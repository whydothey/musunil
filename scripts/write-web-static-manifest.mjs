import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const webRoot = resolve(cwd, "apps/web");
const manifestPath = resolve(webRoot, "static-manifest.json");
const files = staticFiles(webRoot);
const buildVariantFiles = [
  "build-info.js",
  "build-info.json",
  "media/redacted/preview-busan-live-poster.png",
  "media/redacted/preview-daejeon-live-poster.png",
  "media/redacted/preview-occ-live-1-poster.png",
  "media/redacted/preview-presence-1-poster.png"
];
const manifest = {
  schemaVersion: 3,
  generatedBy: "scripts/write-web-static-manifest.mjs",
  buildVariantFiles,
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

function staticFiles(root) {
  const output = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === ".DS_Store") continue;
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const file = relative(root, absolute).split(sep).join("/");
      if (file === "static-manifest.json") continue;
      if (!statSync(absolute).isFile()) continue;
      output.push(file);
    }
  };
  visit(root);
  return output.sort((left, right) => left.localeCompare(right));
}
