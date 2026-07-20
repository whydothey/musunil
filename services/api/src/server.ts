import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ApiError, canServePublicRedactedMedia, createApp, createSeedStore, stripPreviewData } from "./app.ts";
import { createPublicWriteRateLimiter, readJsonBody } from "./http-boundary.ts";
import { createLiveMediaStorage } from "./live-media-storage.ts";
import { loadPostgresStore, pingOpsSchedulerSchema, pingPostgres, savePostgresStore } from "./postgres-store.ts";
import { loadUserInputs, validateLaunchConfig } from "../../../packages/config/src/index.ts";

const apiDir = dirname(fileURLToPath(import.meta.url));
const publicRedactedMediaRoot = resolve(apiDir, "../../../apps/web/media/redacted");
const publicRedactedMediaPrefix = "/media/redacted/";

const runtime = loadRuntime();
const publicWriteRateLimiter = await createPublicWriteRateLimiter(runtime.redisUrl, runtime.userTokenSecret || runtime.internalApiKey);
const runtimeReadiness = async () => {
  const report = await runtime.readiness();
  if (!runtime.redisUrl) return report;
  const redis = await publicWriteRateLimiter.readiness();
  const checks = [...report.checks.filter((check) => check.id !== "redis"), redis];
  return {
    ...report,
    ready: checks.every((check) => check.ok),
    checks
  };
};
const seedStore = createSeedStore({ includeMockData: runtime.includeMockData });
const loadedStore = runtime.databaseUrl ? await loadPostgresStore(runtime.databaseUrl, seedStore, runtime.encryptionKey) : seedStore;
const initialStore = runtime.includeMockData ? loadedStore : stripPreviewData(loadedStore);
const app = createApp(initialStore, {
  readiness: runtimeReadiness,
  internalApiKey: runtime.internalApiKey,
  userTokenSecret: runtime.userTokenSecret,
  identity: runtime.identity,
  autoPublishLiveReports: runtime.autoPublishLiveReports,
  liveMediaStorage: runtime.liveMediaStorage,
  liveMediaEncryptionKey: runtime.liveMediaEncryptionKey,
  requireExternalLiveStorage: runtime.requireExternalLiveStorage,
  requireReadyForWrites: runtime.requireReadyForWrites,
  allowAnonymousSession: runtime.allowAnonymousSession,
  retention: runtime.retention
});
const port = Number(process.env.PORT ?? 4000);
let shuttingDown = false;
let storeIoQueue = Promise.resolve();
let nextStoreRefreshAt = Date.now() + 30_000;

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      send(req, res, 204, undefined);
      return;
    }
    await refreshStoreFromPostgresIfDue();
    if (await sendPublicRedactedMedia(req, res)) return;
    await publicWriteRateLimiter.enforce(req);
    const body = await readJsonBody(req);
    const response = await app.handle({
      method: req.method ?? "GET",
      path: req.url ?? "/",
      headers: normalizeHeaders(req.headers),
      body
    });
    if (runtime.databaseUrl && req.method !== "GET" && response.status < 400) await persistStore();
    send(req, res, response.status, response.body, response.headers);
  } catch (error) {
    if (error instanceof ApiError) {
      send(req, res, error.status, { error: error.code });
      return;
    }
    send(req, res, 500, { error: "internal_error" });
  }
}).listen(port, () => {
  console.log(`musunil api listening on http://localhost:${port}`);
});

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  const timeout = setTimeout(() => process.exit(1), 8_000);
  timeout.unref();

  try {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await publicWriteRateLimiter.close();
    await storeIoQueue.catch(() => undefined);
    if (runtime.databaseUrl) await persistStore();
    console.log(`musunil api shutdown after ${signal}`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

function persistStore(): Promise<void> {
  const databaseUrl = runtime.databaseUrl;
  if (!databaseUrl) return Promise.resolve();
  nextStoreRefreshAt = Date.now() + 30_000;
  storeIoQueue = storeIoQueue.catch(() => undefined).then(() => savePostgresStore(databaseUrl, app.store, runtime.encryptionKey));
  return storeIoQueue;
}

async function refreshStoreFromPostgresIfDue(): Promise<void> {
  const databaseUrl = runtime.databaseUrl;
  if (!databaseUrl || Date.now() < nextStoreRefreshAt) return;
  nextStoreRefreshAt = Date.now() + 30_000;
  storeIoQueue = storeIoQueue.catch(() => undefined).then(async () => {
    const refreshed = await loadPostgresStore(databaseUrl, app.store, runtime.encryptionKey);
    Object.assign(app.store, runtime.includeMockData ? refreshed : stripPreviewData(refreshed));
  });
  try {
    await storeIoQueue;
  } catch (error) {
    nextStoreRefreshAt = Date.now() + 5_000;
    console.error("postgres store refresh failed", error instanceof Error ? error.message : String(error));
  }
}

async function sendPublicRedactedMedia(
  req: { method?: string; url?: string; headers?: Record<string, string | string[] | undefined> },
  res: { writeHead: Function; end: Function }
): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith(publicRedactedMediaPrefix)) return false;
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(req, res, 404, { error: "not_found" });
    return true;
  }

  const filePath = publicRedactedMediaPath(url.pathname);
  if (!filePath) {
    send(req, res, 403, { error: "forbidden" });
    return true;
  }
  if (!canServePublicRedactedMedia(app.store, url.pathname)) {
    send(req, res, 404, { error: "not_found" });
    return true;
  }

  try {
    const body = await readFile(filePath);
    const headers = publicMediaHeaders(req, publicMediaContentType(filePath));
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    const storageKey = publicRedactedStorageKey(filePath);
    if (!storageKey || !runtime.liveMediaStorage?.get) {
      send(req, res, 404, { error: "not_found" });
      return true;
    }
    try {
      const body = await runtime.liveMediaStorage.get(storageKey);
      const headers = publicMediaHeaders(req, publicMediaContentType(filePath));
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      send(req, res, 404, { error: "not_found" });
    }
  }
  return true;
}

