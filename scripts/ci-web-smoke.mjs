import { spawn, spawnSync } from "node:child_process";
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
const server = spawn(process.execPath, ["scripts/serve-web.mjs"], {
  cwd,
  env,
  stdio: "inherit"
});

let exitCode = 0;
try {
  await waitForWeb(port);
  await checkWeb(port);
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
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Web server exited before smoke check with ${server.exitCode}`);
    try {
      const response = await fetch(`http://localhost:${port}/`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
    }
  }
  throw new Error("Web server did not become ready in time");
}

async function checkWeb(port) {
  const base = `http://localhost:${port}`;
  const html = await fetch(`${base}/`);
  assert(html.status === 200, `index returned ${html.status}`);
  const index = await html.text();
  assert(html.headers.get("x-content-type-options") === "nosniff", "nosniff header missing");
  assert(html.headers.get("x-frame-options") === "DENY", "x-frame-options header missing");
  assert(html.headers.get("referrer-policy") === "no-referrer", "referrer-policy header missing");
  assert(html.headers.get("permissions-policy")?.includes("geolocation=()"), "permissions-policy geolocation guard missing");
  assert(html.headers.get("content-security-policy")?.includes("default-src 'self'"), "content-security-policy missing");
  assert(index.includes("지금 확인할 이슈"), "issue-first home title missing");
  assert(index.includes('id="issue-stories"'), "issue story rail missing");
  assert(index.includes('id="reels-section"'), "top-level reels section missing");
  assert(index.includes('id="explore-grid"'), "explore grid missing");
  assert(index.includes('data-tab-view="home"'), "home mobile tab missing");
  assert(index.includes('data-tab-view="reels"'), "reels mobile tab missing");
  assert(index.includes('data-tab-view="explore"'), "explore mobile tab missing");
  assert(index.includes('data-tab-view="laws"'), "laws mobile tab missing");
  assert(index.includes('data-tab-view="report"'), "report mobile tab missing");
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
  assert(index.includes("자료 위치"), "map source pin key missing");
  assert(index.includes("현장 인증 범위"), "map presence area key missing");
  assert(!/좋아요|댓글|찬반|추천|비추천|팔로우/u.test(index), "forbidden social mechanic copy present");
  assert(index.includes("근처 현장 후보"), "nearby report target candidates missing");
  assert(index.includes('id="confirm-report-target"'), "report target confirmation action missing");
  assert(index.includes("이 현장에 제보"), "report target confirmation copy missing");
  assert(index.includes('id="submit-capture-action"'), "capture preview submit action missing");
  assert(index.includes('id="report-receipt"'), "report receipt panel missing");
  assert(index.includes("reportTargetFromCard"), "NearbyReportTarget derived model missing");
  assert(index.includes("pendingCapture"), "capture preview state missing");
  assert(index.includes("reportReceiptFromResponse"), "report receipt response binding missing");
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
  assert(index.includes("판단 전체"), "issue video judgment filter missing");
  assert(index.includes("현장 인증 영상"), "plain-language live video title missing");
  assert(index.includes("issueLivePreviewByIssueId"), "issue live preview cache missing");
  assert(index.includes("firstPublishableLivePreview"), "publishable live preview selector missing");
  assert(index.includes("renderIssueCoverArt"), "issue representative cover renderer missing");
  assert(index.includes("has-live-video"), "live video representative cover state missing");
  assert(index.includes("현장 인증 영상</span>"), "live representative thumbnail badge missing");
  assert(index.includes("publicLiveMediaUrl"), "public live media URL guard missing");
  assert(index.includes("publicLiveMediaSrc"), "public live media source resolver missing");
  assert(index.includes("공개된 주장"), "plain-language public claim label missing");
  assert(index.includes("법안이 어떤 이슈와 연결되는지 먼저 봅니다."), "law tab issue-first copy missing");
  assert(index.includes("지도는 위치 맥락만 보조합니다"), "map support copy missing");
  assert(!index.includes("현장 영상 Claim"), "public live video model-name copy present");
  assert(!index.includes("공개 Claim"), "public claim model-name copy present");
  assert(index.includes("id=\"start-capture-action\""), "capture action id missing");
  assert(index.includes('api("/uploads/live"'), "live upload contract missing");
  assert(index.includes("mediaBase64: await blobBase64(blob)"), "live upload bytes missing");
  assert(index.includes("hash: upload.hash"), "server upload hash missing");
  assert(index.includes("distanceMeters("), "field distance calculation missing");
  assert(!index.includes("distanceToTargetM: 80"), "fake field distance present");
  assert(!index.includes("storageKey: `private/live/browser"), "client-side private storage key present");
  assert(!index.includes("hash: `browser-"), "client-side live hash present");
  assert(!index.includes("storage_upload_unavailable"), "client-side storage gate present");
  assert(!index.includes("웹은 확인 전용입니다"), "stale report handoff copy present");
  assert(!index.includes("제출 버튼은 모바일 앱"), "stale blocked-submit copy present");

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

  const packageJson = readFileSync(resolve(cwd, "package.json"), "utf8");
  const webConfigWriter = readFileSync(resolve(cwd, "scripts/write-web-config.mjs"), "utf8");
  assert(packageJson.includes('"build:web-static"'), "static web build script missing");
  assert(packageJson.includes('"check:web-deploy"'), "web deploy version smoke script missing");
  assert(webConfigWriter.includes("MUSUNIL_WEB_API_BASE_URL"), "static web API env override missing");
  assert(webConfigWriter.includes("MUSUNIL_WEB_MAP_STYLE_URL"), "static web map env override missing");
  assert(webConfigWriter.includes("build-info.json"), "web build-info artifact missing");

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
