import { execFileSync } from "node:child_process";
import { loadUserInputs } from "../packages/config/src/index.ts";

const config = safeConfig();
const webBaseUrl = deployedUrl(process.env.MUSUNIL_WEB_BASE_URL ?? positionalArg() ?? readString(config, "app.public_base_url"));
const expectedCommitSha = process.env.MUSUNIL_EXPECTED_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || gitHead();
const checks = [];

if (!webBaseUrl) {
  console.error("Set MUSUNIL_WEB_BASE_URL or app.public_base_url to the deployed HTTPS web URL.");
  process.exit(1);
}

await check("web_build_info", async () => {
  const response = await raw(`${webBaseUrl}/build-info.json`);
  assert(response.status === 200, `/build-info.json returned ${response.status}`);
  assertWebNoStore(response.headers, "/build-info.json");
  assert(typeof response.body?.commitSha === "string" && response.body.commitSha.length >= 7, "build-info commitSha missing");
  assert(typeof response.body?.builtAt === "string" && response.body.builtAt.includes("T"), "build-info builtAt missing");
  if (expectedCommitSha) {
    assert(response.body.commitSha === expectedCommitSha, `deployed web commit ${response.body.commitSha} does not match expected ${expectedCommitSha}`);
  }
});

await check("web_html_current", async () => {
  const response = await text(`${webBaseUrl}/`);
  assert(response.status === 200, `/ returned ${response.status}`);
  assertWebNoStore(response.headers, "/");
  assert(response.body.includes("build-info.js"), "HTML is missing build-info.js");
  assert(response.body.includes('data-tab-view="explore"'), "HTML is missing current explore tab");
  assert(response.body.includes("occurrence-pins"), "HTML is missing current MapLibre occurrence layer");
  assert(response.body.includes("presence-areas"), "HTML is missing current presence area layer");
  assert(!response.body.includes('data-tab-view="map"'), "HTML still contains old map tab");
  assert(!response.body.includes('data-tab-view="record"'), "HTML still contains old detail tab");
});

await check("web_config_current", async () => {
  const response = await text(`${webBaseUrl}/config.js`);
  assert(response.status === 200, `/config.js returned ${response.status}`);
  assertWebNoStore(response.headers, "/config.js");
  assert(response.body.includes("MUSUNIL_WEB_CONFIG"), "config.js missing MUSUNIL_WEB_CONFIG");
  assert(response.body.includes("apiBaseUrl"), "config.js missing apiBaseUrl");
  assert(!response.body.includes("localhost:4000"), "config.js still points to localhost API");
  assert(!/internal|secret|jwt|postgres|redis|database|MUSUNIL_USER_INPUTS/i.test(response.body), "config.js leaked internal config pattern");
});

console.log(JSON.stringify({ checked: "web_deploy_version", webBaseUrl, expectedCommitSha, checks }, null, 2));

async function raw(url) {
  const response = await fetch(withCacheBuster(url), {
    headers: noCacheHeaders(),
    redirect: "manual",
    signal: AbortSignal.timeout(10_000)
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body };
}

async function text(url) {
  const response = await fetch(withCacheBuster(url), {
    headers: noCacheHeaders(),
    redirect: "manual",
    signal: AbortSignal.timeout(10_000)
  });
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body: await response.text() };
}

async function check(id, run) {
  await run();
  checks.push({ id, ok: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertWebNoStore(headers, path) {
  const cacheControl = String(headers["cache-control"] || "").toLowerCase();
  assert(cacheControl.includes("no-store"), `${path} must send Cache-Control: no-store, got ${cacheControl || "missing"}`);
}

function withCacheBuster(url) {
  const parsed = new URL(url);
  parsed.searchParams.set("_musunil_deploy_check", `${Date.now()}`);
  return parsed.toString();
}

function noCacheHeaders() {
  return {
    "cache-control": "no-cache",
    pragma: "no-cache"
  };
}

function positionalArg() {
  return process.argv.slice(2).find((arg) => !arg.startsWith("--"));
}

function deployedUrl(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return undefined;
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname) || url.hostname.endsWith(".local")) return undefined;
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
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

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}
