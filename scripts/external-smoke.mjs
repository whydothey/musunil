import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const postLaws = process.argv.includes("--post-laws");
const listOnly = process.argv.includes("--list");

const steps = [
  { id: "storage", args: ["storage:smoke"], requireRealOutput: "storage_put_delete" },
  { id: "redaction", args: ["redaction:smoke"], requireRealOutput: "redaction_engine_smoke" },
  { id: "mobile_integrity", args: ["mobile:integrity-smoke"], requireRealOutput: "mobile_integrity_provider_dry_run" },
  {
    id: postLaws ? "laws_post" : "laws_dry_run",
    args: postLaws ? ["--filter", "@musunil/public-source-ingest", "dev", "--", "--laws", "--post"] : ["sources:laws"],
    requireRealOutput: postLaws ? "laws_post" : "laws_dry_run",
    forbidOutput: "laws_disabled"
  }
];

if (listOnly) {
  console.log(JSON.stringify({ checked: "external_smoke_plan", steps: steps.map(({ id, args }) => ({ id, command: [pnpm, ...args].join(" ") })) }, null, 2));
  process.exit(0);
}

for (const step of steps) {
  const result = spawnSync(pnpm, step.args, { encoding: "utf8" });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) fail(step.id, `${pnpm} ${step.args.join(" ")} failed with ${result.status}`);
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (step.forbidOutput && output.includes(step.forbidOutput)) fail(step.id, `${step.forbidOutput} is not S+ evidence`);
  if (!output.includes(step.requireRealOutput)) fail(step.id, `missing expected proof marker: ${step.requireRealOutput}`);
}

console.log(JSON.stringify({ checked: "external_smoke", postLaws, steps: steps.map((step) => step.id) }, null, 2));

function fail(step, message) {
  console.error(JSON.stringify({ error: "external_smoke_failed", step, message }, null, 2));
  process.exit(1);
}
