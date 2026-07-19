import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadUserInputs } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
const staticMode = process.argv.includes("--static");
const renderBuildDetected = Boolean(
  readEnv("RENDER") ||
  readEnv("RENDER_SERVICE_ID") ||
  readEnv("RENDER_SERVICE_NAME") ||
  readEnv("RENDER_SERVICE_TYPE") ||
  readEnv("RENDER_GIT_COMMIT") ||
  readEnv("RENDER_EXTERNAL_URL")
);
const writeBuildInfo = process.argv.includes("--write-build-info") || readEnv("MUSUNIL_WRITE_BUILD_INFO") === "1" || renderBuildDetected;
let config = {};
try {
  config = loadUserInputs({ cwd }).config;
} catch {
  config = {};
}

const webConfig = {
  apiBaseUrl: publicUrl(process.env.MUSUNIL_WEB_API_BASE_URL) ?? readString(config, "api.public_base_url") ?? (staticMode ? "https://api.musunil.com" : "http://localhost:4000"),
  mapStyleUrl: publicUrl(process.env.MUSUNIL_WEB_MAP_STYLE_URL) ?? readString(config, "map.map_style_url") ?? "https://tiles.openfreemap.org/styles/positron"
};
const buildInfo = {
  commitSha: readEnv("RENDER_GIT_COMMIT") ?? gitValue("rev-parse", "HEAD") ?? "unknown",
  branch: readEnv("RENDER_GIT_BRANCH") ?? gitValue("rev-parse", "--abbrev-ref", "HEAD") ?? "unknown",
  builtAt: new Date().toISOString(),
  staticMode,
  source: renderBuildDetected ? "render" : "local"
};

const publicDir = resolve(cwd, "apps/web/public");

writeFileSync(
  resolve(publicDir, "config.js"),
  `window.MUSUNIL_WEB_CONFIG = ${JSON.stringify(webConfig, null, 2)};\n`
);
if (writeBuildInfo) {
  writeFileSync(
    resolve(publicDir, "build-info.js"),
    `window.MUSUNIL_BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)};\n`
  );
  writeFileSync(resolve(publicDir, "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`);
}

function readString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function publicUrl(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return undefined;
    if (parsed.username || parsed.password) return undefined;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function readEnv(key) {
  const value = process.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function gitValue(...args) {
  try {
    const value = execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}
