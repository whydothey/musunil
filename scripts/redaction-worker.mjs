import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadUserInputs } from "../packages/config/src/index.ts";
import { decryptLiveMediaBytes } from "../services/api/src/app.ts";
import { createLiveMediaStorage } from "../services/api/src/live-media-storage.ts";

const cwd = resolve(import.meta.dirname, "..");
const { config } = loadUserInputs({ cwd });
const storage = createLiveMediaStorage(config);
const apiBaseUrl = (process.env.MUSUNIL_API_BASE_URL ?? apiUrlFromHostport(process.env.MUSUNIL_API_HOSTPORT) ?? readString(config, "api.internal_base_url") ?? "http://localhost:4000").replace(/\/$/, "");
const internalApiKey = process.env.MUSUNIL_INTERNAL_API_KEY ?? readString(config, "security.internal_api_key");
const encryptionKey = readString(config, "security.media_encryption_key");
const redactionCommand = readString(config, "redaction.engine_smoke_command");

if (!storage?.get) throw new Error("Readable private media storage is required for redaction.");
if (!internalApiKey || internalApiKey.startsWith("CHANGE_ME")) throw new Error("MUSUNIL_INTERNAL_API_KEY is required for redaction.");
if (!redactionCommand?.includes("{input}") || !redactionCommand.includes("{output}")) throw new Error("A redaction command with {input} and {output} is required.");

const queue = await apiRequest("GET", "/internal/redaction-queue?limit=1");
const jobs = Array.isArray(queue.jobs) ? queue.jobs : [];
if (jobs.length === 0) {
  console.log(JSON.stringify({ checked: "redaction_worker", processed: 0, status: "idle" }, null, 2));
  process.exit(0);
}

let processed = 0;
for (const rawJob of jobs) {
  const job = redactionJob(rawJob);
  await processJob(job);
  processed += 1;
}
console.log(JSON.stringify({ checked: "redaction_worker", processed, status: "review_required" }, null, 2));

async function processJob(job) {
  const dir = await mkdtemp(join(tmpdir(), "musunil-redaction-worker-"));
  const inputPath = join(dir, `input${inputExtension(job.mediaMimeType)}`);
  const outputPath = join(dir, "clip.webm");
  const posterPath = join(dir, "poster.webp");
  const clipStorageKey = `public/redacted/${job.evidenceId}/clip.webm`;
  const posterStorageKey = `public/redacted/${job.evidenceId}/poster.webp`;
  let uploaded = false;
  let recorded = false;
  try {
    const stored = await storage.get(job.storageKey);
    if (stored.length > 6 * 1024 * 1024) throw new Error("Encrypted media object exceeds the redaction worker limit.");
    if (job.encrypted && !encryptionKey) throw new Error("security.media_encryption_key is required for encrypted live media.");
    const original = job.encrypted ? decryptLiveMediaBytes(stored, encryptionKey) : stored;
    if (mediaHash(original) !== job.expectedHash) throw new Error("Original media hash verification failed.");
    await writeFile(inputPath, original, { mode: 0o600 });
    await runTemplate(redactionCommand.replaceAll("{input}", shellQuote(inputPath)).replaceAll("{output}", shellQuote(outputPath)), 120_000);
    await run("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error", "-i", outputPath,
      "-frames:v", "1", "-vf", "scale=w='min(960,iw)':h=-2:force_original_aspect_ratio=decrease",
      "-map_metadata", "-1", "-an", "-c:v", "libwebp", "-q:v", "72", posterPath
    ], 30_000);
    const clip = await readFile(outputPath);
    const poster = await readFile(posterPath);
    if (clip.length === 0 || poster.length === 0) throw new Error("Redaction worker produced an empty public asset.");
    await storage.put({ storageKey: clipStorageKey, mediaMimeType: "video/webm", bytes: clip });
    await storage.put({ storageKey: posterStorageKey, mediaMimeType: "image/webp", bytes: poster });
    uploaded = true;
    const proofHash = `sha256-${createHash("sha256").update(clip).update(poster).digest("base64url")}`;
    await apiRequest("PATCH", `/internal/evidence/${encodeURIComponent(job.evidenceId)}/redaction`, {
      redactedClipUrl: `/media/redacted/${job.evidenceId}/clip.webm`,
      redactedPosterUrl: `/media/redacted/${job.evidenceId}/poster.webp`,
      redactionProofHash: proofHash
    });
    recorded = true;
  } finally {
    if (uploaded && !recorded) {
      await Promise.allSettled([storage.delete?.(clipStorageKey), storage.delete?.(posterStorageKey)]);
    }
    await rm(dir, { recursive: true, force: true });
  }
}

function redactionJob(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid redaction queue job.");
  const evidenceId = requiredString(value.evidenceId, "evidenceId");
  const storageKey = requiredString(value.storageKey, "storageKey");
  const mediaMimeType = requiredString(value.mediaMimeType, "mediaMimeType");
  const expectedHash = requiredString(value.expectedHash, "expectedHash");
  if (!/^[-A-Za-z0-9_]+$/.test(evidenceId)) throw new Error("Invalid redaction evidence id.");
  if (!storageKey.startsWith("private/live/") || storageKey.includes("..") || storageKey.includes("//")) throw new Error("Invalid private media storage key.");
  if (!mediaMimeType.startsWith("video/")) throw new Error("Invalid redaction media type.");
  if (!/^sha256-[A-Za-z0-9_-]{32,}$/.test(expectedHash)) throw new Error("Invalid original media hash.");
  return { evidenceId, storageKey, mediaMimeType, expectedHash, encrypted: value.encrypted === true };
}

async function apiRequest(method, path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      "x-musunil-internal-key": internalApiKey,
      ...(body === undefined ? {} : { "content-type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Redaction API request failed with ${response.status}.`);
  return payload;
}

function runTemplate(commandLine, timeoutMs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(commandLine, { cwd, shell: true, stdio: ["ignore", "ignore", "pipe"] });
    settleChild(child, timeoutMs, "Redaction command", resolveRun, reject);
  });
}

function run(command, args, timeoutMs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "ignore", "pipe"] });
    settleChild(child, timeoutMs, command, resolveRun, reject);
  });
}

function settleChild(child, timeoutMs, label, resolveRun, reject) {
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    if (stderr.length < 4_000) stderr += chunk.toString();
  });
  const timeout = setTimeout(() => {
    child.kill("SIGTERM");
    reject(new Error(`${label} timed out.`));
  }, timeoutMs);
  child.once("error", (error) => {
    clearTimeout(timeout);
    reject(error);
  });
  child.once("exit", (code, signal) => {
    clearTimeout(timeout);
    if (code === 0 && !signal) resolveRun();
    else reject(new Error(`${label} failed (${signal || code}).${stderr.trim() ? ` ${stderr.trim()}` : ""}`));
  });
}

function mediaHash(bytes) {
  return `sha256-${createHash("sha256").update(bytes).digest("base64url")}`;
}

function inputExtension(mediaMimeType) {
  return mediaMimeType.includes("mp4") ? ".mp4" : ".webm";
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function apiUrlFromHostport(hostport) {
  return hostport ? `http://${hostport}` : undefined;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Missing ${label} in redaction queue job.`);
  return value;
}

function readString(object, configPath) {
  const value = configPath.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, object);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
