import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const inputArg = process.argv.slice(2).find((arg) => arg !== "--");
const inputPath = resolve(process.cwd(), inputArg ?? "config/musunil.user-inputs.local.yaml");

if (!existsSync(inputPath)) {
  console.error(`User inputs YAML not found: ${inputPath}`);
  process.exit(1);
}

const originalEnv = { ...process.env };
const localPreviewEnv = { ...originalEnv, MUSUNIL_USER_INPUTS_B64: "", MUSUNIL_USER_INPUTS_FILE_PATH: "" };
const renderManagedEnv = {
  ...originalEnv,
  MUSUNIL_USER_INPUTS_B64: "",
  MUSUNIL_USER_INPUTS_FILE_PATH: inputPath,
  DATABASE_URL: originalEnv.DATABASE_URL ?? "postgres://musunil:password@render-managed-postgres:5432/musunil",
  REDIS_URL: originalEnv.REDIS_URL ?? "redis://default:password@render-managed-redis:6379",
  MUSUNIL_USER_TOKEN_SECRET: originalEnv.MUSUNIL_USER_TOKEN_SECRET ?? "render_generated_user_token_secret_32_bytes",
  MUSUNIL_ENCRYPTION_KEY: originalEnv.MUSUNIL_ENCRYPTION_KEY ?? "render_generated_encryption_key_32_bytes",
  MUSUNIL_INTERNAL_API_KEY: originalEnv.MUSUNIL_INTERNAL_API_KEY ?? "render_generated_internal_api_key"
};

let exitCode = 0;
try {
  run(["build:web-config"], renderManagedEnv);
  run(["launch:check"], renderManagedEnv);
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  try {
    run(["build:web-config"], localPreviewEnv);
  } catch (error) {
    exitCode = 1;
    console.error(error instanceof Error ? error.message : String(error));
  }
}

process.exit(exitCode);

function run(args, env) {
  const result = spawnSync(pnpm, args, { env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${pnpm} ${args.join(" ")} failed with ${result.status}`);
}
