import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { publicPayloadRoutes } from "./public-api-routes.mjs";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const once = args.includes("--once");
const withVisualSurface = args.includes("--with-visual") || process.env.MUSUNIL_SERVICE_WATCH_VISUAL === "1";
const intervalMs = Number(process.env.MUSUNIL_SERVICE_WATCH_INTERVAL_MS ?? 5 * 60_000);
const webBaseUrl = (process.env.MUSUNIL_WEB_BASE_URL ?? "https://musunil.com").replace(/\/$/, "");
const apiBaseUrl = (process.env.MUSUNIL_API_BASE_URL ?? "https://api.musunil.com").replace(/\/$/, "");
const expectedApiBaseUrl = deployedHttpsUrlString(process.env.MUSUNIL_EXPECTED_API_BASE_URL ?? apiBaseUrl);
const expectedCommitSha = process.env.MUSUNIL_EXPECTED_COMMIT_SHA;
const reportPath = resolve(process.cwd(), "docs/splus-service-watch.md");
let webStaticManifestVerified = false;
let apiEndpointReachable = false;
const webHeaderContract = [
  {
    id: "cache-control",
    label: "Cache-Control",
    ok: (value) => value.toLowerCase().includes("no-store"),
    expected: "no-store"
  },
  {
    id: "content-security-policy",
    label: "Content-Security-Policy",
    ok: (value) => [
      "default-src 'self'",
      "connect-src 'self' https:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https: blob:",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.portone.io",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "worker-src 'self' blob:"
    ].every((token) => value.includes(token)),
    expected: "CSP with self, https API/map, public media, PortOne, and blob worker/media allowances"
  },
  {
    id: "permissions-policy",
    label: "Permissions-Policy",
    ok: (value) => ["camera=(self)", "microphone=()", "geolocation=(self)"].every((token) => value.includes(token)),
    expected: "camera=(self), microphone=(), geolocation=(self)"
  },
  {
    id: "referrer-policy",
    label: "Referrer-Policy",
    ok: (value) => value.toLowerCase() === "no-referrer",
    expected: "no-referrer"
  },
  {
    id: "x-content-type-options",
    label: "X-Content-Type-Options",
    ok: (value) => value.toLowerCase() === "nosniff",
    expected: "nosniff"
  },
  {
    id: "x-frame-options",
    label: "X-Frame-Options",
    ok: (value) => value.toUpperCase() === "DENY",
    expected: "DENY"
  }
];

