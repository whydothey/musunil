import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const launchYaml = `app:
  name: "무슨일"
  public_base_url: "https://musunil.kr"
  support_email: "ops@musunil.kr"
  default_locale: "ko-KR"
  timezone: "Asia/Seoul"
api:
  public_base_url: "https://api.musunil.kr"
organization:
  legal_name: "Musunil Inc."
  operator_name: "Musunil Ops"
  operator_type: "individual_business_pending"
  business_registration_number: "000-00-00000"
  mail_order_sales_registration_number: ""
  business_bank_account_holder: ""
  privacy_officer_name: "Privacy Officer"
  privacy_officer_email: "privacy@musunil.kr"
  location_info_manager_name: "Location Officer"
  location_info_manager_email: "location@musunil.kr"
domestic_operation:
  service_country: "KR"
  service_language: "ko-KR"
  overseas_service_enabled: false
  overseas_payments_enabled: false
  tax_deductible_donation_receipt_enabled: false
  public_personal_bank_account_exposure_enabled: false
  fundraising_registration_threshold_krw: 10000000
render:
  environment: "production"
  service_region: "singapore"
security:
  jwt_secret: ""
  encryption_key: ""
  media_encryption_key: "render_media_encryption_key_32_bytes"
  internal_api_key: ""
web:
  allowed_origins:
    - "https://musunil.kr"
  pwa_enabled: true
mobile:
  android_package_name: "app.musunil.android"
  android_play_integrity_service_account_json_b64: "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6Im11c3VuaWwtcHJvZCIsImNsaWVudF9lbWFpbCI6InBsYXktaW50ZWdyaXR5QG11c3VuaWwtcHJvZC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsInByaXZhdGVfa2V5IjoiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ1xuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIn0="
  ios_bundle_id: ""
  ios_team_id: ""
  android_play_integrity_enabled: true
  ios_app_attest_enabled: false
  integrity_smoke_command: "printf mobile_integrity_provider_dry_run"
identity:
  provider: "portone"
  portone_store_id: "store-musunil-production"
  portone_identity_channel_key: "identity-channel-musunil-production"
  portone_api_secret: "portone_identity_api_secret_32_bytes"
  portone_api_base_url: "https://api.portone.io"
  session_cookie_domain: ".musunil.kr"
map:
  provider: "openfreemap"
  map_style_url: "https://tiles.openfreemap.org/styles/positron"
  default_center:
    lat: 36.5
    lng: 127.8
  default_zoom: 7
  public_location_blur_meters: 200
  sensitive_location_blur_meters: 500
storage:
  provider: "s3"
  bucket: "musunil-prod-media"
  region: "ap-northeast-2"
  access_key_id: "MUSUNILPRODACCESSKEY0001"
  secret_access_key: "R4nd0mStorageSecretValueForValidation32"
redaction:
  engine_smoke_command: "cp {input} {output}"
ai:
  provider: ""
public_data_sources:
  national_assembly_bill_api_key: "assembly_api_key"
  national_assembly_bill_api_url: "https://open.assembly.go.kr/portal/openapi/ALLBILLINFO"
  law_go_kr_oc: ""
  law_go_kr_base_url: "https://www.law.go.kr/DRF/lawSearch.do"
notifications:
  default_alert_level: "major_only"
payments:
  provider: ""
  mode: "disabled"
  public_key: ""
  secret_key: ""
  webhook_secret: ""
  donations_enabled: false
  operating_support_enabled: false
  public_label: "무슨일 운영 후원"
  settlement_currency: "KRW"
  tax_treatment: "business_income"
  pg_mid: ""
  pg_client_key: ""
  pg_secret_key: ""
  pg_webhook_secret: ""
  success_url: "https://musunil.kr/support/complete"
  fail_url: "https://musunil.kr/support/fail"
  webhook_url: "https://api.musunil.kr/payments/webhook"
  influence_on_ranking_enabled: false
  influence_on_alerts_enabled: false
  influence_on_trust_enabled: false
features:
  free_comments_enabled: false
  voting_enabled: false
  national_priority_cards_enabled: true
  issue_follow_enabled: true
  occurrence_follow_enabled: true
  continuous_presence_enabled: true
`;

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const originalEnv = { ...process.env };
const localPreviewEnv = { ...originalEnv, MUSUNIL_USER_INPUTS_B64: "", MUSUNIL_USER_INPUTS_FILE_PATH: "" };
const launchEnv = {
  ...originalEnv,
  DATABASE_URL: "postgres://musunil:password@db.musunil.internal:5432/musunil",
  REDIS_URL: "redis://default:password@redis.musunil.internal:6379",
  MUSUNIL_USER_TOKEN_SECRET: "render_generated_user_token_secret_32_bytes",
  MUSUNIL_ENCRYPTION_KEY: "render_generated_encryption_key_32_bytes",
  MUSUNIL_INTERNAL_API_KEY: "render_generated_internal_api_key",
  MUSUNIL_USER_INPUTS_B64: Buffer.from(launchYaml).toString("base64"),
  RENDER: "true",
  RENDER_SERVICE_ID: "srv-musunil-web",
  RENDER_SERVICE_NAME: "musunil-web",
  RENDER_SERVICE_TYPE: "static",
  RENDER_GIT_COMMIT: "1234567890abcdef1234567890abcdef12345678",
  RENDER_GIT_BRANCH: "main",
  RENDER_EXTERNAL_URL: "https://musunil-web.onrender.com"
};

