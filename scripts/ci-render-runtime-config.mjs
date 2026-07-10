import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const port = await freePort();
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
  business_registration_number: "000-00-00000"
  privacy_officer_name: "Privacy Officer"
  privacy_officer_email: "privacy@musunil.kr"
  location_info_manager_name: "Location Officer"
  location_info_manager_email: "location@musunil.kr"
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
  public_key: ""
  secret_key: ""
  webhook_secret: ""
  donations_enabled: false
features:
  free_comments_enabled: false
  voting_enabled: false
  national_priority_cards_enabled: true
  issue_follow_enabled: true
  occurrence_follow_enabled: true
  continuous_presence_enabled: true
  transit_occurrence_enabled: true
  crowd_density_enabled: true
  route_segment_enabled: true
  route_checkpoint_enabled: true
`;
const env = {
  ...process.env,
  PORT: String(port),
  MUSUNIL_RUNTIME_ENV: "production",
  MUSUNIL_USER_INPUTS_B64: Buffer.from(launchYaml).toString("base64"),
  MUSUNIL_USER_TOKEN_SECRET: "render_generated_user_token_secret_32_bytes",
  MUSUNIL_ENCRYPTION_KEY: "render_generated_encryption_key_32_bytes",
  MUSUNIL_INTERNAL_API_KEY: "render_generated_internal_api_key",
  DATABASE_URL: "",
  REDIS_URL: ""
};
const server = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "src/server.ts"], {
  cwd: resolve(cwd, "services/api"),
  env,
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
server.stdout.on("data", (data) => {
  serverOutput += data.toString();
});
server.stderr.on("data", (data) => {
  serverOutput += data.toString();
});

let exitCode = 0;
try {
  await waitForHealth(port);
  const response = await fetch(`http://localhost:${port}/ready`);
  const body = await response.json();
  const failedIds = Array.isArray(body.checks) ? body.checks.filter((check) => !check.ok).map((check) => check.id) : [];

  assert(response.status === 503, `/ready should be blocked only by missing managed DB/Redis in this smoke, got ${response.status}`);
  assert(body.ready === false, "/ready should be false without managed DB/Redis env");
  assert(failedIds.includes("postgres.database_url"), "missing postgres.database_url was not reported");
  assert(failedIds.includes("redis.url"), "missing redis.url was not reported");
  for (const id of ["security.jwt_secret", "security.encryption_key", "security.internal_api_key"]) {
    assert(!failedIds.includes(id), `${id} should be satisfied by Render-generated env`);
  }
  const writeResponse = await fetch(`http://localhost:${port}/session/anonymous`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  const writeBody = await writeResponse.json();
  assert(writeResponse.status === 503, `production writes should fail closed when /ready is false, got ${writeResponse.status}`);
  assert(writeBody.error === "runtime_not_ready", "not-ready write error code mismatch");
  const lawsResponse = await fetch(`http://localhost:${port}/laws`);
  const lawsBody = await lawsResponse.json();
  assert(lawsResponse.status === 200, `/laws should stay readable in not-ready production smoke, got ${lawsResponse.status}`);
  assert(Array.isArray(lawsBody.laws), "/laws response missing laws array");
  assert(lawsBody.laws.length === 0, "production seed must not expose preview law items before ingest");
  assert(JSON.stringify(lawsBody).includes("preview") === false, "production law response leaked preview data");

  console.log(JSON.stringify({ apiBaseUrl: `http://localhost:${port}`, failedIds, checked: "render-generated-secret-runtime-config" }, null, 2));
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
  if (serverOutput.trim()) console.error(serverOutput.trim());
} finally {
  server.kill("SIGTERM");
  const code = await waitForExit(server);
  if (code !== 0) exitCode = 1;
}

process.exit(exitCode);

function freePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, () => {
      const address = probe.address();
      probe.close(() => resolvePort(typeof address === "object" && address ? address.port : 0));
    });
  });
}

async function waitForHealth(port) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`API exited before health check with ${server.exitCode}`);
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    }
  }
  throw new Error("API did not become healthy in time");
}

function waitForExit(child) {
  return new Promise((resolveExit) => {
    if (child.exitCode !== null) {
      resolveExit(child.exitCode);
      return;
    }
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolveExit(1);
    }, 5_000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolveExit(code ?? 0);
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
