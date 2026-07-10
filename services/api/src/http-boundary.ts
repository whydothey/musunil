import { ApiError } from "./app.ts";

const maxJsonBodyBytes = 256 * 1024;
const maxLiveUploadJsonBodyBytes = 6 * 1024 * 1024;
const publicWriteLimit = { max: 30, windowMs: 60_000 };
const publicWriteBuckets = new Map<string, { count: number; resetAt: number }>();

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
  req: {
    method?: string;
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  },
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
