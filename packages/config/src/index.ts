import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";

export type LoadedUserInputs = {
  config: Record<string, unknown>;
  source: "env_b64" | "env_file" | "local_file" | "template_file";
  path?: string;
};

export type LoadUserInputsOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  allowTemplate?: boolean;
  preferTemplate?: boolean;
};

export type LaunchValidationIssue = {
  path: string;
  message: string;
};

export function loadUserInputs(options: LoadUserInputsOptions = {}): LoadedUserInputs {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;

  if (env.MUSUNIL_USER_INPUTS_B64) {
    return parseUserInputs(Buffer.from(env.MUSUNIL_USER_INPUTS_B64, "base64").toString("utf8"), "env_b64");
  }

  if (env.MUSUNIL_USER_INPUTS_FILE_PATH) {
    const path = resolve(cwd, env.MUSUNIL_USER_INPUTS_FILE_PATH);
    return parseUserInputs(readFileSync(path, "utf8"), "env_file", path);
  }

  const templatePath = resolve(cwd, "config/musunil.user-inputs.template.yaml");
  if (options.allowTemplate && options.preferTemplate) {
    return parseUserInputs(readFileSync(templatePath, "utf8"), "template_file", templatePath);
  }

  const localPath = resolve(cwd, "config/musunil.user-inputs.local.yaml");
  if (existsSync(localPath)) {
    return parseUserInputs(readFileSync(localPath, "utf8"), "local_file", localPath);
  }

  if (options.allowTemplate) {
    return parseUserInputs(readFileSync(templatePath, "utf8"), "template_file", templatePath);
  }

  throw new Error("Missing user inputs. Copy config/musunil.user-inputs.template.yaml to config/musunil.user-inputs.local.yaml or set Render secret input.");
}

function parseUserInputs(raw: string, source: LoadedUserInputs["source"], path?: string): LoadedUserInputs {
  const config = YAML.parse(raw);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("User inputs YAML must be an object.");
  }
  assertForbiddenFeaturesDisabled(config as Record<string, unknown>);
  return { config: config as Record<string, unknown>, source, path };
}

function assertForbiddenFeaturesDisabled(config: Record<string, unknown>): void {
  const features = config.features as Record<string, unknown> | undefined;
  if (features?.free_comments_enabled !== false) {
    throw new Error("free_comments_enabled must stay false.");
  }
  if (features?.voting_enabled !== false) {
    throw new Error("voting_enabled must stay false.");
  }
}

