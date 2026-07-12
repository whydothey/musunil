import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const listOnly = args.includes("--list");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const launchEnv = deriveLaunchEnv(process.env);

const steps = [
  {
    id: "public_source_refresh_preflight",
    scope: "live_public_sources",
    args: ["sources:refresh-preflight"]
  },
  {
    id: "post_deploy_smoke",
    scope: "live_web_api",
    args: ["launch:post-deploy-smoke", "--", "--require-laws", "--require-source-refreshes"]
  },
  {
    id: "live_blocker_refresh_strict",
    scope: "live_service_watch",
    args: ["launch:blockers:refresh-strict"]
  }
];
const stepCommands = new Map(steps.map((step) => [step.id, [pnpm, ...step.args].join(" ")]));

if (listOnly) {
  console.log(JSON.stringify({
    checked: "launch_final_gate_plan",
    env: launchEnv.summary,
    steps: steps.map((step) => ({
      id: step.id,
      scope: step.scope,
      command: [pnpm, ...step.args].join(" ")
    }))
  }, null, 2));
  process.exit(0);
}

const results = steps.map(run);
const failed = results.filter((result) => !result.ok);

const summary = {
  checked: "launch_final_gate",
  ok: failed.length === 0,
  env: launchEnv.summary,
  steps: results
};

console[failed.length === 0 ? "log" : "error"](JSON.stringify(summary, null, 2));
if (failed.length > 0) {
  process.exit(failed.find((result) => typeof result.status === "number" && result.status !== 0)?.status ?? 1);
}

function run(step) {
  const result = spawnSync(pnpm, step.args, {
    cwd: process.cwd(),
    env: launchEnv.env,
    stdio: "inherit"
  });

  if (result.error) {
    console.error(`Failed to run ${step.id}: ${result.error.message}`);
    return {
      id: step.id,
      scope: step.scope,
      command: stepCommands.get(step.id),
      ok: false,
      status: 1,
      error: result.error.message
    };
  }
  if (result.signal) {
    console.error(`${step.id} exited via signal ${result.signal}`);
    return {
      id: step.id,
      scope: step.scope,
      command: stepCommands.get(step.id),
      ok: false,
      status: 1,
      signal: result.signal
    };
  }
  return {
    id: step.id,
    scope: step.scope,
    command: stepCommands.get(step.id),
    ok: result.status === 0,
    status: result.status ?? 1
  };
}

function deriveLaunchEnv(baseEnv) {
  const env = { ...baseEnv };
  const defaults = [];
  setDefault(env, defaults, "MUSUNIL_WEB_BASE_URL", "https://musunil.com");
  setDefault(env, defaults, "MUSUNIL_API_BASE_URL", "https://api.musunil.com");
  setDefault(env, defaults, "MUSUNIL_EXPECTED_API_BASE_URL", env.MUSUNIL_API_BASE_URL);
  setDefault(env, defaults, "MUSUNIL_EXPECTED_COMMIT_SHA", env.RENDER_GIT_COMMIT || gitHead());
  return {
    env,
    summary: {
      webBaseUrl: env.MUSUNIL_WEB_BASE_URL,
      apiBaseUrl: env.MUSUNIL_API_BASE_URL,
      expectedApiBaseUrl: env.MUSUNIL_EXPECTED_API_BASE_URL,
      expectedCommitSha: env.MUSUNIL_EXPECTED_COMMIT_SHA || null,
      defaulted: defaults
    }
  };
}

function setDefault(env, defaults, key, value) {
  if (env[key] || !value) return;
  env[key] = value;
  defaults.push(key);
}

function gitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}
