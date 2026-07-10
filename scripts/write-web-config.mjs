import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadUserInputs } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
let config = {};
try {
  config = loadUserInputs({ cwd }).config;
} catch {
  config = {};
}

const webConfig = {
  apiBaseUrl: readString(config, "api.public_base_url") ?? "http://localhost:4000",
  mapStyleUrl: readString(config, "map.map_style_url") ?? "https://tiles.openfreemap.org/styles/positron"
};

writeFileSync(
  resolve(cwd, "apps/web/config.js"),
  `window.MUSUNIL_WEB_CONFIG = ${JSON.stringify(webConfig, null, 2)};\n`
);

function readString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
