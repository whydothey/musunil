import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
const failures = [];

let loaded;
try {
  loaded = loadUserInputs({ cwd });
  failures.push(...validateLaunchConfig(loaded.config).map((issue) => `${issue.path}: ${issue.message}`));
} catch (error) {
  failures.push(error instanceof Error ? error.message : "failed to load user inputs");
}

const web = readFileSync(resolve(cwd, "apps/web/index.html"), "utf8");
const trackedFiles = gitTrackedFiles();
const userFacingDocs = [
  "docs/product-principles.md",
  "docs/data-fixtures-and-real-sources.md",
  "docs/uiux-reference-notes.md",
  "docs/local-completion-status.md",
  "docs/launch-readiness-checklist.md"
].map((path) => `${path}\n${readFileSync(resolve(cwd, path), "utf8")}`).join("\n");
const localCompletionStatus = readFileSync(resolve(cwd, "docs/local-completion-status.md"), "utf8");
const completionAudit = readFileSync(resolve(cwd, "docs/splus-completion-audit.md"), "utf8");
const webConfigJs = readFileSync(resolve(cwd, "apps/web/config.js"), "utf8");
const webConfigWriter = readFileSync(resolve(cwd, "scripts/write-web-config.mjs"), "utf8");
const webHeaderWriter = readFileSync(resolve(cwd, "scripts/write-web-headers.mjs"), "utf8");
const webServer = readFileSync(resolve(cwd, "scripts/serve-web.mjs"), "utf8");
const webDeployCheck = readFileSync(resolve(cwd, "scripts/check-web-deploy.mjs"), "utf8");
const renderWebSettings = readFileSync(resolve(cwd, "scripts/render-web-settings.mjs"), "utf8");
const launchCutoverPlan = readFileSync(resolve(cwd, "scripts/launch-cutover-plan.mjs"), "utf8");
const cloudflareDnsCheck = readFileSync(resolve(cwd, "scripts/cloudflare-dns-check.mjs"), "utf8");
const launchNextActions = readFileSync(resolve(cwd, "scripts/launch-next-actions.mjs"), "utf8");
const launchReady = readFileSync(resolve(cwd, "scripts/launch-ready.mjs"), "utf8");
const launchFinalGate = readFileSync(resolve(cwd, "scripts/launch-final-gate.mjs"), "utf8");
const launchCutoverRehearsal = readFileSync(resolve(cwd, "scripts/launch-cutover-rehearsal.mjs"), "utf8");
const launchCutoverRunbook = readFileSync(resolve(cwd, "docs/launch-cutover-runbook.md"), "utf8");
const webFlowSmoke = readFileSync(resolve(cwd, "scripts/ci-web-flow-smoke.mjs"), "utf8");
const uxSurfaceSmoke = readFileSync(resolve(cwd, "scripts/ci-ux-surface-smoke.mjs"), "utf8");
const visualSurfaceSmoke = readFileSync(resolve(cwd, "scripts/ci-visual-surface-smoke.mjs"), "utf8");
const publicApiRoutes = readFileSync(resolve(cwd, "scripts/public-api-routes.mjs"), "utf8");
const webStaticManifestScript = readFileSync(resolve(cwd, "scripts/write-web-static-manifest.mjs"), "utf8");
const postDeploySmokeRunner = readFileSync(resolve(cwd, "scripts/post-deploy-smoke-runner.mjs"), "utf8");
const rootPackageJson = readFileSync(resolve(cwd, "package.json"), "utf8");
const ciWorkflow = readFileSync(resolve(cwd, ".github/workflows/ci.yml"), "utf8");
const gitignore = readFileSync(resolve(cwd, ".gitignore"), "utf8");
const readme = readFileSync(resolve(cwd, "README.md"), "utf8");
const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const renderApi = renderServiceBlock(renderYaml, "musunil-api");
const renderWeb = renderServiceBlock(renderYaml, "musunil-web");
const renderRedis = renderServiceBlock(renderYaml, "musunil-redis");
const renderPublicSourceIngest = renderServiceBlock(renderYaml, "musunil-public-source-ingest");
const renderLawSourceIngest = renderServiceBlock(renderYaml, "musunil-law-source-ingest");
const renderNotificationDispatch = renderServiceBlock(renderYaml, "musunil-notification-dispatch");
const renderPrivacyPurge = renderServiceBlock(renderYaml, "musunil-privacy-purge");
const forbiddenPatterns = [
  /[🪧📊⛺🚇👥🚧➰]/u,
  /자유 댓글|추천\/비추천|찬반투표/u,
  /hazard_area|service_disruption/u
];
for (const key of ["DATABASE_URL", "REDIS_URL", "MUSUNIL_USER_INPUTS_B64", "MUSUNIL_USER_TOKEN_SECRET", "MUSUNIL_ENCRYPTION_KEY", "MUSUNIL_INTERNAL_API_KEY"]) {
  if (new RegExp(`key:\\s*${key}\\b`).test(renderWeb)) {
    failures.push(`Render Static Web must not receive backend secret/runtime env var: ${key}`);
  }
}
for (const pattern of forbiddenPatterns) {
  if (pattern.test(web)) failures.push(`forbidden UI pattern found: ${pattern}`);
}
for (const term of ["공식 원천", "일정 수집", "데이터 커버리지", "상충/반론", "원천 미확정"]) {
  if ((web + "\n" + userFacingDocs).includes(term)) failures.push(`legacy user-facing term found: ${term}`);
}
for (const phrase of ["장기 현장/교통/인파/경로/제보", "교통 통제/도로 소통 공개 API", "지하철/버스 운행 영향 공개 API"]) {
  if (userFacingDocs.includes(phrase)) failures.push(`non-protest source/domain wording must not reappear in launch docs: ${phrase}`);
}
for (const pattern of ["config/*.local.yaml", "config/*.secret.yaml", ".env", ".env.*", "*.pem", "*.key"]) {
  if (!gitignore.split("\n").includes(pattern)) failures.push(`.gitignore must block local secret pattern: ${pattern}`);
}
for (const pattern of ["apps/web/build-info.js", "apps/web/build-info.json"]) {
  if (gitignore.split("\n").includes(pattern)) failures.push(`web deploy build-info artifact must not be ignored: ${pattern}`);
  if (!trackedFiles.has(pattern)) failures.push(`web deploy build-info artifact must be tracked: ${pattern}`);
}
if (
  !/actions\/checkout@v5/.test(ciWorkflow) ||
  !/actions\/setup-node@v5/.test(ciWorkflow) ||
  !/node-version:\s*24/.test(ciWorkflow) ||
  !/package-manager-cache:\s*false/.test(ciWorkflow)
) {
  failures.push("GitHub Actions CI must use Node 24-compatible checkout/setup-node actions");
}
if (!/pnpm check:release/.test(ciWorkflow)) failures.push("GitHub Actions CI must run pnpm check:release");
if (!/fallback\.issueCards = fallback\.issueCards\.filter\(\(issue\) => !isPreviewIssue\(issue\.id\) && !isMetaPublicSourceIssue\(issue\)\)/.test(web)) {
  failures.push("production Web fallback must not expose public source bundles as issue cards");
}