let exitCode = 0;
const tempDir = mkdtempSync(join(tmpdir(), "musunil-launch-"));
const tempYaml = join(tempDir, "user-inputs.yaml");
const generatedYaml = join(tempDir, "generated-user-inputs.yaml");
const brokenYaml = join(tempDir, "broken-user-inputs.yaml");
const unsafeLiveYaml = join(tempDir, "unsafe-live-user-inputs.yaml");
const buildInfoJsPath = join(process.cwd(), "apps/web/build-info.js");
const buildInfoJsonPath = join(process.cwd(), "apps/web/build-info.json");
const originalBuildInfoJs = readFileSync(buildInfoJsPath, "utf8");
const originalBuildInfoJson = readFileSync(buildInfoJsonPath, "utf8");

try {
  writeFileSync(tempYaml, launchYaml, { mode: 0o600 });
  run(["config:encode", "--", "--check", tempYaml], launchEnv);
  run(["launch:inputs", "--", generatedYaml], originalEnv);
  writeFileSync(generatedYaml, fillGeneratedLaunchInputs(readFileSync(generatedYaml, "utf8")), { mode: 0o600 });
  run(["launch:verify-inputs", "--", generatedYaml], launchEnv);
  writeFileSync(brokenYaml, "features:\n  free_comments_enabled: false\n  voting_enabled: false\n", { mode: 0o600 });
  runExpectFailure(["config:encode", "--", "--check", brokenYaml], launchEnv);
  runExpectFailure(["launch:verify-inputs", "--", brokenYaml], launchEnv);
  writeFileSync(
    unsafeLiveYaml,
    `${launchYaml}
moderation:
  auto_publish_low_risk_live_reports: true
`,
    { mode: 0o600 }
  );
  runExpectFailure(["config:encode", "--", "--check", unsafeLiveYaml], launchEnv);
  runExpectFailure(["launch:verify-inputs", "--", unsafeLiveYaml], launchEnv);
  run(["build:web-config"], launchEnv);
  assertRenderBuildInfo();
  run(["launch:check"], launchEnv);
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  writeFileSync(buildInfoJsPath, originalBuildInfoJs);
  writeFileSync(buildInfoJsonPath, originalBuildInfoJson);
  try {
    run(["build:web-config"], localPreviewEnv);
  } catch (error) {
    exitCode = 1;
    console.error(error instanceof Error ? error.message : String(error));
  }
  rmSync(tempDir, { recursive: true, force: true });
}

process.exit(exitCode);

function run(args, env) {
  const result = spawnSync(pnpm, args, {
    env,
    stdio: "inherit"
  });
  if (result.status !== 0) throw new Error(`${pnpm} ${args.join(" ")} failed with ${result.status}`);
}

function runExpectFailure(args, env) {
  const result = spawnSync(pnpm, args, { env, stdio: "pipe" });
  if (result.status === 0) throw new Error(`${pnpm} ${args.join(" ")} unexpectedly passed`);
}

function fillGeneratedLaunchInputs(raw) {
  return raw
    .replaceAll("CHANGE_ME_MEDIA_ENCRYPTION_KEY_32_BYTES", "render_media_encryption_key_32_bytes")
    .replaceAll("CHANGE_ME_PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON_B64", "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6Im11c3VuaWwtcHJvZCIsImNsaWVudF9lbWFpbCI6InBsYXktaW50ZWdyaXR5QG11c3VuaWwtcHJvZC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsInByaXZhdGVfa2V5IjoiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ1xuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIn0=")
    .replaceAll("CHANGE_ME_MOBILE_INTEGRITY_DRY_RUN_COMMAND_PRINTING_mobile_integrity_provider_dry_run", "printf mobile_integrity_provider_dry_run")
    .replaceAll("CHANGE_ME_REDACTION_ENGINE_SMOKE_COMMAND_WITH_{input}_AND_{output}", "cp {input} {output}")
    .replaceAll("CHANGE_ME_PORTONE_STORE_ID", "store-musunil-production")
    .replaceAll("CHANGE_ME_PORTONE_IDENTITY_CHANNEL_KEY", "identity-channel-musunil-production")
    .replaceAll("CHANGE_ME_PORTONE_API_SECRET", "portone_identity_api_secret_32_bytes")
    .replaceAll("CHANGE_ME_PUBLIC_WEB_URL", "https://musunil.kr")
    .replaceAll("CHANGE_ME_PUBLIC_API_URL", "https://api.musunil.kr")
    .replaceAll("CHANGE_ME_SUPPORT_EMAIL", "ops@musunil.kr")
    .replaceAll("CHANGE_ME_PRIVACY_OFFICER_EMAIL", "privacy@musunil.kr")
    .replaceAll("CHANGE_ME_LOCATION_MANAGER_EMAIL", "location@musunil.kr")
    .replace(/CHANGE_ME_[A-Z_]+/g, "Musunil Test Value");
}

function assertRenderBuildInfo() {
  const buildInfo = JSON.parse(readFileSync(buildInfoJsonPath, "utf8"));
  if (buildInfo.commitSha !== launchEnv.RENDER_GIT_COMMIT) {
    throw new Error(`Render build-info commitSha mismatch: ${buildInfo.commitSha}`);
  }
  if (buildInfo.branch !== launchEnv.RENDER_GIT_BRANCH) {
    throw new Error(`Render build-info branch mismatch: ${buildInfo.branch}`);
  }
  if (buildInfo.source !== "render") {
    throw new Error(`Render build-info source mismatch: ${buildInfo.source}`);
  }
  if (buildInfo.staticMode !== false) {
    throw new Error(`Render build-info staticMode should reflect build:web-config default: ${buildInfo.staticMode}`);
  }
}
