import { spawnSync } from "node:child_process";
import { loadUserInputs } from "../packages/config/src/index.ts";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const listOnly = args.includes("--list");
const apiBaseUrl = deployedHttpsUrlString(process.env.MUSUNIL_API_BASE_URL ?? readConfigString("api.public_base_url") ?? "https://api.musunil.com");
const requestTimeoutMs = 12_000;
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (listOnly) {
  console.log(JSON.stringify({
    checked: "public_source_refresh_preflight_plan",
    apiBaseUrl,
    steps: [
      "GET /public-sources/coverage",
      "if refresh ledger is incomplete and internal key is available, run pnpm sources:assemblies:post",
      "GET /public-sources/coverage again and require all active schedule sourceRefreshes"
    ]
  }, null, 2));
  process.exit(0);
}

if (!apiBaseUrl) {
  fail("Set MUSUNIL_API_BASE_URL or api.public_base_url to the deployed HTTPS API URL.");
}

const before = await readCoverage();
const beforeCheck = publicSourceRefreshState(before.coverage ?? {});
if (beforeCheck.ok) {
  print({ ok: true, mode: "already_current", apiBaseUrl, coverage: beforeCheck.detail });
  process.exit(0);
}

if (!hasInternalApiKey()) {
  print({
    ok: false,
    mode: "needs_internal_source_post",
    apiBaseUrl,
    reason: beforeCheck.reason,
    requiredAction: "Set MUSUNIL_INTERNAL_API_KEY, or wait for the Render musunil-ops-scheduler public_source_ingest task to succeed, then rerun pnpm launch:final-gate.",
    command: "MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_INTERNAL_API_KEY=<render generated internal key> pnpm sources:assemblies:post"
  }, "error");
  process.exit(1);
}

const post = spawnSync(pnpm, ["sources:assemblies:post"], {
  cwd: process.cwd(),
  env: { ...process.env, MUSUNIL_API_BASE_URL: apiBaseUrl },
  stdio: "inherit"
});
if (post.error) fail(`Failed to run pnpm sources:assemblies:post: ${post.error.message}`);
if (post.signal) fail(`pnpm sources:assemblies:post exited via signal ${post.signal}`);
if (post.status !== 0) process.exit(post.status ?? 1);

const after = await readCoverage();
const afterCheck = publicSourceRefreshState(after.coverage ?? {});
if (!afterCheck.ok) {
  print({
    ok: false,
    mode: "post_completed_but_refresh_incomplete",
    apiBaseUrl,
    reason: afterCheck.reason,
    coverage: afterCheck.detail
  }, "error");
  process.exit(1);
}

print({ ok: true, mode: "posted_and_current", apiBaseUrl, coverage: afterCheck.detail });

async function readCoverage() {
  const response = await fetch(`${apiBaseUrl}/public-sources/coverage`, {
    redirect: "manual",
    signal: AbortSignal.timeout(requestTimeoutMs)
  });
  if (response.status !== 200) fail(`/public-sources/coverage returned ${response.status}`);
  return response.json();
}

function publicSourceRefreshState(coverage) {
  if (coverage.fullScheduleCoverage !== true) return state(false, "coverage is not fullScheduleCoverage=true", coverage);
  if (coverage.activeScheduleRegions !== 18) return state(false, `activeScheduleRegions must be 18, got ${coverage.activeScheduleRegions ?? "(missing)"}`, coverage);
  if (!Array.isArray(coverage.regions)) return state(false, "coverage regions missing", coverage);
  if (!Array.isArray(coverage.sourceRefreshes)) return state(false, "coverage sourceRefreshes missing", coverage);

  const activeSourceIds = coverage.regions.map((region) => region?.activeScheduleSourceId).filter(Boolean);
  const refreshBySource = new Map(coverage.sourceRefreshes.map((refresh) => [refresh?.sourceId, refresh]));
  const missing = activeSourceIds.filter((sourceId) => !refreshBySource.has(sourceId));
  const invalid = activeSourceIds.filter((sourceId) => {
    const refresh = refreshBySource.get(sourceId);
    return !isValidSourceRefresh(refresh);
  });
  const overdueRegions = coverage.regions
    .filter((region) => region?.activeScheduleSourceId && region.freshness === "overdue")
    .map((region) => region.code)
    .filter(Boolean);
  const checkedAtValues = activeSourceIds
    .map((sourceId) => refreshBySource.get(sourceId)?.checkedAt)
    .filter((value) => typeof value === "string");
  const detail = {
    activeScheduleSources: activeSourceIds.length,
    refreshedActiveSources: activeSourceIds.length - missing.length,
    latestCheckedAt: latestIso(checkedAtValues),
    sourceRefreshes: coverage.sourceRefreshes.length,
    missing,
    invalid,
    overdueRegions
  };
  if (missing.length || invalid.length || overdueRegions.length) {
    return state(false, "public source refresh ledger is not launch-ready", detail);
  }
  return state(true, "", detail);
}

function isValidSourceRefresh(refresh) {
  if (!refresh?.checkedAt || Number.isNaN(new Date(refresh.checkedAt).getTime())) return false;
  if (refresh.status === "failed") return false;
  if (refresh.status === "empty") {
    return Number(refresh.parsedCount) > 0 && Number(refresh.resultCount) === 0;
  }
  return Number(refresh.resultCount) > 0;
}

function state(ok, reason, detail) {
  return { ok, reason, detail };
}

function hasInternalApiKey() {
  return isUsableInternalApiKey(process.env.MUSUNIL_INTERNAL_API_KEY) || isUsableInternalApiKey(readConfigString("security.internal_api_key"));
}

function readConfigString(path) {
  try {
    const { config } = loadUserInputs({ cwd: process.cwd() });
    const value = path.split(".").reduce((current, key) => {
      if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
      return current[key];
    }, config);
    return typeof value === "string" && value.trim() && !value.startsWith("CHANGE_ME") ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

function deployedHttpsUrlString(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "";
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname) || url.hostname.endsWith(".local")) return "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function latestIso(values) {
  const times = values
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time));
  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
}

function isUsableInternalApiKey(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  return !/^(CHANGE_ME|render_generated|placeholder|example)/i.test(value.trim());
}

function print(value, stream = "log") {
  console[stream](JSON.stringify({ checked: "public_source_refresh_preflight", ...value }, null, 2));
}

function fail(message) {
  print({ ok: false, mode: "failed", apiBaseUrl, reason: message }, "error");
  process.exit(1);
}
