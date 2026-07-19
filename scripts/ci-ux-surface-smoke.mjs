import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const index = readFileSync(resolve(cwd, "apps/web/index.html"), "utf8");
const publicApiModule = readFileSync(resolve(cwd, "apps/web/modules/public-api.js"), "utf8");
const packageJson = readFileSync(resolve(cwd, "package.json"), "utf8");
const failures = [];
const checkedScenarios = [];

scenario("home_issue_first", [
  has('id="home-section"'),
  has("공개자료 기반 집회·시위"),
  has('id="issue-stories"'),
  has('id="issues"'),
  has('data-issue-card-action="evidence"'),
  has(">근거 보기</span>"),
  order('id="issue-stories"', 'id="issues"'),
  order('id="issues"', 'id="issue-situations-block"'),
  absent("이슈 파일"),
  absent("현장 파일"),
  absent("관련 상황"),
  absent("상황 범위"),
  absent("시민 5초 요약")
]);

scenario("no_dashboard_regression", [
  absent("global-strip"),
  absent('class="metric"'),
  absent("metric-live"),
  absent(".mini-stat"),
  absent("stat-grid"),
  absent("KPI"),
  absent("<span>확인 수준</span>"),
  absent("<span>현재 상태</span>"),
  absent("<span>확인 요약</span>"),
  absent("issue-card-secondary-actions"),
  absent("reels-review-panel"),
  has("issue-card-deck"),
  has("issue-card-proof-row"),
  has("issue-location-strip"),
  has("issue-location-symbol"),
  absent("issue-place-map"),
  absent("issue-map-lane"),
  absent("issue-place-area"),
  has("issuePlainSummaryText"),
  has("issueCardScanlineText")
]);

scenario("commercial_navigation_surface", [
  has('data-tab-view="home"'),
  has('data-tab-view="reels"'),
  has('data-tab-view="explore"'),
  has('data-tab-view="laws"'),
  has('data-tab-view="report"'),
  has('data-rail-view="home"'),
  has('data-rail-view="reels"'),
  has('data-rail-view="explore"'),
  has('data-rail-view="laws"'),
  has('data-rail-view="report"'),
  absent('data-tab-view="map"'),
  absent('data-tab-view="record"'),
  absent('data-tab-view="detail"'),
  absent("<span>상세</span>")
]);

scenario("reels_objective", [
  has('id="reels-section"'),
  has('<video class="reel-video"'),
  has('data-reel-action="evidence"'),
  has('data-reel-action="occurrence"'),
  has('data-reel-action="issue"'),
  has('data-reel-action="dispute"'),
  has("reel-pending-card"),
  has("<span>근거</span>"),
  has("<span>현장</span>"),
  has("<span>이슈</span>"),
  has("<span>다른 주장</span>"),
  absent("좋아요"),
  absent("댓글"),
  absent("찬반"),
  absent("추천"),
  absent("비추천"),
  absent("팔로우")
]);

scenario("map_context_tool", [
  has('id="map-section"'),
  has('id="live-map"'),
  has("occurrence-pins"),
  has("presence-areas"),
  has("자료 위치"),
  has("현장 인증 범위"),
  has("근거 보기"),
  absent("preview-route"),
  absent("preview-transit"),
  absent("preview-crowd"),
  absent("traffic_control"),
  absent("transit_occurrence"),
  absent("crowd_density_signal"),
  absent("route_segment"),
  absent("route_checkpoint")
]);

scenario("report_beginner_flow", [
  has('id="report-section"'),
  has("근처 현장 후보"),
  has("위치 확인 후 표시될 정보"),
  has("근처 현장 찾기"),
  has("이 현장 확정"),
  has('id="start-capture-action"'),
  has('id="confirm-report-target"'),
  has('id="submit-capture-action"'),
  has('id="change-capture-target-action"'),
  has('id="report-receipt"'),
  functionHas("startLiveCapture", "if (!reportTargetConfirmed)"),
  functionHas("startLiveCapture", "confirmReportTarget()"),
  functionHas("submitPendingCapture", "storeReportReceipt(receipt)"),
  functionHas("changeCaptureTarget", "reportTargetConfirmed = false"),
  functionHas("refreshStoredReportReceipt", "/me/reports"),
  functionHas("renderReportReceipt", 'receiptReference(receipt.claimId, "C")')
]);

scenario("identity_write_boundary", [
  has('id="identity-sheet"'),
  has('id="identity-start-action"'),
  has('api("/auth/identity/start"'),
  has('api("/auth/identity/complete"'),
  hasPublicApi('credentials: "include"'),
  has("restoreCookieSession"),
  has("persistIdentitySession"),
  has("shouldPersistIdentityToken"),
  functionHas("getUserSession", "openIdentitySheet(purpose)"),
  functionHas("sessionHeaders", '"x-musunil-user-id"'),
  functionHas("sessionHeaders", '"x-musunil-user-token"')
]);

scenario("forbidden_social_surface", [
  absent("좋아요"),
  absent("댓글"),
  absent("찬반"),
  absent("추천"),
  absent("비추천"),
  absent("팔로우"),
  absent("사용자 원문"),
  absent("raw GPS"),
  absent("private media"),
  absent("localhost:4000")
]);

scenario("release_gate_includes_ux_surface", [
  () => assert(packageJson.includes('"check:ux-surface"'), "package.json missing check:ux-surface script"),
  () => assert(packageJson.includes("pnpm check:ux-surface"), "check:release must run check:ux-surface")
]);

if (failures.length > 0) {
  console.error(["UX surface smoke failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ checked: "commercial_ux_surface", scenarios: checkedScenarios }, null, 2));

function scenario(id, assertions) {
  const before = failures.length;
  for (const check of assertions) {
    try {
      check();
    } catch (error) {
      failures.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  checkedScenarios.push({ id, ok: failures.length === before, assertions: assertions.length });
}

function has(needle) {
  return () => assert(index.includes(needle), `missing ${needle}`);
}

function hasPublicApi(needle) {
  return () => assert(publicApiModule.includes(needle), `public API module missing ${needle}`);
}

function absent(needle) {
  return () => assert(!index.includes(needle), `forbidden ${needle}`);
}

function order(first, second) {
  return () => {
    const firstIndex = index.indexOf(first);
    const secondIndex = index.indexOf(second);
    assert(firstIndex >= 0, `missing ${first}`);
    assert(secondIndex >= 0, `missing ${second}`);
    assert(firstIndex < secondIndex, `${first} must appear before ${second}`);
  };
}

function functionHas(name, needle) {
  return () => {
    const body = functionBody(name);
    assert(body.includes(needle), `${name} missing ${needle}`);
  };
}

function functionBody(name) {
  const start = index.indexOf(`function ${name}`);
  assert(start >= 0, `function not found: ${name}`);
  const next = index.indexOf("\n      function ", start + 1);
  return index.slice(start, next > start ? next : index.length);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
