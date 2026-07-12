import { createHash, createHmac } from "node:crypto";
import type { LiveMediaStorage } from "./app.ts";

export function createLiveMediaStorage(config: Record<string, unknown>): LiveMediaStorage | undefined {
  const provider = readString(config, "storage.provider");
  if (!provider || provider === "mock" || provider === "disabled") return undefined;
  const bucket = readString(config, "storage.bucket");
  const region = readString(config, "storage.region");
  const accessKeyId = readString(config, "storage.access_key_id");
  const secretAccessKey = readString(config, "storage.secret_access_key");
  if (!bucket || !region || !accessKeyId || !secretAccessKey) return undefined;
  const endpoint = readString(config, "storage.endpoint") ?? `https://s3.${region}.amazonaws.com`;
  return {
    put: async ({ storageKey, mediaMimeType, bytes }) => {
      const url = storageUrl(endpoint, bucket, storageKey);
      const payloadHash = createHash("sha256").update(bytes).digest("hex");
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
      const shortDate = amzDate.slice(0, 8);
      const headers = signedS3Headers({ method: "PUT", accessKeyId, secretAccessKey, region, url, amzDate, shortDate, payloadHash, contentType: mediaMimeType });
      const response = await fetch(url, { method: "PUT", headers, body: new Blob([new Uint8Array(bytes)]) });
      if (!response.ok) throw new Error(`storage put failed: ${response.status}`);
    },
    delete: async (storageKey) => {
      const url = storageUrl(endpoint, bucket, storageKey);
      const payloadHash = createHash("sha256").update("").digest("hex");
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
      const shortDate = amzDate.slice(0, 8);
      const headers = signedS3Headers({ method: "DELETE", accessKeyId, secretAccessKey, region, url, amzDate, shortDate, payloadHash, contentType: "application/octet-stream" });
      const response = await fetch(url, { method: "DELETE", headers });
      if (!response.ok && response.status !== 404) throw new Error(`storage delete failed: ${response.status}`);
    }
  };
}

export function storageSmokeKey(): string {
  return `${storageSmokePrefix()}${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
}

export function storageSmokePrefix(): string {
  return "private/live/smoke/";
}

function storageUrl(endpoint: string, bucket: string, storageKey: string): URL {
  const base = new URL(endpoint.endsWith("/") ? endpoint : `${endpoint}/`);
  return new URL(`${encodePathPart(bucket)}/${storageKey.split("/").map(encodePathPart).join("/")}`, base);
}

function signedS3Headers(input: {
  method: "PUT" | "DELETE";
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  url: URL;
  amzDate: string;
  shortDate: string;
  payloadHash: string;
  contentType: string;
}): Record<string, string> {
  const service = "s3";
  const canonicalQuery = [...input.url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodePathPart(key)}=${encodePathPart(value)}`)
    .join("&");
  const canonicalHeaders =
    `content-type:${input.contentType}\n` +
    `host:${input.url.host}\n` +
    `x-amz-content-sha256:${input.payloadHash}\n` +
    `x-amz-date:${input.amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [input.method, input.url.pathname, canonicalQuery, canonicalHeaders, signedHeaders, input.payloadHash].join("\n");
  const credentialScope = `${input.shortDate}/${input.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", input.amzDate, credentialScope, createHash("sha256").update(canonicalRequest).digest("hex")].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, input.shortDate), input.region), service), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "content-type": input.contentType,
    "x-amz-content-sha256": input.payloadHash,
    "x-amz-date": input.amzDate
  };
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function encodePathPart(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function readString(config: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
