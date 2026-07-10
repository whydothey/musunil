import { resolve } from "node:path";
import { loadUserInputs } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
let config = {};
try {
  config = loadUserInputs({ cwd }).config;
} catch {
  config = {};
}

const apiBaseUrl = process.env.MUSUNIL_API_BASE_URL ?? apiUrlFromHostport(process.env.MUSUNIL_API_HOSTPORT) ?? readConfigString(config, "api.internal_base_url") ?? "http://localhost:4000";
const internalApiKey = process.env.MUSUNIL_INTERNAL_API_KEY ?? readConfigString(config, "security.internal_api_key");
if (!internalApiKey || internalApiKey.startsWith("CHANGE_ME")) {
  throw new Error("Set security.internal_api_key in the user-inputs YAML or MUSUNIL_INTERNAL_API_KEY before privacy purge.");
}

const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/internal/privacy/purge-expired`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-musunil-internal-key": internalApiKey
  },
  body: "{}"
});
const body = await response.json();
if (!response.ok) {
  console.error(JSON.stringify({ status: response.status, body }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));

function apiUrlFromHostport(hostport) {
  return hostport ? `http://${hostport}` : undefined;
}

function readConfigString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
