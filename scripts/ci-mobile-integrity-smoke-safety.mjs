import { spawnSync } from "node:child_process";

const sampleServiceAccountB64 = Buffer.from(JSON.stringify({
  type: "service_account",
  project_id: "musunil-prod",
  client_email: "play-integrity@musunil-prod.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMUSUNIL_TEST_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
})).toString("base64");

const baseYaml = (command) => `app:
  name: "무슨일"
  public_base_url: "https://musunil.com"
  support_email: "ops@musunil.com"
  default_locale: "ko-KR"
  timezone: "Asia/Seoul"
api:
  public_base_url: "https://api.musunil.com"
organization:
  legal_name: "Musunil Inc."
  operator_name: "Musunil Ops"
  operator_type: "individual_business_pending"
  business_registration_number: "000-00-00000"
  mail_order_sales_registration_number: ""
  business_bank_account_holder: ""
  privacy_officer_name: "Privacy Officer"
  privacy_officer_email: "privacy@musunil.com"
  location_info_manager_name: "Location Officer"
  location_info_manager_email: "location@musunil.com"
domestic_operation:
  service_country: "KR"
  service_language: "ko-KR"
  overseas_service_enabled: false
  overseas_payments_enabled: false
  tax_deductible_donation_receipt_enabled: false
  public_personal_bank_account_exposure_enabled: false
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
    - "https://musunil.com"
mobile:
  android_package_name: "app.musunil.android"
  android_play_integrity_service_account_json_b64: "${sampleServiceAccountB64}"
  ios_bundle_id: ""
  ios_team_id: ""
  android_play_integrity_enabled: true
  ios_app_attest_enabled: false
  integrity_smoke_command: "${command}"
identity:
  provider: "portone"
  portone_store_id: "store-musunil-production"
  portone_identity_channel_key: "identity-channel-musunil-production"
  portone_api_secret: "portone_identity_api_secret_32_bytes"
  session_cookie_domain: ".musunil.com"
map:
  provider: "openfreemap"
  map_style_url: "https://tiles.openfreemap.org/styles/positron"
  default_center:
    lat: 36.5
    lng: 127.8
  default_zoom: 7
storage:
  provider: "s3"
  bucket: "musunil-prod-media"
  region: "ap-northeast-2"
  access_key_id: "MUSUNILPRODACCESSKEY0001"
  secret_access_key: "R4nd0mStorageSecretValueForValidation32"
redaction:
  engine_smoke_command: "node scripts/redact-media.mjs {input} {output}"
public_data_sources:
  news_initial_lookback_days: 30
  news_max_results_per_feed: 100
  news_max_feeds_per_run: 7
  news_min_request_interval_ms: 500
  national_assembly_bill_api_key: "assembly_api_key"
  law_go_kr_oc: ""
payments:
  provider: ""
  mode: "disabled"
  operating_support_enabled: false
  influence_on_ranking_enabled: false
  influence_on_alerts_enabled: false
  influence_on_trust_enabled: false
features:
  free_comments_enabled: false
  voting_enabled: false
`;

const cases = [
  {
    id: "structured_proof",
    command: "node scripts/mobile-integrity-smoke-fixture.mjs proof app.musunil.android",
    expectStatus: 0,
    expectedOutput: "mobile_integrity_provider_dry_run"
  },
  {
    id: "marker_only",
    command: "node scripts/mobile-integrity-smoke-fixture.mjs marker app.musunil.android",
    expectStatus: 1,
    expectedOutput: "structured proof JSON"
  },
  {
    id: "wrong_package",
    command: "node scripts/mobile-integrity-smoke-fixture.mjs wrong-package app.musunil.android",
    expectStatus: 1,
    expectedOutput: "packageName must match"
  },
  {
    id: "secret_leak",
    command: "node scripts/mobile-integrity-smoke-fixture.mjs leak app.musunil.android",
    expectStatus: 1,
    expectedOutput: "must not print private key material"
  }
];

const results = [];
for (const testCase of cases) {
  const result = spawnSync("node", ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "scripts/mobile-integrity-smoke.mjs"], {
    encoding: "utf8",
    env: {
      ...process.env,
      MUSUNIL_USER_INPUTS_B64: Buffer.from(baseYaml(testCase.command)).toString("base64"),
      MUSUNIL_USER_INPUTS_FILE_PATH: ""
    }
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (output.includes("MUSUNIL_TEST_PRIVATE_KEY") || output.includes(sampleServiceAccountB64)) {
    throw new Error(`${testCase.id} leaked mobile integrity fixture secret material.`);
  }
  if (result.status !== testCase.expectStatus) {
    throw new Error(`${testCase.id} expected status ${testCase.expectStatus}, got ${result.status}: ${output}`);
  }
  if (!output.includes(testCase.expectedOutput)) {
    throw new Error(`${testCase.id} missing expected output: ${testCase.expectedOutput}`);
  }
  results.push(testCase.id);
}

console.log(JSON.stringify({
  checked: "mobile_integrity_smoke_safety",
  cases: results
}, null, 2));
