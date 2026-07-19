import { resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "../packages/config/src/index.ts";
import { assertStorageSmokeKey, createLiveMediaStorage, storageSmokeKey } from "../services/api/src/live-media-storage.ts";

const cwd = resolve(import.meta.dirname, "..");
const { config, source, path } = loadUserInputs({ cwd });
const issues = validateLaunchConfig(config).filter((issue) => issue.path.startsWith("storage.") || issue.path === "security.media_encryption_key");
if (issues.length) {
  for (const issue of issues) console.error(`${issue.path}: ${issue.message}`);
  process.exit(1);
}

const storage = createLiveMediaStorage(config);
if (!storage) {
  console.error("storage.provider, bucket, region, access_key_id, and secret_access_key are required.");
  process.exit(1);
}

const storageKey = process.env.MUSUNIL_STORAGE_SMOKE_KEY || storageSmokeKey();
try {
  assertStorageSmokeKey(storageKey);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
try {
  const expected = Buffer.from(`musunil storage smoke ${new Date().toISOString()}\n`);
  await storage.put({
    storageKey,
    mediaMimeType: "text/plain; charset=utf-8",
    bytes: expected
  });
  if (!storage.get) throw new Error("storage get is unavailable.");
  const actual = await storage.get(storageKey);
  if (!actual.equals(expected)) throw new Error("storage read-back did not match uploaded bytes.");
  await storage.delete?.(storageKey);
  console.log(JSON.stringify({ checked: "storage_put_get_delete", readBackVerified: true, source, path }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
