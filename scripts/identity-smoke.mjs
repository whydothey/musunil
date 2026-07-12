import { resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
const { config, source, path } = loadUserInputs({ cwd });
const issues = validateLaunchConfig(config).filter((issue) => issue.path.startsWith("identity."));
if (issues.length) {
  for (const issue of issues) console.error(`${issue.path}: ${issue.message}`);
  process.exit(1);
}

const provider = readString(config, "identity.provider");
const apiSecret = readString(config, "identity.portone_api_secret") || process.env.MUSUNIL_PORTONE_API_SECRET;
const apiBaseUrl = readString(config, "identity.portone_api_base_url") || "https://api.portone.io";
const identityVerificationId = process.env.MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID;

if (provider !== "portone") {
  console.error("identity.provider must be portone.");
  process.exit(1);
}
if (!apiSecret) {
  console.error("identity.portone_api_secret or MUSUNIL_PORTONE_API_SECRET is required.");
  process.exit(1);
}
if (!identityVerificationId) {
  console.error("MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID is required. Run a real PortOne identity verification once and pass the completed verification id through this environment variable.");
  process.exit(1);
}

try {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
    headers: {
      authorization: `PortOne ${apiSecret}`,
      "user-agent": "MusunilIdentitySmoke/0.1"
    },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`PortOne identity lookup failed with ${response.status}.`);
  const body = await response.json();
  const status = String(readNested(body, ["identityVerification.status", "status", "verification.status"]) ?? "");
  if (!["VERIFIED", "verified", "SUCCESS", "success"].includes(status)) {
    throw new Error("PortOne identity lookup did not return a verified status.");
  }
  const ci = readNestedString(body, [
    "identityVerification.verifiedCustomer.ci",
    "identityVerification.customer.ci",
    "verifiedCustomer.ci",
    "customer.ci",
    "ci"
  ]);
  const di = readNestedString(body, [
    "identityVerification.verifiedCustomer.di",
    "identityVerification.customer.di",
    "verifiedCustomer.di",
    "customer.di",
    "di"
  ]);
  if (!ci && !di) throw new Error("PortOne identity lookup did not include CI or DI.");
  console.log(JSON.stringify({
    checked: "identity_portone_verified_lookup",
    source,
    path,
    provider: "portone",
    apiBaseHost: new URL(apiBaseUrl).host,
    verifiedStatus: "verified",
    subjectFieldsPresent: {
      ci: Boolean(ci),
      di: Boolean(di)
    }
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function readString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readNestedString(value, paths) {
  const found = readNested(value, paths);
  return typeof found === "string" && found.trim().length > 0 ? found.trim() : undefined;
}

function readNested(value, paths) {
  for (const path of paths) {
    let current = value;
    for (const key of path.split(".")) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = current[key];
    }
    if (current !== undefined && current !== null) return current;
  }
  return undefined;
}
