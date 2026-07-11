import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadUserInputs } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
const config = safeConfig();
const webBaseUrl = deployedUrl(process.env.MUSUNIL_WEB_BASE_URL ?? positionalArg() ?? readString(config, "app.public_base_url"));
const expectedCommitSha = process.env.MUSUNIL_EXPECTED_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || gitHead();
const expectedApiBaseUrl = deployedUrl(
  process.env.MUSUNIL_EXPECTED_API_BASE_URL ?? process.env.MUSUNIL_API_BASE_URL ?? readString(config, "api.public_base_url")
);
const checks = [];
const warnings = [];
let staticManifestVerified = false;
const renderStaticHint =
  "Expected Render Static Site settings: Branch=main, Root Directory blank, " +
  "Build Command=\"corepack enable && pnpm install --frozen-lockfile && MUSUNIL_WEB_API_BASE_URL=https://api.musunil.com MUSUNIL_WRITE_BUILD_INFO=1 pnpm build:web-static && MUSUNIL_WEB_API_BASE_URL=https://api.musunil.com pnpm check:web-smoke\", " +
  "Publish Directory=apps/web, headers copied from render.yaml musunil-web. " +
  "If static-manifest and live file hashes match but build-info is placeholder, the latest committed static files are deployed but Render did not publish build metadata.";
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

if (!webBaseUrl) {
  console.error("Set MUSUNIL_WEB_BASE_URL or app.public_base_url to the deployed HTTPS web URL.");
  process.exit(1);
}

await check("web_static_manifest", async () => {
  const response = await raw(`${webBaseUrl}/static-manifest.json`);
  assert(response.status === 200, `/static-manifest.json returned ${response.status}`);
  const localManifest = JSON.parse(readFileSync(resolve(cwd, "apps/web/static-manifest.json"), "utf8"));
  assert(response.body?.schemaVersion === localManifest.schemaVersion, "deployed static manifest schemaVersion does not match local manifest");
  assert(JSON.stringify(response.body?.files) === JSON.stringify(localManifest.files), "deployed static manifest does not match local manifest");
  const detail = await assertAllLiveManifestFiles(response.body);
  staticManifestVerified = true;
  return detail;
});

await check("web_build_info", async () => {
  const response = await raw(`${webBaseUrl}/build-info.json`);
  assert(response.status === 200, `/build-info.json returned ${response.status}`);
  assert(typeof response.body?.commitSha === "string" && response.body.commitSha.length >= 7, "build-info commitSha missing");
  assert(typeof response.body?.builtAt === "string" && response.body.builtAt.includes("T"), "build-info builtAt missing");
  const placeholderBuildInfo = response.body.commitSha === "generated-at-build" || response.body.source === "placeholder";
  if (placeholderBuildInfo) {
    assert(
      staticManifestVerified,
      `build-info placeholder was deployed and static manifest could not prove freshness. body=${shortJson(response.body)}. ${renderStaticHint}`
    );
    warn(
      "web_build_info_placeholder",
      `build-info is placeholder, but static-manifest and live file hashes match local output. ${renderStaticHint}`
    );
  }
  checkWebHeaders(response.headers, "/build-info.json");
  if (expectedCommitSha && !placeholderBuildInfo) {
    assert(response.body.commitSha === expectedCommitSha, `deployed web commit ${response.body.commitSha} does not match expected ${expectedCommitSha}`);
  }
});

