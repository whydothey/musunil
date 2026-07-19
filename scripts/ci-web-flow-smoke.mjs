import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const index = readFileSync(resolve(cwd, "apps/web/index.html"), "utf8");
const publicApiModule = readFileSync(resolve(cwd, "apps/web/modules/public-api.js"), "utf8");
const packageJson = readFileSync(resolve(cwd, "package.json"), "utf8");
const failures = [];
const checkedScenarios = [];

scenario("mobile_desktop_navigation_surface", [
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
  regex(/document\.querySelectorAll\("\.mobile-nav button"\)[\s\S]*setMobileTab\(button\.dataset\.tabView, button\)/),
  regex(/document\.querySelectorAll\("\.rail-item"\)[\s\S]*setPrimaryView\(button\.dataset\.railView\)/)
]);

scenario("home_issue_card_to_evidence_and_dispute", [
  has('data-issue-card-action="evidence"'),
  has('>근거 보기</span>'),
  has('data-issue-card-action="dispute"'),
  functionHas("openIssueCardAction", 'if (action === "evidence")'),
  functionHas("openIssueCardAction", 'selectIssue(issue, { openDetail: true, scrollToCards: false, initialTab: "evidence" });'),
  functionHas("openIssueCardAction", 'const initialTab = action === "dispute" ? "dispute" : "evidence";'),
  functionHas("selectIssue", "renderIssueDetail(issue)"),
  functionHas("selectIssue", "openDetailPanel()"),
  functionHas("selectIssue", 'const initialTab = options.initialTab || "summary"'),
  functionHas("selectIssue", "selectDetailTab(initialTab")
]);

scenario("home_issue_card_to_map_and_video", [
  has('data-issue-card-action="map"'),
  has('class="issue-location-strip"'),
  functionHas("openIssueCardAction", 'if (action === "video")'),
  functionHas("openIssueCardAction", 'requestedReelsIssueId = issue.id;'),
  functionHas("openIssueCardAction", 'setPrimaryView("reels");'),
  functionHas("openIssueCardAction", 'if (action === "map")'),
  functionHas("openIssueCardAction", 'setPrimaryView("explore");'),
  functionHas("openIssueCardAction", "renderDetail(selected)"),
  functionHas("openIssueCardAction", "liveMap?.resize()"),
  functionHas("openIssueCardAction", 'focusPanel(document.querySelector(".map-shell"))')
]);

