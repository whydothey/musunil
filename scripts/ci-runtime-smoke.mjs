import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const internalApiKey = "ci_internal_key_32_bytes_minimum";
const port = await freePort();
const env = {
  ...process.env,
  MUSUNIL_API_BASE_URL: `http://localhost:${port}`,
  MUSUNIL_INTERNAL_API_KEY: internalApiKey,
  MUSUNIL_USER_TOKEN_SECRET: "ci_user_token_secret_32_bytes_minimum",
  PORT: String(port)
};

const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "src/server.ts"], {
  cwd: resolve(cwd, "services/api"),
  env,
  stdio: "inherit"
});

let exitCode = 0;
try {
  await waitForHealth(port);
  await run(["scripts/runtime-smoke.mjs", "--boundary-checks"], env);
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  server.kill("SIGTERM");
  const code = await waitForExit(server);
  if (code !== 0) exitCode = 1;
}

process.exit(exitCode);

function freePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, () => {
      const address = probe.address();
      probe.close(() => resolvePort(typeof address === "object" && address ? address.port : 0));
    });
  });
}

async function waitForHealth(port) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`API exited before health check with ${server.exitCode}`);
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    }
  }
  throw new Error("API did not become healthy in time");
}

function run(args, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", ...args], {
      cwd,
      env,
      stdio: "inherit"
    });
    child.once("exit", (code) => (code === 0 ? resolveRun() : reject(new Error(`${args.join(" ")} failed with ${code}`))));
  });
}

function waitForExit(child) {
  return new Promise((resolveExit) => {
    if (child.exitCode !== null) {
      resolveExit(child.exitCode);
      return;
    }
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolveExit(1);
    }, 5_000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolveExit(code ?? 0);
    });
  });
}
