import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const once = args.includes("--once");
const intervalMs = Number(process.env.MUSUNIL_SERVICE_WATCH_INTERVAL_MS ?? 5 * 60_000);
const webBaseUrl = (process.env.MUSUNIL_WEB_BASE_URL ?? "https://musunil.com").replace(/\/$/, "");
const apiBaseUrl = (process.env.MUSUNIL_API_BASE_URL ?? "https://api.musunil.com").replace(/\/$/, "");
const expectedCommitSha = process.env.MUSUNIL_EXPECTED_COMMIT_SHA;
const reportPath = resolve(process.cwd(), "docs/splus-service-watch.md");
let webStaticManifestVerified = false;

do {
  const result = await runChecks();
  recordResult(result);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
  if (once) break;
  await new Promise((resolveWait) => setTimeout(resolveWait, intervalMs));
} while (true);

async function runChecks() {
  webStaticManifestVerified = false;
  const checks = [];
  await check(checks, "web_static_manifest", async () => {
    const manifest = await getJson(`${webBaseUrl}/static-manifest.json`);
    if (!manifest.files?.["index.html"]?.sha256 || !manifest.files?.["config.js"]?.sha256) throw new Error("static manifest missing core files");
    const localManifest = localStaticManifest();
    if (localManifest && JSON.stringify(manifest.files) !== JSON.stringify(localManifest.files)) {
      throw new Error("live static manifest does not match local manifest");
    }
    webStaticManifestVerified = true;
    return { files: Object.keys(manifest.files).length, mode: localManifest ? "matches_local" : "live_shape_only" };
  });
  await check(checks, "web_build_info", async () => {
    const build = await getJson(`${webBaseUrl}/build-info.json`);
    if (build.commitSha === "generated-at-build" || build.source === "placeholder") {
      if (!webStaticManifestVerified) throw new Error("build-info placeholder deployed and static manifest did not verify freshness");
      return { commitSha: build.commitSha, builtAt: build.builtAt, mode: "static_manifest_verified_fallback" };
    }
    if (expectedCommitSha && build.commitSha !== expectedCommitSha) throw new Error(`commit ${build.commitSha} != ${expectedCommitSha}`);
    return { commitSha: build.commitSha, builtAt: build.builtAt };
  });
  await check(checks, "web_forbidden_ui_absent", async () => {
    const html = await getText(`${webBaseUrl}/`);
    assertAbsent(html, ["좋아요", "댓글", "찬반", "추천", "비추천", "팔로우", "localhost:4000", "traffic_control", "WEAKLY_OBSERVED"]);
    return { bytes: html.length };
  });
  await check(checks, "api_health_ready", async () => {
    const health = await getJson(`${apiBaseUrl}/health`);
    const ready = await getJson(`${apiBaseUrl}/ready`, { allowNotOk: true });
    if (health.ok !== true) throw new Error("health not ok");
    if (ready.ready !== true) throw new Error("ready=false");
    return { ready: ready.ready, checks: ready.checks?.map((item) => item.id) ?? [] };
  });
  await check(checks, "public_redacted_media", async () => {
    const poster = await fetch(`${apiBaseUrl}/media/redacted/preview-occ-live-1-poster.png`, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000)
    });
    if (poster.status !== 200) throw new Error(`poster returned ${poster.status}`);
    if (!poster.headers.get("content-type")?.startsWith("image/png")) throw new Error("poster content-type mismatch");
    if (poster.headers.get("x-content-type-options") !== "nosniff") throw new Error("poster nosniff missing");
    const posterBytes = (await poster.arrayBuffer()).byteLength;
    if (posterBytes <= 10_000) throw new Error("poster payload too small");

    const clip = await fetch(`${apiBaseUrl}/media/redacted/preview-occ-live-1.webm`, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000)
    });
    if (clip.status !== 200) throw new Error(`clip returned ${clip.status}`);
    if (!clip.headers.get("content-type")?.startsWith("video/webm")) throw new Error("clip content-type mismatch");
    if (clip.headers.get("x-content-type-options") !== "nosniff") throw new Error("clip nosniff missing");
    const clipBytes = (await clip.arrayBuffer()).byteLength;
    if (clipBytes <= 5_000) throw new Error("clip payload too small");

    return { posterBytes, clipBytes };
  });
  for (const path of ["/home", "/issues", "/map", "/laws", "/public-sources/coverage"]) {
    await check(checks, `public_payload_${path.slice(1).replaceAll("/", "_")}`, async () => {
      const body = await getJson(`${apiBaseUrl}${path}`);
      assertPublicPayloadSafe(body);
      return summaryFor(path, body);
    });
  }
  await check(checks, "identity_public_read_write_boundary", async () => {
    const read = await getJson(`${apiBaseUrl}/me`);
    if (read.authenticated !== false) throw new Error("/me without auth should be unauthenticated");
    const response = await fetch(`${apiBaseUrl}/reports/material`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType: "occurrence", targetId: "occ_1", rawText: "watch boundary" })
    });
    const body = await response.json().catch(() => ({}));
    if (response.status !== 401 || body.error !== "identity_required") throw new Error(`write boundary returned ${response.status}:${body.error}`);
    return { read: "public", write: "identity_required" };
  });
  return {
    checkedAt: new Date().toISOString(),
    webBaseUrl,
    apiBaseUrl,
    ok: checks.every((item) => item.ok),
    checks
  };
}

