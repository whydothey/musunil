import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const preservedFiles = [
  "apps/web/config.js",
  "apps/web/build-info.js",
  "apps/web/build-info.json",
  "apps/web/_headers",
  "apps/web/static-manifest.json"
];
const preserved = new Map();

for (const file of preservedFiles) {
  preserved.set(file, readFileSync(resolve(cwd, file)));
}

const result = spawnSync(pnpmCommand(), ["build:web-static:render"], {
  cwd,
  env: {
    ...process.env,
    MUSUNIL_WEB_API_BASE_URL: "https://api.musunil.com",
    MUSUNIL_EXPECTED_API_BASE_URL: "https://api.musunil.com"
  },
  stdio: "inherit"
});

const restoreFailures = [];
for (const [file, bytes] of preserved.entries()) {
  try {
    writeFileSync(resolve(cwd, file), bytes);
  } catch (error) {
    restoreFailures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (restoreFailures.length > 0) {
  console.error("Failed to restore tracked Web static files after Render build command check:");
  console.error(restoreFailures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
if (result.error) {
  console.error(`Failed to run Render Web build command: ${result.error.message}`);
  process.exit(1);
}
if (result.signal) {
  console.error(`Render Web build command exited via signal ${result.signal}`);
  process.exit(1);
}
if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

console.log(JSON.stringify({ checked: "web_render_build_command", restoredFiles: preservedFiles }, null, 2));

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}
