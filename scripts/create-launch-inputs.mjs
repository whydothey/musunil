import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outputArg = process.argv.slice(2).find((arg) => arg !== "--" && arg !== "--force");
const outputPath = resolve(process.cwd(), outputArg ?? "config/musunil.user-inputs.local.yaml");
const force = process.argv.includes("--force");

if (existsSync(outputPath) && !force) {
  console.error(`Refusing to overwrite ${outputPath}. Pass --force to regenerate.`);
  process.exit(1);
}

const yaml = `app:
  name: "무슨일"
  public_base_url: "https://musunil.com"
  support_email: "CHANGE_ME_SUPPORT_EMAIL"
  default_locale: "ko-KR"
  timezone: "Asia/Seoul"

api:
  public_base_url: "https://api.musunil.com"

web:
  allowed_origins:
    - "https://musunil.com"

organization:
  legal_name: "CHANGE_ME_LEGAL_NAME"
  operator_name: "CHANGE_ME_OPERATOR_NAME"
  operator_type: "individual_business_pending"
  business_registration_number: ""
  mail_order_sales_registration_number: ""
  business_bank_account_holder: ""
  privacy_officer_name: "CHANGE_ME_PRIVACY_OFFICER_NAME"
  privacy_officer_email: "CHANGE_ME_PRIVACY_OFFICER_EMAIL"
  location_info_manager_name: "CHANGE_ME_LOCATION_MANAGER_NAME"
  location_info_manager_email: "CHANGE_ME_LOCATION_MANAGER_EMAIL"

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
  internal_api_key: ""
  media_encryption_key: "CHANGE_ME_MEDIA_ENCRYPTION_KEY_32_BYTES"

postgres:
  database_url: ""

redis:
  url: ""

storage:
  provider: "s3"
  bucket: "CHANGE_ME_MEDIA_BUCKET"
  region: "CHANGE_ME_MEDIA_REGION"
  endpoint: ""
  access_key_id: "CHANGE_ME_MEDIA_ACCESS_KEY_ID"
  secret_access_key: "CHANGE_ME_MEDIA_SECRET_ACCESS_KEY"

redaction:
  engine_smoke_command: "node scripts/redact-media.mjs {input} {output}"

mobile:
  android_play_integrity_enabled: true
  android_package_name: "CHANGE_ME_ANDROID_PACKAGE_NAME_OR_DISABLE_AND_ENABLE_IOS_APP_ATTEST"
  android_play_integrity_service_account_json_b64: "CHANGE_ME_PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON_B64"
  ios_app_attest_enabled: false
  ios_bundle_id: ""
  ios_team_id: ""
  integrity_smoke_command: "CHANGE_ME_MOBILE_INTEGRITY_DRY_RUN_COMMAND_PRINTING_STRUCTURED_mobile_integrity_provider_dry_run_JSON"

identity:
  provider: "portone"
  portone_store_id: "CHANGE_ME_PORTONE_STORE_ID"
  portone_identity_channel_key: "CHANGE_ME_PORTONE_IDENTITY_CHANNEL_KEY"
  portone_api_secret: "CHANGE_ME_PORTONE_API_SECRET"
  portone_api_base_url: "https://api.portone.io"
  session_cookie_domain: ".musunil.com"

public_data_sources:
  national_assembly_bill_api_key: "CHANGE_ME_NATIONAL_ASSEMBLY_BILL_API_KEY_OR_SET_LAW_GO_KR_OC"
  national_assembly_bill_api_url: "https://open.assembly.go.kr/portal/openapi/ALLBILLV2"
  national_assembly_bill_eraco: "제22대"
  law_go_kr_oc: ""
  law_go_kr_base_url: "https://www.law.go.kr/DRF/lawSearch.do"
  law_interest_keywords:
    - "집회 및 시위에 관한 법률"
    - "정보통신망법"
    - "공직선거법"
    - "국회법"
    - "탄핵"
    - "선거 검증"

map:
  provider: "openfreemap"
  map_style_url: "https://tiles.openfreemap.org/styles/positron"
  default_center:
    lat: 36.5
    lng: 127.8
  default_zoom: 7
  public_location_blur_meters: 200
  sensitive_location_blur_meters: 500

preview:
  use_mock_data: false

moderation:
  live_report_max_upload_minutes: 5
  max_public_location_accuracy_meters: 300
  min_gps_accuracy_meters_for_live: 100
  max_distance_to_report_location_meters: 200
  candidate_occurrence_visibility_threshold: 0.7
  auto_publish_low_risk_live_reports: false

retention:
  raw_claim_statement_days: 30
  unverified_original_media_days: 30
  verified_original_media_days: 180
  precise_location_days: 30
  audit_log_days: 3650

features:
  free_comments_enabled: false
  voting_enabled: false
  national_priority_cards_enabled: true
  issue_follow_enabled: true
  occurrence_follow_enabled: true
  continuous_presence_enabled: true

payments:
  donations_enabled: false
  operating_support_enabled: false
  provider: ""
  mode: "disabled"
  public_label: "무슨일 운영 후원"
  settlement_currency: "KRW"
  tax_treatment: "business_income"
  pg_mid: ""
  pg_client_key: ""
  pg_secret_key: ""
  pg_webhook_secret: ""
  success_url: "https://musunil.com/support/complete"
  fail_url: "https://musunil.com/support/fail"
  webhook_url: "https://api.musunil.com/payments/webhook"
  influence_on_ranking_enabled: false
  influence_on_alerts_enabled: false
  influence_on_trust_enabled: false

ai:
  provider: ""
  api_key: ""
`;

writeFileSync(outputPath, yaml, { mode: 0o600 });
console.log(`Created ${outputPath}`);
console.log("Fill first: support email, organization contacts, PortOne identity verification keys, law source API key, media encryption key, storage provider/bucket/keys, mobile integrity verifier values/smoke command, and a one-time MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID env value for identity smoke. The built-in redaction command is already configured.");
console.log("Fill later after business/PG setup: business registration number, business bank account holder, and PG keys. Keep personal bank account exposure and payment influence flags disabled.");
console.log(`Then run: pnpm launch:ready -- ${outputPath}`);