export function validateLaunchConfig(config: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env): LaunchValidationIssue[] {
  const issues: LaunchValidationIssue[] = [];
  const production = read(config, "render.environment") === "production";
  const forbiddenLocalApiUrls = ["http://localhost:4000", "http://localhost:4000/", "localhost:4000", "127.0.0.1:4000", "http://127.0.0.1:4000"];

  requireRealValue(config, issues, "app.public_base_url", ["https://example.com"]);
  requireRealValue(config, issues, "app.support_email", ["support@example.com"]);
  requireRealValue(config, issues, "api.public_base_url", production ? forbiddenLocalApiUrls : []);
  const appPublicUrl = deployedHttpsUrl(read(config, "app.public_base_url"));
  const apiPublicUrl = deployedHttpsUrl(read(config, "api.public_base_url"));
  if (production && !appPublicUrl) {
    issues.push({ path: "app.public_base_url", message: "production app public_base_url must be a deployed HTTPS URL." });
  }
  if (production && !apiPublicUrl) {
    issues.push({ path: "api.public_base_url", message: "production api public_base_url must be a deployed HTTPS URL." });
  }
  requireRealValue(config, issues, "organization.legal_name");
  requireRealValue(config, issues, "organization.operator_name");
  requireRealValue(config, issues, "organization.privacy_officer_name");
  requireRealValue(config, issues, "organization.privacy_officer_email");
  requireRealValue(config, issues, "organization.location_info_manager_name");
  requireRealValue(config, issues, "organization.location_info_manager_email");
  requireSecretOrEnv(config, env, issues, "security.jwt_secret", "MUSUNIL_USER_TOKEN_SECRET", 32);
  requireSecretOrEnv(config, env, issues, "security.encryption_key", "MUSUNIL_ENCRYPTION_KEY", 32);
  requireSecretOrEnv(config, env, issues, "security.internal_api_key", "MUSUNIL_INTERNAL_API_KEY", 24);
  requireRealValueOrEnv(config, env, issues, "postgres.database_url", "DATABASE_URL");
  requireRealValueOrEnv(config, env, issues, "redis.url", "REDIS_URL");
  const storageProvider = read(config, "storage.provider");
  if (production && !providerEnabled(storageProvider)) {
    issues.push({ path: "storage.provider", message: "production LIVE media requires an external storage provider." });
  }
  if (providerEnabled(storageProvider)) {
    requireSecret(config, issues, "security.media_encryption_key", 32);
    requireRealValue(config, issues, "storage.bucket");
    requireRealValue(config, issues, "storage.region");
    requireRealValue(config, issues, "storage.access_key_id");
    requireRealValue(config, issues, "storage.secret_access_key");
  }
  const redactionCommand = read(config, "redaction.engine_smoke_command");
  if (production && !hasRealString(redactionCommand)) {
    issues.push({ path: "redaction.engine_smoke_command", message: "production redaction engine smoke command is required." });
  }
  if (hasRealString(redactionCommand) && (!redactionCommand.includes("{input}") || !redactionCommand.includes("{output}"))) {
    issues.push({ path: "redaction.engine_smoke_command", message: "redaction smoke command must include {input} and {output}." });
  }
  const aiProvider = read(config, "ai.provider");
  if (typeof aiProvider === "string" && aiProvider.trim().length > 0 && aiProvider !== "mock" && aiProvider !== "disabled") {
    requireRealValue(config, issues, "ai.api_key");
  }
  if (
    production &&
    !hasRealString(read(config, "public_data_sources.national_assembly_bill_api_key")) &&
    !hasRealString(read(config, "public_data_sources.law_go_kr_oc"))
  ) {
    issues.push({
      path: "public_data_sources.national_assembly_bill_api_key",
      message: "production law tab requires national_assembly_bill_api_key or law_go_kr_oc."
    });
  }
  const androidIntegrityEnabled = read(config, "mobile.android_play_integrity_enabled") === true;
  const iosAttestEnabled = read(config, "mobile.ios_app_attest_enabled") === true;
  if (production && !androidIntegrityEnabled && !iosAttestEnabled) {
    issues.push({ path: "mobile.android_play_integrity_enabled", message: "production LIVE reports require Play Integrity or App Attest." });
  }
  if (androidIntegrityEnabled) {
    requireRealValue(config, issues, "mobile.android_package_name");
    requireSecret(config, issues, "mobile.android_play_integrity_service_account_json_b64", 32);
    requireServiceAccountJsonB64(config, issues, "mobile.android_play_integrity_service_account_json_b64");
  }
  if (iosAttestEnabled) {
    requireRealValue(config, issues, "mobile.ios_bundle_id");
    requireRealValue(config, issues, "mobile.ios_team_id");
  }
  if (production && (androidIntegrityEnabled || iosAttestEnabled)) {
    requireRealValue(config, issues, "mobile.integrity_smoke_command");
  }

  if (production && read(config, "identity.provider") !== "portone") {
    issues.push({ path: "identity.provider", message: "production identity verification provider must be portone for v1." });
  }
  if (production) {
    requireRealValueOrEnv(config, env, issues, "identity.portone_store_id", "MUSUNIL_PORTONE_STORE_ID");
    requireRealValueOrEnv(config, env, issues, "identity.portone_identity_channel_key", "MUSUNIL_PORTONE_IDENTITY_CHANNEL_KEY");
    requireSecretOrEnv(config, env, issues, "identity.portone_api_secret", "MUSUNIL_PORTONE_API_SECRET", 24);
    requireRealValue(config, issues, "identity.session_cookie_domain");
    const cookieDomain = read(config, "identity.session_cookie_domain");
    if (
      typeof cookieDomain === "string" &&
      appPublicUrl &&
      apiPublicUrl &&
      (!cookieDomainMatchesHost(cookieDomain, appPublicUrl.hostname) || !cookieDomainMatchesHost(cookieDomain, apiPublicUrl.hostname))
    ) {
      issues.push({ path: "identity.session_cookie_domain", message: "session cookie domain must cover both app.public_base_url and api.public_base_url hosts." });
    }
  }

  const mapProvider = read(config, "map.provider");
  if (production && (!mapProvider || mapProvider === "mock")) {
    issues.push({ path: "map.provider", message: "production must not use the mock map provider." });
  }
  requireRealValue(config, issues, "map.map_style_url", production ? ["http://localhost:4000"] : []);

  const origins = read(config, "web.allowed_origins");
  if (!Array.isArray(origins) || origins.length === 0) {
    issues.push({ path: "web.allowed_origins", message: "at least one allowed origin is required." });
  }
  if (Array.isArray(origins) && production && origins.some((origin) => typeof origin === "string" && origin.includes("localhost"))) {
    issues.push({ path: "web.allowed_origins", message: "production origins must not include localhost." });
  }
  if (Array.isArray(origins) && production && origins.some((origin) => typeof origin !== "string" || !hasRealString(origin))) {
    issues.push({ path: "web.allowed_origins", message: "production origins must be real launch URLs." });
  }
  if (Array.isArray(origins) && production) {
    const invalidOrigins = origins.filter((origin) => typeof origin !== "string" || origin !== deployedOrigin(origin));
    if (invalidOrigins.length > 0) {
      issues.push({ path: "web.allowed_origins", message: "production origins must be exact deployed HTTPS origins without path, query, or trailing slash." });
    }
    const appOrigin = appPublicUrl?.origin;
    if (appOrigin && !origins.includes(appOrigin)) {
      issues.push({ path: "web.allowed_origins", message: "web.allowed_origins must include app.public_base_url origin for CORS and identity flows." });
    }
  }

  if (production && read(config, "domestic_operation.service_country") !== "KR") {
    issues.push({ path: "domestic_operation.service_country", message: "v1 production launch is domestic Korea only." });
  }
  if (read(config, "domestic_operation.overseas_service_enabled") !== false) {
    issues.push({ path: "domestic_operation.overseas_service_enabled", message: "overseas service must stay disabled for v1." });
  }
  if (read(config, "domestic_operation.overseas_payments_enabled") !== false) {
    issues.push({ path: "domestic_operation.overseas_payments_enabled", message: "overseas payments must stay disabled for v1." });
  }
  if (read(config, "domestic_operation.tax_deductible_donation_receipt_enabled") !== false) {
    issues.push({ path: "domestic_operation.tax_deductible_donation_receipt_enabled", message: "tax-deductible donation receipts are not supported in v1." });
  }
  if (read(config, "domestic_operation.public_personal_bank_account_exposure_enabled") !== false) {
    issues.push({ path: "domestic_operation.public_personal_bank_account_exposure_enabled", message: "personal bank account exposure must stay disabled." });
  }

  if (read(config, "features.free_comments_enabled") !== false) {
    issues.push({ path: "features.free_comments_enabled", message: "free comments must stay disabled." });
  }
  if (read(config, "features.voting_enabled") !== false) {
    issues.push({ path: "features.voting_enabled", message: "voting must stay disabled." });
  }
  if (read(config, "payments.donations_enabled") !== false) {
    issues.push({ path: "payments.donations_enabled", message: "donations stay disabled for launch." });
  }
  if (read(config, "payments.influence_on_ranking_enabled") !== false) {
    issues.push({ path: "payments.influence_on_ranking_enabled", message: "payments must not influence ranking." });
  }
  if (read(config, "payments.influence_on_alerts_enabled") !== false) {
    issues.push({ path: "payments.influence_on_alerts_enabled", message: "payments must not influence alerts." });
  }
  if (read(config, "payments.influence_on_trust_enabled") !== false) {
    issues.push({ path: "payments.influence_on_trust_enabled", message: "payments must not influence trust." });
  }
  if (read(config, "payments.operating_support_enabled") === true) {
    requireRealValue(config, issues, "organization.business_registration_number");
    requireRealValue(config, issues, "organization.business_bank_account_holder");
    requireRealValue(config, issues, "payments.provider");
    requireRealValue(config, issues, "payments.mode");
    requireRealValue(config, issues, "payments.pg_mid");
    requireRealValue(config, issues, "payments.pg_client_key");
    requireSecret(config, issues, "payments.pg_secret_key", 24);
    requireSecret(config, issues, "payments.pg_webhook_secret", 24);
    requireRealValue(config, issues, "payments.success_url");
    requireRealValue(config, issues, "payments.fail_url");
    requireRealValue(config, issues, "payments.webhook_url");
  }
  if (production && read(config, "preview.use_mock_data") === true) {
    issues.push({ path: "preview.use_mock_data", message: "production must not expose mock data." });
  }
  if (production && read(config, "moderation.auto_publish_low_risk_live_reports") === true) {
    issues.push({
      path: "moderation.auto_publish_low_risk_live_reports",
      message: "production must keep LIVE auto-publish disabled until the redaction and storage pipeline is verified."
    });
  }

  return issues;
}

