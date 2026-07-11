import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const port = await freePort();
const env = { ...process.env, PORT: String(port) };
const configBuild = spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "scripts/write-web-config.mjs", "--static"], {
  cwd,
  env,
  stdio: "inherit"
});
if (configBuild.status !== 0) process.exit(configBuild.status ?? 1);
const manifestBuild = spawnSync(process.execPath, ["scripts/write-web-static-manifest.mjs"], {
  cwd,
  env,
  stdio: "inherit"
});
if (manifestBuild.status !== 0) process.exit(manifestBuild.status ?? 1);
const server = spawn(process.execPath, ["scripts/serve-web.mjs"], {
  cwd,
  env,
  stdio: "inherit"
});

let exitCode = 0;
try {
  await waitForWeb(port);
  await checkWeb(port);
  await checkRuntimeConfigOverride();
} catch (error) {
  exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
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

async function waitForWeb(port) {
  return waitForWebServer(server, port);
}

async function waitForWebServer(webServer, port) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (webServer.exitCode !== null) throw new Error(`Web server exited before smoke check with ${webServer.exitCode}`);
    try {
      const response = await fetch(`http://localhost:${port}/`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    }
  }
  throw new Error("Web server did not become ready in time");
}

async function checkRuntimeConfigOverride() {
  const overridePort = await freePort();
  const overrideApiBaseUrl = "http://localhost:58241";
  const overrideServer = spawn(process.execPath, ["scripts/serve-web.mjs"], {
    cwd,
    env: {
      ...process.env,
      PORT: String(overridePort),
      MUSUNIL_WEB_API_BASE_URL: overrideApiBaseUrl
    },
    stdio: "inherit"
  });

  try {
    await waitForWebServer(overrideServer, overridePort);
    const config = await (await fetch(`http://localhost:${overridePort}/config.js`)).text();
    assert(config.includes(`"apiBaseUrl": "${overrideApiBaseUrl}"`), "serve-web runtime API override was not applied");
    assert(!config.includes("api.musunil.com"), "serve-web runtime API override leaked stale production API");
    assert(!/internal|secret|jwt|postgres|redis|database|MUSUNIL_USER_INPUTS/i.test(config), "serve-web runtime config leaked internal/secret pattern");
  } finally {
    overrideServer.kill("SIGTERM");
    const code = await waitForExit(overrideServer);
    if (code !== 0) throw new Error(`Runtime config override web server exited with ${code}`);
  }
}