function publicRedactedMediaPath(pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (!decoded.startsWith(publicRedactedMediaPrefix)) return undefined;
  if (decoded.includes("\\") || decoded.includes("//") || decoded.toLowerCase().includes("/private/")) return undefined;

  const relativePath = decoded.slice(publicRedactedMediaPrefix.length);
  const segments = relativePath.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return undefined;

  const allowedExtensions = new Set([".jpeg", ".jpg", ".mp4", ".png", ".webm", ".webp"]);
  if (!allowedExtensions.has(extname(relativePath).toLowerCase())) return undefined;

  const filePath = resolve(publicRedactedMediaRoot, relativePath);
  return filePath.startsWith(`${publicRedactedMediaRoot}${sep}`) ? filePath : undefined;
}

function publicMediaContentType(path: string): string {
  return (
    {
      ".jpeg": "image/jpeg",
      ".jpg": "image/jpeg",
      ".mp4": "video/mp4",
      ".png": "image/png",
      ".webm": "video/webm",
      ".webp": "image/webp"
    }[extname(path).toLowerCase()] ?? "application/octet-stream"
  );
}

function publicRedactedStorageKey(filePath: string): string | undefined {
  if (!filePath.startsWith(`${publicRedactedMediaRoot}${sep}`)) return undefined;
  const relativePath = filePath.slice(publicRedactedMediaRoot.length + 1).split(sep).join("/");
  if (!relativePath || relativePath.includes("..") || relativePath.includes("//")) return undefined;
  return `public/redacted/${relativePath}`;
}

function publicMediaHeaders(req: { headers?: Record<string, string | string[] | undefined> }, type: string): Record<string, string> {
  const origin = typeof req.headers?.origin === "string" ? req.headers.origin : undefined;
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": type,
    "referrer-policy": "no-referrer",
    "vary": "Origin",
    "x-content-type-options": "nosniff"
  };
  if (!origin) {
    headers["access-control-allow-origin"] = runtime.allowedOrigins[0] ?? "*";
  } else if (runtime.allowedOrigins.includes(origin) || (runtime.allowLocalDevOrigins && isLocalhostOrigin(origin))) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
  }
  return headers;
}

