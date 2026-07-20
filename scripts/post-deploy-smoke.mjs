import { loadUserInputs } from "../packages/config/src/index.ts";
import { publicPayloadRoutes } from "./public-api-routes.mjs";

const config = safeConfig();
const apiBaseUrl = (process.env.MUSUNIL_API_BASE_URL ?? readString(config, "api.public_base_url") ?? "").replace(/\/$/, "");
const webBaseUrl = (process.env.MUSUNIL_WEB_BASE_URL ?? readString(config, "app.public_base_url") ?? "").replace(/\/$/, "");
const requireLaws = process.argv.includes("--require-laws");
const requireSourceRefreshes = process.argv.includes("--require-source-refreshes");
const requestTimeoutMs = 10_000;
const checks = [];

if (!isDeployedHttpsUrl(apiBaseUrl)) {
  console.error("Set MUSUNIL_API_BASE_URL or api.public_base_url to the deployed HTTPS API URL.");
  process.exit(1);
}
if (!isDeployedHttpsUrl(webBaseUrl)) {
  console.error("Set MUSUNIL_WEB_BASE_URL or app.public_base_url to the deployed HTTPS web URL.");
  process.exit(1);
}

await check("web_runtime_config_alignment", async () => {
  const source = await webText("/config.js");
  assert(source.includes("MUSUNIL_WEB_CONFIG"), "Web config.js missing MUSUNIL_WEB_CONFIG");
  assert(!/localhost:4000|MUSUNIL_USER_INPUTS|postgres|redis|database|secret|jwt/i.test(source), "Web config.js leaked internal config pattern");
  const webConfig = parseWebConfig(source);
  const publicKeys = Object.keys(webConfig).sort();
  assert(JSON.stringify(publicKeys) === JSON.stringify(["apiBaseUrl", "mapStyleUrl"]), `Web config public keys changed: ${publicKeys.join(", ") || "(none)"}`);
  assert(webConfig.apiBaseUrl === apiBaseUrl, `Web config apiBaseUrl ${webConfig.apiBaseUrl} does not match deployed API ${apiBaseUrl}`);
  assert(isDeployedHttpsUrl(webConfig.mapStyleUrl), `Web config mapStyleUrl must be deployed HTTPS, got ${webConfig.mapStyleUrl || "(missing)"}`);
});

await check("health", async () => {
  const response = await raw("GET", "/health");
  assert(response.status === 200, `/health returned ${response.status}`);
  assert(response.body?.ok === true, "/health did not return ok=true");
  assertApiSecurityHeaders(response.headers);
});

