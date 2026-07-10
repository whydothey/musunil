import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
const { config, source, path } = loadUserInputs({ cwd });
const issues = validateLaunchConfig(config).filter((issue) => issue.path.startsWith("mobile."));
if (issues.length) {
  for (const issue of issues) console.error(`${issue.path}: ${issue.message}`);
  process.exit(1);
}

const command = readString(config, "mobile.integrity_smoke_command");
if (!command) {
  console.error("mobile.integrity_smoke_command is required.");
  process.exit(1);
}

try {
  const output = await run(command);
  if (!output.includes("mobile_integrity_provider_dry_run")) {
    throw new Error("mobile integrity smoke output must include mobile_integrity_provider_dry_run.");
  }
  console.log(JSON.stringify({ checked: "mobile_integrity_provider_dry_run", source, path }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function run(commandLine) {
  return new Promise((resolveRun, reject) => {
    let output = "";
    const child = spawn(commandLine, { cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("mobile integrity smoke command timed out."));
    }, 30_000);
    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      output += data.toString();
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolveRun(output);
      else reject(new Error(`mobile integrity smoke command failed with ${code}.`));
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function readString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