class SkipCheck extends Error {}

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
  apiEndpointReachable = false;
  const checks = [];
  await check(checks, "web_static_manifest", async () => {
    const manifest = await getJson(`${webBaseUrl}/static-manifest.json`);
    if (!manifest.files?.["index.html"]?.sha256 || !manifest.files?.["config.js"]?.sha256) throw new Error("static manifest missing core files");
    const localManifest = localStaticManifest();
    if (localManifest && manifest.schemaVersion !== localManifest.schemaVersion) {
      throw new Error("live static manifest schemaVersion does not match local manifest");
    }
    if (localManifest && JSON.stringify(manifest.files) !== JSON.stringify(localManifest.files)) {
      throw new Error("live static manifest does not match local manifest");
    }
    const liveFiles = await verifyLiveManifestFiles(manifest);
    webStaticManifestVerified = true;
    return { ...liveFiles, mode: localManifest ? "matches_local_and_live_hashes" : "live_hashes_only" };
  });
  await check(checks, "web_runtime_config", async () => {
    const source = await getText(`${webBaseUrl}/config.js`);
    assertAbsent(source, ["localhost:4000", "MUSUNIL_USER_INPUTS", "postgres", "redis", "database", "secret", "jwt"]);
    const config = parseWebConfig(source);
    const publicKeys = Object.keys(config).sort();
    const expectedKeys = ["apiBaseUrl", "mapStyleUrl"];
    if (JSON.stringify(publicKeys) !== JSON.stringify(expectedKeys)) {
      throw new Error(`config.js public keys changed: ${publicKeys.join(", ") || "(none)"}`);
    }
    const apiUrl = deployedHttpsUrlString(config.apiBaseUrl);
    if (apiUrl !== expectedApiBaseUrl) {
      throw new Error(`config.js apiBaseUrl ${apiUrl || "(invalid)"} != expected ${expectedApiBaseUrl}`);
    }
    const mapStyleUrl = deployedHttpsUrlString(config.mapStyleUrl);
    if (!mapStyleUrl) throw new Error(`config.js mapStyleUrl must be deployed HTTPS, got ${config.mapStyleUrl || "(missing)"}`);
    return { apiBaseUrl: apiUrl, expectedApiBaseUrl, mapStyleHost: new URL(mapStyleUrl).hostname, publicKeys };
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
  await check(checks, "web_header_contract", async () => {
    const checked = [];
    const failures = [];
    for (const path of ["/", "/config.js", "/build-info.json"]) {
      const response = await fetch(withCacheBuster(`${webBaseUrl}${path}`), {
        headers: noCacheHeaders(),
        redirect: "manual",
        signal: AbortSignal.timeout(12_000)
      });
      const headers = {};
      for (const rule of webHeaderContract) {
        const value = response.headers.get(rule.id) || "";
        headers[rule.id] = value;
        if (!rule.ok(value)) failures.push(`${path} ${rule.label} expected ${rule.expected}, got ${value || "missing"}`);
      }
      checked.push({ path, headers });
    }
    if (failures.length > 0) throw new Error(`invalid Web headers: ${failures.join("; ")}`);
    return { checked };
  });
  await check(checks, "web_forbidden_ui_absent", async () => {
    const html = await getText(`${webBaseUrl}/`);
    assertAbsent(html, ["좋아요", "댓글", "찬반", "추천", "비추천", "팔로우", "localhost:4000", "traffic_control", "WEAKLY_OBSERVED"]);
    return { bytes: html.length };
  });
  await check(checks, "web_visual_surface", async () => {
    if (!withVisualSurface) throw new SkipCheck("skipped: run service-watch with --with-visual or MUSUNIL_SERVICE_WATCH_VISUAL=1");
    const result = spawnSync(process.execPath, ["scripts/ci-visual-surface-smoke.mjs", "--base-url", webBaseUrl], {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    });
    if (result.status !== 0) {
      throw new Error(clip([result.stderr, result.stdout].filter(Boolean).join("\n"), 2400));
    }
    const parsed = JSON.parse(result.stdout);
    const serviceStates = Array.isArray(parsed.serviceStates)
      ? parsed.serviceStates
      : [...new Set((parsed.scenarios || []).map((item) => item.detail?.serviceSyncState).filter(Boolean))];
    const homeScenarios = (parsed.scenarios || []).filter((item) => /_home$/.test(item.id));
    const firstIssues = [...new Set(homeScenarios.map((item) => item.detail?.firstIssueTitle).filter(Boolean))];
    const sourceBundleFirstCount = homeScenarios.filter((item) => item.detail?.sourceBundleFirst).length;
    const firstIssueDetail = firstIssues.length
      ? `; firstIssues=${firstIssues.join(" / ")}; sourceBundleFirst=${sourceBundleFirstCount}/${homeScenarios.length}`
      : "";
    const nonLiveStates = serviceStates.filter((state) => state !== "live");
    if (nonLiveStates.length > 0) {
      throw new Error(`live visual surface is rendering non-live data state: ${nonLiveStates.join(", ")}${firstIssueDetail}`);
    }
    if (sourceBundleFirstCount > 0) {
      throw new Error(`live visual surface first issue is a public source bundle, not a topic Issue${firstIssueDetail}`);
    }
    return {
      mode: parsed.mode,
      baseUrl: parsed.baseUrl,
      serviceStates,
      serviceBannerVisibleCount: parsed.serviceBannerVisibleCount ?? 0,
      scenarios: parsed.scenarios?.length ?? 0,
      failedScenarios: parsed.scenarios?.filter((item) => item.ok !== true).length ?? 0
    };
  });
  await check(checks, "api_endpoint_preflight", async () => {
    const url = deployedHttpsUrl(apiBaseUrl);
    const addresses = await lookup(url.hostname, { all: true });
    const health = await fetch(`${apiBaseUrl}/health`, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000)
    });
    apiEndpointReachable = true;
    return {
      hostname: url.hostname,
      addressFamilies: [...new Set(addresses.map((address) => `IPv${address.family}`))],
      healthStatus: health.status
    };
  });
  await check(checks, "api_health_ready", async () => {
    skipIfApiUnreachable();
    const health = await getJson(`${apiBaseUrl}/health`);
    const ready = await getJson(`${apiBaseUrl}/ready`, { allowNotOk: true });
    if (health.ok !== true) throw new Error("health not ok");
    if (ready.ready !== true) throw new Error("ready=false");
    return { ready: ready.ready, checks: ready.checks?.map((item) => item.id) ?? [] };
  });
  await check(checks, "public_redacted_media", async () => {
    skipIfApiUnreachable();
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
  for (const path of publicPayloadRoutes) {
    await check(checks, `public_payload_${path.slice(1).replaceAll("/", "_")}`, async () => {
      skipIfApiUnreachable();
      const body = await getJson(`${apiBaseUrl}${path}`);
      assertPublicPayloadSafe(body);
      if (path === "/home") assertHomeIssueFirstPayload(body);
      return summaryFor(path, body);
    });
  }
  await check(checks, "identity_public_read_write_boundary", async () => {
    skipIfApiUnreachable();
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
  const result = {
    checkedAt: new Date().toISOString(),
    webBaseUrl,
    apiBaseUrl,
    ok: checks.every((item) => item.ok),
    checks
  };
  result.requiredActions = requiredActions(result);
  return result;
}

function localStaticManifest() {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), "apps/web/static-manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

async function verifyLiveManifestFiles(manifest) {
  const entries = Object.entries(manifest.files ?? {});
  if (entries.length === 0) throw new Error("static manifest has no files");
  let bytes = 0;
  let headersFileVerified = false;
  for (const [manifestPath, expected] of entries) {
    if (!expected?.sha256 || typeof expected.bytes !== "number") throw new Error(`static manifest missing hash metadata for ${manifestPath}`);
    const body = await getBytes(`${webBaseUrl}${staticUrlPath(manifestPath)}`);
    bytes += expected.bytes;
    if (body.byteLength !== expected.bytes) throw new Error(`${manifestPath} byte length mismatch`);
    const actualHash = createHash("sha256").update(body).digest("hex");
    if (actualHash !== expected.sha256) throw new Error(`${manifestPath} hash mismatch`);
    if (manifestPath === "_headers") {
      assertStaticHeadersFile(body);
      headersFileVerified = true;
    }
  }
  if (!headersFileVerified) throw new Error("static manifest must include and verify _headers");
  return { files: entries.length, bytes, headersFile: "verified" };
}

async function getBytes(url) {
  const response = await fetch(withCacheBuster(url), {
    headers: noCacheHeaders(),
    redirect: "manual",
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function assertStaticHeadersFile(bytes) {
  const source = bytes.toString("utf8");
  for (const token of ["Cache-Control", "Content-Security-Policy", "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options"]) {
    if (!source.includes(token)) throw new Error(`_headers missing ${token}`);
  }
}

function staticUrlPath(manifestPath) {
  if (manifestPath === "index.html") return "/";
  return `/${manifestPath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

async function check(checks, id, action) {
  try {
    checks.push({ id, ok: true, detail: await action() });
  } catch (error) {
    if (error instanceof SkipCheck) {
      checks.push({ id, ok: false, skipped: true, message: error.message });
      return;
    }
    checks.push({ id, ok: false, message: error instanceof Error ? error.message : String(error) });
  }
}

function skipIfApiUnreachable() {
  if (!apiEndpointReachable) throw new SkipCheck("skipped: API endpoint preflight failed");
}

function deployedHttpsUrl(value, label = "URL") {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`invalid deployed ${label}: ${value || "(empty)"}`);
  }
  if (url.protocol !== "https:") throw new Error(`${label} must be HTTPS: ${value}`);
  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname) || url.hostname.endsWith(".local")) {
    throw new Error(`${label} must be deployed, got ${url.hostname}`);
  }
  return url;
}

function deployedHttpsUrlString(value) {
  try {
    return deployedHttpsUrl(value).toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function parseWebConfig(source) {
  const match = source.match(/window\.MUSUNIL_WEB_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*$/);
  if (!match) throw new Error("config.js could not be parsed");
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`config.js contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
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

function withCacheBuster(url) {
  const parsed = new URL(url);
  parsed.searchParams.set("_musunil_service_watch", `${Date.now()}`);
  return parsed.toString();
}

function noCacheHeaders() {
  return {
    "cache-control": "no-cache",
    pragma: "no-cache"
  };
}

function assertAbsent(text, tokens) {
  for (const token of tokens) {
    if (text.includes(token)) throw new Error(`forbidden token visible: ${token}`);
  }
}

function assertPublicPayloadSafe(body) {
  const text = JSON.stringify(body);
  assertAbsent(text, [
    '"statement"',
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

function assertHomeIssueFirstPayload(body) {
  const issues = Array.isArray(body?.issueCards) ? body.issueCards : [];
  if (issues.length === 0) {
    throw new Error("/home issueCards is empty; live launch needs at least one topic Issue before the issue feed can be considered ready");
  }
  const topicIssues = issues.filter((issue) => !isPublicSourceBundleIssue(issue));
  if (topicIssues.length === 0) {
    throw new Error("/home issueCards contains only public source bundles; move schedule/statistics bundles to source coverage context");
  }
  if (topicIssues.length < 3) {
    throw new Error(`/home issueCards needs at least 3 topic Issues for launch visual readiness, got ${topicIssues.length}`);
  }
  if (isPublicSourceBundleIssue(issues[0])) {
    throw new Error(`/home first issueCard is a public source bundle, not a topic Issue: ${publicIssueTitle(issues[0])}`);
  }
}

function isPublicSourceBundleIssue(issue) {
  const text = [
    issue?.id,
    issue?.normalizedTopicKey,
    issue?.title,
    ...(Array.isArray(issue?.topicTags) ? issue.topicTags : [])
  ].filter(Boolean).join(" ");
  return /^issue_public_/.test(String(issue?.id || ""))
    || /real-public-assembly-sources|public-assembly-(schedules|statistics)/.test(text)
    || /공개\s*(일정|자료)|신고[·\s-]*(개최|통계)|집회\s*신고\s*통계/.test(text);
}

function publicIssueTitle(issue) {
  return String(issue?.title || issue?.id || "(untitled)").slice(0, 120);
}

function summaryFor(path, body) {
  if (path === "/home") {
    const issues = Array.isArray(body?.issueCards) ? body.issueCards : [];
    return {
      cards: body.cards?.length ?? 0,
      issues: issues.length,
      firstIssueTitle: publicIssueTitle(issues[0]),
      sourceBundleFirst: Boolean(issues[0] && isPublicSourceBundleIssue(issues[0])),
      topicIssues: issues.filter((issue) => !isPublicSourceBundleIssue(issue)).length
    };
  }
  if (path === "/issues") return { issues: body.issues?.length ?? 0 };
  if (path === "/map") return { pins: body.geojson?.pins?.features?.length ?? 0, areas: body.geojson?.presenceAreas?.features?.length ?? 0 };
  if (path === "/laws") return { laws: body.laws?.length ?? 0 };
  if (path === "/public-sources/coverage") return { activeScheduleRegions: body.coverage?.activeScheduleRegions, nextRefreshAt: body.coverage?.nextRefreshAt };
  if (path === "/transparency/logs") return { logs: body.logs?.length ?? 0 };
  return {};
}

function recordResult(result) {
  mkdirSync(resolve(process.cwd(), "docs"), { recursive: true });
  const status = result.ok ? "S+ Guard" : "Active";
  const rows = result.checks.map((item) => `| ${cell(item.id)} | ${item.ok ? "ok" : item.skipped ? "skip" : "fail"} | ${cell(item.message ?? JSON.stringify(item.detail ?? {}))} |`).join("\n");
  const actionRows = result.requiredActions.length
    ? result.requiredActions.map((item) => `| ${cell(item.id)} | ${cell(item.owner ?? "operator")} | ${cell(item.action)} | ${cell(item.verify)} | ${cell(item.reference ?? "-")} |`).join("\n")
    : "| - | - | - | - | - |";
  writeFileSync(
    reportPath,
    `# S+ Service Watch\n\nLast checked: ${result.checkedAt}\n\nStatus: ${status}\n\n| Check | Result | Detail |\n|---|---|---|\n${rows}\n\n## Required Actions\n\n| ID | Owner | Action | Verify | Reference |\n|---|---|---|---|---|\n${actionRows}\n\n## History\n`
  );
  const historyPath = resolve(process.cwd(), "docs/splus-service-watch.history.md");
  if (!existsSync(historyPath)) writeFileSync(historyPath, "# S+ Service Watch History\n\n| Checked At | Status | Failed Checks |\n|---|---|---|\n");
  const failed = result.checks.filter((item) => !item.ok && !item.skipped).map((item) => item.id).join(", ") || "-";
  appendFileSync(historyPath, `| ${result.checkedAt} | ${status} | ${failed} |\n`);
}

function requiredActions(result) {
  const actions = [];
  const byId = new Map(result.checks.map((item) => [item.id, item]));
  const finalGateVerify = "pnpm launch:final-gate";
  const staticManifest = byId.get("web_static_manifest");
  if (staticManifest && !staticManifest.ok) {
    actions.push({
      id: "deploy_latest_static",
      owner: "operator",
      action: "Render musunil-web의 Branch, Root Directory, Build Command, Publish Directory가 pnpm render:web-settings 출력과 같은지 맞춘 뒤 Clear build cache & deploy를 실행한다.",
      verify: "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      reference: "docs/launch-cutover-runbook.md#2-render-static-site"
    });
  }
  const webRuntimeConfig = byId.get("web_runtime_config");
  if (webRuntimeConfig && !webRuntimeConfig.ok) {
    actions.push({
      id: "fix_web_runtime_config",
      owner: "operator",
      action: "Render musunil-web Build Command가 pnpm render:web-settings 출력처럼 pnpm build:web-static:render를 실행하는지 확인한다. 이 단일 명령이 MUSUNIL_WEB_API_BASE_URL=https://api.musunil.com으로 config.js를 생성해야 하며, config.js에는 apiBaseUrl/mapStyleUrl 외 공개 필드가 있으면 안 된다. 수정 후 Clear build cache & deploy를 실행한다.",
      verify: "pnpm render:web-settings && pnpm cloudflare:check && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      reference: "docs/launch-cutover-runbook.md#2-render-static-site"
    });
  }
  const apiPreflight = byId.get("api_endpoint_preflight");
  if (apiPreflight && !apiPreflight.ok) {
    actions.push({
      id: "connect_api_endpoint",
      owner: "operator",
      action: apiPreflight.message?.includes("ENOTFOUND")
        ? "pnpm render:api-settings 출력대로 Render musunil-api 설정과 환경변수를 확인한다. Custom Domains에 api.musunil.com을 추가하고, Render가 표시한 target을 Cloudflare DNS의 api 레코드에 DNS only로 연결한다."
        : "api.musunil.com의 TLS 인증서, Render musunil-api 서비스 상태, /health 응답을 확인한다.",
      verify: withVisualSurface
        ? `pnpm render:api-settings && pnpm cloudflare:check && ${finalGateVerify}`
        : "pnpm render:api-settings && pnpm cloudflare:check && MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm service:watch -- --once",
      reference: "docs/launch-cutover-runbook.md#3-render-api"
    });
  }
  const webHeaders = byId.get("web_header_contract");
  if (webHeaders && !webHeaders.ok) {
    actions.push({
      id: "apply_static_headers",
      owner: "operator",
      action: "pnpm render:web-settings 출력의 Header application mode를 먼저 확인한다. 수동 Static Site이면 Render musunil-web Settings > Headers에 Cache-Control, CSP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options를 그대로 입력하고 Clear build cache & deploy를 실행한다. Blueprint-managed이면 render.yaml headers가 sync됐는지 확인한다. Cloudflare proxy가 켜져 있으면 캐시 우회와 header override 규칙도 함께 확인한다.",
      verify: "pnpm render:web-settings && pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy",
      reference: "docs/launch-cutover-runbook.md#2-render-static-site"
    });
  }
  const buildInfo = byId.get("web_build_info");
  if (buildInfo?.detail?.mode === "static_manifest_verified_fallback") {
    actions.push({
      id: "publish_build_metadata",
      owner: "operator",
      action: "Static manifest hash로 최신 UI는 확인됐지만 build-info가 placeholder다. Render musunil-web Build Command가 pnpm build:web-static:render인지 확인한다. 이 단일 명령은 MUSUNIL_WRITE_BUILD_INFO=1로 실제 Git SHA를 쓰며, 수정 후 Clear build cache & deploy를 실행한다.",
      verify: "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      reference: "docs/launch-readiness-checklist.md"
    });
  }
  const apiReady = byId.get("api_health_ready");
  if (apiReady && !apiReady.ok && !apiReady.skipped) {
    actions.push({
      id: "fix_api_readiness",
      owner: "operator",
      action: "/ready가 ready=true가 아니다. 응답의 summary.blockingGroups와 requiredActions를 보고 DB, Redis, storage, identity, public source, mobile integrity 설정을 채운 뒤 API를 재배포한다.",
      verify: finalGateVerify,
      reference: "docs/user-inputs-manual.md#15-운영-전-최종-확인"
    });
  }
  const homePayload = byId.get("public_payload_home");
  if (homePayload && !homePayload.ok && !homePayload.skipped && /topic Issue|public source bundle|issueCards/.test(homePayload.message || "")) {
    actions.push({
      id: "restore_issue_first_api_payload",
      owner: "lead",
      action: "/home issueCards는 지역별 공개 일정이나 신고 통계 묶음이 아니라 실제 주제형 Issue를 먼저 반환해야 한다. 공식자료 묶음은 source coverage/지역 현황 맥락으로 낮추고, 실제 주제 ingest 또는 topic grouping을 복구한다.",
      verify: "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm service:watch -- --once",
      reference: "docs/launch-readiness-checklist.md"
    });
  }
  const unsafePublicPayload = result.checks.find((item) => item.id.startsWith("public_payload_") && !item.ok && !item.skipped);
  if (unsafePublicPayload) {
    actions.push({
      id: "stop_public_payload_regression",
      owner: "lead",
      action: "공개 payload 안전성 회귀다. 사용자 원문, 정밀 GPS, storage key, identity hash, private media field 노출 여부를 먼저 막고 배포를 중단한다.",
      verify: finalGateVerify,
      reference: "AGENTS.md"
    });
  }
  const visualSurface = byId.get("web_visual_surface");
  if (visualSurface?.skipped) {
    actions.push({
      id: "run_live_visual_surface_check",
      owner: "lead",
      action: "이번 service watch 실행은 live 화면 캡처 검증을 생략했다. 출시 판단에는 모바일/데스크톱 live visual surface 증거가 필요하므로 final gate로 다시 실행한다.",
      verify: finalGateVerify,
      reference: "docs/commercial-splus-redesign.md"
    });
  }
  if (visualSurface && !visualSurface.ok && !visualSurface.skipped) {
    const visualMessage = visualSurface.message || "";
    const nonLiveDataState =
      visualMessage.includes("non-live data state") ||
      /state=(?!live\b)[a-z_-]+/i.test(visualMessage) ||
      /serviceSyncState=(?!live\b)[a-z_-]+/i.test(visualMessage);
    const emptyLiveIssueFeed = /issues=0\b/.test(visualMessage) || /expected at least 3 issue cards, got 0/.test(visualMessage);
    const sourceBundleFirst = /sourceBundleFirst=([1-9]\d*)\/(\d+)/.test(visualSurface.message || "") || /public source bundle/.test(visualSurface.message || "");
    const firstIssues = visualSurface.message?.match(/firstIssues=([^;]+)/)?.[1]?.trim()
      || visualSurface.message?.match(/public source bundle[^:]*:\s*([^\n]+)/)?.[1]?.trim();
    actions.push({
      id: "stop_live_visual_surface_regression",
      owner: "lead",
      action: nonLiveDataState || emptyLiveIssueFeed
        ? "실제 musunil.com이 live issue feed를 받지 못하고 있다. API DNS/CORS/Web config와 `/home.issueCards` 연결을 고쳐 `serviceSyncState=live`이고 홈 이슈 3개 이상이 렌더링될 때까지 배포 승급을 중단한다."
        : "실제 musunil.com 렌더링 회귀다. 홈 이슈 수, 상세 전환, 인증영상/지도/제보 표면, 모바일 overflow와 하단 내비 겹침을 수정하기 전까지 배포 승급을 중단한다.",
      verify: finalGateVerify,
      reference: nonLiveDataState || emptyLiveIssueFeed ? "docs/launch-cutover-runbook.md#3-render-api" : "docs/commercial-splus-redesign.md"
    });
    if (sourceBundleFirst) {
      actions.push({
        id: "restore_issue_first_live_data",
        owner: "lead",
        action: `현재 live 첫 카드가 구체 이슈가 아니라 공개자료 묶음(${firstIssues || "first issue unknown"})이다. API 연결 후 /home issueCards가 실제 주제형 Issue를 먼저 반환하는지 확인하고, 공식자료 묶음은 보조/자료 범위 맥락으로 내려야 한다.`,
        verify: `pnpm check:visual-surface:live && ${finalGateVerify}`,
        reference: "docs/commercial-splus-redesign.md"
      });
    }
  }
  return actions;
}

function cell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function clip(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
