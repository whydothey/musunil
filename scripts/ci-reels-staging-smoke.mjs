import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const apiPort = await freePort();
const webPort = await freePort();
const api = spawn("corepack", ["pnpm", "--filter", "@musunil/api", "dev"], {
  cwd,
  env: { ...process.env, PORT: String(apiPort) },
  stdio: ["ignore", "pipe", "pipe"]
});
const web = spawn(process.execPath, ["scripts/serve-web.mjs"], {
  cwd,
  env: { ...process.env, PORT: String(webPort) },
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  await waitForHttp(`http://localhost:${apiPort}/health`);
  await waitForHttp(`http://localhost:${webPort}/`);
  const args = [
    "scripts/ci-visual-surface-smoke.mjs",
    "--base-url",
    `http://localhost:${webPort}/?api=http://localhost:${apiPort}`,
    "--require-reels"
  ];
  const evidenceDir = process.env.MUSUNIL_REELS_STAGING_EVIDENCE_DIR;
  if (evidenceDir) args.push("--evidence-dir", evidenceDir);
  const result = await run(process.execPath, args);
  process.exitCode = result;
} finally {
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  await Promise.all([waitForExit(api), waitForExit(web)]);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForHttp(url, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

function waitForExit(child) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve) => child.once("exit", (code) => resolve(code ?? 0)));
}