async function checkWeb(port) {
  const base = `http://localhost:${port}`;
  const html = await fetch(`${base}/`);
  assert(html.status === 200, `index returned ${html.status}`);
  const index = await html.text();
  assert(html.headers.get("x-content-type-options") === "nosniff", "nosniff header missing");
  assert(html.headers.get("x-frame-options") === "DENY", "x-frame-options header missing");
  assert(html.headers.get("referrer-policy") === "no-referrer", "referrer-policy header missing");
  assert(html.headers.get("permissions-policy")?.includes("geolocation=(self)"), "permissions-policy geolocation self grant missing");
  assert(html.headers.get("permissions-policy")?.includes("camera=(self)"), "permissions-policy camera self grant missing");
  assert(html.headers.get("content-security-policy")?.includes("default-src 'self'"), "content-security-policy missing");
  assert(html.headers.get("content-security-policy")?.includes("https://cdn.portone.io"), "PortOne SDK CSP allowlist missing");
  assert(html.headers.get("content-security-policy")?.includes("media-src 'self'"), "public media CSP allowlist missing");
  assert(index.includes("확인된 집회·시위"), "consumer issue-feed home title missing");
  for (const [id, title] of [
    ["issue_public_regional_schedule", "지역별 집회 공개 일정"],
    ["issue_public_daegu_stats", "대구 집회 신고·개최 현황"],
    ["issue_public_national_stats", "전국 집회 신고·개최 통계"]
  ]) {
    assert(index.includes(`id: "${id}"`), `official public-source fallback issue missing: ${id}`);
    assert(index.includes(title), `official public-source fallback issue title missing: ${title}`);
  }
  assert(index.includes("issue-card-actions"), "issue card action hub missing");
  assert(index.includes('data-issue-empty-state="sync-waiting"'), "home issue empty sync state missing");
  assert(index.includes("새 이슈를 확인 중입니다"), "home issue empty state must use user-facing status copy");
  assert(index.includes("지역별 현장 맥락"), "home issue empty state must point to regional context");
  assert(index.includes('data-issue-empty-action="refresh"'), "home issue empty refresh action missing");
  assert(index.includes('data-issue-empty-action="explore"'), "home issue empty explore action missing");
  assert(index.includes(">지역 보기<"), "home issue empty explore action must use regional label");
  assert(index.includes("!isPreviewIssue(issue.id) && !isMetaPublicSourceIssue(issue)"), "production fallback must not expose public-source bundles as issue cards");
  assert(!index.includes("issue-card-secondary-actions"), "legacy issue card secondary action row present");
  assert(index.includes("issue-place-peek"), "issue card place preview missing");
  assert(index.includes("issue-place-map"), "issue card place preview mini-map missing");
  assert(index.includes("issue-map-lane"), "issue card place preview road surface missing");
  assert(index.includes("issue-place-area"), "issue card place preview public area missing");
  assert(!index.includes("radial-gradient(circle at 72% 42%"), "issue card place preview still uses target-like radial art");
  assert(index.includes("primary-action"), "issue card primary action styling missing");
  assert(index.includes("issue-confirm-summary"), "issue card confirmed summary row missing");
  assert(index.includes("issueConfirmedSummaryLine"), "shared issue confirmed summary helper missing");
  assert(index.includes("issueCardMainFactLine"), "issue card main fact summary helper missing");
  assert(index.includes("issueCardEvidenceLine"), "issue card evidence summary helper missing");
  assert(index.includes("issueAssemblyTimeText"), "issue assembly time summary helper missing");
  assert(index.includes("issueSourceBasisText"), "issue source basis summary helper missing");
  assert(index.includes("isMetaPublicSourceIssue"), "meta public-source issue sort guard missing");
  assert(index.includes('id="detail-confirm-summary"'), "detail confirmed summary line missing");
  assert(index.includes("issue-card-action-label"), "issue card footer action label missing");
  assert(index.includes(">상세 보기</span>"), "issue card lightweight detail label missing");
  assert(index.includes("secondary-action"), "issue card dispute shortcut styling missing");
  assert(index.includes('data-issue-card-action="dispute"'), "issue card dispute shortcut missing");
  assert(!index.includes("근거·영상·지도"), "old issue card footer path copy present");
  assert(index.includes(".issue-card-action.primary-action") && index.includes("background: transparent;"), "issue card primary action should be lightweight, not a filled CTA");
  assert(!index.includes('issueCardActionButton("evidence", "icon-stats", "근거 보기", `${title} 근거 보기`, "primary")'), "evidence should not remain the primary home card action");
  assert(!index.includes('issueCardActionButton("map", "icon-locate", "지도", `${title} 지도에서 위치 확인`, "primary")'), "map action should not be the primary card action");
  assert(index.includes('data-issue-card-action="summary"'), "issue card summary action missing");
  assert(!index.includes('issueCardActionButton("video"'), "issue card video action should not be a repeated CTA");
  assert(!index.includes('issueCardActionButton("dispute"'), "issue card rebuttal action should not be a repeated CTA");
  assert(!index.includes('issue-card-source">공개자료 기준'), "repeated issue card source label present");
  assert(!index.includes("<span>확인 요약</span>"), "dashboard-like issue card summary label present");
  assert(!index.includes("지도에서 확인</span>"), "legacy oversized map CTA present");
  assert(!index.includes('issueCardActionButton("video", "icon-video", "인증영상"'), "long verified video card action label present");
  assert(index.includes('data-tab-view="report"><svg class="nav-symbol"><use href="#icon-report"></use></svg><span>제보</span></button>'), "report navigation label missing");
  assert(!index.includes("<span>현장촬영</span>"), "stale field capture navigation label present");
  assert(!index.includes("<span>영상제보</span>"), "ambiguous video report nav label present");
  assert(index.includes("openIssueCardAction"), "issue card action router missing");
  assert(index.includes("desktop-detail-open"), "desktop detail-open state missing");
  assert(index.includes("homeStatusText"), "plain home status copy helper missing");
  assert(!index.includes("실시간 자료 · 현장"), "dashboard-like home status copy present");
  assert(!index.includes("현장 파일 보기"), "internal file-language CTA present");
  assert(!index.includes("중요 변경 알림"), "global follow-like alert CTA present");
  assert(index.includes("공개용으로 처리된 영상"), "public redacted media explanation missing");
  assert(index.includes("근처 현장 찾기"), "location-first report CTA missing");
  assert(index.includes("has-field-preview"), "compact mobile field preview class missing");
  assert(index.includes("grid-template-columns: minmax(0, 1fr) 112px"), "compact mobile issue card media rail missing");
  assert(index.includes("issue-card-deck"), "issue card public summary deck missing");
  assert(index.includes("issue-card-proof-row"), "issue card proof row missing");
  assert(!index.includes("시민 5초 요약"), "internal five-second summary label exposed");
  assert(index.includes("issuePlainSummaryText"), "plain-language issue summary missing");
  assert(index.includes("issueCardScanlineText"), "issue card scanline helper missing");
  assert(index.includes("위치 ${regionCount}곳"), "issue location-count scanline missing");
  assert(index.includes("현장 ${count}건"), "issue occurrence-count scanline missing");
  assert(index.includes("공식 자료 ${official}건"), "issue official-source scanline missing");
  assert(index.includes("issueScaleStatusText"), "issue scale status line missing");
  assert(index.includes("issueDisputeStatusText"), "issue dispute status line missing");
  assert(index.includes("publicLocationCountText"), "public location count helper missing");
  assert(index.includes("relatedTargetCountText"), "related target count helper missing");
  assert(index.includes("publicZeroCountDisplayText"), "public zero-count display normalizer missing");
  assert(index.includes("issueEvidenceLineText"), "plain-language issue evidence line missing");
  assert(index.includes("issueUncertaintyText(issue)"), "uncertainty disclosure missing");
  assert(!index.includes("<span>확인 수준</span>"), "dashboard row label present in issue card");
  assert(!index.includes("<span>현재 상태</span>"), "dashboard status row label present in issue card");
  assert(index.includes('data-detail-jump="video"'), "detail video quick action missing");
  assert(index.includes('data-detail-jump="map"'), "detail map quick action missing");
  assert(index.includes('data-detail-jump="evidence"'), "detail evidence quick action missing");
  assert(index.includes("detail-disclosure"), "collapsible detail disclosure missing");
  assert(index.includes('id="issue-stories"'), "issue story rail missing");
  assert(index.includes('id="reels-section"'), "top-level reels section missing");
  assert(index.includes('id="explore-grid"'), "explore grid missing");
  assert(index.includes('data-tab-view="home"'), "home mobile tab missing");
  assert(index.includes('data-tab-view="reels"'), "reels mobile tab missing");
  assert(index.includes('data-tab-view="reels"><svg class="nav-symbol"><use href="#icon-video"></use></svg><span>영상</span></button>'), "reels mobile tab should be labeled 영상");
  assert(!index.includes('data-tab-view="reels"><svg class="nav-symbol"><use href="#icon-video"></use></svg><span>인증영상</span></button>'), "stale 인증영상 mobile tab label present");
  assert(index.includes('data-tab-view="explore"'), "explore mobile tab missing");
  assert(index.includes('data-tab-view="explore"><svg class="nav-symbol"><use href="#icon-search"></use></svg><span>탐색</span></button>'), "explore mobile tab should be labeled 탐색");
  assert(!index.includes('data-tab-view="explore"><svg class="nav-symbol"><use href="#icon-search"></use></svg><span>지도</span></button>'), "stale 지도 mobile tab label present");
  assert(index.includes('data-tab-view="laws"'), "laws mobile tab missing");
  assert(index.includes('data-tab-view="report"'), "report mobile tab missing");
  assert(index.includes('data-tab-view="report"><svg class="nav-symbol"><use href="#icon-report"></use></svg><span>제보</span></button>'), "report mobile tab should be labeled 제보");
  assert(!index.includes('data-tab-view="report"><svg class="nav-symbol"><use href="#icon-report"></use></svg><span>현장촬영</span></button>'), "stale 현장촬영 mobile tab label present");
  assert(!index.includes('data-icon="'), "stale text-icon mobile nav present");
  assert(index.includes('href="#icon-home"'), "home line icon missing");
  assert(index.includes('href="#icon-video"'), "video line icon missing");
  assert(index.includes('href="#icon-search"'), "search line icon missing");
  assert(index.includes('href="#icon-law"'), "law line icon missing");
  assert(index.includes('href="#icon-report"'), "report line icon missing");
  assert(index.includes("mobile-detail-open"), "detail sheet state missing");
  assert(index.includes("data-reel-action=\"evidence\""), "reel evidence action missing");
  assert(index.includes("data-reel-action=\"region\""), "reel region action missing");
  assert(index.includes("data-reel-action=\"issue\""), "reel issue action missing");
  assert(index.includes("data-reel-action=\"dispute\""), "reel dispute action missing");
  assert(index.includes("reelsDefaultIssue"), "reels should choose a video-bearing issue by default");
  assert(index.includes("renderReelsEmptyState"), "professional reels empty state missing");
  assert(index.includes("renderReelsPendingReview"), "posterless live claims should render as pending full-screen reels");
  assert(index.includes("reel-full reel-pending"), "posterless review should use full-screen reel styling");
  assert(index.includes('renderPublicVideoReviewSlot("reel")'), "posterless review should use reel-size review surface");
  assert(!index.includes("reels-review-panel"), "legacy posterless review panel returned");
  assert(index.includes('data-reel-empty-action="map"'), "reels empty map recovery action missing");
  assert(index.includes('data-reel-empty-action="evidence"'), "reels empty evidence recovery action missing");
  assert(index.includes('data-reel-empty-action="report"'), "reels empty report recovery action missing");
  assert(index.includes("publicLiveVideoDisplaySrc"), "full-screen reel display-safe video resolver missing");
  assert(index.includes('<video class="reel-video"'), "full-screen reel should render actual public video when available");
  assert(index.includes('controlslist="nodownload noplaybackrate"'), "public reel video controls should avoid download/rate affordances");
  assert(!index.includes('<img class="reel-poster-image" src="${escapeHtml(poster)}"'), "full-screen public reels must not stay poster-only");
  assert(index.includes("reel-play-badge is-ready"), "full-screen reel public copy badge missing");
  assert(!index.includes('<span class="reel-play-badge">${poster ? "비식별 공개본" : "검토 대기"}</span>'), "pending videos must not use play-badge affordance");
  assert(index.includes("<svg class=\"button-symbol\" aria-hidden=\"true\"><use href=\"#icon-stats\"></use></svg><span>근거</span>"), "reel evidence icon action missing");
  assert(!index.includes('data-tab-view="record"'), "stale detail mobile tab present");
  assert(!index.includes('data-tab-view="map"'), "stale map mobile tab present");
  assert(!index.includes('data-tab-view="law"'), "stale singular law mobile tab present");
  assert(!index.includes("traffic_control"), "internal current enum present");
  assert(!index.includes("WEAKLY_OBSERVED"), "internal observation enum present");
  assert(!index.includes("transit_occurrence"), "removed transit target type present");
  assert(!index.includes("crowd_density_signal"), "removed crowd target type present");
  assert(!index.includes("route_segment"), "removed route segment target type present");
  assert(!index.includes("route_checkpoint"), "removed route checkpoint target type present");
  assert(!index.includes("preview-transit"), "removed preview transit layer present");
  assert(!index.includes("preview-crowd"), "removed preview crowd layer present");
  assert(!index.includes("preview-route"), "removed preview route layer present");
  assert(!index.includes("이동 영향별"), "removed movement-impact wording present");
  assert(!index.includes('data-layer="transit"'), "removed transit layer control present");
  assert(!index.includes('data-layer="crowd"'), "removed crowd layer control present");
  assert(!index.includes('data-layer="route"'), "removed route layer control present");
  assert(!index.includes("pin preview-only"), "fixed preview DOM pin present");
  assert(!index.includes(".pin.preview-only"), "fixed preview DOM pin CSS present");
  assert(index.includes("occurrence-pins"), "MapLibre occurrence pin source missing");
  assert(index.includes("presence-areas"), "MapLibre presence area source missing");
  assert(index.includes("fallbackPinFeatures"), "map fallback data pin renderer missing");
  assert(index.includes("drawFallbackPresence"), "map fallback presence area renderer missing");
  assert(index.includes("fallbackPresenceAreaFeatureForCard"), "map fallback presence area should be evidence-gated");
  assert(index.includes("fallbackPresenceEvidenceCount"), "map fallback live evidence counter missing");
  assert(!index.includes(".filter((card) => card.publicLocation && Number(card.proof || 0) > 0)"), "map fallback presence area must not use generic proof count");
  assert(!index.includes("ctx.ellipse(x, y, isSelected ? 74 : 58"), "map fallback must not draw fake presence areas from pins");
  assert(index.includes("mapSafeFly(cardCenter(card), area ? 14.4 : 12);"), "map should zoom closer when a presence area exists");
  assert(index.includes("refreshMapSurface"), "map refresh fallback helper missing");
  assert(index.includes('liveMap.on("styledata", () => syncOccurrenceMapLayers());'), "MapLibre styledata layer sync missing");
  assert(index.includes('liveMap.on("idle", () => syncOccurrenceMapLayers());'), "MapLibre idle layer sync missing");
  assert(index.includes("자료 위치"), "map source pin key missing");
  assert(index.includes("현장 인증 범위"), "map presence area key missing");
  assert(index.includes("근거·영상 보기"), "map sheet should expose evidence/video CTA");
  assert(!index.includes('id="split-view" aria-label="선택한 현장 상세 보기">상세</button>'), "stale generic map detail CTA present");
  assert(index.includes("const target = selected || visibleCards(loadedCards)[0] || loadedCards[0];"), "map detail should resolve selected occurrence target");
  assert(index.includes('selectDetailTab("summary", { pulse: false, transition: false });'), "map detail should open selected occurrence summary");
  assert(index.includes("function selectDetailTab(tab, options = {})"), "detail tab state helper missing");
  assert(index.includes('document.querySelectorAll("#record-section .tabs button")'), "detail tabs should be scoped to record section");
  assert(index.includes("검색 결과 없음"), "map search miss title missing");
  assert(index.includes("지역·이슈·현장명을 다시 입력해 주세요."), "map search miss recovery copy missing");
  assert(index.includes("검색어와 맞는 공개 자료 위치가 아직 없습니다."), "map search miss sheet state missing");
  assert(index.includes('selectCard(match, { openDetail: false, toast: "지도에서 검색 결과를 봅니다." });'), "map search should keep results in map context");
  assert(!index.includes("검색어와 맞는 공개 상황이 아직 없습니다."), "stale map search miss toast-only copy present");
  assert(index.indexOf('class="map-shell"') < index.indexOf('id="explore-grid"'), "map should render before explore grid");
  assert(!/좋아요|댓글|찬반|추천|비추천|팔로우/u.test(index), "forbidden social mechanic copy present");
  assert(!/현장 증가|미확인 근거|낮은 신뢰도|중간 신뢰도|높은 신뢰도/u.test(index), "dashboard/confidence wording present");
  assert(index.includes("근처 현장 후보"), "nearby report target candidates missing");
  assert(index.includes('id="identity-sheet"'), "identity verification sheet missing");
  assert(index.includes("requestIdentityVerification"), "PortOne identity SDK handoff missing");
  assert(index.includes('api("/auth/identity/start"'), "identity start API handoff missing");
  assert(index.includes('api("/auth/identity/complete"'), "identity complete API handoff missing");
  assert(index.includes('id="report-auth-state"'), "report auth status chip missing");
  assert(index.includes('id="confirm-report-target"'), "report target confirmation action missing");
  assert(index.includes("이 현장 확정"), "report target confirmation copy missing");
  assert(index.includes("현장 영상 제보"), "report screen title missing");
  assert(index.includes("근처 현장 찾기"), "report primary action copy missing");
  assert(index.includes('initialTab: "evidence"'), "issue evidence CTA should open evidence tab directly");
  assert(index.includes('id="reels-issue-anchor"'), "reels issue context anchor missing");
  assert(index.includes('id="map-issue-anchor"'), "map issue context anchor missing");
  assert(index.includes('id="report-issue-anchor"'), "report issue context anchor missing");
  assert(index.includes('id="reels-anchor-status"'), "reels issue context status missing");
  assert(index.includes('id="map-anchor-status"'), "map issue context status missing");
  assert(index.includes('id="report-anchor-status"'), "report issue context status missing");
  assert(index.includes("issueContextStatusText"), "issue context status helper missing");
  assert(index.includes("statusNode.dataset.state = statusState"), "issue context status tone sync missing");
  assert(index.includes('let currentPrimaryView = "home"'), "primary view state memory missing");
  assert(index.includes("currentPrimaryView = view"), "primary view state should update on tab switches");
  assert(index.includes('currentPrimaryView = mobileClass.replace("mobile-tab-", "")'), "mobile-to-desktop view sync missing");
  assert(index.includes("setRailCurrent(currentPrimaryView)"), "desktop rail should sync to preserved view");
  assert(index.includes("report-context-panel"), "desktop report context panel missing");
  assert(index.includes('id="report-context-title"'), "report context issue title missing");
  assert(index.includes('id="report-context-target"'), "report context target state missing");
  assert(index.includes('id="report-context-stage"'), "report context stage state missing");
  assert(index.includes('data-context-jump="evidence"'), "issue context evidence action missing");
  assert(index.includes("updateIssueContextStrips"), "issue context strip synchronizer missing");
  assert(index.includes("issueContextFacts"), "compact issue context facts missing");
  assert(index.includes("return issueConfirmedSummaryLine(issue);"), "issue context should reuse confirmed summary line");
  assert(index.includes("일시 확인 중"), "assembly time summary label missing");
  assert(index.includes("기준 ${basis}"), "source basis summary label missing");
  assert(index.includes("위치 ${locationCount}곳"), "compact location count label missing");
  assert(index.includes("영상 확인 중"), "compact field-video status label missing");
  assert(!index.includes(">LOAD<"), "demo-style loading label must not appear in public UI");
  assert(index.includes("현장 영상 ${video}건"), "field-video status label missing");
  assert(!index.includes("영상 근거 ${videos}건"), "stale compact video evidence label present");
  assert(!index.includes("현장 영상 근거 ${issueVideoCount(issue)}건"), "zero-prone explore video count present");
  assert(!index.includes("현장 영상 근거 ${liveClaimCount}건"), "zero-prone detail video count present");
  assert(!index.includes("현장 영상 근거 ${Number(signal.liveClaimCount || 0)}건"), "zero-prone regional video count present");
  assert(!index.includes("0건의 공개 가능한 현장 인증 영상"), "zero-count public video copy present");
  assert(!index.includes("현장 영상 없음"), "zero-count public video empty copy present");
  assert(index.includes("fieldVerificationRatioText"), "field verification ratio copy helper missing");
  assert(index.includes("반론·정정"), "rebuttal/correction label missing");
  assert(index.includes('data-tab="video" aria-label="인증 영상">영상</button>'), "detail verified video short tab label missing");
  assert(index.includes('data-tab="timeline" aria-label="시간 흐름">흐름</button>'), "detail timeline short tab label missing");
  assert(index.includes('data-tab="dispute" aria-label="반론·정정">반론</button>'), "detail rebuttal short tab label missing");
  assert(index.includes('data-detail-jump="video" aria-label="인증 영상 보기"'), "detail video quick action accessible label missing");
  assert(!index.includes("data-tab=\"video\">인증 영상</button>"), "stale detail verified video long tab label present");
  assert(!index.includes(">현장 영상</button>"), "ambiguous detail video tab label present");
  assert(!index.includes("data-tab=\"timeline\">시간 흐름</button>"), "stale detail timeline long tab label present");
  assert(index.includes("제보 기준"), "report criteria disclosure missing");
  assert(index.includes("검토로 제출"), "report submit review copy missing");
  assert(index.includes('id="submit-capture-action"'), "capture preview submit action missing");
  assert(index.includes('id="report-receipt"'), "report receipt panel missing");
  assert(index.includes("reportTargetFromCard"), "NearbyReportTarget derived model missing");
  assert(index.includes("pendingCapture"), "capture preview state missing");
  assert(index.includes("reportReceiptFromResponse"), "report receipt response binding missing");
  assert(index.includes("desktop-report"), "desktop report view state missing");
  assert(!index.includes("7초 뒤 자동으로 검토 대기에 제출합니다."), "stale auto-submit capture copy present");
  assert(index.includes("전국 현황"), "national issue snapshot missing");
  assert(index.includes("주제 묶음 근거"), "topic grouping rationale missing");
  assert(index.includes("지역·시간이 다르면 별도 현장"), "topic grouping separation policy missing");
  assert(index.includes("지역별 현장 신호"), "regional issue signal missing");
  assert(index.includes("공식 자료 미확인"), "regional official status missing");
  assert(index.includes("이견 없음"), "regional dispute status missing");
  assert(index.includes("규모 추정"), "crowd estimate panel missing");
  assert(index.includes("추정 한계"), "crowd estimate limitation missing");
  assert(index.includes("자동 갱신 추정"), "derived crowd estimate label missing");
  assert(index.includes("estimateClaim"), "crowd estimate metadata binding missing");
  assert(index.includes("지역별 규모 추정"), "regional crowd estimate panel missing");
  assert(index.includes("검증 신호"), "verification signal panel missing");
  assert(index.includes("전국 시간축"), "national timeline panel missing");
  assert(index.includes("시간축 확인"), "timeline fallback label missing");
  assert(index.includes("data-issue-timeline-source"), "timeline source filter missing");
  assert(index.includes("지역 필터"), "timeline region filter missing");
  assert(index.includes('loadLiveClaims("issue", issue.id)'), "issue live claim feed missing");
  assert(index.includes("data-issue-video-region"), "issue video region filter missing");
  assert(index.includes("data-issue-video-status"), "issue video status filter missing");
  assert(index.includes("확인 전체"), "issue video status filter missing");
  assert(index.includes("현장 인증 영상"), "plain-language live video title missing");
  assert(index.includes("issueLivePreviewByIssueId"), "issue live preview cache missing");
  assert(index.includes("firstPublishableLivePreview"), "publishable live preview selector missing");
  assert(index.includes("renderIssueCoverArt"), "issue representative cover renderer missing");
  assert(index.includes("renderIssueFieldPreview(issue)"), "issue field preview renderer is not wired into feed cards");
  assert(index.includes("issue-field-preview"), "issue field preview UI missing");
  assert(index.includes("비식별 공개본"), "redacted public live preview copy missing");
  assert(index.includes("has-live-video"), "live video representative cover state missing");
  assert(index.includes("현장 인증 영상</span>"), "live representative thumbnail badge missing");
  assert(index.includes("publicLiveMediaUrl"), "public live media URL guard missing");
  assert(index.includes("publicLiveMediaSrc"), "public live media source resolver missing");
  assert(index.includes("publicLivePosterUrl"), "public live poster URL guard missing");
  assert(index.includes("publicLivePosterSrc"), "public live poster source resolver missing");
  assert(index.includes("publicLivePosterDisplaySrc"), "display-safe poster resolver missing");
  assert(index.includes("isSampleRedactedPreviewUrl"), "sample poster display guard missing");
  assert(index.includes("field-review-slot"), "review-state video slot missing");
  assert(index.includes("현장 영상 공개 준비 중"), "review-state video copy missing");
  assert(index.includes('<p class="subtitle">공개 위치·근거 확인</p>'), "consumer-facing brand subtitle missing");
  assert(index.includes("<h2>확인된 집회·시위</h2>"), "consumer-facing home headline missing");
  assert(index.includes('id="service-banner"'), "public service sync banner missing");
  assert(index.includes("공개자료 확인 중"), "service sync checking copy missing");
  assert(index.includes("저장된 공개자료 기준"), "stored public material fallback copy missing");
  assert(index.includes("새로고침"), "service sync refresh action missing");
  assert(index.includes('id="service-retry"'), "service sync retry action missing");
  assert(index.includes("setServiceSyncState(\"live\")"), "service sync success state missing");
  assert(!index.includes("<h2>집회·시위 공개자료</h2>"), "old home headline is still visible");
  assert(index.includes("compactIssueTitle"), "compact issue story labels missing");
  assert(index.includes("publicRedactedMediaUrl"), "strict public redacted media resolver missing");
  assert(index.includes("hasPublicLiveMedia"), "public live media poster+clip gate missing");
  assert(index.includes("redactedPosterUrl"), "redacted public poster contract missing");
  assert(index.includes('poster="${escapeHtml'), "redacted public poster attribute missing");
  assert(!index.includes("선택 이슈 기준"), "internal selected-issue copy present");
  assert(!index.includes("선택 상황"), "internal selected-state copy present");
  assert(!index.includes("이슈 선택 전"), "internal pre-selection copy present");
  assert(!index.includes("시간 확인 중"), "stale time-checking copy present");
  assert(index.includes("출처별 자료"), "source-separated public material label missing");
  assert(index.includes("법안이 어떤 이슈와 연결되는지 먼저 봅니다."), "law tab issue-first copy missing");
  assert(index.includes("지도는 위치 맥락만 보조합니다"), "map support copy missing");
  assert(!index.includes("현장 영상 Claim"), "public live video model-name copy present");
  assert(!index.includes("공개 Claim"), "public claim model-name copy present");
  assert(!index.includes("현장 Claim"), "public field model-name copy present");
  assert(index.includes("id=\"start-capture-action\""), "capture action id missing");
  assert(index.includes('api("/uploads/live"'), "live upload contract missing");
  assert(index.includes("mediaBase64: await blobBase64(blob)"), "live upload bytes missing");
  assert(index.includes("hash: upload.hash"), "server upload hash missing");
  assert(index.includes("distanceMeters("), "field distance calculation missing");
  assert(index.includes("safePublicApiBase"), "production API base guard missing");
  assert(index.includes("https://api.musunil.com"), "production API fallback missing");
  assert(!index.includes("distanceToTargetM: 80"), "fake field distance present");
  assert(!index.includes("storageKey: `private/live/browser"), "client-side private storage key present");
  assert(!index.includes("hash: `browser-"), "client-side live hash present");
  assert(!index.includes("storage_upload_unavailable"), "client-side storage gate present");
  assert(!index.includes("웹은 확인 전용입니다"), "stale report handoff copy present");
  assert(!index.includes("제출 버튼은 모바일 앱"), "stale blocked-submit copy present");
  assert(!index.includes("공개 자료 연결 대기"), "stale empty-state top status copy present");

  const config = await (await fetch(`${base}/config.js`)).text();
  assert(config.includes("MUSUNIL_WEB_CONFIG"), "web config hook missing");
  assert(config.includes("apiBaseUrl"), "web config apiBaseUrl missing");
  assert(config.includes("mapStyleUrl"), "web config mapStyleUrl missing");
  assert(!config.includes("localhost:4000"), "web config points to localhost API");
  assert(!/internal|secret|jwt|postgres|redis|database|MUSUNIL_USER_INPUTS/i.test(config), "web config leaked internal/secret pattern");
  const buildInfoJsonResponse = await fetch(`${base}/build-info.json`);
  assert(buildInfoJsonResponse.status === 200, `build-info.json returned ${buildInfoJsonResponse.status}`);
  const buildInfo = await buildInfoJsonResponse.json();
  assert(typeof buildInfo.commitSha === "string" && buildInfo.commitSha.length >= 7, "build-info commit SHA missing");
  assert(typeof buildInfo.builtAt === "string" && buildInfo.builtAt.includes("T"), "build-info timestamp missing");
  const buildInfoJs = await (await fetch(`${base}/build-info.js`)).text();
  assert(buildInfoJs.includes("MUSUNIL_BUILD_INFO"), "web build-info JS hook missing");
  const manifestResponse = await fetch(`${base}/static-manifest.json`);
  assert(manifestResponse.status === 200, `static-manifest.json returned ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  assert(manifest.files?.["index.html"]?.sha256 === sha256(index), "static manifest index hash mismatch");
  assert(manifest.files?.["config.js"]?.sha256 === sha256(config), "static manifest config hash mismatch");

  const packageJson = readFileSync(resolve(cwd, "package.json"), "utf8");
  const webConfigWriter = readFileSync(resolve(cwd, "scripts/write-web-config.mjs"), "utf8");
  const webHeaderWriter = readFileSync(resolve(cwd, "scripts/write-web-headers.mjs"), "utf8");
  const webServer = readFileSync(resolve(cwd, "scripts/serve-web.mjs"), "utf8");
  assert(packageJson.includes('"build:web-static"'), "static web build script missing");
  assert(packageJson.includes('"build:web-headers"'), "static web header build script missing");
  assert(packageJson.includes("pnpm build:web-headers"), "static web build does not generate _headers");
  assert(packageJson.includes('"build:web-manifest"'), "static web manifest build script missing");
  assert(packageJson.includes('"check:web-manifest"'), "static web manifest check script missing");
  assert(packageJson.includes('"check:web-deploy"'), "web deploy version smoke script missing");
  assert(webConfigWriter.includes("MUSUNIL_WEB_API_BASE_URL"), "static web API env override missing");
  assert(webConfigWriter.includes("MUSUNIL_WEB_MAP_STYLE_URL"), "static web map env override missing");
  assert(webHeaderWriter.includes("render.yaml"), "web header writer must use render.yaml as source");
  assert(webHeaderWriter.includes("Content-Security-Policy"), "web header writer CSP guard missing");
  assert(webServer.includes("MUSUNIL_WEB_API_BASE_URL"), "serve-web runtime API env override missing");
  assert(webServer.includes("allowLocal: true"), "serve-web local API env override guard missing");
  assert(webConfigWriter.includes("build-info.json"), "web build-info artifact missing");
  assert(packageJson.includes('"assets:redacted-preview"'), "redacted preview asset generator script missing");
  const staticHeadersResponse = await fetch(`${base}/_headers`);
  assert(staticHeadersResponse.status === 200, `_headers returned ${staticHeadersResponse.status}`);
  const staticHeaders = await staticHeadersResponse.text();
  for (const headerName of ["Cache-Control", "Content-Security-Policy", "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options", "X-Frame-Options"]) {
    assert(staticHeaders.includes(headerName), `_headers missing ${headerName}`);
  }

  const posterResponse = await fetch(`${base}/media/redacted/preview-occ-live-1-poster.png`);
  assert(posterResponse.status === 200, `redacted preview poster returned ${posterResponse.status}`);
  assert(posterResponse.headers.get("content-type")?.startsWith("image/png"), "redacted preview poster content-type mismatch");
  const posterBytes = await posterResponse.arrayBuffer();
  assert(posterBytes.byteLength > 10_000, "redacted preview poster is unexpectedly small");

  const clipResponse = await fetch(`${base}/media/redacted/preview-occ-live-1.webm`);
  assert(clipResponse.status === 200, `redacted preview clip returned ${clipResponse.status}`);
  assert(clipResponse.headers.get("content-type")?.startsWith("video/webm"), "redacted preview clip content-type mismatch");
  const clipBytes = await clipResponse.arrayBuffer();
  assert(clipBytes.byteLength > 5_000, "redacted preview clip is unexpectedly small");

  const forbidden = await fetch(`${base}/../package.json`);
  assert(forbidden.status === 403 || forbidden.status === 404, `path traversal should fail, got ${forbidden.status}`);
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