function localStaticManifest() {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), "apps/web/static-manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

async function check(checks, id, action) {
  try {
    checks.push({ id, ok: true, detail: await action() });
  } catch (error) {
    checks.push({ id, ok: false, message: error instanceof Error ? error.message : String(error) });
  }
}

async function getJson(url, options = {}) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12_000) });
  if (!options.allowNotOk && !response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function getText(url) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function assertAbsent(text, tokens) {
  for (const token of tokens) {
    if (text.includes(token)) throw new Error(`forbidden token visible: ${token}`);
  }
}

function assertPublicPayloadSafe(body) {
  const text = JSON.stringify(body);
  assertAbsent(text, [
    "private/live/",
    '"mediaBase64"',
    '"storageKey"',
    '"publicStorageKey"',
    '"publicPosterKey"',
    '"privateLng"',
    '"privateLat"',
    '"geoCell"',
    '"foregroundGps"',
    '"captureMode"',
    '"gpsAccuracyM"',
    '"distanceToTargetM"',
    '"deviceAttestationBucket"',
    '"deviceIntegrityProvider"',
    '"deviceIntegrityProofHash"',
    '"deviceIntegrityCheckedAt"',
    '"redactionProofHash"',
    '"redactionCheckedAt"',
    '"reviewTargetClaimId"',
    '"rawText"',
    '"userId"',
    '"tokenHash"',
    "identityProvider\":\"portone\"",
    '"identityVerificationId"',
    '"ciHash"',
    '"diHash"',
    '"subjectHash"',
    '"phone"',
    '"name"',
    '"birthDate"'
  ]);
}

function summaryFor(path, body) {
  if (path === "/home") return { cards: body.cards?.length ?? 0, issues: body.issueCards?.length ?? 0 };
  if (path === "/issues") return { issues: body.issues?.length ?? 0 };
  if (path === "/map") return { pins: body.geojson?.pins?.features?.length ?? 0, areas: body.geojson?.presenceAreas?.features?.length ?? 0 };
  if (path === "/laws") return { laws: body.laws?.length ?? 0 };
  if (path === "/public-sources/coverage") return { activeScheduleRegions: body.coverage?.activeScheduleRegions, nextRefreshAt: body.coverage?.nextRefreshAt };
  return {};
}

function recordResult(result) {
  mkdirSync(resolve(process.cwd(), "docs"), { recursive: true });
  const status = result.ok ? "S+ Guard" : "Active";
  const rows = result.checks.map((item) => `| ${item.id} | ${item.ok ? "ok" : "fail"} | ${item.message ?? JSON.stringify(item.detail ?? {})} |`).join("\n");
  writeFileSync(
    reportPath,
    `# S+ Service Watch\n\nLast checked: ${result.checkedAt}\n\nStatus: ${status}\n\n| Check | Result | Detail |\n|---|---|---|\n${rows}\n\n## History\n`
  );
  const historyPath = resolve(process.cwd(), "docs/splus-service-watch.history.md");
  if (!existsSync(historyPath)) writeFileSync(historyPath, "# S+ Service Watch History\n\n| Checked At | Status | Failed Checks |\n|---|---|---|\n");
  const failed = result.checks.filter((item) => !item.ok).map((item) => item.id).join(", ") || "-";
  appendFileSync(historyPath, `| ${result.checkedAt} | ${status} | ${failed} |\n`);
}
