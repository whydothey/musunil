import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "../packages/config/src/index.ts";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const checkOnly = args.includes("--check");
const inputArg = args.find((arg) => arg !== "--check");
const inputPath = resolve(process.cwd(), inputArg ?? "config/musunil.user-inputs.local.yaml");

if (!existsSync(inputPath)) {
  console.error(`User inputs YAML not found: ${inputPath}`);
  process.exit(1);
}

const validationEnv = {
  ...process.env,
  MUSUNIL_USER_INPUTS_B64: "",
  MUSUNIL_USER_INPUTS_FILE_PATH: inputPath,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://musunil:password@render-managed-postgres:5432/musunil",
  REDIS_URL: process.env.REDIS_URL ?? "redis://default:password@render-managed-redis:6379",
  MUSUNIL_USER_TOKEN_SECRET: process.env.MUSUNIL_USER_TOKEN_SECRET ?? "render_generated_user_token_secret_32_bytes",
  MUSUNIL_ENCRYPTION_KEY: process.env.MUSUNIL_ENCRYPTION_KEY ?? "render_generated_encryption_key_32_bytes",
  MUSUNIL_INTERNAL_API_KEY: process.env.MUSUNIL_INTERNAL_API_KEY ?? "render_generated_internal_api_key"
};
const loaded = loadUserInputs({ cwd: process.cwd(), env: validationEnv });
const issues = validateLaunchConfig(loaded.config, validationEnv);
if (issues.length > 0) {
  console.error(`User inputs validation failed: ${inputPath}`);
  for (const issue of issues) console.error(`- ${issue.path}: ${issue.message}`);
  process.exit(1);
}

if (checkOnly) {
  console.log(`User inputs validation passed: ${inputPath}`);
  process.exit(0);
}

const encoded = readFileSync(inputPath).toString("base64");
console.log(`MUSUNIL_USER_INPUTS_B64=${encoded}`);
