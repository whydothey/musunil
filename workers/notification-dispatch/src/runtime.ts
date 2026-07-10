import { resolve } from "node:path";
import { loadUserInputs } from "../../../packages/config/src/index.ts";

export type NotificationWorkerRuntime = {
  apiBaseUrl: string;
  internalApiKey: string;
};

export function readNotificationWorkerRuntime(
  env: NodeJS.ProcessEnv = process.env,
  cwd = resolve(import.meta.dirname, "../../..")
): NotificationWorkerRuntime {
  let config: Record<string, unknown> = {};
  try {
    config = loadUserInputs({ cwd, env }).config;
  } catch {
    config = {};
  }

  const apiBaseUrl = env.MUSUNIL_API_BASE_URL ?? apiUrlFromHostport(env.MUSUNIL_API_HOSTPORT) ?? readConfigString(config, "api.internal_base_url") ?? "http://localhost:4000";
  const internalApiKey = env.MUSUNIL_INTERNAL_API_KEY ?? readConfigString(config, "security.internal_api_key");
  if (!internalApiKey || internalApiKey.startsWith("CHANGE_ME")) {
    throw new Error("Set security.internal_api_key in the user-inputs YAML or MUSUNIL_INTERNAL_API_KEY before dispatch.");
  }
  return { apiBaseUrl: apiBaseUrl.replace(/\/$/, ""), internalApiKey };
}

function apiUrlFromHostport(hostport: string | undefined): string | undefined {
  return hostport ? `http://${hostport}` : undefined;
}

function readConfigString(config: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
