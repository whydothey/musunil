import { createHmac } from "node:crypto";
import { createClient } from "redis";
import { ApiError } from "./app.ts";

const maxJsonBodyBytes = 256 * 1024;
const maxLiveUploadJsonBodyBytes = 6 * 1024 * 1024;
const publicWriteLimit = { max: 30, windowMs: 60_000 };
const publicWriteBuckets = new Map<string, { count: number; resetAt: number }>();
const distributedRateLimitScript = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export type PublicWriteRateLimiter = {
  enforce: (req: RateLimitedRequest) => Promise<void>;
  readiness: () => Promise<{ id: string; ok: boolean; message: string }>;
  close: () => Promise<void>;
};

type RateLimitedRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

export async function createPublicWriteRateLimiter(redisUrl?: string, keySecret?: string): Promise<PublicWriteRateLimiter> {
  if (!redisUrl) {
    return {
      enforce: async (req) => enforcePublicWriteRateLimit(req),
      readiness: async () => ({ id: "redis", ok: false, message: "redis not configured" }),
      close: async () => undefined
    };
  }
  if (!keySecret) throw new Error("A secret is required to pseudonymize distributed rate-limit keys.");

  const client = createClient({
    url: redisUrl,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 1_500,
      reconnectStrategy: (retries) => Math.min(100 * 2 ** retries, 1_000)
    }
  });
  client.on("error", () => undefined);
  let connectTimer: NodeJS.Timeout | undefined;
  const connectTimeout = new Promise<never>((_, reject) => {
    connectTimer = setTimeout(() => reject(new Error("Redis connection timed out.")), 5_000);
    connectTimer.unref();
  });
  try {
    await Promise.race([client.connect(), connectTimeout]);
  } catch (error) {
    client.destroy();
    throw error;
  } finally {
    clearTimeout(connectTimer);
  }

  return {
    enforce: async (req) => {
      const path = new URL(req.url ?? "/", "http://localhost").pathname;
      if (!isPublicWrite(req.method, path)) return;
      const key = publicWriteRateLimitKey(clientIp(req), keySecret);
      try {
        const count = Number(await client.eval(distributedRateLimitScript, {
          keys: [key],
          arguments: [String(publicWriteLimit.windowMs)]
        }));
        if (!Number.isFinite(count)) throw new Error("invalid Redis rate-limit response");
        if (count > publicWriteLimit.max) throw new ApiError(429, "rate_limited");
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(503, "rate_limiter_unavailable");
      }
    },
    readiness: async () => {
      try {
        return await client.ping() === "PONG"
          ? { id: "redis", ok: true, message: "redis authenticated and reachable" }
          : { id: "redis", ok: false, message: "redis ping failed" };
      } catch {
        return { id: "redis", ok: false, message: "redis unreachable" };
      }
    },
    close: async () => {
      if (client.isOpen) client.destroy();
    }
  };
}

export function publicWriteRateLimitKey(ip: string, secret: string): string {
  return `musunil:write-limit:${createHmac("sha256", secret).update(ip).digest("hex")}`;
}

export async function readJsonBody(req: {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  on: Function;
  destroy?: Function;
}): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;

  const path = new URL(String(req.headers?.[":path"] ?? (req as { url?: string }).url ?? "/"), "http://localhost").pathname;
  const maxBodyBytes = path === "/uploads/live" ? maxLiveUploadJsonBodyBytes : maxJsonBodyBytes;
  const declaredLength = Number(req.headers?.["content-length"] ?? 0);
  if (declaredLength > maxBodyBytes) throw new ApiError(413, "body_too_large");

  let total = 0;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBodyBytes) {
        req.destroy?.();
        reject(new ApiError(413, "body_too_large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", resolve);
    req.on("error", reject);
  });
  if (chunks.length === 0) return undefined;

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "invalid_json");
  }
}

export function enforcePublicWriteRateLimit(
  req: RateLimitedRequest,
  buckets = publicWriteBuckets,
  now = Date.now()
): void {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  if (!isPublicWrite(req.method, path)) return;

  const key = clientIp(req);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + publicWriteLimit.windowMs });
    return;
  }
  if (bucket.count >= publicWriteLimit.max) throw new ApiError(429, "rate_limited");
  bucket.count += 1;

  // ponytail: tiny in-memory limiter for one Node process; use Redis buckets when horizontal scale matters.
  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  }
}

function isPublicWrite(method: string | undefined, path: string): boolean {
  if (method === "POST") {
    return [
      "/session/anonymous",
      "/auth/identity/start",
      "/auth/identity/complete",
      "/auth/logout",
      "/uploads/live",
      "/reports/live",
      "/reports/material",
      "/corrections/on-site",
      "/reports/rights-violation",
      "/rebuttals",
      "/subscriptions"
    ].includes(path) || (path.startsWith("/claims/") && path.endsWith("/field-verifications"));
  }
  return method === "PATCH" && path.startsWith("/subscriptions/");
}

function clientIp(req: {
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}