await check("web_html_current", async () => {
  const response = await text(`${webBaseUrl}/`);
  assert(response.status === 200, `/ returned ${response.status}`);
  checkWebHeaders(response.headers, "/");
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
  checkWebHeaders(response.headers, "/config.js");
  assert(response.body.includes("MUSUNIL_WEB_CONFIG"), "config.js missing MUSUNIL_WEB_CONFIG");
  assert(response.body.includes("apiBaseUrl"), "config.js missing apiBaseUrl");
  assert(!response.body.includes("localhost:4000"), "config.js still points to localhost API");
  assert(!/internal|secret|jwt|postgres|redis|database|MUSUNIL_USER_INPUTS/i.test(response.body), "config.js leaked internal config pattern");
  const deployedConfig = parseWebConfig(response.body);
  assert(deployedUrl(deployedConfig.apiBaseUrl), `config.js apiBaseUrl must be deployed HTTPS, got ${deployedConfig.apiBaseUrl || "(missing)"}`);
  if (expectedApiBaseUrl) {
    assert(
      deployedConfig.apiBaseUrl === expectedApiBaseUrl,
      `config.js apiBaseUrl ${deployedConfig.apiBaseUrl} does not match expected ${expectedApiBaseUrl}`
    );
  }
  return { apiBaseUrl: deployedConfig.apiBaseUrl, expectedApiBaseUrl: expectedApiBaseUrl ?? null };
});

console.log(JSON.stringify({ checked: "web_deploy_version", webBaseUrl, expectedCommitSha, expectedApiBaseUrl, checks, warnings }, null, 2));

async function raw(url) {
  const response = await fetch(withCacheBuster(url), {
    headers: noCacheHeaders(),
    redirect: "manual",
    signal: AbortSignal.timeout(10_000)
  });
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body };
}

async function assertLiveFileHash(urlPath, manifestPath, manifest) {
  const response = await fetch(withCacheBuster(`${webBaseUrl}${urlPath}`), {
    headers: noCacheHeaders(),
    redirect: "manual",
    signal: AbortSignal.timeout(10_000)
  });
  assert(response.status === 200, `${urlPath} returned ${response.status}`);
  const expected = manifest.files?.[manifestPath];
  assert(expected?.sha256, `manifest missing ${manifestPath}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.byteLength === expected.bytes, `${urlPath} byte length mismatch`);
  assert(createHash("sha256").update(bytes).digest("hex") === expected.sha256, `${urlPath} hash mismatch`);
  return bytes;
}

async function assertAllLiveManifestFiles(manifest) {
  const entries = Object.entries(manifest.files ?? {});
  assert(entries.length > 0, "manifest has no files");
  let bytes = 0;
  let headersFileVerified = false;
  for (const [manifestPath, expected] of entries) {
    assert(typeof expected?.bytes === "number", `manifest missing byte size for ${manifestPath}`);
    const body = await assertLiveFileHash(staticUrlPath(manifestPath), manifestPath, manifest);
    bytes += expected.bytes;
    if (manifestPath === "_headers") {
      assertStaticHeadersFile(body);
      headersFileVerified = true;
    }
  }
  assert(headersFileVerified, "manifest must include and verify _headers");
  return { files: entries.length, bytes, headersFile: "verified" };
}

function assertStaticHeadersFile(bytes) {
  const source = bytes.toString("utf8");
  for (const token of ["Cache-Control", "Content-Security-Policy", "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options"]) {
    assert(source.includes(token), `_headers missing ${token}`);
  }
}

function staticUrlPath(manifestPath) {
  if (manifestPath === "index.html") return "/";
  return `/${manifestPath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
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
  const detail = await run();
  checks.push(detail === undefined ? { id, ok: true } : { id, ok: true, detail });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkWebHeaders(headers, path) {
  const failures = [];
  for (const rule of webHeaderContract) {
    const value = String(headers[rule.id] || "");
    if (!rule.ok(value)) failures.push(`${rule.label} expected ${rule.expected}, got ${value || "missing"}`);
  }
  if (failures.length === 0) return;
  const message = `${path} has invalid Web headers: ${failures.join("; ")}. ${renderStaticHint}`;
  if (process.env.MUSUNIL_STRICT_WEB_HEADERS === "1") {
    assert(false, message);
  }
  warn("web_headers_not_strict", message);
}

function warn(id, message) {
  if (!warnings.some((item) => item.id === id && item.message === message)) warnings.push({ id, message });
}

function shortJson(value) {
  return JSON.stringify(value).slice(0, 500);
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

function parseWebConfig(source) {
  const match = source.match(/window\.MUSUNIL_WEB_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*$/);
  assert(match, "config.js could not be parsed");
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`config.js contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
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
