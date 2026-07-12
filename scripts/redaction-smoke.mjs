import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
const { config, source, path } = loadUserInputs({ cwd });
const issues = validateLaunchConfig(config).filter((issue) => issue.path === "redaction.engine_smoke_command");
if (issues.length) {
  for (const issue of issues) console.error(`${issue.path}: ${issue.message}`);
  process.exit(1);
}

const command = readString(config, "redaction.engine_smoke_command");
if (!command) {
  console.error("redaction.engine_smoke_command is required.");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "musunil-redaction-"));
const input = join(dir, "input.txt");
const output = join(dir, "output.txt");
const sensitiveSamples = ["sample face", "12가3456"];
writeFileSync(input, `musunil redaction smoke\n${sensitiveSamples[0]}\nsample plate ${sensitiveSamples[1]}\n`);

try {
  await run(command.replaceAll("{input}", shellQuote(input)).replaceAll("{output}", shellQuote(output)));
  const size = statSync(output).size;
  if (size <= 0) throw new Error("redaction smoke output is empty.");
  const outputBytes = readFileSync(output);
  assertSampleRedacted(outputBytes);
  const redactionProofHash = `sha256-${createHash("sha256").update(outputBytes).digest("base64url")}`;
  console.log(JSON.stringify({ checked: "redaction_engine_smoke", source, path, outputBytes: size, redactionProofHash }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

function run(commandLine) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(commandLine, { cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("redaction smoke command timed out."));
    }, 30_000);
    child.stdout.on("data", () => undefined);
    child.stderr.on("data", () => undefined);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolveRun();
      else reject(new Error(`redaction smoke command failed with ${code}.`));
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function assertSampleRedacted(outputBytes) {
  const outputText = outputBytes.toString("utf8");
  for (const sample of sensitiveSamples) {
    if (outputText.includes(sample)) {
      throw new Error("redaction smoke output still contains an unredacted sensitive sample token.");
    }
  }
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function readString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