const publicResponseFiles = [
  "services/api/src/app.ts",
  "packages/schemas/src/index.ts"
].map((path) => readFileSync(resolve(cwd, path), "utf8")).join("\n");
const schemasIndex = readFileSync(resolve(cwd, "packages/schemas/src/index.ts"), "utf8");
if (!/function toPublicClaim/.test(publicResponseFiles)) failures.push("toPublicClaim guard is missing");
if (!/function toPublicTarget/.test(publicResponseFiles)) failures.push("toPublicTarget guard is missing");
if (!/function toPublicAreaCluster/.test(publicResponseFiles)) failures.push("toPublicAreaCluster guard is missing");
if (/statement:\s*claim\.statement/.test(publicResponseFiles)) failures.push("raw Claim statement is exposed publicly");
if (/evidenceIds:\s*claim\.evidenceIds/.test(publicResponseFiles)) failures.push("public Claim exposes internal evidence IDs");
if (/storageKey:\s*evidence\?*\.storageKey/.test(publicResponseFiles)) failures.push("public media exposes private storage key");
if (/hash:\s*evidence\?*\.hash/.test(publicResponseFiles)) failures.push("public media exposes original media hash");
if (!/timingSafeEqual/.test(publicResponseFiles)) failures.push("internal key comparison must use timingSafeEqual");
if (!/body_too_large/.test(readFileSync(resolve(cwd, "services/api/src/http-boundary.ts"), "utf8"))) failures.push("HTTP JSON body limit is missing");
if (!/invalid_json/.test(readFileSync(resolve(cwd, "services/api/src/http-boundary.ts"), "utf8"))) failures.push("HTTP invalid JSON guard is missing");
if (!/rate_limited/.test(readFileSync(resolve(cwd, "services/api/src/http-boundary.ts"), "utf8"))) failures.push("public write rate limit is missing");
if (!/evidence\.evidenceType === "live_media" && evidence\.captureMode !== "in_app_camera"/.test(schemasIndex)) {
  failures.push("Proof-of-Presence must only accept in-app camera LIVE media");
}
if (!/minDurationMs/.test(schemasIndex) || !/\(evidence\.durationMs \?\? 0\) < policy\.minDurationMs/.test(schemasIndex)) {
  failures.push("Proof-of-Presence must reject too-short LIVE media");
}
const apiServer = readFileSync(resolve(cwd, "services/api/src/server.ts"), "utf8");
const apiApp = readFileSync(resolve(cwd, "services/api/src/app.ts"), "utf8");
const liveMediaStorage = readFileSync(resolve(cwd, "services/api/src/live-media-storage.ts"), "utf8");
const storageSmoke = readFileSync(resolve(cwd, "scripts/storage-smoke.mjs"), "utf8");
const redactionSmoke = readFileSync(resolve(cwd, "scripts/redaction-smoke.mjs"), "utf8");
const mobileIntegritySmoke = readFileSync(resolve(cwd, "scripts/mobile-integrity-smoke.mjs"), "utf8");
const operationalDiagnostics = readFileSync(resolve(cwd, "scripts/operational-readiness-diagnostics.mjs"), "utf8");
const postDeploySmoke = readFileSync(resolve(cwd, "scripts/post-deploy-smoke.mjs"), "utf8");
const serviceWatch = readFileSync(resolve(cwd, "scripts/service-watch.mjs"), "utf8");
const adminReview = readFileSync(resolve(cwd, "scripts/admin-review.mjs"), "utf8");
const renderApiSettings = readFileSync(resolve(cwd, "scripts/render-api-settings.mjs"), "utf8");
const postgresStore = readFileSync(resolve(cwd, "services/api/src/postgres-store.ts"), "utf8");
const packageJson = readFileSync(resolve(cwd, "package.json"), "utf8");
if (!/pingPostgres/.test(apiServer)) failures.push("/ready postgres ping is missing");
if (!/tcpUrlReadyCheck\("redis"/.test(apiServer)) failures.push("/ready redis reachability check is missing");
if (
  !/function describeReadiness/.test(apiApp) ||
  !/summary:\s*\{[\s\S]*failedIds/.test(apiApp) ||
  !/blockingGroups/.test(apiApp) ||
  !/requiredActions/.test(apiApp) ||
  !/function readinessAction/.test(apiApp) ||
  !/runtime_not_ready/.test(apiApp)
) {
  failures.push("/ready must expose safe summary and required actions, and not-ready writes must return the same diagnostics");
}
if (!/x-content-type-options/.test(apiServer) || !/nosniff/.test(apiServer)) failures.push("API x-content-type-options header is missing");
if (!/referrer-policy/.test(apiServer) || !/no-referrer/.test(apiServer)) failures.push("API referrer-policy header is missing");
if (!/cache-control/.test(apiServer) || !/no-store/.test(apiServer)) failures.push("API cache-control header is missing");
if (!/"vary": "Origin"/.test(apiServer)) failures.push("API Vary: Origin header is missing");
if (!/x-musunil-user-id/.test(apiServer)) failures.push("API CORS user scope header is missing");
if (!/x-musunil-user-token/.test(apiServer)) failures.push("API CORS user token header is missing");
if (!/userTokenSecret/.test(apiServer)) failures.push("API user token secret runtime wiring is missing");
if (!/includeMockData/.test(apiServer) || !/stripPreviewData/.test(apiServer)) failures.push("production mock-data strip wiring is missing");
if (!/sendPublicRedactedMedia/.test(apiServer) || !/publicRedactedMediaRoot/.test(apiServer) || !/publicRedactedMediaPrefix/.test(apiServer)) {
  failures.push("API public redacted media route is missing");
}
if (!/autoPublishLiveReports/.test(apiServer) || !/moderation\.auto_publish_low_risk_live_reports/.test(apiServer)) {
  failures.push("LIVE report moderation auto-publish wiring is missing");
}
if (!/createLiveMediaStorage/.test(apiServer) || !/liveMediaStorage:\s*runtime\.liveMediaStorage/.test(apiServer) || !/requireExternalLiveStorage:\s*runtime\.requireExternalLiveStorage/.test(apiServer)) {
  failures.push("production LIVE media storage adapter wiring is missing");
}
if (!/delete:\s*async/.test(liveMediaStorage) || !/method:\s*"DELETE"/.test(liveMediaStorage) || !/privacy_purge_storage_unavailable/.test(apiApp)) {
  failures.push("production privacy purge must delete external media objects before clearing storage keys");
}
if (!/createLiveMediaStorage/.test(storageSmoke) || !/storage_put_delete/.test(storageSmoke) || !/storage:smoke/.test(packageJson)) {
  failures.push("storage PUT/DELETE launch smoke command is missing");
}
if (/checked:\s*"storage_put_delete"[\s\S]*storageKey/.test(storageSmoke)) {
  failures.push("storage smoke must not print private storage keys");
}
if (!/"ops:diagnose"/.test(packageJson) || !/"check:ops-diagnostics"/.test(packageJson) || !/check:ops-diagnostics/.test(JSON.parse(packageJson).scripts["check:release"] ?? "")) {
  failures.push("release check must include operational readiness metadata diagnostics");
}
if (
  !/operational_metadata_diagnostics/.test(launchReady) ||
  !/"ops:diagnose",\s*"--",\s*"--require-external-smoke-ready"/.test(launchReady) ||
  !/operational_metadata_diagnostics[\s\S]*external_smoke/.test(launchReady)
) {
  failures.push("launch:ready must run operational metadata diagnostics before external smoke");
}
if (
  !/operational_readiness_metadata/.test(operationalDiagnostics) ||
  !/readyForMetadataCheck/.test(operationalDiagnostics) ||
  !/readyForExternalSmoke/.test(operationalDiagnostics) ||
  !/commandEchoSuppressed/.test(operationalDiagnostics) ||
  !/smokeCommandEchoSuppressed/.test(operationalDiagnostics)
) {
  failures.push("operational diagnostics must expose safe metadata for storage, redaction, mobile integrity, and identity");
}
if (/access_key_id/.test(operationalDiagnostics) || /secret_access_key/.test(operationalDiagnostics) || /portone_api_secret/.test(operationalDiagnostics)) {
  failures.push("operational diagnostics must not print raw secret field names that invite copying into logs");
}
if (
  !/"launch:post-deploy-smoke"/.test(packageJson) ||
  !/post-deploy-smoke-runner\.mjs/.test(packageJson) ||
  /"launch:post-deploy-smoke"\s*:\s*"[^"]*&&/.test(packageJson) ||
  !/process\.argv\.slice\(2\)/.test(postDeploySmokeRunner) ||
  !/scripts\/post-deploy-smoke\.mjs/.test(postDeploySmokeRunner) ||
  !/"check:web-deploy"/.test(postDeploySmokeRunner) ||
  !/MUSUNIL_WEB_BASE_URL/.test(postDeploySmoke) ||
  !/isDeployedHttpsUrl/.test(postDeploySmoke) ||
  !/url\.protocol === "https:"/.test(postDeploySmoke) ||
  !/web_runtime_config_alignment/.test(postDeploySmoke) ||
  !/parseWebConfig/.test(postDeploySmoke) ||
  !/mapStyleUrl/.test(postDeploySmoke) ||
  !/AbortSignal\.timeout\(requestTimeoutMs\)/.test(postDeploySmoke) ||
  !/redirect:\s*"manual"/.test(postDeploySmoke) ||
  !/assertApiSecurityHeaders/.test(postDeploySmoke) ||
  !/cors_boundary/.test(postDeploySmoke) ||
  !/not-allowed\.musunil\.invalid/.test(postDeploySmoke) ||
  !/assertPublicPayloadSafe/.test(postDeploySmoke) ||
  !/assertHomeIssueReadiness/.test(postDeploySmoke) ||
  !/at least 3 topic Issues/.test(postDeploySmoke) ||
  !/public source bundle/.test(postDeploySmoke) ||
  !/publicPayloadRoutes/.test(postDeploySmoke) ||
  !/\/issues/.test(postDeploySmoke) ||
  !/\/issues\/\$\{encodeURIComponent/.test(postDeploySmoke) ||
  !/\/targets\/issue\/\$\{encodeURIComponent/.test(postDeploySmoke) ||
  !/\/laws\/\$\{encodeURIComponent/.test(postDeploySmoke) ||
  !/\/map/.test(publicApiRoutes) ||
  !/\/ready/.test(postDeploySmoke) ||
  !/assertReadyCheck/.test(postDeploySmoke) ||
  !/"config_source"/.test(postDeploySmoke) ||
  !/"postgres"/.test(postDeploySmoke) ||
  !/"redis"/.test(postDeploySmoke) ||
  !/\/public-sources\/coverage/.test(publicApiRoutes) ||
  !/\/transparency\/logs/.test(publicApiRoutes) ||
  !/\/transparency\/monthly/.test(publicApiRoutes) ||
  !/\/me/.test(publicApiRoutes) ||
  !/\/media\/redacted\/preview-occ-live-1-poster\.png/.test(postDeploySmoke) ||
  !/\/media\/redacted\/preview-occ-live-1\.webm/.test(postDeploySmoke) ||
  !/video\/webm/.test(postDeploySmoke) ||
  !/--require-laws/.test(postDeploySmoke) ||
  !/admin\/review-queue/.test(postDeploySmoke) ||
  !/forbidden_engagement_surface_absent/.test(postDeploySmoke) ||
  !/\/comments/.test(postDeploySmoke) ||
  !/\/donations/.test(postDeploySmoke) ||
  !/hazard_area/.test(postDeploySmoke) ||
  !/service_disruption/.test(postDeploySmoke)
) {
  failures.push("post-deploy smoke command must verify deployed Web/API alignment, readiness, coverage, laws, and admin auth boundary");
}
if (!/"render:web-settings"/.test(packageJson) || !/render-web-settings\.mjs/.test(packageJson)) {
  failures.push("Render Web settings helper command is missing");
}
if (!/"build:web-headers"/.test(packageJson) || !/write-web-headers\.mjs/.test(packageJson) || !/pnpm build:web-headers/.test(JSON.parse(packageJson).scripts["build:web-static"] ?? "")) {
  failures.push("static Web build must generate portable _headers from render.yaml");
}
if (!/"render:api-settings"/.test(packageJson) || !/render-api-settings\.mjs/.test(packageJson)) {
  failures.push("Render API settings helper command is missing");
}
if (
  !/"launch:blockers"/.test(packageJson) ||
  !/"launch:blockers:strict"/.test(packageJson) ||
  !/"launch:blockers:refresh-strict"/.test(packageJson) ||
  !/launch-next-actions\.mjs/.test(packageJson) ||
  !/docs\/splus-service-watch\.md/.test(launchNextActions) ||
  !/Required Actions/.test(launchNextActions) ||
  !/--refresh/.test(launchNextActions) ||
  !/"launch:blockers:refresh-strict":\s*"node scripts\/launch-next-actions\.mjs -- --refresh --fail-on-blockers"/.test(packageJson) ||
  !/--fail-on-blockers/.test(packageJson) ||
  !/Report freshness/.test(launchNextActions) ||
  !/MUSUNIL_LAUNCH_BLOCKERS_STALE_AFTER_MINUTES/.test(launchNextActions) ||
  !/refreshRequired/.test(launchNextActions) ||
  !/refreshServiceWatch/.test(launchNextActions) ||
  !/beforeLastChecked/.test(launchNextActions) ||
  !/reportUpdated/.test(launchNextActions) ||
  !/failOnBlockers/.test(launchNextActions) ||
  !/service:watch:visual/.test(launchNextActions) ||
  !/render:api-settings/.test(launchNextActions) ||
  !/render:web-settings/.test(launchNextActions) ||
  !/cloudflare:check/.test(launchNextActions) ||
  !/cloudflare:check:strict/.test(launchNextActions) ||
  !/launch:post-deploy-smoke -- --require-laws/.test(launchNextActions)
) {
  failures.push("Launch blockers helper must summarize service watch freshness, required actions, and Web/API/laws verification commands");
}
if (
  !/"launch:cutover-rehearsal"/.test(packageJson) ||
  !/launch-cutover-rehearsal\.mjs/.test(packageJson) ||
  !/launch:blockers/.test(launchCutoverRehearsal) ||
  !/launch:cutover-plan/.test(launchCutoverRehearsal) ||
  !/launch:final-gate --list/.test(launchCutoverRehearsal) ||
  !/releaseBlocked/.test(launchCutoverRehearsal) ||
  !/nextOperatorCommand/.test(launchCutoverRehearsal) ||
  !/Ordered Operator Actions/.test(launchCutoverRehearsal) ||
  !/connect_api_endpoint/.test(launchCutoverRehearsal) ||
  !/apply_static_headers/.test(launchCutoverRehearsal) ||
  !/restore_live_issue_sync/.test(launchCutoverRehearsal) ||
  !/--refresh/.test(launchCutoverRehearsal) ||
  !/--strict/.test(launchCutoverRehearsal) ||
  !/pnpm launch:cutover-rehearsal/.test(launchCutoverRunbook) ||
  !/launch:cutover-rehearsal/.test(userFacingDocs)
) {
  failures.push("Launch cutover rehearsal helper must combine blockers, cutover plan, final gate plan, ordered operator actions, refresh, and strict modes");
}
if (
  !/"launch:final-gate"/.test(packageJson) ||
  !/launch-final-gate\.mjs/.test(packageJson) ||
  !/launch_final_gate_plan/.test(launchFinalGate) ||
  !/launch:post-deploy-smoke/.test(launchFinalGate) ||
  !/--require-laws/.test(launchFinalGate) ||
  !/launch:blockers:refresh-strict/.test(launchFinalGate) ||
  !/deriveLaunchEnv/.test(launchFinalGate) ||
  !/MUSUNIL_EXPECTED_COMMIT_SHA/.test(launchFinalGate) ||
  !/gitHead\(\)/.test(launchFinalGate) ||
  !/scope:\s*step\.scope/.test(launchFinalGate) ||
  !/command:\s*stepCommands\.get\(step\.id\)/.test(launchFinalGate) ||
  !/post_deploy_smoke[\s\S]*live_blocker_refresh_strict/.test(launchFinalGate)
) {
  failures.push("Launch final gate must run post-deploy smoke with laws and refresh-strict blockers in one ordered command");
}
if (
  !/api\.musunil\.com/.test(renderApiSettings) ||
  !/Health Check Path/.test(renderApiSettings) ||
  !/MUSUNIL_USER_INPUTS_B64/.test(renderApiSettings) ||
  !/Render generated/.test(renderApiSettings) ||
  !/Cloudflare DNS/.test(renderApiSettings) ||
  !/MUSUNIL_WEB_BASE_URL=https:\/\/musunil\.com MUSUNIL_API_BASE_URL=https:\/\/api\.musunil\.com pnpm launch:post-deploy-smoke/.test(renderApiSettings) ||
  !/pnpm launch:final-gate/.test(renderApiSettings) ||
  !/launch:post-deploy-smoke/.test(renderApiSettings) ||
  !/service:watch/.test(renderApiSettings) ||
  !/cloudflare:check/.test(renderApiSettings)
) {
  failures.push("Render API settings helper must print API custom domain, env source, and verification commands");
}
if (
  !/"cloudflare:check"/.test(packageJson) ||
  !/"cloudflare:check:strict"/.test(packageJson) ||
  !/cloudflare-dns-check\.mjs/.test(packageJson) ||
  !/cloudflare_dns_and_edge_preflight/.test(cloudflareDnsCheck) ||
  !/web_dns/.test(cloudflareDnsCheck) ||
  !/api_dns/.test(cloudflareDnsCheck) ||
  !/web_config/.test(cloudflareDnsCheck) ||
  !/web_header_smoke/.test(cloudflareDnsCheck) ||
  !/api_health/.test(cloudflareDnsCheck) ||
  !/api_ready/.test(cloudflareDnsCheck) ||
  !/connect_api_dns/.test(cloudflareDnsCheck) ||
  !/apply_static_headers/.test(cloudflareDnsCheck) ||
  !/--strict/.test(cloudflareDnsCheck)
) {
  failures.push("Cloudflare/DNS preflight helper must check Web/API DNS, Web config, headers, API health/ready, and strict mode");
}
if (!/pnpm cloudflare:check/.test(readme) || !/pnpm cloudflare:check/.test(userFacingDocs)) {
  failures.push("Cloudflare/DNS preflight helper must be documented in README and launch readiness docs");
}
const completionPassingEvidence = markdownSection(completionAudit, "## Current Local/Static Passing Evidence", "## Current Live Blockers");
if (!completionPassingEvidence) failures.push("completion audit must separate local/static passing evidence from live blockers");
if (/check:visual-surface:live/.test(completionPassingEvidence)) {
  failures.push("completion audit must not list live visual surface as current passing evidence while serviceSyncState=live is still required");
}
if (
  !/## Current Live Blockers/.test(completionAudit) ||
  !/api_endpoint_preflight/.test(completionAudit) ||
  !/web_header_contract/.test(completionAudit) ||
  !/web_visual_surface/.test(completionAudit) ||
  !/pnpm cloudflare:check:strict/.test(completionAudit) ||
  !/serviceSyncState=live/.test(completionAudit) ||
  !/pnpm launch:final-gate/.test(completionAudit) ||
  !/stale/.test(completionAudit) ||
  !/freshness window/.test(completionAudit)
) {
  failures.push("completion audit must document current live blockers, stale evidence policy, and require Cloudflare strict, live sync, and final gate evidence");
}
const localCompletedSection = markdownSection(localCompletionStatus, "## 완료", "## 외부 연결 필요");
const localExternalSection = markdownSection(localCompletionStatus, "## 외부 연결 필요", "\n## ");
if (
  !/check:visual-surface:live` 명령 준비 완료/.test(localCompletedSection) ||
  !/service:watch:visual` 명령 준비 완료/.test(localCompletedSection) ||
  !/cloudflare:check:strict/.test(localExternalSection) ||
  !/serviceSyncState=live/.test(localExternalSection) ||
  !/Render Static headers/.test(localExternalSection)
) {
  failures.push("local completion status must separate prepared live verification commands from external live completion evidence");
}
if (!/"check:web-flow"/.test(packageJson) || !/ci-web-flow-smoke\.mjs/.test(packageJson) || !/pnpm check:web-flow/.test(packageJson)) {
  failures.push("Web user-flow smoke must be wired into release checks");
}
if (
  !/home_issue_card_to_detail_and_dispute/.test(webFlowSmoke) ||
  !/detail_quick_actions_to_evidence_video_map/.test(webFlowSmoke) ||
  !/reels_actions_keep_video_objective/.test(webFlowSmoke) ||
  !/report_target_first_capture_and_receipt/.test(webFlowSmoke) ||
  !/identity_write_boundary_for_user_actions/.test(webFlowSmoke)
) {
  failures.push("Web user-flow smoke must cover home, detail, reels, report, and identity flows");
}
if (!/"check:ux-surface"/.test(packageJson) || !/ci-ux-surface-smoke\.mjs/.test(packageJson) || !/pnpm check:ux-surface/.test(packageJson)) {
  failures.push("Commercial UX surface smoke must be wired into release checks");
}
if (
  !/home_issue_first/.test(uxSurfaceSmoke) ||
  !/no_dashboard_regression/.test(uxSurfaceSmoke) ||
  !/reels_objective/.test(uxSurfaceSmoke) ||
  !/map_context_tool/.test(uxSurfaceSmoke) ||
  !/report_beginner_flow/.test(uxSurfaceSmoke) ||
  !/forbidden_social_surface/.test(uxSurfaceSmoke)
) {
  failures.push("Commercial UX surface smoke must cover issue-first home, dashboard regression, reels, map, report, and forbidden social UI");
}
if (
  !/"check:visual-surface"/.test(packageJson) ||
  !/"check:visual-surface:live"/.test(packageJson) ||
  !/ci-visual-surface-smoke\.mjs/.test(packageJson) ||
  !/--base-url https:\/\/musunil\.com/.test(packageJson) ||
  !/pnpm check:visual-surface/.test(JSON.parse(packageJson).scripts["check:release"] ?? "")
) {
  failures.push("Commercial visual surface smoke must be wired into release checks and have a live URL verification command");
}
if (
  !/mobile_390/.test(visualSurfaceSmoke) ||
  !/mobile_430/.test(visualSurfaceSmoke) ||
  !/tablet_768/.test(visualSurfaceSmoke) ||
  !/desktop_1440/.test(visualSurfaceSmoke) ||
  !/visualBaseUrlFromArgs/.test(visualSurfaceSmoke) ||
  !/MUSUNIL_VISUAL_BASE_URL/.test(visualSurfaceSmoke) ||
  !/dashboardVisible/.test(visualSurfaceSmoke) ||
  !/navOverlap/.test(visualSurfaceSmoke) ||
  !/mapSheetHeight/.test(visualSurfaceSmoke) ||
  !/reportPrimaryAction/.test(visualSurfaceSmoke)
) {
  failures.push("Commercial visual surface smoke must cover responsive viewports, dashboard regression, navigation overlap, map density, and report first action");
}
if (
  !/firstIssueActionCount/.test(visualSurfaceSmoke) ||
  !/firstIssuePrimaryActionCount/.test(visualSurfaceSmoke) ||
  !/firstIssueInteractiveCount/.test(visualSurfaceSmoke) ||
  !/firstIssueChipCount/.test(visualSurfaceSmoke) ||
  !/firstIssueRect/.test(visualSurfaceSmoke) ||
  !/first issue has too many visible action labels/.test(visualSurfaceSmoke) ||
  !/first issue must not expose dashboard-like chips/.test(visualSurfaceSmoke)
) {
  failures.push("Commercial visual surface smoke must guard first issue card density, action count, primary action count, chip count, and card height");
}
if (
  !/MUSUNIL_STRICT_WEB_HEADERS=1/.test(renderWebSettings) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(renderWebSettings) ||
  !/Clear build cache & deploy/.test(renderWebSettings) ||
  !/check:visual-surface:live/.test(renderWebSettings) ||
  !/service:watch:visual/.test(renderWebSettings) ||
  !/pnpm launch:final-gate/.test(renderWebSettings) ||
  !/Header application mode/.test(renderWebSettings) ||
  !/Manual Static Site/.test(renderWebSettings) ||
  !/Blueprint-managed/.test(renderWebSettings) ||
  !/render\.com\/docs\/static-site-headers/.test(renderWebSettings) ||
  !/cloudflare:check/.test(renderWebSettings)
) {
  failures.push("Render Web settings helper must print strict header, live visual, integrated service watch, manual/Blueprint header mode, and clear-cache redeploy instructions");
}
if (!/"launch:cutover-plan"/.test(packageJson) || !/launch-cutover-plan\.mjs/.test(packageJson)) {
  failures.push("launch cutover plan helper command is missing");
}
if (
  !/api\.musunil\.com/.test(launchCutoverPlan) ||
  !/Cloudflare DNS/.test(launchCutoverPlan) ||
  !/cloudflare:check/.test(launchCutoverPlan) ||
  !/render:api-settings/.test(launchCutoverPlan) ||
  !/render:web-settings/.test(launchCutoverPlan) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(launchCutoverPlan) ||
  !/MUSUNIL_STRICT_WEB_HEADERS=1/.test(launchCutoverPlan) ||
  !/check:visual-surface:live/.test(launchCutoverPlan) ||
  !/service:watch:visual/.test(launchCutoverPlan) ||
  !/pnpm launch:final-gate/.test(launchCutoverPlan) ||
  !/Final launch gate exits 0/.test(launchCutoverPlan) ||
  !/serviceSyncState=live/.test(launchCutoverPlan) ||
  !/\/home\.issueCards/.test(launchCutoverPlan) ||
  !/3 topic issue cards/.test(launchCutoverPlan) ||
  !/Header application mode/.test(launchCutoverPlan) ||
  !/Manual Static Site/.test(launchCutoverPlan) ||
  !/Blueprint-managed/.test(launchCutoverPlan)
) {
  failures.push("launch cutover plan must cover API DNS, Cloudflare DNS, Render header application modes, live visual surface, live data sync state, topic issue cards, and verification commands");
}
if (
  !/Launch Cutover Runbook/.test(launchCutoverRunbook) ||
  !/pnpm launch:cutover-plan/.test(launchCutoverRunbook) ||
  !/api\.musunil\.com/.test(launchCutoverRunbook) ||
  !/Cloudflare/.test(launchCutoverRunbook) ||
  !/check:visual-surface:live/.test(launchCutoverRunbook) ||
  !/identity_required/.test(launchCutoverRunbook) ||
  !/Header 적용 방식/.test(launchCutoverRunbook) ||
  !/수동 Static Site/.test(launchCutoverRunbook) ||
  !/Blueprint-managed/.test(launchCutoverRunbook)
) {
  failures.push("launch cutover runbook must explain the final service cutover, identity boundary, and manual/Blueprint static header application mode");
}
if (/sourceBundleFirst=4\/4/.test(launchCutoverRunbook) || /첫 카드가 `지역별 집회 공개 일정`/.test(launchCutoverRunbook)) {
  failures.push("launch cutover runbook current blockers must reflect the latest live issue-feed state, not stale source-bundle-first evidence");
}
if (
  !/api_endpoint_preflight/.test(serviceWatch) ||
  !/web_runtime_config/.test(serviceWatch) ||
  !/parseWebConfig/.test(serviceWatch) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(serviceWatch) ||
  !/web_header_contract/.test(serviceWatch) ||
  !/Content-Security-Policy/.test(serviceWatch) ||
  !/Permissions-Policy/.test(serviceWatch) ||
  !/Referrer-Policy/.test(serviceWatch) ||
  !/X-Content-Type-Options/.test(serviceWatch) ||
  !/X-Frame-Options/.test(serviceWatch) ||
  !/web_visual_surface/.test(serviceWatch) ||
  !/publicPayloadRoutes/.test(serviceWatch) ||
  !/assertHomeIssueFirstPayload/.test(serviceWatch) ||
  !/at least 3 topic Issues/.test(serviceWatch) ||
  !/public source bundle/.test(serviceWatch) ||
  !/serviceStates/.test(serviceWatch) ||
  !/firstIssues/.test(serviceWatch) ||
  !/sourceBundleFirst/.test(serviceWatch) ||
  !/non-live data state/.test(serviceWatch) ||
  !/withVisualSurface/.test(serviceWatch) ||
  !/checks\.every\(\(item\) => item\.ok\)/.test(serviceWatch) ||
  !/run_live_visual_surface_check/.test(serviceWatch) ||
  !/stop_live_visual_surface_regression/.test(serviceWatch) ||
  !/restore_issue_first_live_data/.test(serviceWatch) ||
  !/restore_issue_first_api_payload/.test(serviceWatch) ||
  !/requiredActions/.test(serviceWatch) ||
  !/connect_api_endpoint/.test(serviceWatch) ||
  !/fix_web_runtime_config/.test(serviceWatch) ||
  !/pnpm launch:final-gate/.test(serviceWatch) ||
  !/render:api-settings/.test(serviceWatch) ||
  !/apply_static_headers/.test(serviceWatch) ||
  !/cloudflare:check/.test(serviceWatch) ||
  !/deploy_latest_static/.test(serviceWatch) ||
  !/publish_build_metadata/.test(serviceWatch) ||
  !/fix_api_readiness/.test(serviceWatch) ||
  !/stop_public_payload_regression/.test(serviceWatch) ||
  !/docs\/launch-cutover-runbook\.md/.test(serviceWatch) ||
  !/deployedHttpsUrl/.test(serviceWatch) ||
  !/skipIfApiUnreachable/.test(serviceWatch) ||
  !/skipped:\s*true/.test(serviceWatch)
) {
  failures.push("service-watch must separate API endpoint preflight failure from downstream skipped API checks, optionally run live visual surface, and produce actionable launch required actions");
}
if (!/skipped\.length > 0/.test(launchNextActions)) {
  failures.push("launch blockers helper must treat skipped service-watch checks as release blockers");
}
if (!/"service:watch:visual"/.test(packageJson) || !/--with-visual/.test(packageJson)) {
  failures.push("service-watch visual command must be exposed for post-deploy live render verification");
}
if (
  !/redaction_engine_smoke/.test(redactionSmoke) ||
  !/redaction\.engine_smoke_command/.test(redactionSmoke) ||
  !/shellQuote/.test(redactionSmoke) ||
  !/stdio:\s*\["ignore",\s*"pipe",\s*"pipe"\]/.test(redactionSmoke) ||
  !/"redaction:smoke"/.test(packageJson) ||
  !/redaction\.engine_smoke_command/.test(readFileSync(resolve(cwd, "packages/config/src/index.ts"), "utf8"))
) {
  failures.push("redaction engine launch smoke command is missing");
}
if (/process\.(stdout|stderr)\.write\(data\)/.test(mobileIntegritySmoke)) {
  failures.push("mobile integrity smoke must not stream provider output into launch logs");
}
if (!/liveMediaEncryptionKey:\s*runtime\.liveMediaEncryptionKey/.test(apiServer) || !/security\.media_encryption_key/.test(apiServer)) {
  failures.push("production LIVE media encryption key wiring is missing");
}
if (!/requireExternalLiveStorage/.test(apiApp) || !/live_storage_unavailable/.test(apiApp) || !/encryptLiveMediaBytes/.test(apiApp)) {
  failures.push("production LIVE media must fail closed without external storage");
}
if (!/deviceIntegrityProofHash/.test(apiApp) || !/device_integrity_proof_required/.test(apiApp) || !/deviceIntegrityProvider/.test(apiApp)) {
  failures.push("internal device integrity verifier provenance guard is missing");
}
if (!/function hasPublishableLiveEvidence/.test(apiApp) || !/function hasTrustedDeviceIntegrity/.test(apiApp) || !/device_integrity_required/.test(apiApp)) {
  failures.push("public LIVE evidence must require trusted device integrity before publish");
}
const liveReport = apiApp.match(/function postLiveReport[\s\S]*?function liveUploadBytes/);
const fieldVerification = apiApp.match(/function postFieldVerification[\s\S]*?function postMaterialReport/);
if (
  !liveReport ||
  !fieldVerification ||
  !/uploadedAt:\s*upload\.uploadedAt/.test(liveReport[0]) ||
  /readDate\(data,\s*"uploadedAt"/.test(liveReport[0]) ||
  !/uploadedAt:\s*new Date\(\)/.test(fieldVerification[0]) ||
  /readDate\(data,\s*"uploadedAt"/.test(fieldVerification[0]) ||
  !/"field_verification_queued_for_device_integrity"/.test(fieldVerification[0]) ||
  !/visibility:\s*"held_private"/.test(fieldVerification[0])
) {
  failures.push("Proof-of-Presence upload time and field verification visibility must be server-authoritative");
}
const configIndex = readFileSync(resolve(cwd, "packages/config/src/index.ts"), "utf8");
if (!/android_play_integrity_service_account_json_b64/.test(configIndex) || !/requireServiceAccountJsonB64/.test(configIndex) || !/ios_team_id/.test(readFileSync(resolve(cwd, "config/musunil.user-inputs.template.yaml"), "utf8"))) {
  failures.push("mobile integrity verifier launch credentials are missing");
}
if (!/"mobile:integrity-smoke"/.test(packageJson) || !/mobile_integrity_provider_dry_run/.test(readFileSync(resolve(cwd, "scripts/mobile-integrity-smoke.mjs"), "utf8")) || !/integrity_smoke_command/.test(configIndex)) {
  failures.push("mobile integrity verifier launch smoke command is missing");
}
const adminClaimReview = apiApp.match(/function patchAdminClaim[\s\S]*?function postReconcileLifecycle/);
if (!adminClaimReview || !/claim\.fieldVerification/.test(adminClaimReview[0]) || !/device_integrity_required/.test(adminClaimReview[0])) {
  failures.push("public field verification must require trusted device integrity before publish");
}
if (
  !/function patchInternalEvidenceRedaction/.test(apiApp) ||
  !/redaction_worker_required/.test(apiApp) ||
  !/redaction_proof_required/.test(apiApp) ||
  !/redactionProofHash/.test(apiApp) ||
  !/publicPosterKey/.test(apiApp) ||
  !/redactedPosterUrl_invalid/.test(apiApp) ||
  !/hasCompletedRedaction/.test(apiApp) ||
  !adminClaimReview ||
  /publicStorageKey\s*=/.test(adminClaimReview[0]) ||
  /publicPosterKey\s*=/.test(adminClaimReview[0]) ||
  /redactionStatus\s*=\s*"completed"/.test(adminClaimReview[0])
) {
  failures.push("redacted media URLs must only be recorded by the internal redaction worker");
}
const adminCliClaim = adminReview.match(/command === "claim"[\s\S]*?} else if \(command ===/);
if (!/"admin:redaction"/.test(packageJson) || !/command === "redaction"/.test(adminReview) || !/poster-url/.test(adminReview) || /redactedClipUrl/.test(adminCliClaim?.[0] ?? "")) {
  failures.push("admin CLI redaction must use the worker-only route, not admin claim review");
}
if (!/productionRuntime/.test(apiServer) || !/includeMockData:\s*!productionRuntime/.test(apiServer) || !/autoPublishLiveReports:\s*false/.test(apiServer)) {
  failures.push("API config-failure fallback must disable mock data in production and disable LIVE auto-publish");
}
if (!/requireReadyForWrites:\s*runtime\.requireReadyForWrites/.test(apiServer) || !/requireReadyForWrites:\s*production/.test(apiServer) || !/runtime_not_ready/.test(apiApp)) {
  failures.push("production writes must fail closed when runtime is not ready");
}
if (!/persistQueue/.test(apiServer)) failures.push("Postgres snapshot writes must be serialized");
if (!/encryptionKey/.test(apiServer) || !/savePostgresStore\(databaseUrl, app\.store, runtime\.encryptionKey\)/.test(apiServer)) {
  failures.push("Postgres snapshot encryption key wiring is missing");
}
if (!/createCipheriv\("aes-256-gcm"/.test(postgresStore) || !/state_ciphertext/.test(postgresStore)) {
  failures.push("Postgres snapshot encryption storage is missing");
}
if (!/withUserScope/.test(apiApp) || !/verifyUserToken/.test(apiApp) || !/user_scope_required/.test(apiApp)) failures.push("user-owned route token guard is missing");
if (!/verifiedBodyUserId/.test(apiApp) || !/requireVerifiedBodyUserId/.test(apiApp)) failures.push("public report owner token guard is missing");
if (!/userTokenTtlMs/.test(apiApp) || !/expiresAt/.test(apiApp)) failures.push("anonymous user tokens must expire");
if (/x-musunil-user-secret/.test(apiApp)) failures.push("user token secret must not be read from request headers");
if (!/held_private/.test(apiApp) || !/publicClaimsForTarget/.test(apiApp) || !/setClaimVisibility/.test(apiApp)) {
  failures.push("held-private Claim visibility guard is missing");
}
if (!/allowsNotificationForSubscription/.test(apiApp)) failures.push("notification alertTypes/mute guard is missing");
if (!/hasRecentNotification/.test(apiApp) || !/notificationCooldownMs/.test(apiApp)) failures.push("notification dedupe/cooldown guard is missing");
if (!/local_dispatch_completed/.test(apiApp) || !/notification\.status = "sent"/.test(apiApp) || !/notification\.sentAt = now/.test(apiApp)) {
  failures.push("notification dispatch must mark due outbox items sent");
}
if (!/postPrivacyPurgeExpired/.test(apiApp) || !/privacy_purge_completed/.test(apiApp)) failures.push("privacy retention purge route is missing");
if (!/public_source_claim_refreshed/.test(apiApp)) failures.push("public source ingest idempotency guard is missing");
if (!/public-sources\/coverage/.test(apiApp) || !/sourceCoverageReport/.test(apiApp)) failures.push("public source coverage API is missing");
if (!/function homeCardOrderScore/.test(apiApp)) failures.push("API home cards must not rank archive/stat cards first");
if (!/issueCards\(store, cards\)/.test(apiApp) || !/function issueCards/.test(apiApp) || !/function issueTargets/.test(apiApp) || !/function isPublicSourceBundleIssue/.test(apiApp)) {
  failures.push("API home must expose issue-first cards with linked target groups and exclude public source bundles");
}
if (!/targets: targets\.map/.test(apiApp) || !/\/issues\//.test(apiApp)) failures.push("issue detail API must return linked targets");
if (!/resolveIssueIdForIngest/.test(apiApp) || !/topicTitle/.test(apiApp) || !/부정선거 의혹 제기 집회/.test(apiApp)) {
  failures.push("public occurrence ingest must group explicit assembly topics into claim-safe Issues");
}
if (!/isPublicSourceBundleIssueId/.test(apiApp) || !/topicIssueId/.test(apiApp) || !/issue_public_/.test(apiApp)) {
  failures.push("public occurrence ingest must move public source bundle payloads into concrete topic Issues when a topic is detected");
}
const publicCrowdEstimate = apiApp.match(/function toPublicCrowdEstimate[\s\S]*?function crowdEstimateEvidenceStrength/);
if (!publicCrowdEstimate || !/sourceProvenance:\s*"musunil_ai_estimate"/.test(publicCrowdEstimate[0]) || !/evidenceStrength/.test(publicCrowdEstimate[0]) || !/riskLevel:\s*"misleading_possible"/.test(publicCrowdEstimate[0])) {
  failures.push("public CrowdEstimate must expose AI estimate as Claim provenance/evidence/risk");
}
const derivedCrowdEstimate = apiApp.match(/function derivedCrowdEstimateForScope[\s\S]*?function lowerCrowdConfidence/);
const crowdEstimateList = apiApp.match(/function crowdEstimatesForIssue[\s\S]*?function crowdEstimateHasPublicBasis/);
if (!crowdEstimateList || !/crowdEstimateHasPublicBasis/.test(crowdEstimateList[0])) {
  failures.push("stored CrowdEstimate values must require current public live evidence basis");
}
if (!derivedCrowdEstimate || !/independentViewpointCount = new Set\(liveEvidence\.map/.test(derivedCrowdEstimate[0]) || /Math\.max\(regions\.size/.test(derivedCrowdEstimate[0])) {
  failures.push("derived CrowdEstimate independent viewpoints must come from publishable live evidence, not target regions");
}
if (!derivedCrowdEstimate || !/if \(!liveEvidence\.length\) return undefined/.test(derivedCrowdEstimate[0])) {
  failures.push("derived CrowdEstimate must not generate numeric ranges without publishable live evidence");
}
for (const removedTarget of ["transit_occurrence", "crowd_density_signal", "route_segment", "route_checkpoint"]) {
  if (apiApp.includes(removedTarget)) failures.push(`removed public target type still present in API app: ${removedTarget}`);
}
const publicIngestWorker = readFileSync(resolve(cwd, "workers/public-source-ingest/src/index.ts"), "utf8");
const publicSourceRegistry = readFileSync(resolve(cwd, "packages/schemas/src/public-sources.ts"), "utf8");
if (!/response\.ok/.test(publicIngestWorker) || !/process\.exit\(1\)/.test(publicIngestWorker)) {
  failures.push("public source ingest worker must fail non-zero when API posts fail");
}
if (!/public_source_parse_empty/.test(publicIngestWorker)) failures.push("public source ingest worker must fail when parser returns zero rows");
if (!/law_source_parse_empty/.test(publicIngestWorker) || publicIngestWorker.indexOf("law_source_parse_empty") > publicIngestWorker.indexOf("laws_dry_run")) {
  failures.push("law source ingest dry-run must fail when parser returns zero rows");
}
if (!/AbortController/.test(publicIngestWorker)) failures.push("public source ingest worker fetch timeout is missing");
if (!/\/internal\/ingest\/public-occurrence/.test(publicIngestWorker)) failures.push("public source ingest worker must post public occurrences to the occurrence ingest route");
if (!/policeRegions/.test(publicSourceRegistry) || !/sourceCoverageReport/.test(publicSourceRegistry) || !/sourceOperationalDiagnostics/.test(publicSourceRegistry)) failures.push("public source nationwide coverage registry is missing");
if (!/absence_of_public_source_is_not_absence_of_assembly/.test(publicSourceRegistry)) {
  failures.push("public source coverage must not treat source absence as no assembly");
}
if (!/seoul_assembly_control/.test(publicSourceRegistry) || !/sejong_today_assembly/.test(publicSourceRegistry) || !/daegu_today_assembly/.test(publicSourceRegistry) || !/daejeon_today_assembly/.test(publicSourceRegistry) || !/gangwon_today_assembly/.test(publicSourceRegistry) || !/busan_today_assembly/.test(publicSourceRegistry) || !/gyeonggi_south_today_assembly/.test(publicSourceRegistry) || !/gyeonggi_north_today_assembly/.test(publicSourceRegistry) || !/gwangju_today_assembly/.test(publicSourceRegistry) || !/incheon_today_assembly/.test(publicSourceRegistry) || !/gyeongbuk_today_assembly/.test(publicSourceRegistry) || !/gyeongnam_today_assembly/.test(publicSourceRegistry) || !/jeju_today_assembly/.test(publicSourceRegistry) || !/chungbuk_today_assembly/.test(publicSourceRegistry) || !/chungnam_today_assembly/.test(publicSourceRegistry) || !/jeonbuk_today_assembly/.test(publicSourceRegistry) || !/jeonnam_today_assembly/.test(publicSourceRegistry) || !/ulsan_today_assembly/.test(publicSourceRegistry) || !/needs_discovery/.test(publicSourceRegistry)) {
  failures.push("public source registry must separate active sources from unresolved regions");
}
if (!/--diagnose/.test(publicIngestWorker) || !/--require-operational-readiness/.test(publicIngestWorker)) {
  failures.push("public source ingest worker must expose metadata-only operational diagnostics");
}
if (!/"sources:diagnose"/.test(rootPackageJson) || !/"check:source-diagnostics"/.test(rootPackageJson) || !/check:source-diagnostics/.test(JSON.parse(rootPackageJson).scripts["check:release"] ?? "")) {
  failures.push("release check must include public source operational diagnostics");
}
if (!/--laws-diagnose/.test(publicIngestWorker) || !/--require-law-metadata/.test(publicIngestWorker) || !/lawOperationalDiagnostics/.test(publicIngestWorker)) {
  failures.push("law source ingest worker must expose metadata-only law diagnostics");
}
if (!/"sources:laws-diagnose"/.test(rootPackageJson) || !/"check:law-diagnostics"/.test(rootPackageJson) || !/check:law-diagnostics/.test(JSON.parse(rootPackageJson).scripts["check:release"] ?? "")) {
  failures.push("release check must include law source metadata diagnostics");
}
if (!/MUSUNIL_WEB_CONFIG/.test(web)) failures.push("web runtime config hook is missing");
if (!/build-info\.js/.test(web)) failures.push("web build-info hook is missing");
if (
  !/const writeBuildInfo/.test(webConfigWriter) ||
  !/MUSUNIL_WRITE_BUILD_INFO/.test(webConfigWriter) ||
  !/if \(writeBuildInfo\)/.test(webConfigWriter)
) {
  failures.push("web config writer must preserve tracked build-info placeholders unless Render or an explicit build-info flag is used");
}
if (!/"check:build-info-clean"/.test(packageJson) || !/ci-build-info-clean\.mjs/.test(packageJson) || !/pnpm check:build-info-clean/.test(JSON.parse(packageJson).scripts["check:release"] ?? "")) {
  failures.push("release check must verify local commands preserve tracked build-info placeholders");
}
if (
  !/generated-at-build/.test(webDeployCheck) ||
  !/staticManifestVerified/.test(webDeployCheck) ||
  !/web_build_info_placeholder/.test(webDeployCheck) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(webDeployCheck) ||
  !/parseWebConfig/.test(webDeployCheck) ||
  !/Content-Security-Policy/.test(webDeployCheck) ||
  !/Permissions-Policy/.test(webDeployCheck) ||
  !/X-Frame-Options/.test(webDeployCheck)
) {
  failures.push("web deploy check must verify static manifest freshness, deployed apiBaseUrl, and live security headers before tolerating tracked build-info placeholders");
}
if (
  !/static-manifest\.json/.test(webDeployCheck) ||
  !/assertAllLiveManifestFiles/.test(webDeployCheck) ||
  !/assertLiveFileHash/.test(webDeployCheck) ||
  !/_headers/.test(webDeployCheck) ||
  !/createHash\("sha256"\)/.test(webStaticManifestScript)
) {
  failures.push("web deploy check must verify every static manifest file hash, including _headers");
}
if (!/일정 확인/.test(web) || !/public-sources\/coverage/.test(web)) failures.push("web public source coverage status is missing");
if (/const API = "http:\/\/localhost:4000"/.test(web)) failures.push("web API base is hardcoded to localhost");
if (!/function safePublicApiBase/.test(web) || !/https:\/\/api\.musunil\.com/.test(web)) failures.push("web must ignore stale localhost config on production domains");
if (!/isLocalPage/.test(web) || !/storedApi = isLocalPage/.test(web) || !/apiParam = isLocalPage/.test(web)) {
  failures.push("web API override must be localhost-only");
}
if (!/MUSUNIL_WEB_API_BASE_URL/.test(webServer) || !/allowLocal:\s*true/.test(webServer) || !/pathname === "\/config\.js"/.test(webServer)) {
  failures.push("serve-web must support safe runtime web config override for local smoke");
}
if (!/isPreviewApiBase/.test(web) || !/fallback\.cards = fallback\.cards\.filter\(\(card\) => !isPreviewCard/.test(web) || !/isPreviewIssue/.test(web)) {
  failures.push("web production fallback must hide preview/mock data");
}
if (!/data-time-filter="now"/.test(web) || !/function matchesCardFilters/.test(web) || !/function cardOrderScore/.test(web)) {
  failures.push("web home filters must drive real card ordering");
}
if (!/id="issues"/.test(web) || !/function renderIssues/.test(web) || !/selectedIssue/.test(web) || !/function renderIssueDetail/.test(web)) {
  failures.push("web home must prioritize issue-first navigation");
}
if (!/detailMode === "issue"/.test(web) || !/followTargetType/.test(web)) failures.push("web follow action must subscribe to the selected issue when issue detail is open");
if (!/data-time-filter="archive"/.test(web)) failures.push("web must keep past/archive records intentionally reachable");
for (const term of ["요청사항", "S+", "s+", "국평오", "정통법", "객관화 보드"]) {
  if (web.includes(term)) failures.push(`internal planning term leaked to web UI: ${term}`);
}
for (const token of ["--primary", "--official", "--pending", "--dispute", "--risk", "--archive"]) {
  if (!web.includes(token)) failures.push(`semantic color token missing: ${token}`);
}
if (/#325bd6|#a96513|#6552a3/i.test(web)) failures.push("legacy hard-coded map/status color found");
if (!/chip\.schedule/.test(web) || !/chip\.archive/.test(web) || !/function semanticColor/.test(web)) {
  failures.push("web color system must cover schedule/archive chips and map semantic colors");
}
if (!/<details class="coverage-panel"/.test(web)) failures.push("public source coverage panel must be secondary/collapsible");
if (/data-tab-view="home">내정보/.test(web)) failures.push("mobile nav must not expose inactive personal tab");
if (!/content-security-policy/.test(webServer) || !/permissions-policy/.test(webServer) || !/x-frame-options/.test(webServer)) {
  failures.push("local static web security headers are missing");
}
validateWebRuntimeConfig(webConfigJs, failures, loaded?.config);
if (!/healthCheckPath:\s*\/ready/.test(renderYaml)) failures.push("Render API health check must use /ready");
for (const [serviceName, block] of [
  ["musunil-api", renderApi],
  ["musunil-web", renderWeb],
  ["musunil-public-source-ingest", renderPublicSourceIngest],
  ["musunil-law-source-ingest", renderLawSourceIngest],
  ["musunil-notification-dispatch", renderNotificationDispatch],
  ["musunil-privacy-purge", renderPrivacyPurge]
]) {
  if (!/key:\s*MUSUNIL_RUNTIME_ENV[\s\S]*?value:\s*production/.test(block)) failures.push(`${serviceName} must set MUSUNIL_RUNTIME_ENV=production`);
}
if (!/preDeployCommand:\s*pnpm db:migrate/.test(renderYaml)) failures.push("Render API preDeployCommand must run pnpm db:migrate");
if (!/name:\s*musunil-api[\s\S]*?buildCommand:[^\n]*pnpm check[^\n]*pnpm build:web-config[^\n]*pnpm launch:check/.test(renderYaml)) {
  failures.push("Render API build must run pnpm check, pnpm build:web-config, and pnpm launch:check");
}
const packageScripts = JSON.parse(packageJson).scripts ?? {};
const renderWebBuildScript = packageScripts["build:web-static:render"] ?? "";
if (
  !/"build:web-static:render"/.test(packageJson) ||
  !/MUSUNIL_WEB_API_BASE_URL=https:\/\/api\.musunil\.com/.test(renderWebBuildScript) ||
  !/MUSUNIL_WRITE_BUILD_INFO=1/.test(renderWebBuildScript) ||
  !/pnpm build:web-static/.test(renderWebBuildScript) ||
  !/pnpm check:web-smoke/.test(renderWebBuildScript)
) {
  failures.push("package.json must define build:web-static:render with production API base, build-info writing, static build, and web smoke");
}
if (!/name:\s*musunil-web[\s\S]*?buildCommand:\s*corepack enable && pnpm install --frozen-lockfile && pnpm build:web-static:render/.test(renderYaml)) {
  failures.push("Render Web buildCommand must use pnpm build:web-static:render");
}
if (!/Build Command:\s*corepack enable && pnpm install --frozen-lockfile && pnpm build:web-static:render/.test(readme)) {
  failures.push("README Render Static Site build command must match pnpm build:web-static:render");
}
if (!/Render Static Site는 `pnpm build:web-static:render`/.test(readme) || !/MUSUNIL_WRITE_BUILD_INFO=1/.test(readme)) {
  failures.push("README must explain that build:web-static:render writes build-info and preserves local placeholders");
}
if (!/MUSUNIL_STRICT_WEB_HEADERS=1[^\n]*MUSUNIL_EXPECTED_API_BASE_URL=https:\/\/api\.musunil\.com[^\n]*pnpm check:web-deploy/.test(readme)) {
  failures.push("README strict web deploy check must verify the expected API base URL");
}
for (const header of ["Cache-Control", "Content-Security-Policy", "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options"]) {
  if (!hasRenderHeader(renderWeb, header)) failures.push(`Render Web static header is missing: ${header}`);
}
if (!/Content-Security-Policy[\s\S]*media-src\s+'self'\s+https:\s+blob:/.test(renderWeb)) {
  failures.push("Render Web static CSP must allow public redacted video via media-src");
}
if (!/render\.yaml/.test(webHeaderWriter) || !/apps\/web\/_headers/.test(webHeaderWriter) || !/Content-Security-Policy/.test(webHeaderWriter)) {
  failures.push("static Web _headers writer must mirror render.yaml security headers");
}
if (!/databases:\s*[\s\S]*-\s+name:\s*musunil-postgres\b[\s\S]*databaseName:\s*musunil\b[\s\S]*ipAllowList:\s*\[\]/.test(renderYaml)) {
  failures.push("Render managed Postgres must be declared with private-network-only access");
}
if (!/type:\s*keyvalue\b/.test(renderRedis) || !/ipAllowList:\s*\[\]/.test(renderRedis)) {
  failures.push("Render managed Key Value must be declared with private-network-only access");
}
if (!hasRenderPostgresEnv(renderApi, "DATABASE_URL") || !hasRenderKeyValueEnv(renderApi, "REDIS_URL")) {
  failures.push("Render API must receive DATABASE_URL and REDIS_URL from managed resources");
}
if (!hasRenderSyncFalseEnv(renderApi, "MUSUNIL_USER_INPUTS_B64")) {
  failures.push("Render API must prompt once for MUSUNIL_USER_INPUTS_B64");
}
if (!hasRenderGeneratedEnv(renderApi, "MUSUNIL_INTERNAL_API_KEY")) {
  failures.push("Render API must generate MUSUNIL_INTERNAL_API_KEY for internal cron/admin calls");
}
if (!hasRenderGeneratedEnv(renderApi, "MUSUNIL_USER_TOKEN_SECRET")) {
  failures.push("Render API must generate MUSUNIL_USER_TOKEN_SECRET for anonymous user tokens");
}
if (!hasRenderGeneratedEnv(renderApi, "MUSUNIL_ENCRYPTION_KEY")) {
  failures.push("Render API must generate MUSUNIL_ENCRYPTION_KEY for encrypted snapshots");
}
if (!/key:\s*NODE_VERSION[\s\S]*?value:\s*24/.test(renderWeb)) failures.push("Render Web must set NODE_VERSION=24");
if (!/key:\s*MUSUNIL_RUNTIME_ENV[\s\S]*?value:\s*production/.test(renderWeb)) failures.push("Render Web must set MUSUNIL_RUNTIME_ENV=production");
for (const [serviceName, block] of [
  ["musunil-public-source-ingest", renderPublicSourceIngest],
  ["musunil-law-source-ingest", renderLawSourceIngest],
  ["musunil-notification-dispatch", renderNotificationDispatch],
  ["musunil-privacy-purge", renderPrivacyPurge]
]) {
  if (!hasRenderApiHostportEnv(block)) failures.push(`${serviceName} must receive MUSUNIL_API_HOSTPORT from musunil-api`);
  if (!hasRenderInternalKeyFromApiEnv(block)) failures.push(`${serviceName} must receive MUSUNIL_INTERNAL_API_KEY from musunil-api`);
  if (serviceName === "musunil-law-source-ingest") {
    if (!hasRenderEnvFromApiEnv(block, "MUSUNIL_USER_INPUTS_B64")) failures.push(`${serviceName} must reuse MUSUNIL_USER_INPUTS_B64 from musunil-api`);
  } else if (/key:\s*MUSUNIL_USER_INPUTS_B64/.test(block)) {
    failures.push(`${serviceName} must not prompt for full user-input YAML`);
  }
}
if (!/maxShutdownDelaySeconds:\s*30/.test(renderYaml)) failures.push("Render API maxShutdownDelaySeconds must be set");
if (!/SIGTERM/.test(readFileSync(resolve(cwd, "services/api/src/server.ts"), "utf8"))) failures.push("API graceful shutdown handler is missing");
if (!/name:\s*musunil-public-source-ingest[\s\S]*?type:\s*cron|type:\s*cron[\s\S]*?name:\s*musunil-public-source-ingest/.test(renderYaml)) {
  failures.push("public source ingest cron is missing from render.yaml");
}
if (!/startCommand:\s*pnpm --filter @musunil\/public-source-ingest dev -- --post/.test(renderPublicSourceIngest)) {
  failures.push("public source ingest cron startCommand must post parsed public occurrences");
}
if (!/name:\s*musunil-law-source-ingest[\s\S]*?type:\s*cron|type:\s*cron[\s\S]*?name:\s*musunil-law-source-ingest/.test(renderYaml)) {
  failures.push("law source ingest cron is missing from render.yaml");
}
if (!/schedule:\s*"17 0,12 \* \* \*"/.test(renderLawSourceIngest)) {
  failures.push("law source ingest cron must run twice daily.");
}
if (!/startCommand:\s*pnpm --filter @musunil\/public-source-ingest dev -- --laws --post/.test(renderLawSourceIngest)) {
  failures.push("law source ingest cron startCommand must post parsed law items");
}
if (!/name:\s*musunil-notification-dispatch[\s\S]*?type:\s*cron|type:\s*cron[\s\S]*?name:\s*musunil-notification-dispatch/.test(renderYaml)) {
  failures.push("notification dispatch cron is missing from render.yaml");
}
if (!/startCommand:\s*pnpm dispatch:notifications/.test(renderNotificationDispatch)) {
  failures.push("notification dispatch cron startCommand must run pnpm dispatch:notifications");
}
if (!/name:\s*musunil-privacy-purge[\s\S]*?type:\s*cron|type:\s*cron[\s\S]*?name:\s*musunil-privacy-purge/.test(renderYaml)) {
  failures.push("privacy purge cron is missing from render.yaml");
}
if (!/startCommand:\s*pnpm privacy:purge/.test(renderPrivacyPurge)) {
  failures.push("privacy purge cron startCommand must run pnpm privacy:purge");
}

if (failures.length > 0) {
  console.error(["Launch check failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log(`Launch check passed with ${loaded?.source ?? "unknown"} config.`);

function validateWebRuntimeConfig(source, failures, config) {
  const forbiddenPublicBundlePatterns = [
    /internal_api_key/i,
    /internalApiKey/i,
    /internal_base_url/i,
    /jwt_secret/i,
    /encryption_key/i,
    /media_encryption_key/i,
    /secret_access_key/i,
    /secret_key/i,
    /webhook_secret/i,
    /private_key/i,
    /database_url/i,
    /postgres/i,
    /redis/i,
    /MUSUNIL_USER_INPUTS_B64/i
  ];
  for (const pattern of forbiddenPublicBundlePatterns) {
    if (pattern.test(source)) failures.push(`forbidden web config secret/internal pattern found: ${pattern}`);
  }

  const match = source.match(/window\.MUSUNIL_WEB_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*$/);
  if (!match) {
    failures.push("web runtime config must assign a JSON object to window.MUSUNIL_WEB_CONFIG");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    failures.push("web runtime config must be valid JSON");
    return;
  }

  const allowedKeys = new Set(["apiBaseUrl", "mapStyleUrl"]);
  for (const key of Object.keys(parsed)) {
    if (!allowedKeys.has(key)) failures.push(`web runtime config exposes non-public key: ${key}`);
  }
  for (const key of allowedKeys) {
    if (typeof parsed[key] !== "string" || parsed[key].length === 0) {
      failures.push(`web runtime config missing public string: ${key}`);
    }
  }

  if (config) {
    const expectedApiBaseUrl = readConfigString(config, "api.public_base_url") ?? "http://localhost:4000";
    const expectedMapStyleUrl = readConfigString(config, "map.map_style_url") ?? "https://tiles.openfreemap.org/styles/positron";
    if (parsed.apiBaseUrl !== expectedApiBaseUrl) {
      failures.push("web runtime config apiBaseUrl does not match api.public_base_url. Run pnpm build:web-config.");
    }
    if (parsed.mapStyleUrl !== expectedMapStyleUrl) {
      failures.push("web runtime config mapStyleUrl does not match map.map_style_url. Run pnpm build:web-config.");
    }
  }
}

function readConfigString(config, path) {
  const value = path.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function renderServiceBlock(source, name) {
  const lines = source.split("\n");
  for (let start = 0; start < lines.length; start += 1) {
    if (!/^\s*-\s+type:/.test(lines[start])) continue;
    let end = start + 1;
    while (end < lines.length && !/^\s*-\s+type:/.test(lines[end]) && !/^\S/.test(lines[end])) end += 1;
    const block = lines.slice(start, end).join("\n");
    if (new RegExp(`^ {4}name:\\s*${escapeRegExp(name)}\\s*$`, "m").test(block)) return block;
  }
  return "";
}

function hasRenderPostgresEnv(block, key) {
  return new RegExp(`key:\\s*${escapeRegExp(key)}\\s*[\\s\\S]*fromDatabase:\\s*[\\s\\S]*name:\\s*musunil-postgres\\s*[\\s\\S]*property:\\s*connectionString`).test(block);
}

function hasRenderKeyValueEnv(block, key) {
  return new RegExp(`key:\\s*${escapeRegExp(key)}\\s*[\\s\\S]*fromService:\\s*[\\s\\S]*type:\\s*keyvalue\\s*[\\s\\S]*name:\\s*musunil-redis\\s*[\\s\\S]*property:\\s*connectionString`).test(block);
}

function hasRenderApiHostportEnv(block) {
  return new RegExp(`key:\\s*MUSUNIL_API_HOSTPORT\\s*[\\s\\S]*fromService:\\s*[\\s\\S]*type:\\s*web\\s*[\\s\\S]*name:\\s*musunil-api\\s*[\\s\\S]*property:\\s*hostport`).test(block);
}

function hasRenderInternalKeyFromApiEnv(block) {
  return new RegExp(`key:\\s*MUSUNIL_INTERNAL_API_KEY\\s*[\\s\\S]*fromService:\\s*[\\s\\S]*type:\\s*web\\s*[\\s\\S]*name:\\s*musunil-api\\s*[\\s\\S]*envVarKey:\\s*MUSUNIL_INTERNAL_API_KEY`).test(block);
}

function hasRenderEnvFromApiEnv(block, key) {
  return new RegExp(`key:\\s*${escapeRegExp(key)}\\s*[\\s\\S]*fromService:\\s*[\\s\\S]*type:\\s*web\\s*[\\s\\S]*name:\\s*musunil-api\\s*[\\s\\S]*envVarKey:\\s*${escapeRegExp(key)}`).test(block);
}

function hasRenderGeneratedEnv(block, key) {
  return new RegExp(`key:\\s*${escapeRegExp(key)}\\s*\\n\\s*generateValue:\\s*true`).test(block);
}

function hasRenderSyncFalseEnv(block, key) {
  return new RegExp(`key:\\s*${escapeRegExp(key)}\\s*\\n\\s*sync:\\s*false`).test(block);
}

function hasRenderHeader(block, name) {
  return new RegExp(`headers:[\\s\\S]*name:\\s*${escapeRegExp(name)}\\s*\\n\\s*value:`).test(block);
}

function markdownSection(source, heading, nextHeading) {
  const start = source.indexOf(heading);
  if (start < 0) return "";
  const end = source.indexOf(nextHeading, start + heading.length);
  return source.slice(start, end < 0 ? undefined : end);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function gitTrackedFiles() {
  try {
    return new Set(execFileSync("git", ["ls-files"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}