await check("public_redacted_media", async () => {
  const poster = await fetch(`${apiBaseUrl}/media/redacted/preview-occ-live-1-poster.png`, {
    redirect: "manual",
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  assert(poster.status === 200, `public redacted poster returned ${poster.status}`);
  assert(poster.headers.get("content-type")?.startsWith("image/png"), "public redacted poster content-type mismatch");
  assert(poster.headers.get("x-content-type-options") === "nosniff", "public redacted poster nosniff header missing");
  assert((await poster.arrayBuffer()).byteLength > 10_000, "public redacted poster payload too small");

  const clip = await fetch(`${apiBaseUrl}/media/redacted/preview-occ-live-1.webm`, {
    redirect: "manual",
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  assert(clip.status === 200, `public redacted clip returned ${clip.status}`);
  assert(clip.headers.get("content-type")?.startsWith("video/webm"), "public redacted clip content-type mismatch");
  assert(clip.headers.get("x-content-type-options") === "nosniff", "public redacted clip nosniff header missing");
  assert((await clip.arrayBuffer()).byteLength > 5_000, "public redacted clip payload too small");

  const traversal = await fetch(`${apiBaseUrl}/media/redacted/%2e%2e/private/live.png`, {
    redirect: "manual",
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  assert([403, 404].includes(traversal.status), `encoded traversal should be blocked, got ${traversal.status}`);
});

await check("cors_boundary", async () => {
  const disallowedOrigin = "https://not-allowed.musunil.invalid";
  const disallowed = await raw("GET", "/health", { origin: disallowedOrigin });
  assert(disallowed.headers["access-control-allow-origin"] !== disallowedOrigin, "disallowed CORS origin was echoed");
  const allowed = await raw("GET", "/health", { origin: webBaseUrl });
  assert(allowed.headers["access-control-allow-origin"] === webBaseUrl, "configured web origin was not CORS-allowed");
  assert(allowed.headers["vary"] === "Origin", "Vary: Origin header missing");
});

await check("ready", async () => {
  const response = await raw("GET", "/ready");
  assert(response.status === 200, `/ready returned ${response.status}; ${formatReadinessFailure(response.body)}`);
  assert(response.body?.ready === true, `/ready returned ready=false; ${formatReadinessFailure(response.body)}`);
  assert(response.body?.summary?.failedCount === 0, `/ready summary failedCount should be 0; ${formatReadinessFailure(response.body)}`);
  assert(Array.isArray(response.body?.requiredActions) && response.body.requiredActions.length === 0, `/ready requiredActions should be empty; ${formatReadinessFailure(response.body)}`);
  assertReadyCheck(response.body, "config_source");
  assertReadyCheck(response.body, "postgres");
  assertReadyCheck(response.body, "redis");
});

await check("public_payload_safety", async () => {
  const response = await raw("GET", "/home");
  assert(response.status === 200, `/home returned ${response.status}`);
  assert(Array.isArray(response.body?.cards), "/home cards missing");
  assertPublicPayloadSafe("/home", response.body);
  assertHomeIssueReadiness(response.body);
  const issues = await raw("GET", "/issues");
  assert(issues.status === 200, `/issues returned ${issues.status}`);
  assertPublicPayloadSafe("/issues", issues.body);
  const issueId = firstId(issues.body?.issues);
  if (issueId) {
    for (const path of [`/issues/${encodeURIComponent(issueId)}`, `/targets/issue/${encodeURIComponent(issueId)}/live-claims`]) {
      const issueResponse = await raw("GET", path);
      assert(issueResponse.status === 200, `${path} returned ${issueResponse.status}`);
      assertPublicPayloadSafe(path, issueResponse.body);
    }
  }
  for (const path of publicPayloadRoutes.filter((item) => item !== "/home" && item !== "/issues")) {
    const publicResponse = await raw("GET", path);
    assert(publicResponse.status === 200, `${path} returned ${publicResponse.status}`);
    assertPublicPayloadSafe(path, publicResponse.body);
  }
});

await check("coverage", async () => {
  const response = await raw("GET", "/public-sources/coverage");
  assert(response.status === 200, `/public-sources/coverage returned ${response.status}`);
  const coverage = response.body?.coverage ?? {};
  assert(coverage.fullScheduleCoverage === true, "coverage is not fullScheduleCoverage=true");
  assert(coverage.activeScheduleRegions === 18, "activeScheduleRegions must be 18");
  assert(Array.isArray(coverage.regions), "coverage regions missing");
  assert(Array.isArray(coverage.sourceRefreshes), "coverage sourceRefreshes missing");
  if (requireSourceRefreshes) assertSourceRefreshesCurrent(coverage);
});

await check("laws", async () => {
  const response = await raw("GET", "/laws");
  assert(response.status === 200, `/laws returned ${response.status}`);
  assert(Array.isArray(response.body?.laws), "/laws list missing");
  assert(Array.isArray(response.body?.lawTopics), "/laws topic list missing");
  if (requireLaws) assert(response.body.laws.length > 0, "--require-laws expected at least one law item");
  const lawId = firstId(response.body.laws);
  if (lawId) {
    const detail = await raw("GET", `/laws/${encodeURIComponent(lawId)}`);
    assert(detail.status === 200, `/laws/${lawId} returned ${detail.status}`);
    assertPublicPayloadSafe(`/laws/${lawId}`, detail.body);
  }
  const topicId = firstId(response.body.lawTopics);
  if (topicId) {
    const topicDetail = await raw("GET", `/law-topics/${encodeURIComponent(topicId)}`);
    assert(topicDetail.status === 200, `/law-topics/${topicId} returned ${topicDetail.status}`);
    assert(Array.isArray(topicDetail.body?.bills) && topicDetail.body.bills.length > 0, `/law-topics/${topicId} bills missing`);
    assertPublicPayloadSafe(`/law-topics/${topicId}`, topicDetail.body);
  }
});

await check("admin_auth_required", async () => {
  const response = await raw("GET", "/admin/review-queue");
  assert(response.status === 401, `admin route should require auth, got ${response.status}`);
});

await check("forbidden_engagement_surface_absent", async () => {
  for (const path of ["/comments", "/votes", "/likes", "/reactions", "/donations", "/sponsorships"]) {
    for (const method of ["GET", "POST"]) {
      const response = await raw(method, path);
      assert(response.status === 404, `${method} ${path} should not exist, got ${response.status}`);
    }
  }
});

console.log(JSON.stringify({ checked: "post_deploy_smoke", apiBaseUrl, webBaseUrl, checks }, null, 2));

async function raw(method, path, headers = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body };
}

async function webText(path) {
  const response = await fetch(`${webBaseUrl}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  assert(response.status === 200, `Web ${path} returned ${response.status}`);
  return response.text();
}

async function check(id, run) {
  try {
    await run();
    checks.push({ id, ok: true });
  } catch (error) {
    checks.push({ id, ok: false, message: errorMessage(error) });
    console.error(JSON.stringify({ checked: "post_deploy_smoke", apiBaseUrl, webBaseUrl, checks }, null, 2));
    process.exit(1);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSourceRefreshesCurrent(coverage) {
  const activeSourceIds = coverage.regions.map((region) => region?.activeScheduleSourceId).filter(Boolean);
  const refreshBySource = new Map(coverage.sourceRefreshes.map((refresh) => [refresh?.sourceId, refresh]));
  const missing = activeSourceIds.filter((sourceId) => !refreshBySource.has(sourceId));
  assert(
    missing.length === 0,
    `sourceRefreshes missing active schedule sources: ${missing.join(", ")}; run pnpm sources:refresh-preflight before final gate`
  );

  const invalid = activeSourceIds.filter((sourceId) => {
    const refresh = refreshBySource.get(sourceId);
    return !refresh?.checkedAt || Number.isNaN(new Date(refresh.checkedAt).getTime()) || !(Number(refresh.resultCount) > 0);
  });
  assert(
    invalid.length === 0,
    `sourceRefreshes invalid for active sources: ${invalid.join(", ")}; each active source needs checkedAt and resultCount > 0`
  );

  const overdueRegions = coverage.regions
    .filter((region) => region?.activeScheduleSourceId && region.freshness === "overdue")
    .map((region) => region.code)
    .filter(Boolean);
  assert(overdueRegions.length === 0, `coverage active regions still overdue after source ingest: ${overdueRegions.join(", ")}`);
}

function errorMessage(error) {
  if (error instanceof Error) {
    const cause = error.cause instanceof Error ? `: ${error.cause.message}` : "";
    return `${error.message}${cause}`;
  }
  return String(error);
}

function assertApiSecurityHeaders(headers) {
  assert(headers["x-content-type-options"] === "nosniff", "nosniff header missing");
  assert(headers["referrer-policy"] === "no-referrer", "referrer-policy header missing");
  assert(headers["cache-control"] === "no-store", "cache-control header missing");
}

function assertReadyCheck(body, id) {
  assert(Array.isArray(body?.checks), "/ready checks missing");
  const item = body.checks.find((check) => check?.id === id);
  assert(item?.ok === true, `/ready check ${id} is not ok; ${formatReadinessFailure(body)}`);
}

function formatReadinessFailure(body) {
  const failedIds = Array.isArray(body?.summary?.failedIds) ? body.summary.failedIds : [];
  const blockingGroups = Array.isArray(body?.summary?.blockingGroups) ? body.summary.blockingGroups : [];
  const requiredActions = Array.isArray(body?.requiredActions)
    ? body.requiredActions.map((item) => [item?.id, item?.action].filter(Boolean).join(": "))
    : [];
  return [
    `blockingGroups=${blockingGroups.join(",") || "unknown"}`,
    `failedIds=${failedIds.join(",") || "unknown"}`,
    `requiredActions=${requiredActions.join(" | ") || "none"}`
  ].join("; ");
}

function assertPublicPayloadSafe(path, body) {
  const text = JSON.stringify(body);
  for (const token of [
    '"statement"',
    '"storageKey"',
    '"publicStorageKey"',
    '"publicPosterKey"',
    '"rawText"',
    '"claimIds"',
    '"evidenceIds"',
    '"targetRefs"',
    '"mediaBase64"',
    '"privateMediaBase64"',
    '"hash"',
    '"geoCell"',
    '"privateLng"',
    '"privateLat"',
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
    '"userId"',
    '"tokenHash"',
    '"ciHash"',
    '"diHash"',
    '"subjectHash"',
    '"identityVerificationId"',
    '"phone"',
    '"name"',
    '"birthDate"',
    "hazard_area",
    "service_disruption",
    "preview-only",
    "mock",
    "_sample"
  ]) {
    assert(!text.includes(token), `${path} leaked forbidden token: ${token}`);
  }
}

function assertHomeIssueReadiness(body) {
  const issues = Array.isArray(body?.issueCards) ? body.issueCards : [];
  assert(issues.length > 0, "/home issueCards is empty; launch requires topic issue feed data");
  const topicIssues = issues.filter((issue) => !isPublicSourceBundleIssue(issue));
  assert(topicIssues.length >= 3, `/home issueCards needs at least 3 topic Issues, got ${topicIssues.length}`);
  assert(!isPublicSourceBundleIssue(issues[0]), `/home first issueCard is a public source bundle: ${publicIssueTitle(issues[0])}`);
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

function firstId(items) {
  return Array.isArray(items) && typeof items[0]?.id === "string" ? items[0].id : undefined;
}

function safeConfig() {
  try {
    return loadUserInputs({ cwd: process.cwd() }).config;
  } catch {
    return {};
  }
}

function readString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isDeployedHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname) && !url.hostname.endsWith(".local");
  } catch {
    return false;
  }
}

function parseWebConfig(source) {
  const match = source.match(/window\.MUSUNIL_WEB_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*$/);
  assert(match, "Web config.js could not be parsed");
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Web config.js contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}
