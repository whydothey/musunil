import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "./index.ts";

const cwd = resolve(import.meta.dirname, "../../..");
const loaded = loadUserInputs({ cwd, allowTemplate: true, env: {} });

assert.equal(loaded.source, "template_file");
assert.equal((loaded.config.features as Record<string, unknown>).free_comments_enabled, false);
assert.equal((loaded.config.features as Record<string, unknown>).voting_enabled, false);
assert.equal((loaded.config.preview as Record<string, unknown>).use_mock_data, false);

const b64 = Buffer.from(readFileSync(resolve(cwd, "config/musunil.user-inputs.template.yaml"), "utf8")).toString("base64");
const sampleAndroidServiceAccountB64 = Buffer.from(
  JSON.stringify({
    type: "service_account",
    project_id: "musunil-prod",
    client_email: "play-integrity@musunil-prod.iam.gserviceaccount.com",
    private_key: "test-private-key-material-for-launch-validation"
  })
).toString("base64");
const envLoaded = loadUserInputs({ cwd, env: { MUSUNIL_USER_INPUTS_B64: b64 } });
assert.equal(envLoaded.source, "env_b64");

assert.throws(() =>
  loadUserInputs({
    cwd,
    env: {
      MUSUNIL_USER_INPUTS_B64: Buffer.from("features:\n  free_comments_enabled: true\n  voting_enabled: false\n").toString("base64")
    }
  })
);

const launchIssues = validateLaunchConfig(loaded.config, {});
assert.equal(launchIssues.some((issue) => issue.path === "app.public_base_url"), false);
assert.equal(launchIssues.some((issue) => issue.path === "app.support_email"), true);
assert.equal(launchIssues.some((issue) => issue.path === "security.jwt_secret"), true);
assert.equal(launchIssues.some((issue) => issue.path === "security.encryption_key"), true);
assert.equal(launchIssues.some((issue) => issue.path === "security.internal_api_key"), true);
assert.equal(launchIssues.some((issue) => issue.path === "security.media_encryption_key"), true);
assert.equal(launchIssues.some((issue) => issue.path === "storage.bucket"), true);
assert.equal(launchIssues.some((issue) => issue.path === "redaction.engine_smoke_command"), true);
assert.equal(launchIssues.some((issue) => issue.path === "ai.api_key"), false);
assert.equal(launchIssues.some((issue) => issue.path === "public_data_sources.national_assembly_bill_api_key"), true);
assert.equal(launchIssues.some((issue) => issue.path === "mobile.android_package_name"), true);
assert.equal(launchIssues.some((issue) => issue.path === "mobile.android_play_integrity_service_account_json_b64"), true);
assert.equal(launchIssues.some((issue) => issue.path === "mobile.integrity_smoke_command"), true);
assert.equal(launchIssues.some((issue) => issue.path === "features.free_comments_enabled"), false);

const productionConfig = JSON.parse(JSON.stringify(loaded.config));
productionConfig.render.environment = "production";
assert.equal(validateLaunchConfig(productionConfig, {}).some((issue) => issue.path === "api.public_base_url"), false);
assert.equal(validateLaunchConfig(productionConfig, {}).some((issue) => issue.path === "api.internal_base_url"), false);
productionConfig.preview.use_mock_data = true;
assert.equal(validateLaunchConfig(productionConfig, {}).some((issue) => issue.path === "preview.use_mock_data"), true);
productionConfig.web.allowed_origins = ["CHANGE_ME_PUBLIC_WEB_URL"];
assert.equal(validateLaunchConfig(productionConfig, {}).some((issue) => issue.path === "web.allowed_origins"), true);

const noMobileIntegrityProductionConfig = JSON.parse(JSON.stringify(loaded.config));
noMobileIntegrityProductionConfig.render.environment = "production";
noMobileIntegrityProductionConfig.mobile.android_play_integrity_enabled = false;
noMobileIntegrityProductionConfig.mobile.ios_app_attest_enabled = false;
assert.equal(validateLaunchConfig(noMobileIntegrityProductionConfig, {}).some((issue) => issue.path === "mobile.android_play_integrity_enabled"), true);

const noStorageProductionConfig = JSON.parse(JSON.stringify(loaded.config));
noStorageProductionConfig.render.environment = "production";
noStorageProductionConfig.storage.provider = "";
assert.equal(validateLaunchConfig(noStorageProductionConfig, {}).some((issue) => issue.path === "storage.provider"), true);

const unsafeLiveProductionConfig = JSON.parse(JSON.stringify(loaded.config));
unsafeLiveProductionConfig.render.environment = "production";
unsafeLiveProductionConfig.moderation.auto_publish_low_risk_live_reports = true;
assert.equal(validateLaunchConfig(unsafeLiveProductionConfig, {}).some((issue) => issue.path === "moderation.auto_publish_low_risk_live_reports"), true);

const placeholderConfig = JSON.parse(JSON.stringify(loaded.config));
placeholderConfig.app.public_base_url = "https://musunil.example";
placeholderConfig.security.jwt_secret = "sample_jwt_secret_32_bytes_or_longer_value";
assert.equal(validateLaunchConfig(placeholderConfig, {}).some((issue) => issue.path === "app.public_base_url"), true);
assert.equal(validateLaunchConfig(placeholderConfig, {}).some((issue) => issue.path === "security.jwt_secret"), true);

