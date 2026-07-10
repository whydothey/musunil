import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const listOnly = args.includes("--list");
const postLaws = args.includes("--post-laws");
const inputArg = args.find((arg) => !arg.startsWith("--"));
const inputPath = resolve(process.cwd(), inputArg ?? "config/musunil.user-inputs.local.yaml");

const steps = [
  { id: "input_validation", args: ["launch:verify-inputs", "--", inputPath], scope: "actual_input" },
  { id: "config_encode_check", args: ["config:encode", "--", "--check", inputPath], scope: "actual_input" },
  { id: "render_runtime_config_sample", args: ["check:render-runtime-config"], scope: "sample_render_generated_secrets" },
  { id: "external_smoke", args: ["launch:external-smoke", ...(postLaws ? ["--", "--post-laws"] : [])], scope: "actual_input" },
  { id: "release_check", args: ["check:release"], scope: "repo_release_gate" }
];

if (listOnly) {
  console.log(JSON.stringify({ checked: "launch_ready_plan", inputPath, steps: steps.map((step) => ({ id: step.id, scope: step.scope, command: [pnpm, ...step.args].join(" ") })) }, null, 2));
  process.exit(0);
}

if (!existsSync(inputPath)) {
  console.error(`User inputs YAML not found: ${inputPath}`);
  process.exit(1);
}

const env = {
  ...process.env,
  MUSUNIL_USER_INPUTS_B64: "",
  MUSUNIL_USER_INPUTS_FILE_PATH: inputPath,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://musunil:password@render-managed-postgres:5432/musunil",
  REDIS_URL: process.env.REDIS_URL ?? "redis://default:password@render-managed-redis:6379",
  MUSUNIL_USER_TOKEN_SECRET: process.env.MUSUNIL_USER_TOKEN_SECRET ?? "render_generated_user_token_secret_32_bytes",
  MUSUNIL_ENCRYPTION_KEY: process.env.MUSUNIL_ENCRYPTION_KEY ?? "render_generated_encryption_key_32_bytes",
  MUSUNIL_INTERNAL_API_KEY: process.env.MUSUNIL_INTERNAL_API_KEY ?? "render_generated_internal_api_key"
};

for (const step of steps) run(step.args, env);
console.log(JSON.stringify({ checked: "launch_ready", inputPath, postLaws }, null, 2));

function run(args, env) {
  const result = spawnSync(pnpm, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