function requireRealValue(
  config: Record<string, unknown>,
  issues: LaunchValidationIssue[],
  path: string,
  forbidden: string[] = []
): void {
  const value = read(config, path);
  if (!hasRealString(value, forbidden)) {
    issues.push({ path, message: "real launch value is required." });
  }
}

function requireRealValueOrEnv(
  config: Record<string, unknown>,
  env: NodeJS.ProcessEnv,
  issues: LaunchValidationIssue[],
  path: string,
  envKeys: string | string[],
  forbidden: string[] = []
): void {
  const keys = Array.isArray(envKeys) ? envKeys : [envKeys];
  if (hasRealString(read(config, path), forbidden) || keys.some((key) => hasRealString(env[key], forbidden))) return;
  issues.push({ path, message: `real launch value is required in ${path} or ${keys.join(" or ")}.` });
}

function requireSecret(config: Record<string, unknown>, issues: LaunchValidationIssue[], path: string, minLength: number): void {
  const value = read(config, path);
  if (typeof value !== "string" || isPlaceholder(value) || value.length < minLength) {
    issues.push({ path, message: `secret must be changed and at least ${minLength} characters.` });
  }
}

function requireServiceAccountJsonB64(config: Record<string, unknown>, issues: LaunchValidationIssue[], path: string): void {
  const value = read(config, path);
  if (typeof value !== "string" || isPlaceholder(value)) return;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64").toString("utf8")) as Record<string, unknown>;
    if (
      parsed?.type !== "service_account" ||
      !hasRealString(parsed.project_id) ||
      !hasRealString(parsed.client_email) ||
      !hasRealString(parsed.private_key)
    ) {
      issues.push({ path, message: "must be a base64-encoded Google service account JSON." });
    }
  } catch {
    issues.push({ path, message: "must be a base64-encoded Google service account JSON." });
  }
}