const envBackedConfig = JSON.parse(JSON.stringify(loaded.config));
envBackedConfig.postgres.database_url = "";
envBackedConfig.redis.url = "";
const envBackedIssues = validateLaunchConfig(envBackedConfig, {
  DATABASE_URL: "postgresql://musunil:password@db.internal:5432/musunil",
  REDIS_URL: "redis://red-musunil:6379",
  MUSUNIL_USER_TOKEN_SECRET: "render_generated_user_token_secret_32_bytes",
  MUSUNIL_ENCRYPTION_KEY: "render_generated_encryption_key_32_bytes",
  MUSUNIL_INTERNAL_API_KEY: "render_generated_internal_api_key"
});
assert.equal(envBackedIssues.some((issue) => issue.path === "postgres.database_url"), false);
assert.equal(envBackedIssues.some((issue) => issue.path === "redis.url"), false);
assert.equal(envBackedIssues.some((issue) => issue.path === "security.jwt_secret"), false);
assert.equal(envBackedIssues.some((issue) => issue.path === "security.encryption_key"), false);
assert.equal(envBackedIssues.some((issue) => issue.path === "security.internal_api_key"), false);

const aiEnabledConfig = JSON.parse(JSON.stringify(loaded.config));
aiEnabledConfig.ai.provider = "openai";
aiEnabledConfig.ai.api_key = "";
assert.equal(validateLaunchConfig(aiEnabledConfig, {}).some((issue) => issue.path === "ai.api_key"), true);
aiEnabledConfig.ai.api_key = "openai-test-api-key-value-abcdefghijklmnopqrstuvwxyz1234567890";
assert.equal(validateLaunchConfig(aiEnabledConfig, {}).some((issue) => issue.path === "ai.api_key"), false);

const lawSourceConfig = JSON.parse(JSON.stringify(loaded.config));
lawSourceConfig.public_data_sources.national_assembly_bill_api_key = "assembly_api_key";
assert.equal(validateLaunchConfig(lawSourceConfig, {}).some((issue) => issue.path === "public_data_sources.national_assembly_bill_api_key"), false);

const mobileIntegrityConfig = JSON.parse(JSON.stringify(loaded.config));
mobileIntegrityConfig.mobile.android_play_integrity_enabled = true;
mobileIntegrityConfig.mobile.android_package_name = "app.musunil.android";
mobileIntegrityConfig.mobile.android_play_integrity_service_account_json_b64 = sampleAndroidServiceAccountB64;
mobileIntegrityConfig.mobile.integrity_smoke_command = "printf mobile_integrity_provider_dry_run";
assert.equal(validateLaunchConfig(mobileIntegrityConfig, {}).some((issue) => issue.path === "mobile.android_play_integrity_enabled"), false);
assert.equal(validateLaunchConfig(mobileIntegrityConfig, {}).some((issue) => issue.path === "mobile.android_package_name"), false);
assert.equal(validateLaunchConfig(mobileIntegrityConfig, {}).some((issue) => issue.path === "mobile.android_play_integrity_service_account_json_b64"), false);
assert.equal(validateLaunchConfig(mobileIntegrityConfig, {}).some((issue) => issue.path === "mobile.integrity_smoke_command"), false);
mobileIntegrityConfig.mobile.android_play_integrity_service_account_json_b64 = Buffer.from(JSON.stringify({ type: "service_account" })).toString("base64");
assert.equal(validateLaunchConfig(mobileIntegrityConfig, {}).some((issue) => issue.path === "mobile.android_play_integrity_service_account_json_b64"), true);

const iosIntegrityConfig = JSON.parse(JSON.stringify(loaded.config));
iosIntegrityConfig.mobile.android_play_integrity_enabled = false;
iosIntegrityConfig.mobile.ios_app_attest_enabled = true;
iosIntegrityConfig.mobile.ios_bundle_id = "app.musunil.ios";
iosIntegrityConfig.mobile.integrity_smoke_command = "printf mobile_integrity_provider_dry_run";
assert.equal(validateLaunchConfig(iosIntegrityConfig, {}).some((issue) => issue.path === "mobile.ios_team_id"), true);
iosIntegrityConfig.mobile.ios_team_id = "TEAMMUSUNIL";
assert.equal(validateLaunchConfig(iosIntegrityConfig, {}).some((issue) => issue.path === "mobile.ios_team_id"), false);

const storageEnabledConfig = JSON.parse(JSON.stringify(loaded.config));
storageEnabledConfig.storage.provider = "s3";
storageEnabledConfig.security.media_encryption_key = "CHANGE_ME_32_BYTES_OR_MORE";
assert.equal(validateLaunchConfig(storageEnabledConfig, {}).some((issue) => issue.path === "security.media_encryption_key"), true);
assert.equal(validateLaunchConfig(storageEnabledConfig, {}).some((issue) => issue.path === "storage.bucket"), true);
storageEnabledConfig.security.media_encryption_key = "m7N6b5V4c3X2z1L0k9J8h7G6f5D4s3A2";
storageEnabledConfig.storage.bucket = "musunil-prod";
storageEnabledConfig.storage.region = "ap-northeast-2";
storageEnabledConfig.storage.access_key_id = "MUSUNILPRODACCESSKEY0001";
storageEnabledConfig.storage.secret_access_key = "R4nd0mStorageSecretValueForValidation32";
assert.equal(validateLaunchConfig(storageEnabledConfig, {}).some((issue) => issue.path === "storage.bucket"), false);
assert.equal(validateLaunchConfig(storageEnabledConfig, {}).some((issue) => issue.path === "storage.provider"), false);

const redactionConfig = JSON.parse(JSON.stringify(loaded.config));
redactionConfig.redaction.engine_smoke_command = "node tools/redact.mjs {input} {output}";
assert.equal(validateLaunchConfig(redactionConfig, {}).some((issue) => issue.path === "redaction.engine_smoke_command"), false);
redactionConfig.redaction.engine_smoke_command = "node tools/redact.mjs";
assert.equal(validateLaunchConfig(redactionConfig, {}).some((issue) => issue.path === "redaction.engine_smoke_command"), true);
