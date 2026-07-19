import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const apiCwd = resolve(cwd, "services/api");
const apiPort = await freePort();
const webPort = await freePort();
const api = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "src/server.ts"], {
  cwd: apiCwd,
  env: {
    ...process.env,
    PORT: String(apiPort),
    // The API only accepts these placeholders when MUSUNIL_IDENTITY_TEST_MODE is
    // enabled outside production. They exercise the real identity/session boundary
    // without calling PortOne or exposing a bypass to production.
    MUSUNIL_IDENTITY_TEST_MODE: "true",
    MUSUNIL_PORTONE_STORE_ID: "test-store",
    MUSUNIL_PORTONE_IDENTITY_CHANNEL_KEY: "test-channel",
    MUSUNIL_USER_TOKEN_SECRET: "report-flow-staging-test-secret"
  },
  stdio: "inherit"
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
    "--report-flow"
  ];
  const evidenceDir = process.env.MUSUNIL_REPORT_FLOW_EVIDENCE_DIR;
  if (evidenceDir) args.push("--evidence-dir", evidenceDir);
  process.exitCode = await run(process.execPath, args);
} finally {
  await Promise.all([stop(api), stop(web)]);
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolvePort(address.port));
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
      // The local service is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 120));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function run(command, args) {
  return new Promise((resolveExit, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit(code ?? (signal ? 1 : 0)));
  });
}

function stop(child) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  child.kill("SIGTERM");
  return new Promise((resolveExit) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolveExit(1);
    }, 8_000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolveExit(code ?? 0);
    });
  });
}
