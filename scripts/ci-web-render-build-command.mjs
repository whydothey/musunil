import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { acquireWebStaticFileLock } from "./web-static-file-lock.mjs";

const cwd = resolve(import.meta.dirname, "..");
const preservedFiles = [
  "apps/web/public/config.js",
  "apps/web/public/build-info.js",
  "apps/web/public/build-info.json",
  "apps/web/public/_headers",
  "apps/web/static-manifest.json"
];
const releaseLock = acquireWebStaticFileLock("ci-web-render-build-command");
let exitCode = 0;

try {
  const preserved = new Map();

  for (const file of preservedFiles) {
    preserved.set(file, readFileSync(resolve(cwd, file)));
  }

  const packageManager = pnpmCommand();
  const result = spawnSync(packageManager.command, [...packageManager.args, "build:web-static:render"], {
    cwd,
    env: {
      ...process.env,
      MUSUNIL_WEB_API_BASE_URL: "https://api.musunil.com",
      MUSUNIL_EXPECTED_API_BASE_URL: "https://api.musunil.com",
      RENDER: "true",
      RENDER_GIT_COMMIT: gitValue("rev-parse", "HEAD") || "",
      RENDER_GIT_BRANCH: gitValue("rev-parse", "--abbrev-ref", "HEAD") || "main"
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
    exitCode = 1;
  } else if (result.error) {
    console.error(`Failed to run Render Web build command: ${result.error.message}`);
    exitCode = 1;
  } else if (result.signal) {
    console.error(`Render Web build command exited via signal ${result.signal}`);
    exitCode = 1;
  } else if (typeof result.status === "number" && result.status !== 0) {
    exitCode = result.status;
  } else {
    console.log(JSON.stringify({ checked: "web_render_build_command", restoredFiles: preservedFiles }, null, 2));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  releaseLock();
}

process.exit(exitCode);

function pnpmCommand() {
  return { command: process.platform === "win32" ? "corepack.cmd" : "corepack", args: ["pnpm"] };
}

function gitValue(...args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || undefined;
  } catch {
    return undefined;
  }
}
