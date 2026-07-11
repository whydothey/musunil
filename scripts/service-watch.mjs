import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";
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
    if (localManifest && JSON.stringify(manifest.files) !== JSON.stringify(localManifest.files)) {
      throw new Error("live static manifest does not match local manifest");
    }
    webStaticManifestVerified = true;
    return { files: Object.keys(manifest.files).length, mode: localManifest ? "matches_local" : "live_shape_only" };
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
      throw new Error(tail([result.stderr, result.stdout].filter(Boolean).join("\n"), 1200));
    }
    const parsed = JSON.parse(result.stdout);
    const serviceStates = Array.isArray(parsed.serviceStates)
      ? parsed.serviceStates
      : [...new Set((parsed.scenarios || []).map((item) => item.detail?.serviceSyncState).filter(Boolean))];
    const nonLiveStates = serviceStates.filter((state) => state !== "live");
    if (nonLiveStates.length > 0) {
      throw new Error(`live visual surface is rendering non-live data state: ${nonLiveStates.join(", ")}`);
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
    ok: checks.every((item) => item.ok || item.skipped),
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

function summaryFor(path, body) {
  if (path === "/home") return { cards: body.cards?.length ?? 0, issues: body.issueCards?.length ?? 0 };
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
      action: "Render musunil-web Build Command가 pnpm render:web-settings 출력처럼 MUSUNIL_WEB_API_BASE_URL=https://api.musunil.com으로 config.js를 생성하는지 확인한다. config.js에는 apiBaseUrl/mapStyleUrl 외 공개 필드가 있으면 안 되며, 수정 후 Clear build cache & deploy를 실행한다.",
      verify: "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
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
        ? "pnpm render:api-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm service:watch:visual"
        : "pnpm render:api-settings && MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm service:watch -- --once",
      reference: "docs/launch-cutover-runbook.md#3-render-api"
    });
  }
  const webHeaders = byId.get("web_header_contract");
  if (webHeaders && !webHeaders.ok) {
    actions.push({
      id: "apply_static_headers",
      owner: "operator",
      action: "pnpm render:web-settings 출력의 Cache-Control, CSP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options Headers를 Render musunil-web Static Site Dashboard에 그대로 입력하고 Clear build cache & deploy를 실행한다. Cloudflare proxy가 켜져 있으면 캐시 우회와 header override 규칙도 함께 확인한다.",
      verify: "pnpm render:web-settings && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy",
      reference: "docs/launch-cutover-runbook.md#2-render-static-site"
    });
  }
  const buildInfo = byId.get("web_build_info");
  if (buildInfo?.detail?.mode === "static_manifest_verified_fallback") {
    actions.push({
      id: "publish_build_metadata",
      owner: "operator",
      action: "Static manifest hash로 최신 UI는 확인됐지만 build-info가 placeholder다. Render가 build command output을 publish하는지 확인하거나, static-manifest 검증을 fallback warning으로 유지한다.",
      verify: "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      reference: "docs/launch-readiness-checklist.md"
    });
  }
  const apiReady = byId.get("api_health_ready");
  if (apiReady && !apiReady.ok && !apiReady.skipped) {
    actions.push({
      id: "fix_api_readiness",
      owner: "operator",
      action: "/ready가 ready=true가 아니다. 응답의 summary.blockingGroups와 requiredActions를 보고 DB, Redis, storage, identity, public source, mobile integrity 설정을 채운 뒤 API를 재배포한다.",
      verify: "MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm launch:post-deploy-smoke -- --require-laws",
      reference: "docs/user-inputs-manual.md#15-운영-전-최종-확인"
    });
  }
  const unsafePublicPayload = result.checks.find((item) => item.id.startsWith("public_payload_") && !item.ok && !item.skipped);
  if (unsafePublicPayload) {
    actions.push({
      id: "stop_public_payload_regression",
      owner: "lead",
      action: "공개 payload 안전성 회귀다. 사용자 원문, 정밀 GPS, storage key, identity hash, private media field 노출 여부를 먼저 막고 배포를 중단한다.",
      verify: "MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm launch:post-deploy-smoke -- --require-laws",
      reference: "AGENTS.md"
    });
  }
  const visualSurface = byId.get("web_visual_surface");
  if (visualSurface && !visualSurface.ok && !visualSurface.skipped) {
    const nonLiveDataState = visualSurface.message?.includes("non-live data state");
    actions.push({
      id: "stop_live_visual_surface_regression",
      owner: "lead",
      action: nonLiveDataState
        ? "실제 musunil.com이 저장된 공개자료 fallback 상태로 렌더링 중이다. API DNS/CORS/Web config 연결을 고쳐 `serviceSyncState=live`가 될 때까지 배포 승급을 중단한다."
        : "실제 musunil.com 렌더링 회귀다. 홈 이슈 수, 상세 전환, 인증영상/지도/제보 표면, 모바일 overflow와 하단 내비 겹침을 수정하기 전까지 배포 승급을 중단한다.",
      verify: "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm service:watch:visual",
      reference: nonLiveDataState ? "docs/launch-cutover-runbook.md#3-render-api" : "docs/commercial-splus-redesign.md"
    });
  }
  return actions;
}

function cell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function tail(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `...${text.slice(-maxLength)}`;
}
