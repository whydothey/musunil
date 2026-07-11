import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const webRoot = resolve(cwd, "apps/web");
const manifestPath = resolve(webRoot, "static-manifest.json");
const files = [
  "index.html",
  "config.js",
  "_headers",
  "media/redacted/preview-occ-live-1-poster.png",
  "media/redacted/preview-occ-live-1.webm"
];
const manifest = {
  schemaVersion: 1,
  generatedBy: "scripts/write-web-static-manifest.mjs",
  files: Object.fromEntries(files.map((file) => [file, digest(file)]))
};
const output = `${JSON.stringify(manifest, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(manifestPath, "utf8");
  if (current !== output) {
    console.error("apps/web/static-manifest.json is stale. Run pnpm build:web-manifest.");
    process.exit(1);
  }
} else {
  writeFileSync(manifestPath, output);
}

function digest(file) {
  const bytes = readFileSync(resolve(webRoot, file));
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.byteLength
  };
}