function requireSecretOrEnv(
  config: Record<string, unknown>,
  env: NodeJS.ProcessEnv,
  issues: LaunchValidationIssue[],
  path: string,
  envKey: string,
  minLength: number
): void {
  const configValue = read(config, path);
  const envValue = env[envKey];
  if (isUsableSecret(configValue, minLength) || isUsableSecret(envValue, minLength)) return;
  issues.push({ path, message: `secret must be changed and at least ${minLength} characters in ${path} or ${envKey}.` });
}

function isUsableSecret(value: unknown, minLength: number): value is string {
  return typeof value === "string" && !isPlaceholder(value) && value.length >= minLength;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim();
  return [
    /^CHANGE_ME/i,
    /(^|[/:@._-])example(\.|$|[/:@._-])/i,
    /(^|[/:@._-])sample($|[/:@._-])/i,
    /placeholder/i,
    /launch-check-only/i
  ].some((pattern) => pattern.test(normalized));
}

function hasRealString(value: unknown, forbidden: string[] = []): value is string {
  return typeof value === "string" && value.trim().length > 0 && !forbidden.includes(value.trim()) && !isPlaceholder(value);
}

function providerEnabled(value: unknown): value is string {
  return hasRealString(value) && value !== "mock" && value !== "disabled";
}

function deployedOrigin(value: unknown): string | undefined {
  return deployedHttpsUrl(value)?.origin;
}

function deployedHttpsUrl(value: unknown): URL | undefined {
  if (typeof value !== "string" || !hasRealString(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname) || url.hostname.endsWith(".local")) return undefined;
    return url;
  } catch {
    return undefined;
  }
}

function cookieDomainMatchesHost(domain: string, host: string): boolean {
  const normalizedDomain = domain.trim().toLowerCase().replace(/^\./, "");
  const normalizedHost = host.trim().toLowerCase();
  return normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`);
}

function read(config: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, config);
}
