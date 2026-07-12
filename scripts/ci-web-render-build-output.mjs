import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const webRoot = resolve(cwd, "apps/web");
const failures = [];
const renderBuildDetected = Boolean(
  readEnv("RENDER") ||
    readEnv("RENDER_SERVICE_ID") ||
    readEnv("RENDER_SERVICE_NAME") ||
    readEnv("RENDER_SERVICE_TYPE") ||
    readEnv("RENDER_GIT_COMMIT") ||
    readEnv("RENDER_EXTERNAL_URL")
);
const buildInfoWriteRequested = readEnv("MUSUNIL_WRITE_BUILD_INFO") === "1" || renderBuildDetected;
const expectedApiBaseUrl = deployedUrl(readEnv("MUSUNIL_EXPECTED_API_BASE_URL") || readEnv("MUSUNIL_WEB_API_BASE_URL") || "https://api.musunil.com");
const expectedCommitSha = readEnv("RENDER_GIT_COMMIT") || gitValue("rev-parse", "HEAD");

if (!buildInfoWriteRequested) {
  failures.push("Render build output check requires MUSUNIL_WRITE_BUILD_INFO=1 or Render build env detection");
}

const webConfig = parseWindowJson("config.js", "MUSUNIL_WEB_CONFIG");
const buildInfoJson = parseJsonFile("build-info.json");
const buildInfoJs = parseWindowJson("build-info.js", "MUSUNIL_BUILD_INFO");
const headersSource = readText("apps/web/_headers");
const manifest = parseJsonFile("static-manifest.json");

if (JSON.stringify(buildInfoJson) !== JSON.stringify(buildInfoJs)) {
  failures.push("build-info.js and build-info.json must contain the same build metadata");
}
if (JSON.stringify(Object.keys(webConfig).sort()) !== JSON.stringify(["apiBaseUrl", "mapStyleUrl"])) {
  failures.push(`config.js public keys changed: ${Object.keys(webConfig).sort().join(", ") || "(none)"}`);
}
if (webConfig.apiBaseUrl !== expectedApiBaseUrl) {
  failures.push(`config.js apiBaseUrl must be ${expectedApiBaseUrl}, got ${webConfig.apiBaseUrl || "(missing)"}`);
}
if (!deployedUrl(webConfig.mapStyleUrl)) {
  failures.push(`config.js mapStyleUrl must be a deployed HTTPS URL, got ${webConfig.mapStyleUrl || "(missing)"}`);
}
if (buildInfoJson.commitSha === "generated-at-build" || buildInfoJson.source === "placeholder") {
  failures.push("Render build output must not publish tracked build-info placeholders");
}
if (expectedCommitSha && buildInfoJson.commitSha !== expectedCommitSha) {
  failures.push(`build-info commitSha must match ${expectedCommitSha}, got ${buildInfoJson.commitSha || "(missing)"}`);
}
if (typeof buildInfoJson.builtAt !== "string" || Number.isNaN(Date.parse(buildInfoJson.builtAt)) || buildInfoJson.builtAt === "1970-01-01T00:00:00.000Z") {
  failures.push("build-info builtAt must be a real build timestamp");
}
if (buildInfoJson.staticMode !== true) {
  failures.push("build-info staticMode must be true for Render Static Site builds");
}
if (renderBuildDetected && buildInfoJson.source !== "render") {
  failures.push(`Render build-info source must be render, got ${buildInfoJson.source || "(missing)"}`);
}
for (const token of ["Cache-Control", "Content-Security-Policy", "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options"]) {
  if (!headersSource.includes(token)) failures.push(`_headers missing ${token}`);
}
for (const file of ["index.html", "config.js", "_headers", "media/redacted/preview-occ-live-1-poster.png", "media/redacted/preview-occ-live-1.webm"]) {
  if (!manifest.files?.[file]?.sha256) failures.push(`static-manifest.json missing ${file}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      checked: "web_render_build_output",
      apiBaseUrl: webConfig.apiBaseUrl,
      commitSha: buildInfoJson.commitSha,
      source: buildInfoJson.source,
      staticMode: buildInfoJson.staticMode
    },
    null,
    2
  )
);

function parseJsonFile(path) {
  try {
    return JSON.parse(readText(`apps/web/${path}`));
  } catch (error) {
    failures.push(`${path} contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

function parseWindowJson(path, name) {
  const source = readText(`apps/web/${path}`);
  const match = source.match(new RegExp(`window\\.${name}\\s*=\\s*({[\\s\\S]*?})\\s*;?\\s*$`));
  if (!match) {
    failures.push(`${path} is missing window.${name} assignment`);
    return {};
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    failures.push(`${path} contains invalid ${name} JSON: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

function readText(path) {
  try {
    return readFileSync(resolve(cwd, path), "utf8");
  } catch (error) {
    failures.push(`${path} could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

function readEnv(key) {
  const value = process.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

function gitValue(...args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || undefined;
  } catch {
    return undefined;
  }
}
