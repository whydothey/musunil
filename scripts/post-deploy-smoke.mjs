import { loadUserInputs } from "../packages/config/src/index.ts";

const config = safeConfig();
const apiBaseUrl = (process.env.MUSUNIL_API_BASE_URL ?? readString(config, "api.public_base_url") ?? "").replace(/\/$/, "");
const webBaseUrl = (readString(config, "app.public_base_url") ?? "").replace(/\/$/, "");
const requireLaws = process.argv.includes("--require-laws");
const requestTimeoutMs = 10_000;
const checks = [];

if (!isDeployedHttpsUrl(apiBaseUrl)) {
  console.error("Set MUSUNIL_API_BASE_URL or api.public_base_url to the deployed HTTPS API URL.");
  process.exit(1);
}

await check("health", async () => {
  const response = await raw("GET", "/health");
  assert(response.status === 200, `/health returned ${response.status}`);
  assert(response.body?.ok === true, "/health did not return ok=true");
  assertApiSecurityHeaders(response.headers);
});

await check("cors_boundary", async () => {
  const disallowedOrigin = "https://not-allowed.musunil.invalid";
  const disallowed = await raw("GET", "/health", { origin: disallowedOrigin });
  assert(disallowed.headers["access-control-allow-origin"] !== disallowedOrigin, "disallowed CORS origin was echoed");
  if (isDeployedHttpsUrl(webBaseUrl)) {
    const allowed = await raw("GET", "/health", { origin: webBaseUrl });
    assert(allowed.headers["access-control-allow-origin"] === webBaseUrl, "configured web origin was not CORS-allowed");
    assert(allowed.headers["vary"] === "Origin", "Vary: Origin header missing");
  }
});

await check("ready", async () => {
  const response = await raw("GET", "/ready");
  assert(response.status === 200, `/ready returned ${response.status}`);
  assert(response.body?.ready === true, "/ready returned ready=false");
  assertReadyCheck(response.body, "config_source");
  assertReadyCheck(response.body, "postgres");
  assertReadyCheck(response.body, "redis");
});

await check("public_payload_safety", async () => {
  const response = await raw("GET", "/home");
  assert(response.status === 200, `/home returned ${response.status}`);
  assert(Array.isArray(response.body?.cards), "/home cards missing");
  assertPublicPayloadSafe("/home", response.body);
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
  for (const path of ["/area-clusters", "/map", "/public-sources/coverage", "/laws"]) {
    const publicResponse = await raw("GET", path);
    assert(publicResponse.status === 200, `${path} returned ${publicResponse.status}`);
    assertPublicPayloadSafe(path, publicResponse.body);
  }
});

await check("coverage", async () => {
  const response = await raw("GET", "/public-sources/coverage");
  assert(response.status === 200, `/public-sources/coverage returned ${response.status}`);
  assert(response.body?.coverage?.fullScheduleCoverage === true, "coverage is not fullScheduleCoverage=true");
  assert(response.body?.coverage?.activeScheduleRegions === 18, "activeScheduleRegions must be 18");
});

await check("laws", async () => {
  const response = await raw("GET", "/laws");
  assert(response.status === 200, `/laws returned ${response.status}`);
  assert(Array.isArray(response.body?.laws), "/laws list missing");
  if (requireLaws) assert(response.body.laws.length > 0, "--require-laws expected at least one law item");
  const lawId = firstId(response.body.laws);
  if (lawId) {
    const detail = await raw("GET", `/laws/${encodeURIComponent(lawId)}`);
    assert(detail.status === 200, `/laws/${lawId} returned ${detail.status}`);
    assertPublicPayloadSafe(`/laws/${lawId}`, detail.body);
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

console.log(JSON.stringify({ checked: "post_deploy_smoke", apiBaseUrl, checks }, null, 2));

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

async function check(id, run) {
  await run();
  checks.push({ id, ok: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertApiSecurityHeaders(headers) {
  assert(headers["x-content-type-options"] === "nosniff", "nosniff header missing");
  assert(headers["referrer-policy"] === "no-referrer", "referrer-policy header missing");
  assert(headers["cache-control"] === "no-store", "cache-control header missing");
}

function assertReadyCheck(body, id) {
  assert(Array.isArray(body?.checks), "/ready checks missing");
  const item = body.checks.find((check) => check?.id === id);
  assert(item?.ok === true, `/ready check ${id} is not ok`);
}

function assertPublicPayloadSafe(path, body) {
  const text = JSON.stringify(body);
  for (const token of [
    '"statement"',
    '"storageKey"',
    '"publicStorageKey"',
    '"rawText"',
    '"claimIds"',
    '"evidenceIds"',
    '"targetRefs"',
    '"mediaBase64"',
    '"privateMediaBase64"',
    '"hash"',
    '"geoCell"',
    '"gpsAccuracyM"',
    '"distanceToTargetM"',
    '"deviceIntegrityProvider"',
    '"deviceIntegrityProofHash"',
    '"redactionProofHash"',
    "hazard_area",
    "service_disruption",
    "preview-only",
    "mock"
  ]) {
    assert(!text.includes(token), `${path} leaked forbidden token: ${token}`);
  }
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