function loadRuntime() {
  try {
    const loaded = loadUserInputs({
      allowTemplate: process.env.MUSUNIL_ALLOW_TEMPLATE_CONFIG === "true"
    });
    const issues = validateLaunchConfig(loaded.config);
    const allowedOrigins = readStringArray(loaded.config, "web.allowed_origins", ["http://localhost:4173", "http://localhost:4174", "http://localhost:3000"]);
    const internalApiKey = process.env.MUSUNIL_INTERNAL_API_KEY || readString(loaded.config, "security.internal_api_key");
    const userTokenSecret = process.env.MUSUNIL_USER_TOKEN_SECRET || readString(loaded.config, "security.jwt_secret") || internalApiKey;
    const encryptionKey = process.env.MUSUNIL_ENCRYPTION_KEY || readString(loaded.config, "security.encryption_key");
    const databaseUrl = readString(loaded.config, "postgres.database_url") || process.env.DATABASE_URL;
    const redisUrl = readString(loaded.config, "redis.url") || process.env.REDIS_URL;
    const liveMediaStorage = createLiveMediaStorage(loaded.config);
    const liveMediaEncryptionKey = readString(loaded.config, "security.media_encryption_key");
    const production = readString(loaded.config, "render.environment") === "production";
    const identityTestModeRequested = process.env.MUSUNIL_IDENTITY_TEST_MODE === "true";
    const identity = {
      provider: "portone" as const,
      storeId: process.env.MUSUNIL_PORTONE_STORE_ID || readString(loaded.config, "identity.portone_store_id"),
      identityChannelKey: process.env.MUSUNIL_PORTONE_IDENTITY_CHANNEL_KEY || readString(loaded.config, "identity.portone_identity_channel_key"),
      apiSecret: process.env.MUSUNIL_PORTONE_API_SECRET || readString(loaded.config, "identity.portone_api_secret"),
      apiBaseUrl: process.env.MUSUNIL_PORTONE_API_BASE_URL || readString(loaded.config, "identity.portone_api_base_url"),
      sessionCookieDomain: readString(loaded.config, "identity.session_cookie_domain"),
      testMode: identityTestModeRequested && !production
    };
    const retention = {
      rawClaimStatementDays: readNumber(loaded.config, "retention.raw_claim_statement_days", 30),
      unverifiedOriginalMediaDays: readNumber(loaded.config, "retention.unverified_original_media_days", 30),
      verifiedOriginalMediaDays: readNumber(loaded.config, "retention.verified_original_media_days", 180),
      preciseLocationDays: readNumber(loaded.config, "retention.precise_location_days", 30),
      auditLogDays: readNumber(loaded.config, "retention.audit_log_days", 3650)
    };
    return {
      allowedOrigins,
      allowLocalDevOrigins: process.env.MUSUNIL_RUNTIME_ENV !== "production",
      internalApiKey,
      userTokenSecret,
      identity,
      encryptionKey,
      databaseUrl,
      redisUrl,
      liveMediaStorage,
      liveMediaEncryptionKey,
      requireExternalLiveStorage: production,
      requireReadyForWrites: production,
      allowAnonymousSession: !production,
      retention,
      autoPublishLiveReports: readBoolean(loaded.config, "moderation.auto_publish_low_risk_live_reports", false),
      includeMockData: readBoolean(loaded.config, "preview.use_mock_data", !production),
      readiness: async () => {
        const checks = [
          { id: "config_source", ok: loaded.source !== "template_file", message: `config source: ${loaded.source}` },
          ...issues.map((issue) => ({ id: issue.path, ok: false, message: issue.message })),
          ...(production && identityTestModeRequested ? [{ id: "identity.test_mode", ok: false, message: "MUSUNIL_IDENTITY_TEST_MODE is not allowed in production." }] : [])
        ];
        if (databaseUrl) checks.push(...await postgresReadyChecks(databaseUrl));
        return { ready: checks.every((check) => check.ok), checks };
      }
    };
  } catch (error) {
    const productionRuntime = process.env.MUSUNIL_RUNTIME_ENV === "production";
    return {
      allowedOrigins: ["http://localhost:4173", "http://localhost:4174", "http://localhost:3000"],
      allowLocalDevOrigins: !productionRuntime,
      internalApiKey: process.env.MUSUNIL_INTERNAL_API_KEY,
      userTokenSecret: process.env.MUSUNIL_USER_TOKEN_SECRET || process.env.MUSUNIL_INTERNAL_API_KEY,
      identity: {
        provider: "portone" as const,
        storeId: process.env.MUSUNIL_PORTONE_STORE_ID,
        identityChannelKey: process.env.MUSUNIL_PORTONE_IDENTITY_CHANNEL_KEY,
        apiSecret: process.env.MUSUNIL_PORTONE_API_SECRET,
        apiBaseUrl: process.env.MUSUNIL_PORTONE_API_BASE_URL,
        sessionCookieDomain: ".musunil.com",
        testMode: process.env.MUSUNIL_IDENTITY_TEST_MODE === "true" && !productionRuntime
      },
      encryptionKey: process.env.MUSUNIL_ENCRYPTION_KEY,
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      liveMediaStorage: undefined,
      liveMediaEncryptionKey: undefined,
      requireExternalLiveStorage: productionRuntime,
      requireReadyForWrites: productionRuntime,
      allowAnonymousSession: !productionRuntime,
      autoPublishLiveReports: false,
      includeMockData: !productionRuntime,
      retention: {
        rawClaimStatementDays: 30,
        unverifiedOriginalMediaDays: 30,
        verifiedOriginalMediaDays: 180,
        preciseLocationDays: 30,
        auditLogDays: 3650
      },
      readiness: () => ({
        ready: false,
        checks: [{ id: "config", ok: false, message: error instanceof Error ? error.message : "config load failed" }]
      })
    };
  }
}

