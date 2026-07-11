import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const listOnly = args.includes("--list");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const steps = [
  {
    id: "post_deploy_smoke",
    scope: "live_web_api",
    args: ["launch:post-deploy-smoke", "--", "--require-laws"]
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
  steps: results
};

console[failed.length === 0 ? "log" : "error"](JSON.stringify(summary, null, 2));
if (failed.length > 0) {
  process.exit(failed.find((result) => typeof result.status === "number" && result.status !== 0)?.status ?? 1);
}

function run(step) {
  const result = spawnSync(pnpm, step.args, {
    cwd: process.cwd(),
    env: process.env,
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