scenario("detail_quick_actions_to_evidence_video_map", [
  has('data-detail-jump="evidence"'),
  has('data-detail-jump="video"'),
  has('data-detail-jump="map"'),
  regex(/\$\("record-section"\)\.addEventListener\("click"[\s\S]*closest\("\[data-detail-jump\]"\)/),
  regex(/jump === "map"[\s\S]*setPrimaryView\("explore"\)/),
  regex(/const targetTab = \{ video: "video", evidence: "evidence", region: "timeline", dispute: "dispute" \}\[jump\] \|\| "summary"/),
  regex(/selectDetailTab\(targetTab\)/),
  functionHas("selectDetailTab", "normalizedDetailTab(tab)"),
  functionHas("selectDetailTab", 'for (const id of ["summary", "video", "timeline", "evidence", "dispute"])'),
  functionHas("selectDetailTab", "targetTab !== id")
]);

scenario("reels_actions_keep_video_objective", [
  has('data-reel-action="evidence"'),
  has('data-reel-action="region"'),
  has('data-reel-action="dispute"'),
  has('data-reel-action="issue"'),
  has('<video class="reel-video"'),
  has("reel-pending-card"),
  regex(/closest\("\[data-reel-action\]"\)/),
  regex(/action\.dataset\.reelAction === "region"[\s\S]*setPrimaryView\("explore"\)/),
  regex(/action\.dataset\.reelAction === "issue"[\s\S]*setPrimaryView\("home"\)/),
  regex(/evidence: "evidence",\s*dispute: "dispute"/),
  regex(/selectDetailTab\(tab\);\s*openDetailPanel\(\);/)
]);

scenario("shared_issue_context_strips", [
  has('id="reels-issue-anchor"'),
  has('id="map-issue-anchor"'),
  has('id="report-issue-anchor"'),
  has('data-context-jump="evidence"'),
  has('data-context-jump="issue"'),
  regex(/document\.querySelectorAll\("\[data-context-jump\]"\)[\s\S]*openSelectedIssueEvidence\(\)/),
  regex(/document\.querySelectorAll\("\[data-context-jump\]"\)[\s\S]*openSelectedIssueHome\(\)/),
  functionHas("selectIssue", "updateIssueContextStrips()"),
  functionHas("selectCard", "updateIssueContextStrips()")
]);

scenario("map_selection_and_search_remain_contextual", [
  has("occurrence-pins"),
  has("presence-areas"),
  has('id="map-anchor-kicker"'),
  has("선택 현장"),
  has("자료 위치"),
  has("현장 인증 범위"),
  has("근거 보기"),
  functionHas("renderDetail", "renderMapSelectionContext(card)"),
  functionHas("selectCard", "flyToCard(card)"),
  functionHas("selectCard", "renderDetail(card).then"),
  functionHas("selectIssue", 'options.mapContext || currentPrimaryView === "explore"'),
  functionHas("renderMapSelectionContext", "현장 인증 범위"),
  functionHas("updateIssueContextStrips", "occurrenceSelection.snapshot().occurrence"),
  functionHas("updateIssueContextStrips", 'mapKicker.textContent = "선택 현장"'),
  regex(/selectCard\(match, \{ openDetail: false, toast: "지도에서 검색 결과를 봅니다\." \}\)/),
  absent("preview-route"),
  absent("preview-transit"),
  absent("preview-crowd")
]);

scenario("shared_occurrence_selection_contract", [
  has('<script type="module">'),
  has('./modules/contracts.js'),
  has('./modules/selection-state.js'),
  has('./modules/public-api.js'),
  has("selectedOccurrenceId"),
  functionHas("syncSelectedOccurrence", "occurrenceSelection.select(digest)"),
  functionHas("selectIssue", "syncSelectedOccurrence(selected)"),
  functionHas("selectCard", "syncSelectedOccurrence(card)"),
  functionHas("selectMapOccurrence", "selectCard(card")
]);

scenario("issue_file_opens_occurrence_first", [
  has("전국 집회 현장"),
  has("data-issue-occurrence-id"),
  has("renderIssueOccurrenceFile(cards)"),
  functionHas("renderIssueSummary", "${occurrenceFile}"),
  functionHas("renderIssueOccurrenceFile", "cardPlaceTimeText(card)"),
  functionHas("renderIssueOccurrenceFile", "cardEvidenceText(card)"),
  functionHas("renderIssueSummary", "renderIssueRelatedLaws(issue)"),
  has("data-issue-law-id"),
  regex(/const occurrenceButton = event\.target[\s\S]*data-issue-occurrence-id/),
  regex(/const card = loadedCards\.find\(\(item\) => item\.id === occurrenceButton\.dataset\.issueOccurrenceId\);[\s\S]*selectCard\(card\)/),
  regex(/const law = loadedLaws\.find\(\(item\) => item\.id === issueLawButton\.dataset\.issueLawId\);[\s\S]*setPrimaryView\("laws"\)/)
]);

scenario("laws_to_issue_context", [
  has("법안·개정안"),
  has("법안이 어떤 이슈와 연결되는지 먼저 봅니다."),
  has("data-law-issue-id"),
  functionHas("openIssueFromLaw", 'setMobileTab("home"'),
  functionHas("openIssueFromLaw", 'setRailCurrent("home")'),
  functionHas("openIssueFromLaw", "selectIssue(issue"),
  functionHas("renderLawSummary", "data-law-issue-id")
]);

scenario("report_target_first_capture_and_receipt", [
  has('id="start-capture-action"'),
  has('id="confirm-report-target"'),
  has('id="submit-capture-action"'),
  has('id="report-receipt"'),
  has("근처 현장 후보"),
  has("위치 확인 후 표시될 정보"),
  has("이 현장 확정"),
  functionHas("updateReportActionState", 'start.textContent = "근처 현장 찾기";'),
  functionHas("updateReportActionState", 'start.textContent = canConfirmReportTarget() ? "이 현장 확정" : "근처 현장 찾기";'),
  functionHas("updateReportActionState", 'start.textContent = "7초 촬영하기";'),
  functionHas("startLiveCapture", 'if (!reportTargetConfirmed)'),
  functionHas("startLiveCapture", "confirmReportTarget()"),
  functionHas("startLiveCapture", 'activateReportFlow({ requestPosition: true })'),
  functionHas("startLiveCapture", 'await getUserSession("report")'),
  functionHas("submitPendingCapture", "storeReportReceipt(receipt)"),
  functionHas("renderReportReceipt", "receipt.reportId || receipt.claimId")
]);

scenario("identity_write_boundary_for_user_actions", [
  has('id="identity-sheet"'),
  has('id="identity-start-action"'),
  has('api("/auth/identity/start"'),
  has('api("/auth/identity/complete"'),
  hasPublicApi('credentials: "include"'),
  has("restoreCookieSession"),
  has("persistIdentitySession"),
  has("shouldPersistIdentityToken"),
  functionHas("getUserSession", "openIdentitySheet(purpose)"),
  functionHas("completeIdentity", "window.PortOne?.requestIdentityVerification"),
  functionHas("sessionHeaders", '"x-musunil-user-id"'),
  functionHas("sessionHeaders", '"x-musunil-user-token"')
]);

scenario("release_gate_includes_flow_smoke", [
  () => assert(packageJson.includes('"check:web-flow"'), "package.json missing check:web-flow script"),
  () => assert(packageJson.includes("pnpm check:web-flow"), "check:release must run check:web-flow")
]);

if (failures.length > 0) {
  console.error(["Web flow smoke failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ checked: "web_user_flow", scenarios: checkedScenarios }, null, 2));

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

function regex(pattern) {
  return () => assert(pattern.test(index), `missing pattern ${pattern}`);
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