async function postgresReadyChecks(databaseUrl: string): Promise<Array<{ id: string; ok: boolean; message: string }>> {
  try {
    await pingPostgres(databaseUrl);
  } catch {
    return [
      { id: "postgres", ok: false, message: "postgres unreachable" },
      { id: "ops_scheduler_schema", ok: false, message: "ops scheduler schema unavailable" }
    ];
  }
  try {
    await pingOpsSchedulerSchema(databaseUrl);
    return [
      { id: "postgres", ok: true, message: "postgres reachable" },
      { id: "ops_scheduler_schema", ok: true, message: "ops scheduler task rows ready" }
    ];
  } catch {
    return [
      { id: "postgres", ok: true, message: "postgres reachable" },
      { id: "ops_scheduler_schema", ok: false, message: "ops scheduler migration incomplete" }
    ];
  }
}

function send(
  req: { headers?: Record<string, string | string[] | undefined> },
  res: { writeHead: Function; end: Function },
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): void {
  const origin = typeof req.headers?.origin === "string" ? req.headers.origin : undefined;
  const headers: Record<string, string> = {
    "access-control-allow-headers": "content-type, x-musunil-user-id, x-musunil-user-token, x-musunil-internal-key",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "vary": "Origin",
    "x-content-type-options": "nosniff"
  };
  if (!origin) {
    headers["access-control-allow-origin"] = runtime.allowedOrigins[0] ?? "*";
  } else if (runtime.allowedOrigins.includes(origin) || (runtime.allowLocalDevOrigins && isLocalhostOrigin(origin))) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-credentials"] = "true";
  }
  Object.assign(headers, extraHeaders);
  res.writeHead(status, headers);
  res.end(body === undefined ? "" : JSON.stringify(body));
}

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

function normalizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(",") : value])
  );
}

function readString(config: Record<string, unknown>, path: string): string | undefined {
  const value = readPath(config, path);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStringArray(config: Record<string, unknown>, path: string, fallback: string[]): string[] {
  const value = readPath(config, path);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

function readNumber(config: Record<string, unknown>, path: string, fallback: number): number {
  const value = readPath(config, path);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(config: Record<string, unknown>, path: string, fallback: boolean): boolean {
  const value = readPath(config, path);
  return typeof value === "boolean" ? value : fallback;
}

function readPath(config: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, config);
}
