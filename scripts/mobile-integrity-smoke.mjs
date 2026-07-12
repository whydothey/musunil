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
  assertNoSecretLeak(output, config);
  const proof = parseStructuredProof(output);
  assertProofMatchesConfig(proof, config);
  console.log(JSON.stringify({
    checked: "mobile_integrity_provider_dry_run",
    source,
    path,
    provider: proof.provider,
    packageName: proof.packageName || null,
    bundleId: proof.bundleId || null,
    verdict: proof.verdict
  }, null, 2));
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

function parseStructuredProof(output) {
  if (!output.includes("mobile_integrity_provider_dry_run")) {
    throw new Error("mobile integrity smoke output must include mobile_integrity_provider_dry_run.");
  }
  const jsonCandidates = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"));
  for (const candidate of jsonCandidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.checked === "mobile_integrity_provider_dry_run") return parsed;
    } catch {
      // Keep scanning provider logs for a final structured proof line.
    }
  }
  throw new Error("mobile integrity smoke output must include structured proof JSON, not only the marker string.");
}

function assertProofMatchesConfig(proof, config) {
  const provider = typeof proof.provider === "string" ? proof.provider : "";
  const verdict = typeof proof.verdict === "string" ? proof.verdict : "";
  if (!["play_integrity", "app_attest"].includes(provider)) {
    throw new Error("mobile integrity proof provider must be play_integrity or app_attest.");
  }
  if (!["ok", "pass", "verified", "success"].includes(verdict)) {
    throw new Error("mobile integrity proof verdict must be ok, pass, verified, or success.");
  }

  const androidEnabled = config.mobile?.android_play_integrity_enabled === true;
  const iosEnabled = config.mobile?.ios_app_attest_enabled === true;
  if (androidEnabled) {
    const expectedPackage = readString(config, "mobile.android_package_name");
    if (provider !== "play_integrity") throw new Error("mobile integrity proof must use play_integrity for Android launch config.");
    if (!expectedPackage || proof.packageName !== expectedPackage) {
      throw new Error("mobile integrity proof packageName must match mobile.android_package_name.");
    }
  }
  if (iosEnabled) {
    const expectedBundle = readString(config, "mobile.ios_bundle_id");
    const expectedTeam = readString(config, "mobile.ios_team_id");
    if (provider !== "app_attest") throw new Error("mobile integrity proof must use app_attest for iOS launch config.");
    if (!expectedBundle || proof.bundleId !== expectedBundle) {
      throw new Error("mobile integrity proof bundleId must match mobile.ios_bundle_id.");
    }
    if (!expectedTeam || proof.teamId !== expectedTeam) {
      throw new Error("mobile integrity proof teamId must match mobile.ios_team_id.");
    }
  }
}

function assertNoSecretLeak(output, config) {
  const serviceAccount = readString(config, "mobile.android_play_integrity_service_account_json_b64");
  if (serviceAccount && output.includes(serviceAccount)) {
    throw new Error("mobile integrity smoke output must not print the service account secret.");
  }
  if (/BEGIN PRIVATE KEY|\"private_key\"|\\n-----BEGIN PRIVATE KEY-----/.test(output)) {
    throw new Error("mobile integrity smoke output must not print private key material.");
  }
}

function readString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
