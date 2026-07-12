import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const node = process.execPath;

const steps = [
  {
    id: "refresh_live_blockers_once",
    command: [node, "scripts/launch-next-actions.mjs", "--", "--refresh"]
  },
  {
    id: "write_operator_brief_from_current_report",
    command: [node, "scripts/launch-operator-brief.mjs"]
  },
  {
    id: "write_missing_inputs_from_current_report",
    command: [node, "scripts/launch-missing-inputs.mjs"]
  }
];

const results = [];

console.log("# Launch Handoff");
console.log("");
console.log("Refreshing live blockers once, then writing operator-facing docs from the same blocker report.");

for (const step of steps) {
  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd,
    env: process.env,
    stdio: "inherit"
  });
  const status = result.status ?? (result.error || result.signal ? 1 : 0);
  results.push({
    id: step.id,
    command: step.command.join(" "),
    ok: status === 0,
    status,
    signal: result.signal || "",
    error: result.error?.message || ""
  });
  if (status !== 0) break;
}

const failed = results.filter((item) => !item.ok);
console.log("");
console.log(JSON.stringify({
  checked: "launch_handoff",
  ok: failed.length === 0,
  outputs: [
    "docs/splus-service-watch.md",
    "docs/launch-operator-brief.md",
    "docs/launch-missing-inputs.md"
  ],
  steps: results
}, null, 2));

if (failed.length > 0) process.exit(failed[0].status || 1);
