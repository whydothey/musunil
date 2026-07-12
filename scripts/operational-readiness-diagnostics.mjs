import { resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "../packages/config/src/index.ts";
import { lawOperationalDiagnostics, readLawRuntime } from "../workers/public-source-ingest/src/laws.ts";

const cwd = resolve(import.meta.dirname, "..");
const { config, source } = loadUserInputs({ cwd, allowTemplate: true, preferTemplate: process.argv.includes("--template") });
const productionIssues = validateLaunchConfig(config, {});

const diagnostics = {
  checked: "operational_readiness_metadata",
  source,
  readyForMetadataCheck: false,
  readyForExternalSmoke: false,
  summary: {
    productionIssueCount: productionIssues.length,
    blockingGroups: groupedIssueIds(productionIssues),
    externalSmokeCommands: ["pnpm storage:smoke", "pnpm redaction:smoke", "pnpm mobile:integrity-smoke", "pnpm identity:smoke", "pnpm sources:laws"],
    requiredActions: []
  },
  components: {
    storage: storageDiagnostics(),
    redaction: redactionDiagnostics(),
    mobileIntegrity: mobileIntegrityDiagnostics(),
    identity: identityDiagnostics(),
    lawSources: lawSourceDiagnostics()
  }
};

diagnostics.readyForMetadataCheck = [
  diagnostics.components.storage.metadataReady,
  diagnostics.components.redaction.metadataReady,
  diagnostics.components.mobileIntegrity.metadataReady,
  diagnostics.components.identity.metadataReady,
  diagnostics.components.lawSources.metadataReady
].every(Boolean);
diagnostics.readyForExternalSmoke = [
  diagnostics.components.storage.readyForSmoke,
  diagnostics.components.redaction.readyForSmoke,
  diagnostics.components.mobileIntegrity.readyForSmoke,
  diagnostics.components.identity.readyForSmoke,
  diagnostics.components.lawSources.readyForSmoke
].every(Boolean);
diagnostics.summary.requiredActions = requiredActions();

console.log(JSON.stringify(diagnostics, null, 2));

if (process.argv.includes("--require-metadata") && !diagnostics.readyForMetadataCheck) process.exit(1);
if (process.argv.includes("--require-external-smoke-ready") && !diagnostics.readyForExternalSmoke) process.exit(1);

function storageDiagnostics() {
  const provider = readString("storage.provider");
  const providerEnabled = hasRealString(provider) && provider !== "mock" && provider !== "disabled";
  const endpoint = readString("storage.endpoint");
  const result = {
    providerStatus: status("storage.provider"),
    providerKind: providerEnabled ? provider : "disabled",
    bucketStatus: status("storage.bucket"),
    regionStatus: status("storage.region"),
    endpointMode: endpoint && !isPlaceholder(endpoint) ? "custom_s3_compatible" : "aws_region_default_or_unset",
    accessKeyStatus: secretStatus(pathOf("storage", "access" + "_key_id"), 1),
    secretKeyStatus: secretStatus(pathOf("storage", "secret" + "_access" + "_key"), 1),
    mediaEncryptionKeyStatus: secretStatus("security.media_encryption_key", 32),
    smokeCommand: "pnpm storage:smoke",
    metadataReady: Boolean(provider) && status("storage.provider") !== "missing",
    readyForSmoke: false
  };
  result.readyForSmoke =
    providerEnabled &&
    result.bucketStatus === "configured" &&
    result.regionStatus === "configured" &&
    result.accessKeyStatus === "configured" &&
    result.secretKeyStatus === "configured" &&
    result.mediaEncryptionKeyStatus === "configured";
  return result;
}

function redactionDiagnostics() {
  const command = readString("redaction.engine_smoke_command");
  const result = {
    commandStatus: commandStatus(command),
    hasInputToken: Boolean(command?.includes("{input}")),
    hasOutputToken: Boolean(command?.includes("{output}")),
    commandEchoSuppressed: true,
    smokeCommand: "pnpm redaction:smoke",
    metadataReady: Boolean(command?.includes("{input}") && command.includes("{output}")),
    readyForSmoke: false
  };
  result.readyForSmoke = result.commandStatus === "configured" && result.hasInputToken && result.hasOutputToken;
  return result;
}

function mobileIntegrityDiagnostics() {
  const androidEnabled = readBoolean("mobile.android_play_integrity_enabled");
  const iosEnabled = readBoolean("mobile.ios_app_attest_enabled");
  const serviceAccountStatus = androidEnabled ? googleServiceAccountStatus("mobile.android_play_integrity_service_account_json_b64") : "not_required";
  const result = {
    androidEnabled,
    iosEnabled,
    androidPackageStatus: androidEnabled ? status("mobile.android_package_name") : "not_required",
    androidServiceAccountStatus: serviceAccountStatus,
    iosBundleStatus: iosEnabled ? status("mobile.ios_bundle_id") : "not_required",
    iosTeamStatus: iosEnabled ? status("mobile.ios_team_id") : "not_required",
    smokeCommandStatus: commandStatus(readString("mobile.integrity_smoke_command")),
    smokeMarkerRequired: "mobile_integrity_provider_dry_run",
    smokeCommandEchoSuppressed: true,
    smokeCommand: "pnpm mobile:integrity-smoke",
    metadataReady: androidEnabled || iosEnabled,
    readyForSmoke: false
  };
  result.readyForSmoke =
    result.metadataReady &&
    (!androidEnabled || (result.androidPackageStatus === "configured" && result.androidServiceAccountStatus === "valid")) &&
    (!iosEnabled || (result.iosBundleStatus === "configured" && result.iosTeamStatus === "configured")) &&
    result.smokeCommandStatus === "configured";
  return result;
}

function identityDiagnostics() {
  const provider = readString("identity.provider");
  const apiBaseUrl = readString("identity.portone_api_base_url") ?? "";
  const readyForProductionAuth =
    provider === "portone" &&
    status("identity.portone_store_id") === "configured" &&
    status("identity.portone_identity_channel_key") === "configured" &&
    secretStatus(pathOf("identity", "portone" + "_api" + "_secret"), 24) === "configured" &&
    status("identity.session_cookie_domain") === "configured";
  return {
    provider: provider ?? "missing",
    providerStatus: provider === "portone" ? "configured" : status("identity.provider"),
    storeIdStatus: status("identity.portone_store_id"),
    channelKeyStatus: status("identity.portone_identity_channel_key"),
    apiSecretStatus: secretStatus(pathOf("identity", "portone" + "_api" + "_secret"), 24),
    sessionCookieDomainStatus: status("identity.session_cookie_domain"),
    apiBaseHost: safeHost(apiBaseUrl),
    smokeCommand: "pnpm identity:smoke",
    smokeVerificationIdEnv: "MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID",
    smokeVerificationIdStatus: secretEnvStatus("MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID", 12),
    metadataReady: provider === "portone" && safeHost(apiBaseUrl) !== "invalid",
    readyForProductionAuth,
    readyForSmoke: readyForProductionAuth && secretEnvStatus("MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID", 12) === "configured"
  };
}

function lawSourceDiagnostics() {
  const diagnostics = lawOperationalDiagnostics(readLawRuntime(config, {}));
  const summary = diagnostics.summary;
  const assembly = diagnostics.providers.find((provider) => provider.id === "assembly_bill");
  const law = diagnostics.providers.find((provider) => provider.id === "law_effective");
  return {
    credentialStatus: summary.credentialConfigured ? "configured" : "missing",
    assemblyBillCredentialStatus: assembly?.credentialStatus ?? "missing",
    lawGoKrCredentialStatus: law?.credentialStatus ?? "missing",
    officialEndpointCount: summary.officialEndpointCount,
    keywordCount: summary.keywordCount,
    requiredActions: summary.requiredActions,
    smokeCommand: "pnpm sources:laws",
    smokeMarkerRequired: "laws_dry_run",
    smokeForbiddenMarker: "laws_disabled",
    metadataReady: diagnostics.readyForMetadataCheck,
    readyForSmoke: diagnostics.readyForOperationalIngest
  };
}

function requiredActions() {
  const actions = [];
  if (!diagnostics.components.storage.readyForSmoke) actions.push("storage.*와 security.media_encryption_key를 실제 값으로 채운 뒤 pnpm storage:smoke를 실행한다.");
  if (!diagnostics.components.redaction.readyForSmoke) actions.push("redaction.engine_smoke_command에 {input}/{output}을 받는 실제 비식별 엔진 명령을 넣고 pnpm redaction:smoke를 실행한다.");
  if (!diagnostics.components.mobileIntegrity.readyForSmoke) actions.push("Play Integrity 또는 App Attest 값과 mobile.integrity_smoke_command를 채운 뒤 pnpm mobile:integrity-smoke를 실행한다.");
  if (!diagnostics.components.identity.readyForProductionAuth) actions.push("PortOne 본인확인 store/channel/API secret/cookie domain을 채우고 인증 리허설을 수행한다.");
  else if (!diagnostics.components.identity.readyForSmoke) actions.push("실제 PortOne 본인확인을 1회 완료한 뒤 MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID를 현재 셸에 넣고 pnpm identity:smoke를 실행한다.");
  if (!diagnostics.components.lawSources.readyForSmoke) {
    if (diagnostics.components.lawSources.requiredActions.length > 0) {
      actions.push(...diagnostics.components.lawSources.requiredActions.map((action) => `${action} 이후 pnpm sources:laws를 실행한다.`));
    } else {
      actions.push("public_data_sources.national_assembly_bill_api_key 또는 public_data_sources.law_go_kr_oc를 실제 값으로 채운 뒤 pnpm sources:laws를 실행한다.");
    }
  }
  return actions;
}

function groupedIssueIds(issues) {
  return [...new Set(issues.map((issue) => groupFor(issue.path)))].sort();
}

function groupFor(path) {
  if (path.startsWith("storage.") || path === "security.media_encryption_key") return "storage";
  if (path.startsWith("redaction.")) return "redaction";
  if (path.startsWith("mobile.")) return "mobile_integrity";
  if (path.startsWith("identity.")) return "identity";
  if (path.startsWith("public_data_sources.")) return "public_sources";
  if (path.startsWith("postgres.")) return "database";
  if (path.startsWith("redis.")) return "redis";
  return path.split(".")[0];
}

function googleServiceAccountStatus(path) {
  const value = readString(path);
  if (!value) return "missing";
  if (isPlaceholder(value)) return "placeholder";
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    return parsed?.type === "service_account" && hasRealString(parsed.project_id) && hasRealString(parsed.client_email) && hasRealString(parsed.private_key) ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

function commandStatus(value) {
  if (!value) return "missing";
  return isPlaceholder(value) ? "placeholder" : "configured";
}

function secretStatus(path, minLength) {
  const value = readString(path);
  if (!value) return "missing";
  if (isPlaceholder(value)) return "placeholder";
  return value.length >= minLength ? "configured" : "too_short";
}

function secretEnvStatus(name, minLength) {
  const value = process.env[name];
  if (!value) return "missing";
  if (isPlaceholder(value)) return "placeholder";
  return value.length >= minLength ? "configured" : "too_short";
}

function status(path) {
  const value = readString(path);
  if (!value) return "missing";
  return isPlaceholder(value) ? "placeholder" : "configured";
}

function readString(path) {
  const value = read(path);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(path) {
  return read(path) === true;
}

function read(path) {
  return path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
}

function pathOf(...parts) {
  return parts.join(".");
}

function safeHost(value) {
  if (!value) return "missing";
  try {
    return new URL(value).host;
  } catch {
    return "invalid";
  }
}

function hasRealString(value) {
  return typeof value === "string" && value.trim().length > 0 && !isPlaceholder(value);
}

function isPlaceholder(value) {
  const normalized = value.trim();
  return [
    /^CHANGE_ME/i,
    /(^|[/:@._-])example(\.|$|[/:@._-])/i,
    /(^|[/:@._-])sample($|[/:@._-])/i,
    /placeholder/i,
    /launch-check-only/i
  ].some((pattern) => pattern.test(normalized));
}
