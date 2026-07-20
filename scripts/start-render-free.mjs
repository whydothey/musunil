import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const checkOnly = process.argv.includes("--check");
const schedulerIntervalMs = 5 * 60 * 1_000;

if (checkOnly) {
  console.log(JSON.stringify({
    checked: "render_free_runtime",
    migrateBeforeApi: true,
    schedulerIntervalSeconds: schedulerIntervalMs / 1_000,
    schedulerRunsAfterWake: true,
    generatedInternalKeyIsNotLogged: true
  }, null, 2));
  process.exit(0);
}

const port = process.env.PORT || "10000";
const runtimeEnv = {
  ...process.env,
  MUSUNIL_INTERNAL_API_KEY: process.env.MUSUNIL_INTERNAL_API_KEY || randomBytes(32).toString("hex"),
  MUSUNIL_API_BASE_URL: process.env.MUSUNIL_API_BASE_URL || `http://127.0.0.1:${port}`
};

let apiProcess;
let schedulerProcess;
let schedulerTimer;
let stopping = false;

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, () => stop(signal));
}

const nodeArgs = ["--disable-warning=ExperimentalWarning", "--experimental-strip-types"];
const migrationCode = await run(process.execPath, [...nodeArgs, "services/api/src/migrate.ts"], runtimeEnv);
if (migrationCode !== 0) process.exit(migrationCode);

apiProcess = spawn(process.execPath, [...nodeArgs, "services/api/src/server.ts"], { env: runtimeEnv, stdio: "inherit" });
apiProcess.once("error", (error) => {
  console.error(JSON.stringify({ status: "api_spawn_failed", message: error.message }));
  process.exitCode = 1;
});
apiProcess.once("exit", (code, signal) => {
  if (!stopping) console.error(JSON.stringify({ status: "api_exited", code, signal }));
  clearTimeout(schedulerTimer);
  schedulerProcess?.kill("SIGTERM");
  process.exit(code ?? (signal ? 1 : 0));
});

await waitForHealth(runtimeEnv.MUSUNIL_API_BASE_URL);
void runSchedulerLoop();

async function runSchedulerLoop() {
  if (stopping) return;
  schedulerProcess = spawn(process.execPath, [...nodeArgs, "services/api/src/ops-scheduler.ts"], { env: runtimeEnv, stdio: "inherit" });
  const exitCode = await new Promise((resolve) => {
    schedulerProcess.once("error", () => resolve(1));
    schedulerProcess.once("exit", (code) => resolve(code ?? 1));
  });
  schedulerProcess = undefined;
  if (exitCode !== 0) console.error(JSON.stringify({ status: "ops_scheduler_failed", exitCode }));
  if (!stopping) schedulerTimer = setTimeout(() => void runSchedulerLoop(), schedulerIntervalMs);
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 60_000;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The API is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("API did not become healthy before the free runtime scheduler started.");
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

function stop(signal) {
  stopping = true;
  clearTimeout(schedulerTimer);
  schedulerProcess?.kill(signal);
  apiProcess?.kill(signal);
}
