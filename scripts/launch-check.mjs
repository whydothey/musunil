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
const webPublicApi = readFileSync(resolve(cwd, "apps/web/modules/public-api.js"), "utf8");
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
const splusUxTracker = readFileSync(resolve(cwd, "docs/splus-ux-tracker.md"), "utf8");
const webConfigJs = readFileSync(resolve(cwd, "apps/web/config.js"), "utf8");
const webConfigWriter = readFileSync(resolve(cwd, "scripts/write-web-config.mjs"), "utf8");
const webHeaderWriter = readFileSync(resolve(cwd, "scripts/write-web-headers.mjs"), "utf8");
const webServer = readFileSync(resolve(cwd, "scripts/serve-web.mjs"), "utf8");
const webDeployCheck = readFileSync(resolve(cwd, "scripts/check-web-deploy.mjs"), "utf8");
const webRenderBuildOutputCheck = readFileSync(resolve(cwd, "scripts/ci-web-render-build-output.mjs"), "utf8");
const webRenderBuildCommandCheck = readFileSync(resolve(cwd, "scripts/ci-web-render-build-command.mjs"), "utf8");
const renderWebSettings = readFileSync(resolve(cwd, "scripts/render-web-settings.mjs"), "utf8");
const renderApply = readFileSync(resolve(cwd, "scripts/render-apply.mjs"), "utf8");
const renderRuntimeSecret = readFileSync(resolve(cwd, "scripts/render-runtime-secret.mjs"), "utf8");
const renderRuntimeSecretSafety = readFileSync(resolve(cwd, "scripts/ci-render-runtime-secret-safety.mjs"), "utf8");
const renderProvisioningPlan = readFileSync(resolve(cwd, "scripts/render-provisioning-plan.mjs"), "utf8");
const renderBlueprintContract = readFileSync(resolve(cwd, "scripts/ci-render-blueprint-contract.mjs"), "utf8");
const launchCutoverPlan = readFileSync(resolve(cwd, "scripts/launch-cutover-plan.mjs"), "utf8");
const launchApply = readFileSync(resolve(cwd, "scripts/launch-apply.mjs"), "utf8");
const cloudflareDnsCheck = readFileSync(resolve(cwd, "scripts/cloudflare-dns-check.mjs"), "utf8");
const launchNextActions = readFileSync(resolve(cwd, "scripts/launch-next-actions.mjs"), "utf8");
const launchReady = readFileSync(resolve(cwd, "scripts/launch-ready.mjs"), "utf8");
const externalSmoke = readFileSync(resolve(cwd, "scripts/external-smoke.mjs"), "utf8");
const launchFinalGate = readFileSync(resolve(cwd, "scripts/launch-final-gate.mjs"), "utf8");
const launchCutoverRehearsal = readFileSync(resolve(cwd, "scripts/launch-cutover-rehearsal.mjs"), "utf8");
const launchOperatorBrief = readFileSync(resolve(cwd, "scripts/launch-operator-brief.mjs"), "utf8");
const launchMissingInputs = readFileSync(resolve(cwd, "scripts/launch-missing-inputs.mjs"), "utf8");
const checkLaunchInputs = readFileSync(resolve(cwd, "scripts/check-launch-inputs.mjs"), "utf8");
const userInputsShapeCheck = readFileSync(resolve(cwd, "scripts/check-user-inputs-shape.mjs"), "utf8");
const ciLaunchCheck = readFileSync(resolve(cwd, "scripts/ci-launch-check.mjs"), "utf8");
const launchHandoff = readFileSync(resolve(cwd, "scripts/launch-handoff.mjs"), "utf8");
const cloudflareDnsTemplate = readFileSync(resolve(cwd, "scripts/cloudflare-dns-template.mjs"), "utf8");
const cloudflareResponseHeaders = readFileSync(resolve(cwd, "scripts/cloudflare-response-headers-template.mjs"), "utf8");
const cloudflareApply = readFileSync(resolve(cwd, "scripts/cloudflare-apply.mjs"), "utf8");
const launchCutoverRunbook = readFileSync(resolve(cwd, "docs/launch-cutover-runbook.md"), "utf8");
const launchOperatorBriefDoc = readFileSync(resolve(cwd, "docs/launch-operator-brief.md"), "utf8");
const launchMissingInputsDoc = readFileSync(resolve(cwd, "docs/launch-missing-inputs.md"), "utf8");
const userInputsManual = readFileSync(resolve(cwd, "docs/user-inputs-manual.md"), "utf8");
const serviceWatchDoc = readFileSync(resolve(cwd, "docs/splus-service-watch.md"), "utf8");
const serviceWatchLastChecked = serviceWatchDoc.match(/^Last checked:\s*(.+)$/m)?.[1]?.trim() || "";
const launchOperatorBriefServiceWatch = launchOperatorBriefDoc.match(/^- Service watch:\s*([^\s(]+).*$/m)?.[1]?.trim() || "";
const launchMissingInputsBlockerReport = launchMissingInputsDoc.match(/^- Blocker report:\s*([^\s(]+).*$/m)?.[1]?.trim() || "";
const serviceWatchWebDeploymentReady = ["web_static_manifest", "web_runtime_config", "web_build_info", "web_header_contract"].every((id) =>
  new RegExp(`\\|\\s*${id}\\s*\\|\\s*ok\\s*\\|`).test(serviceWatchDoc)
);
const cloudflareDnsRecordsDoc = readFileSync(resolve(cwd, "docs/cloudflare-dns-records.md"), "utf8");
const cloudflareDnsRecordsTerraform = readFileSync(resolve(cwd, "infra/cloudflare/dns-records.tf.example"), "utf8");
const cloudflareResponseHeadersDoc = readFileSync(resolve(cwd, "docs/cloudflare-response-headers.md"), "utf8");
const cloudflareResponseHeadersTerraform = readFileSync(resolve(cwd, "infra/cloudflare/response-headers.tf.example"), "utf8");
const webProductionSmoke = readFileSync(resolve(cwd, "scripts/ci-web-next-production.mjs"), "utf8");
const visualSurfaceSmoke = readFileSync(resolve(cwd, "scripts/ci-web-next-visual.mjs"), "utf8");
const publicApiRoutes = readFileSync(resolve(cwd, "scripts/public-api-routes.mjs"), "utf8");
const webStaticManifestScript = readFileSync(resolve(cwd, "scripts/write-web-static-manifest.mjs"), "utf8");
const postDeploySmokeRunner = readFileSync(resolve(cwd, "scripts/post-deploy-smoke-runner.mjs"), "utf8");
const githubPostDeployWorkflow = readFileSync(resolve(cwd, "scripts/github-post-deploy-workflow.mjs"), "utf8");
const githubCiStatus = readFileSync(resolve(cwd, "scripts/github-ci-status.mjs"), "utf8");
const publicSourceRefreshPreflight = readFileSync(resolve(cwd, "scripts/public-source-refresh-preflight.mjs"), "utf8");
const lawSourceIngest = readFileSync(resolve(cwd, "workers/public-source-ingest/src/laws.ts"), "utf8");
const opsScheduler = readFileSync(resolve(cwd, "services/api/src/ops-scheduler.ts"), "utf8");
const opsSchedulerContract = readFileSync(resolve(cwd, "services/api/src/ops-scheduler-contract.ts"), "utf8");
const opsSchedulerMigration = readFileSync(resolve(cwd, "services/api/migrations/011_ops_task_leases.sql"), "utf8");
const httpBoundary = readFileSync(resolve(cwd, "services/api/src/http-boundary.ts"), "utf8");
const rootPackageJson = readFileSync(resolve(cwd, "package.json"), "utf8");
const ciWorkflow = readFileSync(resolve(cwd, ".github/workflows/ci.yml"), "utf8");
const postDeployWorkflow = readFileSync(resolve(cwd, ".github/workflows/post-deploy.yml"), "utf8");
const gitignore = readFileSync(resolve(cwd, ".gitignore"), "utf8");
const readme = readFileSync(resolve(cwd, "README.md"), "utf8");
const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const renderBackendYaml = readFileSync(resolve(cwd, "render.backend.yaml"), "utf8");
const renderApi = renderServiceBlock(renderYaml, "musunil-api");
const renderWeb = renderServiceBlock(renderYaml, "musunil-web");
const renderRedis = renderServiceBlock(renderYaml, "musunil-redis");
const renderOpsScheduler = renderServiceBlock(renderYaml, "musunil-ops-scheduler");
const forbiddenPatterns = [
  /[🪧📊⛺🚇👥🚧➰]/u,
  /자유 댓글|추천\/비추천|찬반투표/u,
  /hazard_area|service_disruption/u
];
if (!/Ensure ffmpeg runtime/.test(ciWorkflow) || !/command -v ffmpeg/.test(ciWorkflow)) {
  failures.push("GitHub Actions must install ffmpeg when the runner image does not provide it");
}
for (const key of ["DATABASE_URL", "REDIS_URL", "MUSUNIL_USER_INPUTS_B64", "MUSUNIL_USER_INPUTS_FILE_PATH", "MUSUNIL_USER_TOKEN_SECRET", "MUSUNIL_ENCRYPTION_KEY", "MUSUNIL_INTERNAL_API_KEY"]) {
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
for (const phrase of [
  "장기 현장/교통/인파/경로/제보",
  "교통 통제/도로 소통 공개 API",
  "지하철/버스 운행 영향 공개 API",
  "경찰·지자체·교통 API",
  "공개 집회/교통 자료"
]) {
  if (userFacingDocs.includes(phrase)) failures.push(`non-protest source/domain wording must not reappear in launch docs: ${phrase}`);
  if (readme.includes(phrase)) failures.push(`non-protest source/domain wording must not reappear in README: ${phrase}`);
}
if (!/sensor는 영상 제보 proof로 인정하지 않는다/.test(userFacingDocs)) {
  failures.push("launch docs must state that field sensor signals are not LIVE video Proof-of-Presence");
}
for (const pattern of ["config/*.local.yaml", "config/*.secret.yaml", ".env", ".env.*", "*.pem", "*.key", "docs/cloudflare-dns-records.local.md", "infra/cloudflare/dns-records.local.tfvars"]) {
  if (!gitignore.split("\n").includes(pattern)) failures.push(`.gitignore must block local secret pattern: ${pattern}`);
}
for (const pattern of ["apps/web/public/build-info.js", "apps/web/public/build-info.json"]) {
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
if (
  !/"ci:status":\s*"node scripts\/github-ci-status\.mjs"/.test(rootPackageJson) ||
  !/checked:\s*"github_ci_status"/.test(githubCiStatus) ||
  !/--workflow/.test(githubCiStatus) ||
  !/ci\.yml/.test(githubCiStatus) ||
  !/--commit/.test(githubCiStatus) ||
  !/gh", "run", "watch"/.test(githubCiStatus) ||
  !/Queued means GitHub has accepted the workflow/.test(githubCiStatus) ||
  !/pnpm ci:status/.test(readme) ||
  !/pnpm ci:status/.test(userFacingDocs) ||
  !/pnpm ci:status/.test(launchOperatorBrief) ||
  !/pnpm ci:status/.test(launchOperatorBriefDoc) ||
  !/pnpm ci:status/.test(launchCutoverRunbook) ||
  !/queued/.test(userFacingDocs)
) {
  failures.push("GitHub push CI status helper must expose pnpm ci:status, current commit filtering, queued/in-progress/completed distinction, and a gh run watch command");
}
if (
  !/name:\s*post-deploy/.test(postDeployWorkflow) ||
  !/workflow_dispatch/.test(postDeployWorkflow) ||
  !/verification_mode/.test(postDeployWorkflow) ||
  !/web-deploy/.test(postDeployWorkflow) ||
  !/final-gate/.test(postDeployWorkflow) ||
  !/render_api_dns_target/.test(postDeployWorkflow) ||
  !/github_environment/.test(postDeployWorkflow) ||
  !/default:\s*"production"/.test(postDeployWorkflow) ||
  !/environment:\s*\n\s+name:\s*\$\{\{\s*inputs\.github_environment\s*\}\}/.test(postDeployWorkflow) ||
  !/INPUT_RENDER_API_DNS_TARGET/.test(postDeployWorkflow) ||
  !/RENDER_API_TOKEN:\s*\$\{\{\s*secrets\.RENDER_API_TOKEN\s*\}\}/.test(postDeployWorkflow) ||
  !/MUSUNIL_RENDER_API_TOKEN:\s*\$\{\{\s*secrets\.MUSUNIL_RENDER_API_TOKEN\s*\}\}/.test(postDeployWorkflow) ||
  !/MUSUNIL_INTERNAL_API_KEY:\s*\$\{\{\s*secrets\.MUSUNIL_INTERNAL_API_KEY\s*\}\}/.test(postDeployWorkflow) ||
  !/MUSUNIL_WEB_BASE_URL/.test(postDeployWorkflow) ||
  !/MUSUNIL_API_BASE_URL/.test(postDeployWorkflow) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(postDeployWorkflow) ||
  !/MUSUNIL_EXPECTED_COMMIT_SHA/.test(postDeployWorkflow) ||
  !/MUSUNIL_STRICT_WEB_HEADERS=1/.test(postDeployWorkflow) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET=\$render_api_dns_target/.test(postDeployWorkflow) ||
  !/pnpm check:web-render-build-command/.test(postDeployWorkflow) ||
  !/pnpm check:web-deploy/.test(postDeployWorkflow) ||
  !/pnpm launch:final-gate/.test(postDeployWorkflow) ||
  /on:\s*\n\s+push:/.test(postDeployWorkflow)
) {
  failures.push("GitHub Actions post-deploy workflow must be manual-only and verify strict Web deploy or final launch gate against deployed URLs, including optional Render API DNS target input, optional Render token secrets, and internal API key secret for strict final-gate checks");
}
if (
  !/render_api_dns_target/.test(readme) ||
  !/github_environment/.test(readme) ||
  !/pnpm launch:post-deploy-workflow/.test(readme) ||
  !/workflow\/branch\/commit/.test(readme) ||
  !/RENDER_API_TOKEN/.test(readme) ||
  !/MUSUNIL_INTERNAL_API_KEY/.test(readme) ||
  !/check:web-render-build-command/.test(readme) ||
  !/render_api_dns_target/.test(launchCutoverRunbook) ||
  !/github_environment/.test(launchCutoverRunbook) ||
  !/pnpm launch:post-deploy-workflow/.test(launchCutoverRunbook) ||
  !/workflow\/branch\/commit/.test(launchCutoverRunbook) ||
  !/RENDER_API_TOKEN/.test(launchCutoverRunbook) ||
  !/MUSUNIL_INTERNAL_API_KEY/.test(launchCutoverRunbook) ||
  !/check:web-render-build-command/.test(launchCutoverRunbook) ||
  !/render_api_dns_target/.test(userFacingDocs) ||
  !/github_environment/.test(userFacingDocs) ||
  !/pnpm launch:post-deploy-workflow/.test(userFacingDocs) ||
  !/workflow\/branch\/commit/.test(userFacingDocs) ||
  !/RENDER_API_TOKEN/.test(userFacingDocs) ||
  !/MUSUNIL_INTERNAL_API_KEY/.test(userFacingDocs) ||
  !/check:web-render-build-command/.test(userFacingDocs) ||
  !/render_api_dns_target/.test(launchCutoverPlan) ||
  !/launch:post-deploy-workflow -- --mode=final-gate/.test(launchCutoverPlan)
) {
  failures.push("post-deploy operator docs must tell the operator to generate the gh workflow command, pass Render api.musunil.com DNS target through render_api_dns_target, use github_environment for environment secrets, and document optional RENDER_API_TOKEN/MUSUNIL_INTERNAL_API_KEY secrets for remote final-gate strict DNS/source checks");
}
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
if (!/evidence\.evidenceType !== "live_media"/.test(schemasIndex) || !/evidence\.captureMode !== "in_app_camera"/.test(schemasIndex)) {
  failures.push("Proof-of-Presence must only accept in-app camera LIVE media");
}
if (!/minDurationMs/.test(schemasIndex) || !/\(evidence\.durationMs \?\? 0\) < policy\.minDurationMs/.test(schemasIndex)) {
  failures.push("Proof-of-Presence must reject too-short LIVE media");
}
const apiServer = readFileSync(resolve(cwd, "services/api/src/server.ts"), "utf8");
const apiApp = readFileSync(resolve(cwd, "services/api/src/app.ts"), "utf8");
const apiSelfCheck = readFileSync(resolve(cwd, "services/api/src/self-check.ts"), "utf8");
const liveMediaStorage = readFileSync(resolve(cwd, "services/api/src/live-media-storage.ts"), "utf8");
const storageSmoke = readFileSync(resolve(cwd, "scripts/storage-smoke.mjs"), "utf8");
const redactionSmoke = readFileSync(resolve(cwd, "scripts/redaction-smoke.mjs"), "utf8");
const redactionEngine = readFileSync(resolve(cwd, "scripts/redact-media.mjs"), "utf8");
const redactionWorker = readFileSync(resolve(cwd, "scripts/redaction-worker.mjs"), "utf8");
const dockerfile = readFileSync(resolve(cwd, "Dockerfile"), "utf8");
const dockerignore = readFileSync(resolve(cwd, ".dockerignore"), "utf8");
const mobileIntegritySmoke = readFileSync(resolve(cwd, "scripts/mobile-integrity-smoke.mjs"), "utf8");
const identitySmoke = readFileSync(resolve(cwd, "scripts/identity-smoke.mjs"), "utf8");
const operationalDiagnostics = readFileSync(resolve(cwd, "scripts/operational-readiness-diagnostics.mjs"), "utf8");
const postDeploySmoke = readFileSync(resolve(cwd, "scripts/post-deploy-smoke.mjs"), "utf8");
const serviceWatch = readFileSync(resolve(cwd, "scripts/service-watch.mjs"), "utf8");
const adminReview = readFileSync(resolve(cwd, "scripts/admin-review.mjs"), "utf8");
const renderApiSettings = readFileSync(resolve(cwd, "scripts/render-api-settings.mjs"), "utf8");
const postgresStore = readFileSync(resolve(cwd, "services/api/src/postgres-store.ts"), "utf8");
const packageJson = readFileSync(resolve(cwd, "package.json"), "utf8");
if (
  !/"check:user-inputs-shape"/.test(packageJson) ||
  !/check-user-inputs-shape\.mjs/.test(packageJson) ||
  !/checked:\s*"user_inputs_shape"/.test(userInputsShapeCheck) ||
  !/missingPaths/.test(userInputsShapeCheck) ||
  !/templatePathCount/.test(userInputsShapeCheck) ||
  !/leafPaths/.test(userInputsShapeCheck) ||
  !/scripts\/check-user-inputs-shape\.mjs/.test(checkLaunchInputs)
) {
  failures.push("launch input verification must check local YAML shape against the template before value validation");
}
if (!/pingPostgres/.test(apiServer)) failures.push("/ready postgres ping is missing");
if (!/publicWriteRateLimiter\.readiness\(\)/.test(apiServer)) failures.push("/ready authenticated Redis ping check is missing");
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
if (
  !/includeMockData/.test(apiServer) ||
  !/stripPreviewData/.test(apiServer) ||
  !/id\.includes\("_sample"\)/.test(apiApp)
) {
  failures.push("production preview/sample data strip wiring is missing");
}
if (!/sendPublicRedactedMedia/.test(apiServer) || !/publicRedactedMediaRoot/.test(apiServer) || !/publicRedactedMediaPrefix/.test(apiServer)) {
  failures.push("API public redacted media route is missing");
}
if (!/canServePublicRedactedMedia\(app\.store, url\.pathname\)/.test(apiServer) || !/isPublicClaim\(claim\) && claim\.evidenceIds\.includes/.test(apiApp)) {
  failures.push("redacted derivatives must remain inaccessible until a reviewed Claim is public");
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
if (!/createLiveMediaStorage/.test(storageSmoke) || !/storage_put_get_delete/.test(storageSmoke) || !/readBackVerified/.test(storageSmoke) || !/storage:smoke/.test(packageJson)) {
  failures.push("storage PUT/GET/DELETE launch smoke command is missing");
}
if (
  !/storageSmokePrefix/.test(liveMediaStorage) ||
  !/private\/live\/smoke\//.test(liveMediaStorage) ||
  !/function assertStorageSmokeKey/.test(liveMediaStorage) ||
  !/value\.startsWith\(prefix\)/.test(liveMediaStorage) ||
  !/value\.includes\("\.\."\)/.test(liveMediaStorage) ||
  !/value\.includes\("\/\/"\)/.test(liveMediaStorage) ||
  !/MUSUNIL_STORAGE_SMOKE_KEY must stay under/.test(liveMediaStorage) ||
  !/assertStorageSmokeKey/.test(storageSmoke) ||
  !/generatedStorageSmokeKey/.test(apiSelfCheck) ||
  !/private\/live\/original\/occ-live-1\.webm/.test(apiSelfCheck) ||
  !/nested\/\/bad\.txt/.test(apiSelfCheck) ||
  !/assert\.throws\(\(\) => assertStorageSmokeKey/.test(apiSelfCheck)
) {
  failures.push("storage smoke must execute-test custom smoke key constraints under the private/live/smoke/ prefix before PUT/DELETE");
}
if (
  !/MUSUNIL_STORAGE_SMOKE_KEY/.test(userFacingDocs) ||
  !/private\/live\/smoke\//.test(userFacingDocs) ||
  !/MUSUNIL_STORAGE_SMOKE_KEY/.test(userInputsManual) ||
  !/기존 원본 미디어 key를 넣지 않는다/.test(userInputsManual)
) {
  failures.push("operator docs must warn that storage smoke key overrides are restricted to private/live/smoke/ and must not reuse real media keys");
}
if (/checked:\s*"storage_put_get_delete"[\s\S]*storageKey/.test(storageSmoke)) {
  failures.push("storage smoke must not print private storage keys");
}
if (
  !/"identity:smoke"/.test(packageJson) ||
  !/identity_portone_verified_lookup/.test(identitySmoke) ||
  !/MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID/.test(identitySmoke) ||
  !/subjectFieldsPresent/.test(identitySmoke)
) {
  failures.push("PortOne identity launch smoke command is missing");
}
if (/identityVerificationId:\s*identityVerificationId/.test(identitySmoke) || /\bci:\s*ci\b/.test(identitySmoke) || /\bdi:\s*di\b/.test(identitySmoke)) {
  failures.push("identity smoke must not print PortOne verification id, CI, or DI values");
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
  !/MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID/.test(operationalDiagnostics) ||
  !/pnpm identity:smoke/.test(operationalDiagnostics) ||
  !/lawSources/.test(operationalDiagnostics) ||
  !/lawOperationalDiagnostics/.test(operationalDiagnostics) ||
  !/pnpm sources:laws/.test(operationalDiagnostics) ||
  !/laws_dry_run/.test(operationalDiagnostics) ||
  !/laws_disabled/.test(operationalDiagnostics) ||
  !/commandEchoSuppressed/.test(operationalDiagnostics) ||
  !/smokeCommandEchoSuppressed/.test(operationalDiagnostics)
) {
  failures.push("operational diagnostics must expose safe metadata for storage, redaction, mobile integrity, identity, and law sources");
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
  !/post_deploy_smoke_runner_plan/.test(postDeploySmokeRunner) ||
  !/deriveLaunchEnv/.test(postDeploySmokeRunner) ||
  !/MUSUNIL_WEB_BASE_URL",\s*"https:\/\/musunil\.com"/.test(postDeploySmokeRunner) ||
  !/MUSUNIL_API_BASE_URL",\s*"https:\/\/api\.musunil\.com"/.test(postDeploySmokeRunner) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(postDeploySmokeRunner) ||
  !/MUSUNIL_EXPECTED_COMMIT_SHA/.test(postDeploySmokeRunner) ||
  !/MUSUNIL_STRICT_WEB_HEADERS",\s*"1"/.test(postDeploySmokeRunner) ||
  !/strictWebHeaders/.test(postDeploySmokeRunner) ||
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
  !/formatReadinessFailure/.test(postDeploySmoke) ||
  !/blockingGroups/.test(postDeploySmoke) ||
  !/requiredActions/.test(postDeploySmoke) ||
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
  !/requireSourceRefreshes/.test(postDeploySmoke) ||
  !/--require-source-refreshes/.test(postDeploySmoke) ||
  !/sourceRefreshes/.test(postDeploySmoke) ||
  !/activeScheduleSourceId/.test(postDeploySmoke) ||
  !/resultCount/.test(postDeploySmoke) ||
  !/pnpm sources:refresh-preflight/.test(postDeploySmoke) ||
  !/admin\/review-queue/.test(postDeploySmoke) ||
  !/forbidden_engagement_surface_absent/.test(postDeploySmoke) ||
  !/\/comments/.test(postDeploySmoke) ||
  !/\/donations/.test(postDeploySmoke) ||
  !/hazard_area/.test(postDeploySmoke) ||
  !/service_disruption/.test(postDeploySmoke) ||
  !/"preview-only"/.test(postDeploySmoke) ||
  !/"mock"/.test(postDeploySmoke) ||
  !/"_sample"/.test(postDeploySmoke)
) {
  failures.push("post-deploy smoke command must verify deployed Web/API alignment, strict Web headers, readiness, coverage, laws, and admin auth boundary");
}
if (
  !/"launch:post-deploy-workflow"/.test(packageJson) ||
  !/github-post-deploy-workflow\.mjs/.test(packageJson) ||
  !/github_post_deploy_workflow_command/.test(githubPostDeployWorkflow) ||
  !/"gh", "workflow", "run", workflow/.test(githubPostDeployWorkflow) ||
  !/"post-deploy\.yml"/.test(githubPostDeployWorkflow) ||
  !/"verification_mode"/.test(githubPostDeployWorkflow) ||
  !/"web_base_url"/.test(githubPostDeployWorkflow) ||
  !/"api_base_url"/.test(githubPostDeployWorkflow) ||
  !/"expected_api_base_url"/.test(githubPostDeployWorkflow) ||
  !/"expected_commit_sha"/.test(githubPostDeployWorkflow) ||
  !/"render_api_dns_target"/.test(githubPostDeployWorkflow) ||
  !/"github_environment"/.test(githubPostDeployWorkflow) ||
  !/"production"/.test(githubPostDeployWorkflow) ||
  !/listRunCommand/.test(githubPostDeployWorkflow) ||
  !/watchCommand/.test(githubPostDeployWorkflow) ||
  !/"gh", "run", "list"/.test(githubPostDeployWorkflow) ||
  !/"--workflow", workflow/.test(githubPostDeployWorkflow) ||
  !/"--event", "workflow_dispatch"/.test(githubPostDeployWorkflow) ||
  !/"--commit", inputs\.expected_commit_sha/.test(githubPostDeployWorkflow) ||
  !/run_id=\$\(\$\{listRunCommand\}\)/.test(githubPostDeployWorkflow) ||
  !/test -n "\$run_id"/.test(githubPostDeployWorkflow) ||
  !/"gh", "run", "watch", "--repo", repo, "\$run_id", "--exit-status"/.test(githubPostDeployWorkflow) ||
  !/workflow_dispatch run id/.test(githubPostDeployWorkflow) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(githubPostDeployWorkflow) ||
  !/MUSUNIL_GITHUB_ENVIRONMENT/.test(githubPostDeployWorkflow) ||
  !/This command passes only workflow inputs/.test(githubPostDeployWorkflow) ||
  !/expected_commit_sha must be a 40-character Git SHA/.test(githubPostDeployWorkflow) ||
  !/pnpm launch:post-deploy-workflow -- --mode=web-deploy/.test(launchNextActions) ||
  !/pnpm launch:post-deploy-workflow -- --mode=final-gate/.test(launchNextActions)
) {
  failures.push("GitHub post-deploy workflow helper must generate a safe gh workflow run command with all post-deploy inputs and no CLI secret values");
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
  !/"launch:apply"/.test(packageJson) ||
  !/"launch:apply:plan"/.test(packageJson) ||
  !/launch-apply\.mjs/.test(packageJson) ||
  !/launch_apply_plan/.test(launchApply) ||
  !/RENDER_API_TOKEN/.test(launchApply) ||
  !/CLOUDFLARE_API_TOKEN/.test(launchApply) ||
  !/CLOUDFLARE_ZONE_ID/.test(launchApply) ||
  !/render-apply\.mjs/.test(launchApply) ||
  !/cloudflare-apply\.mjs/.test(launchApply) ||
  !/renderTokenConfigured/.test(launchApply) ||
  !/manualApiTargetConfigured/.test(launchApply) ||
  !/renderWriteOrInspectRequired/.test(launchApply) ||
  !/renderSkippedReason/.test(launchApply) ||
  !/manual_api_dns_target_without_render_token/.test(launchApply) ||
  !/deriveTargets/.test(launchApply) ||
  !/runLaunchSteps/.test(launchApply) ||
  !/runCloudflareSteps/.test(launchApply) ||
  !/preflight/.test(launchApply) ||
  !/applyBlocked/.test(launchApply) ||
  !/No Render or Cloudflare writes were attempted because launch apply preflight did not pass/.test(launchApply) ||
  !/renderTargetDerivationStatus/.test(launchApply) ||
  !/renderTargetDerivation/.test(launchApply) ||
  !/configured_but_target_derivation_failed/.test(launchApply) ||
  !/missing_or_render_api_target_derivation_failed/.test(launchApply) ||
  !/missing_manual_fallback_after_render_api_derivation_failed/.test(launchApply) ||
  !/render_api_service_url/.test(launchApply) ||
  !/operatorInputs/.test(launchApply) ||
  !/requiredMode/.test(launchApply) ||
  !/one_of/.test(launchApply) ||
  !/whereToFind/.test(launchApply) ||
  !/howToValidate/.test(launchApply) ||
  !/Render API key, or Render musunil-api custom-domain\/service host/.test(launchApply) ||
  !/Cloudflare user API token with musunil\.com zone DNS edit/.test(launchApply) ||
  !/render_target_source/.test(launchApply) ||
  !/cloudflare_api_token/.test(launchApply) ||
  !/cloudflare_zone/.test(launchApply) ||
  !/default_zone_name_lookup/.test(launchApply) ||
  !/cloudflareZoneName/.test(launchApply) ||
  !/token cannot read zones by name/.test(launchApply) ||
  !/requiredEnv/.test(launchApply) ||
  !/item\.env\.join\(" or "\)/.test(launchApply) ||
  !/missing\|invalid\|failed/.test(launchApply) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(launchApply) ||
  !/--cloudflare-headers/.test(launchApply) ||
  !/--cloudflare-headers-only/.test(launchApply) ||
  !/cloudflareHeadersOnly/.test(launchApply) ||
  !/cloudflareDns/.test(launchApply) ||
  !/not_required_for_header_rule/.test(launchApply) ||
  !/--deploy-web/.test(launchApply) ||
  !/--apply/.test(launchApply) ||
  !/dry_run/.test(launchApply) ||
  !/Render env vars and secret files are not replaced/.test(launchApply)
) {
  failures.push("Launch apply helper must orchestrate dry-run-first Render and Cloudflare apply using Render-derived onrender.com targets");
}
if (
  !/"render:apply"/.test(packageJson) ||
  !/"render:apply:plan"/.test(packageJson) ||
  !/render-apply\.mjs/.test(packageJson) ||
  !/render_apply_plan/.test(renderApply) ||
  !/RENDER_API_TOKEN/.test(renderApply) ||
  !/MUSUNIL_RENDER_WEB_SERVICE_ID/.test(renderApply) ||
  !/MUSUNIL_RENDER_API_SERVICE_ID/.test(renderApply) ||
  !/--apply/.test(renderApply) ||
  !/dry_run/.test(renderApply) ||
  !/upsertWebHeaders/.test(renderApply) ||
  !/ensureCustomDomain/.test(renderApply) ||
  !/verifyCustomDomain/.test(renderApply) ||
  !/triggerDeploy/.test(renderApply) ||
  !/\/services\?\$\{query\}/.test(renderApply) ||
  !/\/headers/.test(renderApply) ||
  !/\/custom-domains/.test(renderApply) ||
  !/\/deploys/.test(renderApply) ||
  !/The script does not replace service environment variables or upload secret files/.test(renderApply) ||
  !/Render API failed/.test(renderApply)
) {
  failures.push("Render apply helper must provide dry-run-first Web header, API custom-domain, and deploy automation through the official Render API");
}
if (
  !/"render:runtime-secret"/.test(packageJson) ||
  !/"check:render-runtime-secret-safety"/.test(packageJson) ||
  !/check:render-runtime-secret-safety/.test(JSON.parse(packageJson).scripts["check:release"] ?? "") ||
  !/render_runtime_secret_file/.test(renderRuntimeSecret) ||
  !/MUSUNIL_RENDER_SECRET_APPLY_CONFIRM/.test(renderRuntimeSecret) ||
  !/APPLY_RUNTIME_SECRET_FILE/.test(renderRuntimeSecret) ||
  !/owner_only_permissions_required/.test(renderRuntimeSecret) ||
  !/check-launch-inputs\.mjs/.test(renderRuntimeSecret) ||
  !/musunil-api/.test(renderRuntimeSecret) ||
  !/musunil-ops-scheduler/.test(renderRuntimeSecret) ||
  !/\/secret-files\//.test(renderRuntimeSecret) ||
  !/\/env-vars\//.test(renderRuntimeSecret) ||
  !/Render runtime secret safety check passed/.test(renderRuntimeSecretSafety)
) {
  failures.push("Render runtime Secret File helper must validate inputs, require explicit apply confirmation, update API and scheduler, and have a release safety test");
}
if (
  !/"render:provisioning-plan"/.test(packageJson) ||
  !/"check:render-blueprint-contract"/.test(packageJson) ||
  !/check:render-blueprint-contract/.test(JSON.parse(packageJson).scripts["check:release"] ?? "") ||
  !/render_backend_provisioning_plan/.test(renderProvisioningPlan) ||
  !/render\.backend\.yaml/.test(renderProvisioningPlan) ||
  !/APPROVE_MINIMUM_14_USD_PLUS_USAGE_TAX/.test(renderProvisioningPlan) ||
  !/estimatedMinimumUsdPerMonth/.test(renderProvisioningPlan) ||
  !/Render backend Blueprint contract passed/.test(renderBlueprintContract) ||
  /name:\s*musunil-web\b/.test(renderBackendYaml) ||
  !/name:\s*musunil-api\b/.test(renderBackendYaml) ||
  !/name:\s*musunil-postgres\b/.test(renderBackendYaml) ||
  !/name:\s*musunil-ops-scheduler\b/.test(renderBackendYaml) ||
  !/name:\s*musunil-redis\b/.test(renderBackendYaml)
) {
  failures.push("Render backend provisioning must preserve the existing Web, make paid resources explicit, and require a cost-aware preflight");
}
if (
  !/"launch:next-actions":\s*"node scripts\/launch-next-actions\.mjs"/.test(packageJson) ||
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
  !/goalState/.test(launchNextActions) ||
  !/launchState/.test(launchNextActions) ||
  !/blockerStage/.test(launchNextActions) ||
  !/launchApplyInputsReady/.test(launchNextActions) ||
  !/headerApplyInputsReady/.test(launchNextActions) ||
  !/requiredLaunchInputsMissing/.test(launchNextActions) ||
  !/requiredHeaderInputsMissing/.test(launchNextActions) ||
  !/nextOperatorPrerequisite/.test(launchNextActions) ||
  !/nextOperatorCommandScope/.test(launchNextActions) ||
  !/nextApplyCommand/.test(launchNextActions) ||
  !/preExternalChangeChecks/.test(launchNextActions) ||
  !/Pre-External-Change Checks/.test(launchNextActions) ||
  !/render_static_build_contract/.test(launchNextActions) ||
  !/web_headers_only_dry_run/.test(launchNextActions) ||
  !/render_cloudflare_apply_dry_run/.test(launchNextActions) ||
  !/commandScopeForStage/.test(launchNextActions) ||
  !/Immediate safe command/.test(launchNextActions) ||
  !/Apply command after inputs/.test(launchNextActions) ||
  !/Before apply command/.test(launchNextActions) ||
  !/Before next command/.test(launchNextActions) ||
  !/필수 입력이 비어 있으면/.test(launchNextActions) ||
  !/canApplyHeaderOnly/.test(launchNextActions) ||
  !/전체 API DNS 적용 입력은 아직 부족하지만 Web header-only 경로는 준비됐다/.test(launchNextActions) ||
  !/pnpm launch:apply -- --apply --cloudflare-headers-only/.test(launchNextActions) ||
  !/manualApiTargetPath/.test(launchNextActions) ||
  !/manual_api_dns_target_without_render_token/.test(launchNextActions) ||
  !/Render automation: skipped/.test(launchNextActions) ||
  !/Render Dashboard target을 수동 입력한 경로다/.test(launchNextActions) ||
  !/deploy_latest_static/.test(launchNextActions) ||
  !/retry_live_static_manifest/.test(launchNextActions) ||
  !/actionIds\.has\("retry_live_static_manifest"\)[\s\S]*return "retry_live_static_manifest"/.test(launchNextActions) ||
  !/actionIds\.has\("deploy_latest_static"\)[\s\S]*return "deploy_latest_static"/.test(launchNextActions) ||
  !/check:web-render-build-command/.test(launchNextActions) ||
  !/Render onrender\.com target/.test(launchNextActions) ||
  !/nextOperatorCommand/.test(launchNextActions) ||
  !/splitApplyPaths/.test(launchNextActions) ||
  !/Split Apply Paths/.test(launchNextActions) ||
  !/web_headers_only/.test(launchNextActions) ||
  !/webProxyModeForPlan/.test(launchNextActions) ||
  !/Web proxy observed/.test(launchNextActions) ||
  !/api_dns_and_render_domain/.test(launchNextActions) ||
  !/Launch readiness/.test(launchNextActions) ||
  !/Current stage/.test(launchNextActions) ||
  !/MUSUNIL_LAUNCH_BLOCKERS_STALE_AFTER_MINUTES/.test(launchNextActions) ||
  !/refreshRequired/.test(launchNextActions) ||
  !/staleDecisionWarning/.test(launchNextActions) ||
  !/actionsAdvisoryOnly/.test(launchNextActions) ||
  !/STALE LIVE EVIDENCE/.test(launchNextActions) ||
  !/diagnostic only/.test(launchNextActions) ||
  !/Do not change Render\/Cloudflare settings/.test(launchNextActions) ||
  !/Split Apply Paths \(stale evidence\)/.test(launchNextActions) ||
  !/Blocking Checks \(stale evidence\)/.test(launchNextActions) ||
  !/Required Actions \(stale evidence\)/.test(launchNextActions) ||
  !/refreshServiceWatch/.test(launchNextActions) ||
  !/beforeLastChecked/.test(launchNextActions) ||
  !/reportUpdated/.test(launchNextActions) ||
  !/failOnBlockers/.test(launchNextActions) ||
  !/service:watch:visual/.test(launchNextActions) ||
  !/launch:apply/.test(launchNextActions) ||
  !/launch:apply -- --apply/.test(launchNextActions) ||
  !/runLaunchApplyPlan/.test(launchNextActions) ||
  !/runLaunchApplyPlan\("--cloudflare-headers-only"\)/.test(launchNextActions) ||
  !/Launch Apply Inputs/.test(launchNextActions) ||
  !/operatorInputs/.test(launchNextActions) ||
  !/\| ID \| Required \| Status \| Env \| Where \| Validate \|/.test(launchNextActions) ||
  !/whereToFind/.test(launchNextActions) ||
  !/howToValidate/.test(launchNextActions) ||
  !/requiredEnv/.test(launchNextActions) ||
  !/Inputs ready/.test(launchNextActions) ||
  !/Missing:/.test(launchNextActions) ||
  !/requiredInputs/.test(launchNextActions) ||
  !/render:api-settings/.test(launchNextActions) ||
  !/render:web-settings/.test(launchNextActions) ||
  !/render:apply/.test(launchNextActions) ||
  !/cloudflare:dns/.test(launchNextActions) ||
  !/cloudflare:headers/.test(launchNextActions) ||
  !/cloudflare:apply/.test(launchNextActions) ||
  !/cloudflare:check/.test(launchNextActions) ||
  !/cloudflare:check:strict/.test(launchNextActions) ||
  !/pnpm sources:refresh-preflight/.test(launchNextActions) ||
  !/launch:post-deploy-smoke -- --require-laws --require-source-refreshes/.test(launchNextActions)
) {
  failures.push("Launch blockers helper must summarize service watch freshness, required actions, and Web/API/laws verification commands");
}
if (
  !/web_proxy_mode/.test(cloudflareDnsCheck) ||
  !/proxyObserved/.test(cloudflareDnsCheck) ||
  !/Response Header Transform Rules require proxied Web DNS records/.test(cloudflareDnsCheck) ||
  !/pnpm cloudflare:check/.test(cloudflareResponseHeadersDoc) ||
  !/web_proxy_mode\.proxyObserved/.test(cloudflareResponseHeadersDoc)
) {
  failures.push("Cloudflare header fallback must expose Web proxy mode because response header transform rules only affect proxied Web records");
}
const operatorCommandSurfaces = [
  ["scripts/launch-next-actions.mjs", launchNextActions],
  ["scripts/launch-cutover-rehearsal.mjs", launchCutoverRehearsal],
  ["scripts/launch-cutover-plan.mjs", launchCutoverPlan],
  ["scripts/render-web-settings.mjs", renderWebSettings],
  ["scripts/render-api-settings.mjs", renderApiSettings],
  ["scripts/service-watch.mjs", serviceWatch],
  ["docs/launch-cutover-runbook.md", launchCutoverRunbook],
  ["docs/launch-operator-brief.md", launchOperatorBriefDoc],
  ["docs/splus-service-watch.md", serviceWatchDoc],
  ["docs/user-inputs-manual.md", userInputsManual],
  ["README.md", readme]
];
for (const [surface, source] of operatorCommandSurfaces) {
  if (/<Render (API|Web|musunil)[^>]*target>/i.test(source)) {
    failures.push(`${surface} must not print angle-bracket Render DNS target placeholders in operator commands`);
  }
  if (/srv-actual-[^\s"`']*\.onrender\.com/i.test(source)) {
    failures.push(`${surface} must not print fake Render DNS target examples in operator commands`);
  }
}
if (
  !/deriveTargets/.test(launchApply) ||
  !/render_api_service_url/.test(launchApply) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(launchApply) ||
  !/Render service onrender\.com hosts are derived only from Render API serviceDetails\.url/.test(launchApply) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET:\?set exact Render API target from Render first/.test(launchNextActions) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET:\?set exact Render API target from Render first/.test(launchCutoverPlan) ||
  !/pnpm launch:apply -- --apply/.test(launchNextActions) ||
  !/pnpm launch:apply -- --apply --cloudflare-headers-only/.test(launchNextActions) ||
  !/pnpm launch:apply -- --apply/.test(launchCutoverRehearsal) ||
  !/pnpm launch:apply -- --apply --cloudflare-headers-only/.test(launchCutoverRehearsal) ||
  !/pnpm launch:apply -- --apply/.test(serviceWatch)
  || !/pnpm launch:apply -- --apply --cloudflare-headers-only/.test(serviceWatch)
) {
  failures.push("Operator DNS helpers must derive the real Render API target from Render API serviceDetails.url, keep a manual MUSUNIL_RENDER_API_DNS_TARGET fallback, and expose strict DNS verification");
}
if (
  !/"launch:cutover-rehearsal"/.test(packageJson) ||
  !/launch-cutover-rehearsal\.mjs/.test(packageJson) ||
  !/launch:blockers/.test(launchCutoverRehearsal) ||
  !/launch:cutover-plan/.test(launchCutoverRehearsal) ||
  !/launch:final-gate --list/.test(launchCutoverRehearsal) ||
  !/launch:ready --list/.test(launchCutoverRehearsal) ||
  !/launch:external-smoke --list/.test(launchCutoverRehearsal) ||
  !/goalState/.test(launchCutoverRehearsal) ||
  !/launchState/.test(launchCutoverRehearsal) ||
  !/launchApplyInputsReady/.test(launchCutoverRehearsal) ||
  !/requiredLaunchInputsMissing/.test(launchCutoverRehearsal) ||
  !/Active goal/.test(launchCutoverRehearsal) ||
  !/Launch readiness/.test(launchCutoverRehearsal) ||
  !/releaseBlocked/.test(launchCutoverRehearsal) ||
  !/nextOperatorPrerequisite/.test(launchCutoverRehearsal) ||
  !/nextOperatorCommandScope/.test(launchCutoverRehearsal) ||
  !/nextApplyCommand/.test(launchCutoverRehearsal) ||
  !/preExternalChangeChecks/.test(launchCutoverRehearsal) ||
  !/Pre-External-Change Checks/.test(launchCutoverRehearsal) ||
  !/Immediate safe command/.test(launchCutoverRehearsal) ||
  !/Apply command after inputs/.test(launchCutoverRehearsal) ||
  !/Before apply command/.test(launchCutoverRehearsal) ||
  !/blockersData\.nextOperatorPrerequisite/.test(launchCutoverRehearsal) ||
  !/Before next command/.test(launchCutoverRehearsal) ||
  !/deploy_latest_static/.test(launchCutoverRehearsal) ||
  !/retry_live_static_manifest/.test(launchCutoverRehearsal) ||
  !/actionIds\.has\("retry_live_static_manifest"\)[\s\S]*return "retry_live_static_manifest"/.test(launchCutoverRehearsal) ||
  !/actionIds\.has\("deploy_latest_static"\)[\s\S]*return "deploy_latest_static"/.test(launchCutoverRehearsal) ||
  !/"deploy_latest_static"[\s\S]*"connect_api_endpoint"/.test(launchCutoverRehearsal) ||
  !/Render onrender\.com target/.test(launchCutoverRehearsal) ||
  !/nextOperatorCommand/.test(launchCutoverRehearsal) ||
  !/blockersData\.nextOperatorCommand/.test(launchCutoverRehearsal) ||
  !/launch:apply/.test(launchCutoverRehearsal) ||
  !/Ordered Operator Actions/.test(launchCutoverRehearsal) ||
  !/Split Apply Paths/.test(launchCutoverRehearsal) ||
  !/splitApplyPaths/.test(launchCutoverRehearsal) ||
  !/staleDecisionWarning/.test(launchCutoverRehearsal) ||
  !/actionsAdvisoryOnly/.test(launchCutoverRehearsal) ||
  !/STALE LIVE EVIDENCE/.test(launchCutoverRehearsal) ||
  !/diagnostic only/.test(launchCutoverRehearsal) ||
  !/Do not change Render\/Cloudflare settings/.test(launchCutoverRehearsal) ||
  !/Ordered Operator Actions \(stale evidence\)/.test(launchCutoverRehearsal) ||
  !/Inputs ready/.test(launchCutoverRehearsal) ||
  !/missingInputs/.test(launchCutoverRehearsal) ||
  !/connect_api_endpoint/.test(launchCutoverRehearsal) ||
  !/deploy_latest_static/.test(launchCutoverPlan) ||
  !/cloudflare:dns/.test(launchCutoverRehearsal) ||
  !/apply_static_headers/.test(launchCutoverRehearsal) ||
  !/cloudflare:check/.test(launchCutoverRehearsal) ||
  !/web_proxy_mode\.proxyObserved=true/.test(launchCutoverRehearsal) ||
  !/restore_live_issue_sync/.test(launchCutoverRehearsal) ||
  !/Launch Ready Plan/.test(launchCutoverRehearsal) ||
  !/External Smoke Proofs/.test(launchCutoverRehearsal) ||
  !/proofMarker/.test(launchCutoverRehearsal) ||
  !/proofContract/.test(launchCutoverRehearsal) ||
  !/contract:/.test(launchCutoverRehearsal) ||
  !/proofContract/.test(externalSmoke) ||
  !/storage_put_get_delete/.test(externalSmoke) ||
  !/redaction_engine_smoke/.test(externalSmoke) ||
  !/mobile_integrity_provider_dry_run/.test(externalSmoke) ||
  !/structured JSON with checked, provider, packageName or bundleId\/teamId, and verdict/.test(externalSmoke) ||
  !/identity_portone_verified_lookup/.test(externalSmoke) ||
  !/--refresh/.test(launchCutoverRehearsal) ||
  !/--strict/.test(launchCutoverRehearsal) ||
  !/pnpm launch:cutover-rehearsal/.test(launchCutoverRunbook) ||
  !/launch:cutover-rehearsal/.test(userFacingDocs)
) {
  failures.push("Launch cutover rehearsal helper must combine blockers, cutover plan, final gate plan, ordered operator actions, refresh, and strict modes");
}
if (
  /return "pnpm launch:apply && pnpm launch:final-gate"/.test(launchNextActions) ||
  /return "pnpm launch:apply && pnpm launch:final-gate"/.test(launchCutoverRehearsal) ||
  /Next command:\s*`pnpm launch:apply && pnpm launch:final-gate`/.test(launchOperatorBriefDoc) ||
  /\|\s*`pnpm launch:apply && pnpm launch:final-gate`\s*\|/.test(launchCutoverRunbook) ||
  /^\|\s*connect_api_endpoint\s*\|.*pnpm launch:apply && pnpm launch:final-gate.*$/m.test(serviceWatchDoc)
) {
  failures.push("Launch helpers must not suggest final-gate immediately after a dry-run-only launch:apply when required operator inputs are missing");
}
if (
  !/"launch:operator-brief"/.test(packageJson) ||
  !/launch-operator-brief\.mjs/.test(packageJson) ||
  !/launch_operator_brief/.test(launchOperatorBrief) ||
  !/docs\/launch-operator-brief\.md/.test(launchOperatorBrief) ||
  !/launch-cutover-rehearsal\.mjs/.test(launchOperatorBrief) ||
  !/launch-cutover-plan\.mjs/.test(launchOperatorBrief) ||
  !/render-web-settings\.mjs/.test(launchOperatorBrief) ||
  !/render-api-settings\.mjs/.test(launchOperatorBrief) ||
  !/launch-apply\.mjs/.test(launchOperatorBrief) ||
  !/launchApplyPlan/.test(launchOperatorBrief) ||
  !/launchInputLines/.test(launchOperatorBrief) ||
  !/splitApplyPathLines/.test(launchOperatorBrief) ||
  !/Split apply paths from current blockers/.test(launchOperatorBrief) ||
  !/Web proxy observed/.test(launchOperatorBrief) ||
  !/Inputs ready/.test(launchOperatorBrief) ||
  !/missingInputs/.test(launchOperatorBrief) ||
  !/render:apply/.test(launchOperatorBrief) ||
  !/launch-ready\.mjs/.test(launchOperatorBrief) ||
  !/external-smoke\.mjs/.test(launchOperatorBrief) ||
  !/pnpm launch:handoff/.test(launchOperatorBrief) ||
  !/goalState/.test(launchOperatorBrief) ||
  !/launchState/.test(launchOperatorBrief) ||
  !/nextOperatorPrerequisite/.test(launchOperatorBrief) ||
  !/nextOperatorCommandScope/.test(launchOperatorBrief) ||
  !/nextApplyCommand/.test(launchOperatorBrief) ||
  !/operatorCommandLines/.test(launchOperatorBrief) ||
  !/preExternalChangeChecks/.test(launchOperatorBrief) ||
  !/preExternalChangeSection/.test(launchOperatorBrief) ||
  !/Pre-External-Change Checks/.test(launchOperatorBrief) ||
  !/staleDecisionWarning/.test(launchOperatorBrief) ||
  !/actionsAdvisoryOnly/.test(launchOperatorBrief) ||
  !/staleEvidenceSection/.test(launchOperatorBrief) ||
  !/STALE LIVE EVIDENCE/.test(launchOperatorBrief) ||
  !/diagnostic only/.test(launchOperatorBrief) ||
  !/Do not change Render\/Cloudflare settings/.test(launchOperatorBrief) ||
  !/Split apply paths from current blockers \(stale evidence\)/.test(launchOperatorBrief) ||
  !/What To Do Now \(stale evidence\)/.test(launchOperatorBrief) ||
  !/Immediate safe command/.test(launchOperatorBrief) ||
  !/Apply command after inputs/.test(launchOperatorBrief) ||
  !/Before apply command/.test(launchOperatorBrief) ||
  !/Before next command/.test(launchOperatorBrief) ||
  !/Immediate safe command/.test(launchOperatorBriefDoc) ||
  !/Apply command after inputs/.test(launchOperatorBriefDoc) ||
  !/Before apply command/.test(launchOperatorBriefDoc) ||
  !/Pre-External-Change Checks/.test(launchOperatorBriefDoc) ||
  (!serviceWatchWebDeploymentReady && !/render_static_build_contract/.test(launchOperatorBriefDoc)) ||
  (!serviceWatchWebDeploymentReady && !/web_headers_only_dry_run/.test(launchOperatorBriefDoc)) ||
  !/render_cloudflare_apply_dry_run/.test(launchOperatorBriefDoc) ||
  !/Render `onrender\.com` host/.test(launchOperatorBriefDoc) ||
  !/Active goal/.test(launchOperatorBrief) ||
  !/Launch readiness/.test(launchOperatorBrief) ||
  !/live blocker를 한 번만 갱신/.test(launchOperatorBrief) ||
  !/Header application mode/.test(launchOperatorBrief) ||
  !/Static Web에는 DB\/Redis/.test(launchOperatorBrief) ||
  !/Launch Operator Brief/.test(launchOperatorBriefDoc) ||
  !/pnpm launch:handoff/.test(launchOperatorBriefDoc) ||
  !/live blocker를 한 번만 갱신/.test(launchOperatorBriefDoc) ||
  !/Expected deploy SHA: run `git rev-parse HEAD`/.test(launchOperatorBrief) ||
  !/Expected deploy SHA: run `git rev-parse HEAD`/.test(launchOperatorBriefDoc) ||
  !/Render Web Static Site/.test(launchOperatorBriefDoc) ||
  !/Render API Service/.test(launchOperatorBriefDoc) ||
  !/Render API automation/.test(launchOperatorBriefDoc) ||
  !/One Command Apply/.test(launchOperatorBriefDoc) ||
  !/Required launch inputs from current dry-run/.test(launchOperatorBriefDoc) ||
  !/\| ID \| Required \| Status \| Env \| Purpose \| Where \| Validate \|/.test(launchOperatorBriefDoc) ||
  !/Render API key, or Render musunil-api custom-domain\/service host/.test(launchOperatorBriefDoc) ||
  !/pnpm launch:apply shows derivedTargets\.api/.test(launchOperatorBriefDoc) ||
  !/Cloudflare user API token with musunil\.com zone DNS edit/.test(launchOperatorBriefDoc) ||
  !/Split apply paths from current blockers/.test(launchOperatorBriefDoc) ||
  (!serviceWatchWebDeploymentReady && !/web_headers_only/.test(launchOperatorBriefDoc)) ||
  (!serviceWatchWebDeploymentReady && !/Web proxy observed/.test(launchOperatorBriefDoc)) ||
  !/Inputs ready/.test(launchOperatorBriefDoc) ||
  !/Missing:/.test(launchOperatorBriefDoc) ||
  !/RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET/.test(launchOperatorBriefDoc) ||
  !/pnpm launch:apply -- --apply/.test(launchOperatorBriefDoc) ||
  !/pnpm launch:apply -- --apply --cloudflare-headers-only/.test(launchOperatorBriefDoc) ||
  !/pnpm render:apply -- --web-headers --apply/.test(launchOperatorBriefDoc) ||
  !/pnpm render:apply -- --api-domain --apply/.test(launchOperatorBriefDoc) ||
  !/Cloudflare/.test(launchOperatorBriefDoc) ||
  !/Launch Ready Plan/.test(launchOperatorBriefDoc) ||
  !/External Smoke Proofs/.test(launchOperatorBriefDoc) ||
  !/provider 연결 증거/.test(launchOperatorBriefDoc) ||
  !/proof: `storage_put_get_delete`/.test(launchOperatorBriefDoc) ||
  !/proof: `redaction_engine_smoke`/.test(launchOperatorBriefDoc) ||
  !/proof: `mobile_integrity_provider_dry_run`/.test(launchOperatorBriefDoc) ||
  !/contract: structured JSON with checked, provider, packageName or bundleId\/teamId, and verdict/.test(launchOperatorBriefDoc) ||
  !/proof: `identity_portone_verified_lookup`/.test(launchOperatorBriefDoc) ||
  !/cloudflare:dns/.test(launchOperatorBriefDoc) ||
  !/cloudflare:headers/.test(launchOperatorBriefDoc) ||
  !/"launch:handoff"/.test(packageJson) ||
  !/launch-handoff\.mjs/.test(packageJson) ||
  !/launch-next-actions\.mjs/.test(launchHandoff) ||
  !/--refresh/.test(launchHandoff) ||
  !/launch-operator-brief\.mjs/.test(launchHandoff) ||
  !/launch-missing-inputs\.mjs/.test(launchHandoff) ||
  !/pnpm launch:handoff/.test(launchOperatorBrief) ||
  !/pnpm launch:handoff/.test(launchOperatorBriefDoc) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(launchOperatorBrief) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(launchOperatorBriefDoc) ||
  !/cloudflare-dns-records\.local\.md/.test(launchOperatorBrief) ||
  !/cloudflare-dns-records\.local\.md/.test(launchOperatorBriefDoc) ||
  !/User Inputs/.test(launchOperatorBriefDoc) ||
  !/docs\/launch-missing-inputs\.md/.test(launchOperatorBrief) ||
  !/docs\/launch-missing-inputs\.md/.test(launchOperatorBriefDoc) ||
  !/pnpm launch:final-gate/.test(launchOperatorBriefDoc) ||
  !/api\.musunil\.com/.test(launchOperatorBriefDoc) ||
  !/MUSUNIL_USER_INPUTS_FILE_PATH/.test(launchOperatorBriefDoc) ||
  !/pnpm render:runtime-secret/.test(launchOperatorBriefDoc) ||
  !/render\.backend\.yaml/.test(launchOperatorBriefDoc) ||
  !/pnpm render:provisioning-plan/.test(launchOperatorBriefDoc)
) {
  failures.push("Launch operator brief must combine current blockers, Render Web/API settings, Cloudflare DNS, user inputs, and final verification into one generated handoff document");
}
if (!serviceWatchLastChecked || !launchOperatorBriefServiceWatch || serviceWatchLastChecked !== launchOperatorBriefServiceWatch) {
  failures.push("docs/launch-operator-brief.md must be regenerated from the latest docs/splus-service-watch.md blocker report. Run pnpm launch:handoff.");
}
if (/^- Git SHA:\s*[a-f0-9]{40}\s*$/im.test(launchOperatorBriefDoc)) {
  failures.push("docs/launch-operator-brief.md must not store a hard-coded Git SHA because committing the handoff makes it stale. Run pnpm launch:handoff after updating the generator.");
}
const serviceWatchStaticReady =
  /\|\s*web_static_manifest\s*\|\s*ok\s*\|/.test(serviceWatchDoc) &&
  /\|\s*web_runtime_config\s*\|\s*ok\s*\|/.test(serviceWatchDoc);
const serviceWatchRequiresApiEndpoint = /\|\s*connect_api_endpoint\s*\|\s*operator\s*\|/.test(serviceWatchDoc);
if (
  serviceWatchStaticReady &&
  serviceWatchRequiresApiEndpoint &&
  (
    !/- Stage: connect_api_endpoint/.test(launchOperatorBriefDoc) ||
    !/1\. connect_api_endpoint \(operator\)/.test(launchOperatorBriefDoc) ||
    /1\. deploy_latest_static \(operator\)/.test(launchOperatorBriefDoc)
  )
) {
  failures.push("Launch operator brief must be refreshed after live static deploy clears so it points to connect_api_endpoint, not deploy_latest_static");
}
if (
  !/"launch:missing-inputs"/.test(packageJson) ||
  !/launch-missing-inputs\.mjs/.test(packageJson) ||
  !/launch_missing_inputs/.test(launchMissingInputs) ||
  !/docs\/launch-missing-inputs\.md/.test(launchMissingInputs) ||
  !/launch-next-actions\.mjs/.test(launchMissingInputs) ||
  !/operational-readiness-diagnostics\.mjs/.test(launchMissingInputs) ||
  !/launch-ready\.mjs/.test(launchMissingInputs) ||
  !/external-smoke\.mjs/.test(launchMissingInputs) ||
  !/law source diagnostics/.test(launchMissingInputs) ||
  !/workers\/public-source-ingest\/src\/index\.ts/.test(launchMissingInputs) ||
  !/lawsGroup\(lawDiagnostics\.data\?\.diagnostics\)/.test(launchMissingInputs) ||
  !/!lawDiagnostics\.ok/.test(launchMissingInputs) ||
  !/blockerReport/.test(launchMissingInputs) ||
  !/nextOperatorCommandScope/.test(launchMissingInputs) ||
  !/nextApplyCommand/.test(launchMissingInputs) ||
  !/operatorCommandLines/.test(launchMissingInputs) ||
  !/preExternalChangeChecks/.test(launchMissingInputs) ||
  !/preExternalChangeLines/.test(launchMissingInputs) ||
  !/Pre-External-Change Checks/.test(launchMissingInputs) ||
  !/staleDecisionWarning/.test(launchMissingInputs) ||
  !/actionsAdvisoryOnly/.test(launchMissingInputs) ||
  !/STALE LIVE EVIDENCE/.test(launchMissingInputs) ||
  !/진단 참고로만 취급/.test(launchMissingInputs) ||
  !/Immediate safe command/.test(launchMissingInputs) ||
  !/Apply command after inputs/.test(launchMissingInputs) ||
  !/Before apply command/.test(launchMissingInputs) ||
  !/Report freshness/.test(launchMissingInputs) ||
  !/stale live blocker report/.test(launchMissingInputs) ||
  !/pnpm launch:handoff/.test(launchMissingInputs) ||
  !/pnpm launch:handoff/.test(launchMissingInputsDoc) ||
  !/pnpm launch:missing-inputs -- --refresh/.test(launchMissingInputs) ||
  !/Blocker report/.test(launchMissingInputsDoc) ||
  !/Report freshness/.test(launchMissingInputsDoc) ||
  !/Immediate safe command/.test(launchMissingInputsDoc) ||
  !/Apply command after inputs/.test(launchMissingInputsDoc) ||
  !/Before apply command/.test(launchMissingInputsDoc) ||
  !/Pre-External-Change Checks/.test(launchMissingInputsDoc) ||
  (!serviceWatchWebDeploymentReady && !/render_static_build_contract/.test(launchMissingInputsDoc)) ||
  (!serviceWatchWebDeploymentReady && !/web_headers_only_dry_run/.test(launchMissingInputsDoc)) ||
  !/render_cloudflare_apply_dry_run/.test(launchMissingInputsDoc) ||
  !/Immediate Apply Inputs/.test(launchMissingInputsDoc) ||
  !/\| ID \| Required \| Status \| Env \| Purpose \| Where \| Validate \|/.test(launchMissingInputsDoc) ||
  !/Render API key, or Render musunil-api custom-domain\/service host/.test(launchMissingInputsDoc) ||
  !/pnpm launch:apply shows derivedTargets\.api/.test(launchMissingInputsDoc) ||
  !/Cloudflare user API token with musunil\.com zone DNS edit/.test(launchMissingInputsDoc) ||
  !/Provider Smoke Inputs/.test(launchMissingInputsDoc) ||
  !/Runtime Secrets/.test(launchMissingInputsDoc) ||
  !/RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET/.test(launchMissingInputsDoc) ||
  !/CLOUDFLARE_API_TOKEN/.test(launchMissingInputsDoc) ||
  !/storage_put_get_delete/.test(launchMissingInputsDoc) ||
  !/redaction_engine_smoke/.test(launchMissingInputsDoc) ||
  !/mobile_integrity_provider_dry_run/.test(launchMissingInputsDoc) ||
  !/Proof contract: structured JSON with checked, provider, packageName or bundleId\/teamId, and verdict/.test(launchMissingInputsDoc) ||
  !/identity_portone_verified_lookup/.test(launchMissingInputsDoc) ||
  !/laws_dry_run/.test(launchMissingInputsDoc) ||
  !/public_data_sources\.national_assembly_bill_api_key/.test(launchMissingInputsDoc) ||
  !/public_data_sources\.official_law_endpoints/.test(launchMissingInputsDoc) ||
  !/MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID/.test(launchMissingInputsDoc) ||
  !/Static Web에는 넣지 않는다/.test(launchMissingInputsDoc) ||
  !/실제 값을 담지 않는다/.test(launchMissingInputsDoc)
) {
  failures.push("Launch missing-inputs helper must generate a secret-safe final input checklist with apply, provider smoke, runtime secret, and proof-marker requirements");
}
if (!serviceWatchLastChecked || !launchMissingInputsBlockerReport || serviceWatchLastChecked !== launchMissingInputsBlockerReport) {
  failures.push("docs/launch-missing-inputs.md must be refreshed from the latest docs/splus-service-watch.md blocker report. Run pnpm launch:handoff.");
}
if (
  !/"launch:final-gate"/.test(packageJson) ||
  !/launch-final-gate\.mjs/.test(packageJson) ||
  !/launch_final_gate_plan/.test(launchFinalGate) ||
  !/sources:refresh-preflight/.test(launchFinalGate) ||
  !/public_source_refresh_preflight/.test(launchFinalGate) ||
  !/cloudflare_dns_strict_preflight/.test(launchFinalGate) ||
  !/live_dns_edge/.test(launchFinalGate) ||
  !/cloudflare:check:strict/.test(launchFinalGate) ||
  !/ensureRenderApiDnsTarget/.test(launchFinalGate) ||
  !/render_api_service_url/.test(launchFinalGate) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(launchFinalGate) ||
  !/launch:post-deploy-smoke/.test(launchFinalGate) ||
  !/--require-laws/.test(launchFinalGate) ||
  !/--require-source-refreshes/.test(launchFinalGate) ||
  !/launch:blockers:refresh-strict/.test(launchFinalGate) ||
  !/deriveLaunchEnv/.test(launchFinalGate) ||
  !/MUSUNIL_EXPECTED_COMMIT_SHA/.test(launchFinalGate) ||
  !/gitHead\(\)/.test(launchFinalGate) ||
  !/scope:\s*step\.scope/.test(launchFinalGate) ||
  !/command:\s*stepCommands\.get\(step\.id\)/.test(launchFinalGate) ||
  !/public_source_refresh_preflight[\s\S]*cloudflare_dns_strict_preflight[\s\S]*post_deploy_smoke[\s\S]*live_blocker_refresh_strict/.test(launchFinalGate)
) {
  failures.push("Launch final gate must run public source refresh preflight, strict Cloudflare DNS, post-deploy smoke with laws, and refresh-strict blockers in one ordered command");
}
if (
  !/api\.musunil\.com/.test(renderApiSettings) ||
  !/Health Check Path/.test(renderApiSettings) ||
  !/MUSUNIL_USER_INPUTS_FILE_PATH/.test(renderApiSettings) ||
  !/pnpm render:runtime-secret/.test(renderApiSettings) ||
  !/render\.backend\.yaml/.test(renderApiSettings) ||
  !/pnpm render:provisioning-plan/.test(renderApiSettings) ||
  !/Render generated/.test(renderApiSettings) ||
  !/Cloudflare DNS/.test(renderApiSettings) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(renderApiSettings) ||
  !/render:apply -- --api-domain --apply/.test(renderApiSettings) ||
  !/cloudflare:dns/.test(renderApiSettings) ||
  !/cloudflare:check:strict/.test(renderApiSettings) ||
  !/pnpm sources:refresh-preflight/.test(renderApiSettings) ||
  !/pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes/.test(renderApiSettings) ||
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
  !/"cloudflare:dns"/.test(packageJson) ||
  !/"check:cloudflare-dns-template"/.test(packageJson) ||
  !/"cloudflare:headers"/.test(packageJson) ||
  !/"cloudflare:apply"/.test(packageJson) ||
  !/"cloudflare:apply:plan"/.test(packageJson) ||
  !/"check:cloudflare-headers"/.test(packageJson) ||
  !/cloudflare-dns-check\.mjs/.test(packageJson) ||
  !/cloudflare_dns_and_edge_preflight/.test(cloudflareDnsCheck) ||
  !/web_dns/.test(cloudflareDnsCheck) ||
  !/api_dns/.test(cloudflareDnsCheck) ||
  !/render_target_inputs/.test(cloudflareDnsCheck) ||
  !/api_render_target/.test(cloudflareDnsCheck) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(cloudflareDnsCheck) ||
  !/isPlaceholderRenderTarget/.test(cloudflareDnsCheck) ||
  !/invalidRenderTargetReason/.test(cloudflareDnsCheck) ||
  !/Render DNS target placeholder is not valid input/.test(cloudflareDnsCheck) ||
  !/Render DNS target must be a hostname only/.test(cloudflareDnsCheck) ||
  !/URL scheme present/.test(cloudflareDnsCheck) ||
  !/path or query present/.test(cloudflareDnsCheck) ||
  !/port or label separator present/.test(cloudflareDnsCheck) ||
  !/resolveCname/.test(cloudflareDnsCheck) ||
  !/expectedRenderTargets/.test(cloudflareDnsCheck) ||
  !/web_config/.test(cloudflareDnsCheck) ||
  !/web_header_smoke/.test(cloudflareDnsCheck) ||
  !/api_health/.test(cloudflareDnsCheck) ||
  !/api_ready/.test(cloudflareDnsCheck) ||
  !/formatReadinessFailure/.test(cloudflareDnsCheck) ||
  !/blockingGroups/.test(cloudflareDnsCheck) ||
  !/requiredActions/.test(cloudflareDnsCheck) ||
  !/connect_api_dns/.test(cloudflareDnsCheck) ||
  !/cloudflare:dns/.test(cloudflareDnsCheck) ||
  !/apply_static_headers/.test(cloudflareDnsCheck) ||
  !/cloudflare:headers/.test(cloudflareDnsCheck) ||
  !/cloudflare:check/.test(cloudflareDnsCheck) ||
  !/--strict/.test(cloudflareDnsCheck)
) {
  failures.push("Cloudflare/DNS preflight helper must check Web/API DNS, Web config, headers, API health/ready, and strict mode");
}
if (
  !/cloudflare_apply_plan/.test(cloudflareApply) ||
  !/CLOUDFLARE_API_TOKEN/.test(cloudflareApply) ||
  !/CLOUDFLARE_ZONE_ID/.test(cloudflareApply) ||
  !/zoneResolution/.test(cloudflareApply) ||
  !/zone_name_lookup/.test(cloudflareApply) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(cloudflareApply) ||
  !/--apply/.test(cloudflareApply) ||
  !/dry_run/.test(cloudflareApply) ||
  !/upsertDnsRecord/.test(cloudflareApply) ||
  !/upsertResponseHeaderRule/.test(cloudflareApply) ||
  !/http_response_headers_transform/.test(cloudflareApply) ||
  !/musunil_web_security_headers/.test(cloudflareApply) ||
  !/inspectWebProxyMode/.test(cloudflareApply) ||
  !/webProxyMode/.test(cloudflareApply) ||
  !/canApplyHeadersToProxiedWeb/.test(cloudflareApply) ||
  !/Response Header Transform Rule requires Cloudflare proxied Web responses/.test(cloudflareApply) ||
  !/MUSUNIL_CLOUDFLARE_WEB_PROXIED=1/.test(cloudflareApply) ||
  !/invalidRenderTargetReason/.test(cloudflareApply) ||
  !/conflicting_record/.test(cloudflareApply) ||
  !/api\.cloudflare\.com\/client\/v4/.test(cloudflareApply) ||
  !/Cloudflare API failed/.test(cloudflareApply)
) {
  failures.push("Cloudflare apply helper must provide dry-run-first DNS and response header automation through the official Cloudflare API, and must guard header apply behind proxied Web responses");
}
if (
  !/cloudflare_dns_records_template/.test(cloudflareDnsTemplate) ||
  !/docs\/cloudflare-dns-records\.md/.test(cloudflareDnsTemplate) ||
  !/infra\/cloudflare\/dns-records\.tf\.example/.test(cloudflareDnsTemplate) ||
  !/docs\/cloudflare-dns-records\.local\.md/.test(cloudflareDnsTemplate) ||
  !/infra\/cloudflare\/dns-records\.local\.tfvars/.test(cloudflareDnsTemplate) ||
  !/MUSUNIL_RENDER_WEB_DNS_TARGET/.test(cloudflareDnsTemplate) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(cloudflareDnsTemplate) ||
  !/placeholderRejected/.test(cloudflareDnsTemplate) ||
  !/invalidReason/.test(cloudflareDnsTemplate) ||
  !/isPlaceholderRenderTarget/.test(cloudflareDnsTemplate) ||
  !/invalidRenderTargetReason/.test(cloudflareDnsTemplate) ||
  !/hostname only/.test(cloudflareDnsTemplate) ||
  !/srv-actual-/.test(cloudflareDnsTemplate) ||
  !/Render musunil-api custom-domain target/.test(cloudflareDnsTemplate) ||
  !/web_record_proxied/.test(cloudflareDnsTemplate) ||
  !/proxied = false/.test(cloudflareDnsRecordsTerraform) ||
  !/cloudflare_record/.test(cloudflareDnsRecordsTerraform) ||
  !/render_api_target/.test(cloudflareDnsRecordsTerraform) ||
  !/Cloudflare DNS Records/.test(cloudflareDnsRecordsDoc) ||
  !/api\.musunil\.com/.test(cloudflareDnsRecordsDoc) ||
  !/호스트명만 허용/.test(cloudflareDnsRecordsDoc) ||
  !/`https:\/\/`, 경로, 포트/.test(cloudflareDnsRecordsDoc) ||
  !/DNS only/.test(cloudflareDnsRecordsDoc) ||
  !/pnpm cloudflare:check/.test(cloudflareDnsRecordsDoc) ||
  !/pnpm cloudflare:apply -- --dns --apply/.test(cloudflareDnsRecordsDoc) ||
  !/pnpm check:cloudflare-dns-template/.test(JSON.parse(packageJson).scripts["check:release"] ?? "")
) {
  failures.push("Cloudflare DNS template must generate dashboard docs and Terraform example for Web/API records and be wired into release checks");
}
if (
  !/cloudflare_response_headers_template/.test(cloudflareResponseHeaders) ||
  !/http_response_headers_transform/.test(cloudflareResponseHeaders) ||
  !/operation = "set"/.test(cloudflareResponseHeaders) ||
  !/docs\/cloudflare-response-headers\.md/.test(cloudflareResponseHeaders) ||
  !/infra\/cloudflare\/response-headers\.tf\.example/.test(cloudflareResponseHeaders) ||
  !/Response Header Transform Rule/.test(cloudflareResponseHeadersDoc) ||
  !/Set static/.test(cloudflareResponseHeadersDoc) ||
  !/pnpm cloudflare:apply -- --headers --apply/.test(cloudflareResponseHeadersDoc) ||
  !/web_proxy_mode\.proxyObserved=true/.test(cloudflareResponseHeadersDoc) ||
  !/http_response_headers_transform/.test(cloudflareResponseHeadersDoc) ||
  !/Cloudflare proxied/.test(cloudflareResponseHeadersDoc) ||
  !/cloudflare_ruleset/.test(cloudflareResponseHeadersTerraform) ||
  !/phase\s+=\s*"http_response_headers_transform"/.test(cloudflareResponseHeadersTerraform) ||
  !/Cache-Control/.test(cloudflareResponseHeadersTerraform) ||
  !/Content-Security-Policy/.test(cloudflareResponseHeadersTerraform) ||
  !/X-Frame-Options/.test(cloudflareResponseHeadersTerraform) ||
  !/pnpm check:cloudflare-headers/.test(JSON.parse(packageJson).scripts["check:release"] ?? "")
) {
  failures.push("Cloudflare response header template must generate dashboard docs and Terraform example from render.yaml headers and be wired into release checks");
}
if (!/pnpm cloudflare:check/.test(readme) || !/pnpm cloudflare:headers/.test(readme) || !/pnpm cloudflare:check/.test(userFacingDocs)) {
  failures.push("Cloudflare/DNS preflight helper must be documented in README and launch readiness docs");
}
if (!/pnpm cloudflare:apply/.test(readme) || !/pnpm cloudflare:apply/.test(launchCutoverRunbook) || !/Cloudflare API automation/.test(launchOperatorBrief)) {
  failures.push("Operator docs must expose dry-run-first Cloudflare API automation for DNS and response headers");
}
const completionPassingEvidence = markdownSection(completionAudit, "## Current Local/Static Passing Evidence", "## Current Live Blockers");
if (!completionPassingEvidence) failures.push("completion audit must separate local/static passing evidence from live blockers");
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
const uxCurrentVerdict = markdownSection(splusUxTracker, "## Current Verdict", "## Design S+ Active Goals");
const uxScorecard = markdownSection(splusUxTracker, "## Scorecard", "## Previous UX Evidence Under Review");
if (!/React\/Vite UI-G1~G6/.test(completionAudit) || !/가상 이슈를 만들지/.test(completionAudit) || !/serviceSyncState=unavailable/.test(uxCurrentVerdict)) {
  failures.push("current UX/completion docs must record the React production no-fixture empty-state contract while the live API is unavailable");
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
if (!/"check:web-flow"/.test(packageJson) || !/ci-web-next-production\.mjs/.test(packageJson) || !/pnpm check:web-flow/.test(packageJson)) {
  failures.push("Web user-flow smoke must be wired into release checks");
}
if (
  !/fixtureTokens/.test(webProductionSmoke) ||
  !/fixtureMedia/.test(webProductionSmoke) ||
  !/public config keys changed/.test(webProductionSmoke) ||
  !/production bundle contains preview asset/.test(webProductionSmoke)
) {
  failures.push("Web production smoke must reject fixture data, preview media, and public config drift");
}
if (!/"check:ux-surface"/.test(packageJson) || !/ci-web-next-production\.mjs/.test(packageJson) || !/pnpm check:ux-surface/.test(packageJson)) {
  failures.push("Commercial UX surface smoke must be wired into release checks");
}
if (
  !/visibleIssueTitles/.test(visualSurfaceSmoke) ||
  !/nestedInteractive/.test(visualSurfaceSmoke) ||
  !/desktop home includes map/.test(visualSurfaceSmoke) ||
  !/issue detail must expose exactly four tabs/.test(visualSurfaceSmoke) ||
  !/reel action rail changed/.test(visualSurfaceSmoke) ||
  !/report entry must expose one action/.test(visualSurfaceSmoke)
) {
  failures.push("Commercial UX surface smoke must cover issue-first home, flat actions, full-screen detail, reels, map, and report");
}
if (
  !/"check:visual-surface"/.test(packageJson) ||
  !/"check:visual-surface:production-fallback"/.test(packageJson) ||
  !/"check:visual-surface:live"/.test(packageJson) ||
  !/"check:visual-surface:evidence"/.test(packageJson) ||
  !/"check:visual-surface:live:evidence"/.test(packageJson) ||
  !/ci-web-next-visual\.mjs/.test(packageJson) ||
  !/check:web-next:production/.test(packageJson) ||
  !/--base-url https:\/\/musunil\.com/.test(packageJson) ||
  !/"check:web-next:visual"/.test(packageJson) ||
  !/--evidence-dir docs\/visual-evidence\/live-current/.test(packageJson) ||
  !/pnpm check:visual-surface/.test(JSON.parse(packageJson).scripts["check:release"] ?? "") ||
  !/pnpm check:visual-surface:production-fallback/.test(JSON.parse(packageJson).scripts["check:release"] ?? "")
) {
  failures.push("Commercial visual surface smoke must be wired into release checks and have production fallback, live URL, and screenshot evidence commands");
}
if (
  !/mobile_390/.test(visualSurfaceSmoke) ||
  !/mobile_430/.test(visualSurfaceSmoke) ||
  !/tablet_768/.test(visualSurfaceSmoke) ||
  !/desktop_1440/.test(visualSurfaceSmoke) ||
  !/externalBaseUrl/.test(visualSurfaceSmoke) ||
  !/MUSUNIL_VISUAL_BASE_URL/.test(visualSurfaceSmoke) ||
  !/verifyLiveViewport/.test(visualSurfaceSmoke) ||
  !/fixture issue leaked to live/.test(visualSurfaceSmoke) ||
  !/map canvas collapsed/.test(visualSurfaceSmoke) ||
  !/live report entry changed/.test(visualSurfaceSmoke) ||
  !/page\.screenshot/.test(visualSurfaceSmoke) ||
  !/visual-evidence\.json/.test(visualSurfaceSmoke)
) {
  failures.push("Commercial visual surface smoke must cover responsive local/live screens, fixture leakage, map sizing, report entry, and screenshot evidence");
}
if (
  !/visibleIssueTitles\.length >= 3/.test(visualSurfaceSmoke) ||
  !/nested interactive controls/.test(visualSurfaceSmoke) ||
  !/home includes map/.test(visualSurfaceSmoke) ||
  !/horizontal overflow/.test(visualSurfaceSmoke) ||
  !/axe serious violations/.test(visualSurfaceSmoke)
) {
  failures.push("Commercial visual surface smoke must guard issue visibility, nested actions, dashboard map regression, overflow, and accessibility");
}
if (
  !/확인된 주요 이슈가 없습니다/.test(visualSurfaceSmoke) ||
  !/자료 연결을 확인하고 있습니다/.test(visualSurfaceSmoke) ||
  !/live empty state is not honest/.test(visualSurfaceSmoke)
) {
  failures.push("Commercial visual surface smoke must guard honest live empty and unavailable states");
}
if (
  !/MUSUNIL_STRICT_WEB_HEADERS=1/.test(renderWebSettings) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(renderWebSettings) ||
  !/Clear build cache & deploy/.test(renderWebSettings) ||
  !/check:web-render-build-command/.test(renderWebSettings) ||
  !/check:visual-surface:live/.test(renderWebSettings) ||
  !/service:watch:visual/.test(renderWebSettings) ||
  !/pnpm launch:final-gate/.test(renderWebSettings) ||
  !/Header application mode/.test(renderWebSettings) ||
  !/Manual Static Site/.test(renderWebSettings) ||
  !/Blueprint-managed/.test(renderWebSettings) ||
  !/render\.com\/docs\/static-site-headers/.test(renderWebSettings) ||
  !/render:apply -- --web-headers --apply/.test(renderWebSettings) ||
  !/cloudflare:headers/.test(renderWebSettings) ||
  !/cloudflare:check/.test(renderWebSettings)
) {
  failures.push("Render Web settings helper must print Render build preflight, strict header, live visual, integrated service watch, manual/Blueprint header mode, and clear-cache redeploy instructions");
}
if (!/"launch:cutover-plan"/.test(packageJson) || !/launch-cutover-plan\.mjs/.test(packageJson)) {
  failures.push("launch cutover plan helper command is missing");
}
if (
  !/api\.musunil\.com/.test(launchCutoverPlan) ||
  !/Cloudflare DNS/.test(launchCutoverPlan) ||
  !/cloudflare:dns/.test(launchCutoverPlan) ||
  !/cloudflare:headers/.test(launchCutoverPlan) ||
  !/cloudflare:check/.test(launchCutoverPlan) ||
  !/MUSUNIL_RENDER_API_DNS_TARGET/.test(launchCutoverPlan) ||
  !/MUSUNIL_RENDER_WEB_DNS_TARGET/.test(launchCutoverPlan) ||
  !/docs\/cloudflare-dns-records\.local\.md/.test(launchCutoverPlan) ||
  !/dns-records\.local\.tfvars/.test(launchCutoverPlan) ||
  !/render:api-settings/.test(launchCutoverPlan) ||
  !/render:web-settings/.test(launchCutoverPlan) ||
  !/launch:apply/.test(launchCutoverPlan) ||
  !/check:web-render-build-command/.test(launchCutoverPlan) ||
  !/build:web-static:render/.test(launchCutoverPlan) ||
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
  !/cloudflare:dns/.test(launchCutoverRunbook) ||
  !/cloudflare:headers/.test(launchCutoverRunbook) ||
  !/check:visual-surface:live/.test(launchCutoverRunbook) ||
  !/check:web-render-build-command/.test(launchCutoverRunbook) ||
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
if (/web_build_info`, `web_forbidden_ui_absent`는 통과/.test(launchCutoverRunbook) || /web_build_info.*통과했고/.test(launchCutoverRunbook)) {
  failures.push("launch cutover runbook current blockers must not claim web_build_info passed while live build-info placeholder remains a blocker");
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
  !/forbiddenPublicUiTokens/.test(serviceWatch) ||
  !/forbiddenPublicPayloadTokens/.test(serviceWatch) ||
  !/web_forbidden_ui_absent/.test(serviceWatch) ||
  !/transit_occurrence/.test(serviceWatch) ||
  !/crowd_density_signal/.test(serviceWatch) ||
  !/route_segment/.test(serviceWatch) ||
  !/route_checkpoint/.test(serviceWatch) ||
  !/hazard_area/.test(serviceWatch) ||
  !/service_disruption/.test(serviceWatch) ||
  !/"preview-only"/.test(serviceWatch) ||
  !/"mock"/.test(serviceWatch) ||
  !/"_sample"/.test(serviceWatch) ||
  !/web_visual_surface/.test(serviceWatch) ||
  !/publicPayloadRoutes/.test(serviceWatch) ||
  !/assertHomeIssueFirstPayload/.test(serviceWatch) ||
  !/public_source_refresh_freshness/.test(serviceWatch) ||
  !/assertPublicSourceRefreshesCurrent/.test(serviceWatch) ||
  !/sourceRefreshes/.test(serviceWatch) ||
  !/resultCount/.test(serviceWatch) ||
  !/refresh_public_source_ingest/.test(serviceWatch) ||
  !/pnpm sources:refresh-preflight/.test(serviceWatch) ||
  !/at least 3 topic Issues/.test(serviceWatch) ||
  !/public source bundle/.test(serviceWatch) ||
  !/serviceStates/.test(serviceWatch) ||
  !/summarizeVisualSmokeFailure/.test(serviceWatch) ||
  !/homeSummaries/.test(serviceWatch) ||
  !/emptyTitle/.test(serviceWatch) ||
  !/emptyActions/.test(serviceWatch) ||
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
  !/manual_api_dns_target_without_render_token/.test(serviceWatch) ||
  !/Render token 없이 Dashboard target을 직접 복사한 경우/.test(serviceWatch) ||
  !/fix_web_runtime_config/.test(serviceWatch) ||
  !/check:web-render-build-command/.test(serviceWatch) ||
  !/build:web-static:render/.test(serviceWatch) ||
  !/pnpm launch:final-gate/.test(serviceWatch) ||
  !/render:api-settings/.test(serviceWatch) ||
  !/cloudflare:dns/.test(serviceWatch) ||
  !/apply_static_headers/.test(serviceWatch) ||
  !/--cloudflare-headers-only/.test(serviceWatch) ||
  !/cloudflare:check/.test(serviceWatch) ||
  !/web_proxy_mode\.proxyObserved=true/.test(serviceWatch) ||
  !/cloudflare:check/.test(serviceWatch) ||
  !/deploy_latest_static/.test(serviceWatch) ||
  !/retry_live_static_manifest/.test(serviceWatch) ||
  !/isTransientNetworkError/.test(serviceWatch) ||
  !/staticManifest\.transient/.test(serviceWatch) ||
  !/manifest mismatch가 재현되는지 먼저 확인/.test(serviceWatch) ||
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
  !/assertSampleRedacted/.test(redactionSmoke) ||
  !/ffprobe/.test(redactionSmoke) ||
  !/edgeEnergy/.test(redactionSmoke) ||
  !/audioRemoved/.test(redactionSmoke) ||
  !/unredacted sensitive sample token/.test(redactionSmoke) ||
  !/12\\uAC003456/.test(redactionSmoke) ||
  !/sample face/.test(redactionSmoke) ||
  !/"redaction:smoke"/.test(packageJson) ||
  !/"check:redaction-smoke-safety"/.test(packageJson) ||
  !/check:redaction-smoke-safety/.test(JSON.parse(packageJson).scripts["check:release"] ?? "") ||
  !/ci-redaction-smoke-safety\.mjs/.test(packageJson) ||
  !/redaction\.engine_smoke_command/.test(readFileSync(resolve(cwd, "packages/config/src/index.ts"), "utf8"))
) {
  failures.push("redaction engine launch smoke command is missing");
}
const redactionSmokeSafety = readFileSync(resolve(cwd, "scripts/ci-redaction-smoke-safety.mjs"), "utf8");
if (
  !/redaction_smoke_safety/.test(redactionSmokeSafety) ||
  !/copy fixture unexpectedly passed/.test(redactionSmokeSafety) ||
  !/unredacted sensitive sample token/.test(redactionSmokeSafety) ||
  !/sample face/.test(redactionSmokeSafety) ||
  !/12가3456/.test(redactionSmokeSafety) ||
  !/scripts\/redact-media\.mjs/.test(redactionSmokeSafety) ||
  !/cp \{input\} \{output\}/.test(redactionSmokeSafety)
) {
  failures.push("redaction smoke safety check must execute-test redacted and unredacted sample outputs without leaking sensitive samples");
}
if (
  !/boxblur/.test(redactionEngine) ||
  !/"-an"/.test(redactionEngine) ||
  !/"-map_metadata"/.test(redactionEngine) ||
  !/libvpx-vp9/.test(redactionEngine) ||
  !/\/internal\/redaction-queue/.test(redactionWorker) ||
  !/decryptLiveMediaBytes/.test(redactionWorker) ||
  !/public\/redacted\//.test(redactionWorker) ||
  !/status: "review_required"/.test(redactionWorker) ||
  !/"redaction:worker"/.test(packageJson)
) {
  failures.push("built-in media redaction worker must decrypt, redact, upload private-bucket public derivatives, and preserve manual review");
}
if (/process\.(stdout|stderr)\.write\(data\)/.test(mobileIntegritySmoke)) {
  failures.push("mobile integrity smoke must not stream provider output into launch logs");
}
const mobileIntegritySmokeSafety = readFileSync(resolve(cwd, "scripts/ci-mobile-integrity-smoke-safety.mjs"), "utf8");
const mobileIntegritySmokeFixture = readFileSync(resolve(cwd, "scripts/mobile-integrity-smoke-fixture.mjs"), "utf8");
if (
  !/parseStructuredProof/.test(mobileIntegritySmoke) ||
  !/assertProofMatchesConfig/.test(mobileIntegritySmoke) ||
  !/assertNoSecretLeak/.test(mobileIntegritySmoke) ||
  !/structured proof JSON/.test(mobileIntegritySmoke) ||
  !/packageName must match/.test(mobileIntegritySmoke) ||
  !/"check:mobile-integrity-smoke-safety"/.test(packageJson) ||
  !/check:mobile-integrity-smoke-safety/.test(JSON.parse(packageJson).scripts["check:release"] ?? "") ||
  !/mobile_integrity_smoke_safety/.test(mobileIntegritySmokeSafety) ||
  !/marker_only/.test(mobileIntegritySmokeSafety) ||
  !/wrong_package/.test(mobileIntegritySmokeSafety) ||
  !/secret_leak/.test(mobileIntegritySmokeSafety) ||
  !/MUSUNIL_TEST_PRIVATE_KEY/.test(mobileIntegritySmokeSafety) ||
  !/wrong-package/.test(mobileIntegritySmokeFixture) ||
  !/BEGIN PRIVATE KEY/.test(mobileIntegritySmokeFixture)
) {
  failures.push("mobile integrity smoke safety check must reject marker-only output, wrong package proof, and provider secret leaks");
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
if (
  !/"mobile:integrity-smoke"/.test(packageJson) ||
  !/mobile_integrity_provider_dry_run/.test(readFileSync(resolve(cwd, "scripts/mobile-integrity-smoke.mjs"), "utf8")) ||
  !/integrity_smoke_command/.test(configIndex) ||
  !/STRUCTURED_mobile_integrity_provider_dry_run_JSON/.test(readFileSync(resolve(cwd, "config/musunil.user-inputs.template.yaml"), "utf8"))
) {
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
if (!/storeIoQueue/.test(apiServer)) failures.push("Postgres snapshot reads and writes must be serialized");
if (!/encryptionKey/.test(apiServer) || !/savePostgresStore\(databaseUrl, app\.store, runtime\.encryptionKey\)/.test(apiServer)) {
  failures.push("Postgres snapshot encryption key wiring is missing");
}
if (!/createCipheriv\("aes-256-gcm"/.test(postgresStore) || !/state_ciphertext/.test(postgresStore)) {
  failures.push("Postgres snapshot encryption storage is missing");
}
if (!/withUserScope/.test(apiApp) || !/verifyUserToken/.test(apiApp) || !/user_scope_required/.test(apiApp)) failures.push("user-owned route token guard is missing");
if (!/verifiedBodyUserId/.test(apiApp) || !/requireVerifiedBodyUserId/.test(apiApp)) failures.push("public report owner token guard is missing");
if (!/allowAnonymousSession\?: boolean/.test(apiApp) || !/allowAnonymousSession:\s*!production/.test(apiServer) || !/allowAnonymousSession:\s*!productionRuntime/.test(apiServer) || !/options\.allowAnonymousSession === false/.test(apiApp)) {
  failures.push("production anonymous session fallback must stay disabled");
}
if (!/identityTestModeRequested/.test(apiServer) || !/testMode:\s*identityTestModeRequested && !production/.test(apiServer) || !/testMode:\s*process\.env\.MUSUNIL_IDENTITY_TEST_MODE === "true" && !productionRuntime/.test(apiServer) || !/identity\.test_mode/.test(apiServer)) {
  failures.push("PortOne identity test mode must be impossible in production and reported by readiness");
}
if (!/verifiedCredentialsFromRequest/.test(apiApp) || !/cookieValueFromHeader/.test(apiApp) || !/"musunil_session"/.test(apiApp) || !/clearIdentityCookieHeaders/.test(apiApp)) {
  failures.push("verified identity session cookie restore and logout clearing guard is missing");
}
if (!/credentials:\s*"include"/.test(webPublicApi) || !/restoreCookieSession/.test(web) || !/sessionFromMe/.test(web)) {
  failures.push("Web must restore HttpOnly identity cookie sessions through /me");
}
if (!/persistIdentitySession/.test(web) || !/shouldPersistIdentityToken/.test(web) || !/location\.protocol !== "https:"/.test(web)) {
  failures.push("Web must avoid long-term localStorage identity token persistence on production HTTPS");
}
if (!/userTokenTtlMs/.test(apiApp) || !/expiresAt/.test(apiApp)) failures.push("verified identity session tokens must expire");
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
if (!/recordPublicSourceRefresh/.test(apiApp) || !/sourceCheckedAt/.test(apiApp) || !/publicSourceRefreshes/.test(apiApp)) {
  failures.push("public source ingest must persist source refresh metadata for coverage freshness");
}
if (!/public-sources\/coverage/.test(apiApp) || !/sourceCoverageReport\(store\.publicSourceRefreshes\)/.test(apiApp)) failures.push("public source coverage API must include live ingest refresh metadata");
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
const liveProofOfPresence = schemasIndex.match(/export function hasProofOfPresence[\s\S]*?export function hasFieldPresenceSignal/);
const fieldPresenceSignal = schemasIndex.match(/export function hasFieldPresenceSignal[\s\S]*?function hasLocalPresenceSignal/);
if (!liveProofOfPresence || !/evidence\.evidenceType !== "live_media"/.test(liveProofOfPresence[0]) || !/captureMode !== "in_app_camera"/.test(liveProofOfPresence[0]) || /evidenceType !== "sensor"|evidenceType === "sensor"/.test(liveProofOfPresence[0])) {
  failures.push("LIVE Proof-of-Presence must be live_media in_app_camera only and must not accept sensor evidence");
}
if (!fieldPresenceSignal || !/evidence\.evidenceType !== "sensor"/.test(fieldPresenceSignal[0]) || !/hasLocalPresenceSignal/.test(fieldPresenceSignal[0])) {
  failures.push("field verification presence signal must stay separate from LIVE video Proof-of-Presence");
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
if (!/sourceId:\s*source\.id/.test(publicIngestWorker) || !/sourceCheckedAt/.test(publicIngestWorker) || !/sourceBatchSize/.test(publicIngestWorker)) {
  failures.push("public source ingest worker must attach registry sourceId, sourceCheckedAt, and sourceBatchSize to each posted payload");
}
if (!/law_source_parse_empty/.test(publicIngestWorker) || publicIngestWorker.indexOf("law_source_parse_empty") > publicIngestWorker.indexOf("laws_dry_run")) {
  failures.push("law source ingest dry-run must fail when parser returns zero rows");
}
if (!/AbortController/.test(publicIngestWorker)) failures.push("public source ingest worker fetch timeout is missing");
if (!/\/internal\/ingest\/public-occurrence/.test(publicIngestWorker)) failures.push("public source ingest worker must post public occurrences to the occurrence ingest route");
if (!/policeRegions/.test(publicSourceRegistry) || !/sourceCoverageReport/.test(publicSourceRegistry) || !/PublicAssemblySourceRefresh/.test(publicSourceRegistry) || !/sourceRefreshes/.test(publicSourceRegistry) || !/sourceOperationalDiagnostics/.test(publicSourceRegistry)) failures.push("public source nationwide coverage registry is missing live refresh metadata support");
if (!/absence_of_public_source_is_not_absence_of_assembly/.test(publicSourceRegistry)) {
  failures.push("public source coverage must not treat source absence as no assembly");
}
if (!/seoul_assembly_control/.test(publicSourceRegistry) || !/sejong_today_assembly/.test(publicSourceRegistry) || !/daegu_today_assembly/.test(publicSourceRegistry) || !/daejeon_today_assembly/.test(publicSourceRegistry) || !/gangwon_today_assembly/.test(publicSourceRegistry) || !/busan_today_assembly/.test(publicSourceRegistry) || !/gyeonggi_south_today_assembly/.test(publicSourceRegistry) || !/gyeonggi_north_today_assembly/.test(publicSourceRegistry) || !/gwangju_today_assembly/.test(publicSourceRegistry) || !/incheon_today_assembly/.test(publicSourceRegistry) || !/gyeongbuk_today_assembly/.test(publicSourceRegistry) || !/gyeongnam_today_assembly/.test(publicSourceRegistry) || !/jeju_today_assembly/.test(publicSourceRegistry) || !/chungbuk_today_assembly/.test(publicSourceRegistry) || !/chungnam_today_assembly/.test(publicSourceRegistry) || !/jeonbuk_today_assembly/.test(publicSourceRegistry) || !/jeonnam_today_assembly/.test(publicSourceRegistry) || !/ulsan_today_assembly/.test(publicSourceRegistry) || !/needs_discovery/.test(publicSourceRegistry)) {
  failures.push("public source registry must separate active sources from unresolved regions");
}
if (!/--diagnose/.test(publicIngestWorker) || !/--require-operational-readiness/.test(publicIngestWorker)) {
  failures.push("public source ingest worker must expose metadata-only operational diagnostics");
}
if (
  !/"sources:assemblies"/.test(rootPackageJson) ||
  !/"sources:assemblies:post"/.test(rootPackageJson) ||
  !/"sources:refresh-preflight"/.test(rootPackageJson)
) {
  failures.push("package scripts must expose public assembly source dry-run, post, and refresh preflight commands");
}
if (
  !/public_source_refresh_preflight/.test(publicSourceRefreshPreflight) ||
  !/\/public-sources\/coverage/.test(publicSourceRefreshPreflight) ||
  !/sourceRefreshes/.test(publicSourceRefreshPreflight) ||
  !/sources:assemblies:post/.test(publicSourceRefreshPreflight) ||
  !/MUSUNIL_INTERNAL_API_KEY/.test(publicSourceRefreshPreflight) ||
  !/resultCount/.test(publicSourceRefreshPreflight) ||
  !/overdueRegions/.test(publicSourceRefreshPreflight)
) {
  failures.push("public source refresh preflight must verify existing sourceRefreshes and post live public sources when an internal key is available");
}
if (!/"sources:diagnose"/.test(rootPackageJson) || !/"check:source-diagnostics"/.test(rootPackageJson) || !/check:source-diagnostics/.test(JSON.parse(rootPackageJson).scripts["check:release"] ?? "")) {
  failures.push("release check must include public source operational diagnostics");
}
if (!/--laws-diagnose/.test(publicIngestWorker) || !/--require-law-metadata/.test(publicIngestWorker) || !/lawOperationalDiagnostics/.test(publicIngestWorker)) {
  failures.push("law source ingest worker must expose metadata-only law diagnostics");
}
if (!/readCredentialString/.test(lawSourceIngest) || !/isPlaceholderCredential/.test(lawSourceIngest) || !/\^CHANGE_ME/.test(lawSourceIngest)) {
  failures.push("law source diagnostics must ignore placeholder credential values before reporting laws as ready for ingest");
}
if (!/"sources:laws-diagnose"/.test(rootPackageJson) || !/"check:law-diagnostics"/.test(rootPackageJson) || !/check:law-diagnostics/.test(JSON.parse(rootPackageJson).scripts["check:release"] ?? "")) {
  failures.push("release check must include law source metadata diagnostics");
}
if (!/MUSUNIL_WEB_CONFIG/.test(web)) failures.push("web runtime config hook is missing");
if (!/build-info\.js/.test(web)) failures.push("web build-info hook is missing");
if (
  !/const writeBuildInfo/.test(webConfigWriter) ||
  !/renderBuildDetected/.test(webConfigWriter) ||
  !/MUSUNIL_WRITE_BUILD_INFO/.test(webConfigWriter) ||
  !/RENDER_GIT_COMMIT/.test(webConfigWriter) ||
  !/RENDER_EXTERNAL_URL/.test(webConfigWriter) ||
  !/if \(writeBuildInfo\)/.test(webConfigWriter)
) {
  failures.push("web config writer must preserve tracked build-info placeholders unless Render or an explicit build-info flag is used");
}
if (!/"check:build-info-clean"/.test(packageJson) || !/ci-build-info-clean\.mjs/.test(packageJson) || !/pnpm check:build-info-clean/.test(JSON.parse(packageJson).scripts["check:release"] ?? "")) {
  failures.push("release check must verify local commands preserve tracked build-info placeholders");
}
if (
  !/"check:web-render-build-output"/.test(packageJson) ||
  !/ci-web-render-build-output\.mjs/.test(packageJson) ||
  !/check:web-render-build-output/.test(JSON.parse(packageJson).scripts["build:web-static:render"] ?? "") ||
  !/MUSUNIL_WRITE_BUILD_INFO=1/.test(JSON.parse(packageJson).scripts["build:web-static:render"] ?? "") ||
  !/Render build output must not publish tracked build-info placeholders/.test(webRenderBuildOutputCheck) ||
  !/buildInfoJson\.commitSha !== expectedCommitSha/.test(webRenderBuildOutputCheck) ||
  !/config\.js apiBaseUrl must be/.test(webRenderBuildOutputCheck)
) {
  failures.push("Render Web build command must fail if build-info placeholders or wrong production apiBaseUrl reach the static output");
}
if (
  !/"check:web-render-build-command"/.test(packageJson) ||
  !/ci-web-render-build-command\.mjs/.test(packageJson) ||
  !/pnpm check:web-render-build-command/.test(JSON.parse(packageJson).scripts["check:release"] ?? "") ||
  !/build:web-static:render/.test(webRenderBuildCommandCheck) ||
  !/preservedFiles/.test(webRenderBuildCommandCheck) ||
  !/writeFileSync/.test(webRenderBuildCommandCheck) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(webRenderBuildCommandCheck) ||
  !/RENDER_GIT_COMMIT/.test(webRenderBuildCommandCheck) ||
  !/gitValue\("rev-parse", "HEAD"\)/.test(webRenderBuildCommandCheck) ||
  !/acquireWebStaticFileLock/.test(webRenderBuildCommandCheck) ||
  !/acquireWebStaticFileLock/.test(ciLaunchCheck)
) {
  failures.push("release check must execute the exact Render Web build command under a shared Web static file lock and restore tracked static placeholders afterward");
}
if (
  !/generated-at-build/.test(webDeployCheck) ||
  !/staticManifestVerified/.test(webDeployCheck) ||
  !/web_build_info_placeholder/.test(webDeployCheck) ||
  !/MUSUNIL_ALLOW_PLACEHOLDER_BUILD_INFO/.test(webDeployCheck) ||
  !/expectedCommitSha && !allowPlaceholderBuildInfo/.test(webDeployCheck) ||
  !/MUSUNIL_EXPECTED_API_BASE_URL/.test(webDeployCheck) ||
  !/parseWebConfig/.test(webDeployCheck) ||
  !/Content-Security-Policy/.test(webDeployCheck) ||
  !/Permissions-Policy/.test(webDeployCheck) ||
  !/X-Frame-Options/.test(webDeployCheck)
) {
  failures.push("web deploy check must verify static manifest freshness, deployed apiBaseUrl, live security headers, and reject tracked build-info placeholders during expected-commit checks unless an explicit hash-only override is set");
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
if (
  !/isPreviewApiBase/.test(web) ||
  !/fallback\.cards = fallback\.cards\.filter\(\(card\) => !isPreviewCard/.test(web) ||
  !/isPreviewIssue/.test(web) ||
  !/id\.includes\("_sample"\)/.test(web)
) {
  failures.push("web production fallback must hide preview/sample data");
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
  ["musunil-ops-scheduler", renderOpsScheduler]
]) {
  if (!/key:\s*MUSUNIL_RUNTIME_ENV[\s\S]*?value:\s*production/.test(block)) failures.push(`${serviceName} must set MUSUNIL_RUNTIME_ENV=production`);
}
if (!/preDeployCommand:\s*pnpm db:migrate/.test(renderYaml)) failures.push("Render API preDeployCommand must run pnpm db:migrate");
if (!/runtime:\s*docker/.test(renderApi) || !/dockerfilePath:\s*\.\/Dockerfile/.test(renderApi) || !/dockerContext:\s*\./.test(renderApi)) {
  failures.push("Render API must use the ffmpeg-capable Docker runtime");
}
if (!/FROM node:24-bookworm-slim/.test(dockerfile) || !/apt-get install[^\n]*ca-certificates ffmpeg/.test(dockerfile) || !/pnpm install --frozen-lockfile && pnpm check/.test(dockerfile)) {
  failures.push("API Docker image must pin Node 24, install ffmpeg, and run the repository check");
}
if (!/config\/musunil\.user-inputs\.local\.yaml/.test(dockerignore)) {
  failures.push("Docker build context must exclude the local secret YAML");
}
const packageScripts = JSON.parse(packageJson).scripts ?? {};
const renderWebBuildScript = packageScripts["build:web-static:render"] ?? "";
if (
  !/"build:web-static:render"/.test(packageJson) ||
  !/MUSUNIL_WEB_API_BASE_URL=(?:https:\/\/api\.musunil\.com|\$\{MUSUNIL_WEB_API_BASE_URL:-https:\/\/api\.musunil\.com\})/.test(renderWebBuildScript) ||
  !/MUSUNIL_WRITE_BUILD_INFO=1/.test(renderWebBuildScript) ||
  !/pnpm build:web-static/.test(renderWebBuildScript) ||
  !/pnpm check:web-smoke/.test(renderWebBuildScript)
) {
  failures.push("package.json must define build:web-static:render with a configurable production API base, build-info writing, static build, and web smoke");
}
if (!/name:\s*musunil-web[\s\S]*?buildCommand:\s*pnpm install --frozen-lockfile && pnpm build:web-static:render/.test(renderYaml)) {
  failures.push("Render Web buildCommand must use pnpm build:web-static:render");
}
if (!/name:\s*musunil-web[\s\S]*?staticPublishPath:\s*apps\/web\/dist/.test(renderYaml)) {
  failures.push("Render Web staticPublishPath must publish apps/web/dist");
}
if (!/name:\s*musunil-web[\s\S]*?routes:\s*[\s\S]*?type:\s*rewrite[\s\S]*?source:\s*\/\*[\s\S]*?destination:\s*\/index\.html/.test(renderYaml)) {
  failures.push("Render Web must rewrite /* to /index.html for direct React routes");
}
if (!/Build Command:\s*pnpm install --frozen-lockfile && pnpm build:web-static:render/.test(readme)) {
  failures.push("README Render Static Site build command must match pnpm build:web-static:render");
}
if (
  !/Render Static Site는 `pnpm build:web-static:render`/.test(readme) ||
  !/MUSUNIL_WRITE_BUILD_INFO=1/.test(readme) ||
  !/check:web-render-build-output/.test(readme) ||
  !/check:web-render-build-command/.test(readme)
) {
  failures.push("README must explain that build:web-static:render writes build-info, checks Render output, and release CI preserves local placeholders");
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
if (!/render\.yaml/.test(webHeaderWriter) || !/apps\/web\/public\/_headers/.test(webHeaderWriter) || !/Content-Security-Policy/.test(webHeaderWriter)) {
  failures.push("static Web _headers writer must mirror render.yaml security headers");
}
if (!/databases:\s*[\s\S]*-\s+name:\s*musunil-postgres\b[\s\S]*databaseName:\s*musunil\b[\s\S]*ipAllowList:\s*\[\]/.test(renderYaml)) {
  failures.push("Render managed Postgres must be declared with private-network-only access");
}
if (!/type:\s*keyvalue\b/.test(renderRedis) || !/ipAllowList:\s*\[\]/.test(renderRedis)) {
  failures.push("Render managed Key Value must be declared with private-network-only access");
}
if (!/plan:\s*free\b/.test(renderRedis) || /persistenceMode:/.test(renderRedis)) {
  failures.push("Render Key Value should use the non-persistent free plan while it is limited to rate-limit counters");
}
if (!/createClient\(\{[\s\S]*?url:\s*redisUrl/.test(httpBoundary) || !/client\.eval\(distributedRateLimitScript/.test(httpBoundary) || !/PEXPIRE/.test(httpBoundary)) {
  failures.push("Redis must enforce the public write rate limit atomically instead of serving as a readiness-only dependency");
}
if (!/createHmac\("sha256", secret\)/.test(httpBoundary) || !/rate_limiter_unavailable/.test(httpBoundary)) {
  failures.push("distributed rate-limit keys must pseudonymize client IPs and fail closed when Redis is unavailable");
}
if (!/disableOfflineQueue:\s*true/.test(httpBoundary) || !/Promise\.race\(\[client\.connect\(\), connectTimeout\]\)/.test(httpBoundary)) {
  failures.push("Redis rate limiting must fail quickly instead of queuing writes or hanging API startup");
}
if (!hasRenderPostgresEnv(renderApi, "DATABASE_URL") || !hasRenderKeyValueEnv(renderApi, "REDIS_URL")) {
  failures.push("Render API must receive DATABASE_URL and REDIS_URL from managed resources");
}
if (!hasRenderFixedEnv(renderApi, "MUSUNIL_USER_INPUTS_FILE_PATH", "/etc/secrets/musunil.user-inputs.yaml")) {
  failures.push("Render API must load user inputs from the mounted Render Secret File");
}
if (!hasRenderGeneratedEnv(renderApi, "MUSUNIL_INTERNAL_API_KEY")) {
  failures.push("Render API must generate MUSUNIL_INTERNAL_API_KEY for internal cron/admin calls");
}
if (!hasRenderGeneratedEnv(renderApi, "MUSUNIL_USER_TOKEN_SECRET")) {
  failures.push("Render API must generate MUSUNIL_USER_TOKEN_SECRET for verified identity sessions");
}
if (!hasRenderGeneratedEnv(renderApi, "MUSUNIL_ENCRYPTION_KEY")) {
  failures.push("Render API must generate MUSUNIL_ENCRYPTION_KEY for encrypted snapshots");
}
if (!/key:\s*NODE_VERSION[\s\S]*?value:\s*24/.test(renderWeb)) failures.push("Render Web must set NODE_VERSION=24");
if (!/key:\s*MUSUNIL_RUNTIME_ENV[\s\S]*?value:\s*production/.test(renderWeb)) failures.push("Render Web must set MUSUNIL_RUNTIME_ENV=production");
if (!hasRenderApiHostportEnv(renderOpsScheduler)) failures.push("musunil-ops-scheduler must receive MUSUNIL_API_HOSTPORT from musunil-api");
if (!hasRenderInternalKeyFromApiEnv(renderOpsScheduler)) failures.push("musunil-ops-scheduler must receive MUSUNIL_INTERNAL_API_KEY from musunil-api");
if (!hasRenderFixedEnv(renderOpsScheduler, "MUSUNIL_USER_INPUTS_FILE_PATH", "/etc/secrets/musunil.user-inputs.yaml")) {
  failures.push("musunil-ops-scheduler must load the same named Render Secret File as musunil-api");
}
if (!hasRenderPostgresEnv(renderOpsScheduler, "DATABASE_URL")) failures.push("musunil-ops-scheduler must receive DATABASE_URL from musunil-postgres for durable task leases");
if (!/maxShutdownDelaySeconds:\s*30/.test(renderYaml)) failures.push("Render API maxShutdownDelaySeconds must be set");
if (!/SIGTERM/.test(readFileSync(resolve(cwd, "services/api/src/server.ts"), "utf8"))) failures.push("API graceful shutdown handler is missing");
if (!/name:\s*musunil-ops-scheduler[\s\S]*?type:\s*cron|type:\s*cron[\s\S]*?name:\s*musunil-ops-scheduler/.test(renderYaml)) {
  failures.push("durable operations scheduler cron is missing from render.yaml");
}
if (!/schedule:\s*"\*\/5 \* \* \* \*"/.test(renderOpsScheduler)) failures.push("operations scheduler cron must wake every five minutes");
if (!/runtime:\s*docker/.test(renderOpsScheduler) || !/dockerCommand:\s*pnpm ops:scheduler/.test(renderOpsScheduler)) {
  failures.push("operations scheduler cron must use the ffmpeg-capable Docker image and run pnpm ops:scheduler");
}
for (const legacyCron of ["musunil-public-source-ingest", "musunil-law-source-ingest", "musunil-notification-dispatch", "musunil-privacy-purge"]) {
  if (renderYaml.includes(`name: ${legacyCron}`)) failures.push(`legacy duplicate cron must be removed after scheduler consolidation: ${legacyCron}`);
}
for (const taskId of ["notification_dispatch", "public_source_ingest", "law_source_ingest", "media_redaction", "privacy_purge"]) {
  if (!opsSchedulerContract.includes(`id: "${taskId}"`)) failures.push(`operations scheduler task is missing: ${taskId}`);
}
if (!/for update skip locked\s+limit 1/i.test(opsScheduler) || !/lease_owner = \$2/.test(opsScheduler) || !/lease_until <= now\(\)/.test(opsScheduler) || !/renewLease\(task\)/.test(opsScheduler)) {
  failures.push("operations scheduler must atomically claim one expired due-task lease and renew it while the task runs");
}
if (!/failure_count = failure_count \+ 1/.test(opsScheduler) || !/retry_seconds \* interval '1 second'/.test(opsScheduler)) {
  failures.push("operations scheduler must persist failure retry state");
}
if (!/create table if not exists ops_task_leases/i.test(opsSchedulerMigration) || !/ops_task_leases_due_idx/i.test(opsSchedulerMigration)) {
  failures.push("operations scheduler durable lease migration is missing");
}
if (!/pingOpsSchedulerSchema/.test(readFileSync(resolve(cwd, "services/api/src/server.ts"), "utf8")) || !/ops_scheduler_schema/.test(readFileSync(resolve(cwd, "services/api/src/server.ts"), "utf8"))) {
  failures.push("API readiness must verify the durable operations scheduler schema");
}
if (!/"ops:scheduler"/.test(packageJson) || !/"check:ops-scheduler"/.test(packageJson) || !/check:ops-scheduler/.test(packageScripts["check:release"] ?? "")) {
  failures.push("operations scheduler scripts and release contract are missing");
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
    /MUSUNIL_USER_INPUTS_B64/i,
    /MUSUNIL_USER_INPUTS_FILE_PATH/i
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
    const serviceStart = lines[start].match(/^(\s*)-\s+type:/);
    if (!serviceStart || serviceStart[1].length !== 2) continue;
    const serviceIndent = serviceStart[1].length;
    const nextService = new RegExp(`^\\s{${serviceIndent}}-\\s+type:`);
    let end = start + 1;
    while (end < lines.length && !nextService.test(lines[end]) && !/^\S/.test(lines[end])) end += 1;
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

function hasRenderGeneratedEnv(block, key) {
  return new RegExp(`key:\\s*${escapeRegExp(key)}\\s*\\n\\s*generateValue:\\s*true`).test(block);
}

function hasRenderFixedEnv(block, key, value) {
  return new RegExp(`key:\\s*${escapeRegExp(key)}\\s*\\n\\s*value:\\s*${escapeRegExp(value)}`).test(block);
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
