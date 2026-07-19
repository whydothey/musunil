import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";


const cwd = resolve(import.meta.dirname, "..");
const failures = [];
const scenarios = [];
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const productionFallbackMode = args.includes("--production-fallback") || process.env.MUSUNIL_VISUAL_PRODUCTION_FALLBACK === "1";
const requireReels = args.includes("--require-reels");
const reportFlow = args.includes("--report-flow");
const evidenceDir = evidenceDirFromArgs();
const evidenceScreenshots = [];
let server;
let chrome;

async function main() {
  const visualBaseUrl = visualBaseUrlFromArgs();
  const chromePath = findChrome();
  if (!chromePath) {
    console.error("Chrome executable not found. Set CHROME_PATH to run visual surface smoke.");
    process.exit(1);
  }
  if (evidenceDir) mkdirSync(evidenceDir, { recursive: true });

  const debugPort = await freePort();
  const userDataDir = mkdtempSync(join(tmpdir(), "musunil-chrome-"));
  let appUrl = visualBaseUrl;

  if (!appUrl) {
    const webPort = await freePort();
    const deadApiPort = await freePort();
    const apiBaseUrl = productionFallbackMode ? "https://api.musunil.com" : `http://localhost:${deadApiPort}`;
    const env = {
      ...process.env,
      PORT: String(webPort),
      MUSUNIL_WEB_API_BASE_URL: apiBaseUrl
    };

    run("node", ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "scripts/write-web-config.mjs", "--static"], env);
    run("node", ["scripts/write-web-static-manifest.mjs"], env);

    server = spawn(process.execPath, ["scripts/serve-web.mjs"], {
      cwd,
      env,
      stdio: ["ignore", "ignore", "pipe"]
    });
    appUrl = `http://localhost:${webPort}/`;
  }

  chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--hide-scrollbars",
    "--no-sandbox",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], {
    stdio: ["ignore", "ignore", "pipe"]
  });

  let exitCode = 0;
  try {
    if (server) await waitForWeb(appUrl);
    else await waitForHttp(appUrl);
    const pageWsUrl = await waitForPageWebSocket(debugPort);
    const client = await CdpClient.connect(pageWsUrl);
    try {
      await client.send("Page.enable");
      await client.send("Runtime.enable");
      if (reportFlow) {
        await client.send("Page.addScriptToEvaluateOnNewDocument", { source: reportFlowBrowserMocks() });
      }
      for (const viewport of [
        { id: "mobile_390", width: 390, height: 844, mobile: true },
        { id: "mobile_430", width: 430, height: 932, mobile: true },
        { id: "tablet_768", width: 768, height: 1024, mobile: true },
        { id: "desktop_1440", width: 1440, height: 960, mobile: false }
      ]) {
        await runViewport(client, viewport, appUrl, { liveUrl: Boolean(visualBaseUrl) });
      }
      if (reportFlow) await runReportFlow(client, appUrl);
    } finally {
      client.close();
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    const chromeExitedBeforeCleanup = chrome.exitCode !== null;
    const serverExitedBeforeCleanup = Boolean(server && server.exitCode !== null);
    chrome.kill("SIGTERM");
    if (server) server.kill("SIGTERM");
    const chromeCode = await waitForExit(chrome);
    const serverCode = server ? await waitForExit(server) : 0;
    rmSync(userDataDir, { recursive: true, force: true });
    if (serverExitedBeforeCleanup && serverCode !== 0) failures.push(`web server exited with ${serverCode}`);
    if (chromeExitedBeforeCleanup && chromeCode !== 0) failures.push(`chrome exited with ${chromeCode}`);
  }

  const serviceStates = [...new Set(scenarios.map((item) => item.detail?.serviceSyncState).filter(Boolean))];
  const payload = {
    checked: "commercial_visual_surface",
    ok: failures.length === 0,
    mode: visualBaseUrl ? "live_url" : productionFallbackMode ? "local_static_production_fallback" : "local_static",
    baseUrl: stableEvidenceBaseUrl(appUrl, { visualBaseUrl, productionFallbackMode }),
    productionFallbackMode,
    serviceStates,
    serviceBannerVisibleCount: scenarios.filter((item) => item.detail?.serviceBannerVisible).length,
    evidenceDir: evidenceDir ? relativeFromCwd(evidenceDir) : "",
    evidenceScreenshots,
    scenarios,
    failures
  };
  if (evidenceDir) {
    writeFileSync(
      join(evidenceDir, "visual-surface-evidence.json"),
      `${JSON.stringify(payload, null, 2)}\n`
    );
  }

  if (failures.length > 0) {
    console.error(["Visual surface smoke failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
    console.log(JSON.stringify(payload, null, 2));
    exitCode = 1;
  } else {
    console.log(JSON.stringify(payload, null, 2));
  }

  process.exit(exitCode);
}

async function runViewport(client, viewport, url, { liveUrl = false } = {}) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile });
  await navigate(client, url);
  let homeReady = true;
  try {
    await waitForExpression(
      client,
      `(() => {
        const visible = (node) => {
          if (!node) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0
            && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
        };
        return visible(document.querySelector('.issue-card')) && visible(document.querySelector('.story-ring'));
      })()`,
      20_000
    );
  } catch {
    homeReady = false;
  }
  await sleep(260);

  const home = await evaluate(client, visualMetrics("home"));
  const minimumFeedItems = home.serviceSyncState === "live" ? 1 : 3;
  await captureEvidence(client, `${viewport.id}_home`);
  scenario(`${viewport.id}_home`, [
    () => assert(
      homeReady,
      `home issue feed not ready: issues=${home.issueCount}, stories=${home.storyCount}, state=${home.serviceSyncState}, banner=${home.serviceBannerTitle || "none"}, first=${home.firstIssueTitle || "none"}, empty=${home.issueEmptyStateVisible ? "controlled" : "missing"}, emptyTitle=${home.issueEmptyTitle || "none"}, emptyBody=${home.issueEmptyBody || "none"}, emptyActions=${home.issueEmptyActions.join("/") || "none"}`
    ),
    () => assert(homeReady || home.issueEmptyStateVisible, "home issue feed has no cards and no controlled empty state"),
    () => assert(homeReady || /새 이슈를 확인 중입니다/.test(home.issueEmptyTitle), `home issue empty title changed: ${home.issueEmptyTitle}`),
    () => assert(homeReady || /지역별 현장 맥락/.test(home.issueEmptyBody), `home issue empty body changed: ${home.issueEmptyBody}`),
    () => assert(homeReady || home.issueEmptyActions.join("/") === "다시 확인/지역 보기", `home issue empty recovery actions changed: ${home.issueEmptyActions.join("/")}`),
    () => assert(home.scrollWidth <= viewport.width, `home overflows horizontally: ${home.scrollWidth} > ${viewport.width}`),
    () => assert(home.forbidden.length === 0, `forbidden public UI copy: ${home.forbidden.join(", ")}`),
    () => assert(home.dashboardVisible.length === 0, `dashboard-like visible elements: ${home.dashboardVisible.join(", ")}`),
    () => assert(home.storyCount >= minimumFeedItems, `expected at least ${minimumFeedItems} issue story rings, got ${home.storyCount}`),
    () => assert(home.issueCount >= minimumFeedItems, `expected at least ${minimumFeedItems} issue cards, got ${home.issueCount}`),
    () => assert(home.firstIssueTitle.length >= 6, "first issue title is missing"),
    () => assert(!productionFallbackMode || home.serviceSyncState === "delayed", `production fallback visual smoke must exercise delayed API sync, got ${home.serviceSyncState}`),
    () => assert(!productionFallbackMode || home.firstIssueTitle === "정보통신망법 개정 반대 집회", `production fallback first issue changed: ${home.firstIssueTitle}`),
    () => assert(!productionFallbackMode || !home.issueEmptyStateVisible, "production fallback must render topic issues instead of the empty state"),
    () => assert(!home.sourceBundleFirst, `first issue is a public source bundle, not a topic issue: ${home.firstIssueTitle}`),
    () => assert(!viewport.mobile || !home.serviceBannerVisible || home.serviceBannerRect.height <= 30, `mobile service sync strip is too tall: ${home.serviceBannerRect.height}`),
    () => assert(!viewport.mobile || !home.serviceBannerRetryVisible, "mobile service sync strip must not expose a duplicate refresh button"),
    () => assert(!/자료 기준/.test(home.firstIssueDeck) && /(기준|일정|기록|\d{1,2}월)/.test(home.firstIssueDeck), `first issue public place/time line is too operational: ${home.firstIssueDeck}`),
    () => assert(/위치/.test(home.firstIssueSummary) && /현장/.test(home.firstIssueSummary) && /(공식자료|공개근거|공개자료)/.test(home.firstIssueSummary) && /(공개영상|촬영자료|현장영상)/.test(home.firstIssueSummary), `first issue summary missing location/evidence units: ${home.firstIssueSummary}`),
    () => assert(!/반론\/정정/.test(home.firstIssueSummary) && (!/반론/.test(home.firstIssueSummary) || /반론·정정/.test(home.firstIssueSummary)), `first issue rebuttal copy should use civic correction label: ${home.firstIssueSummary}`),
    () => assert(!/인원 미확인/.test(home.firstIssueSummary), `first issue summary exposes low-value negative scale copy: ${home.firstIssueSummary}`),
    () => assert(/근거 보기/.test(home.firstIssueActions.join(" ")), `first issue evidence-first path missing: ${home.firstIssueActions.join(", ")}`),
    () => assert(!/근거·영상/.test(home.firstIssueActions.join(" ")), `first issue should not promise video from evidence action: ${home.firstIssueActions.join(", ")}`),
    () => assert(home.firstIssueActionCount >= 1 && home.firstIssueActionCount <= 2, `first issue has too many visible action labels: ${home.firstIssueActionCount}`),
    () => assert(home.firstIssuePrimaryActionCount === 1, `first issue must have exactly one primary action, got ${home.firstIssuePrimaryActionCount}`),
    () => assert(home.firstIssueInteractiveCount <= 3, `first issue has too many visible interactive targets: ${home.firstIssueInteractiveCount}`),
    () => assert(home.firstIssueChipCount === 0, `first issue must not expose dashboard-like chips, got ${home.firstIssueChipCount}`),
    () => assert(home.firstIssueRect.height <= (viewport.mobile ? 260 : 280), `first issue card is too tall for feed scanning: ${home.firstIssueRect.height}`),
    () => assert(viewport.mobile || home.homeRect.width >= Math.round(home.mapRect.width * 1.35), `desktop home issue feed should dominate map context: home=${home.homeRect.width}, map=${home.mapRect.width}`),
    () => assert(viewport.mobile || home.mapRect.height <= 310, `desktop home map should be context-sized, got ${home.mapRect.height}`),
    () => assert(home.placePeekCount >= 1, "issue cards must keep a lightweight map entry"),
    () => assert(home.placePeekMapCount === 0 && home.placePeekAreaCount === 0, `home issue cards must not render decorative mini-map surfaces: map=${home.placePeekMapCount}, area=${home.placePeekAreaCount}`),
    () => assert(!/KPI|진행\/예정/.test(home.visibleText), "top-level dashboard metric copy is visible")
  ], serviceDetail(home));
  if (!homeReady) return;

  await click(client, ".issue-card");
  await waitForExpression(client, viewport.mobile
    ? "document.querySelector('.layout')?.classList.contains('mobile-detail-open')"
    : "document.querySelector('.layout')?.classList.contains('desktop-detail-open')");
  await sleep(220);
  const detail = await evaluate(client, visualMetrics("detail"));
  await captureEvidence(client, `${viewport.id}_detail`);
  scenario(`${viewport.id}_detail`, [
    () => assert(detail.scrollWidth <= viewport.width, `detail overflows horizontally: ${detail.scrollWidth} > ${viewport.width}`),
    () => assert(detail.forbidden.length === 0, `forbidden detail copy: ${detail.forbidden.join(", ")}`),
    () => assert(detail.detailTitle.length >= 6, "detail title is missing"),
    () => assert(!/자료 기준/.test(detail.detailConfirmSummary) && /(기준|일정|\d{1,2}월)/.test(detail.detailConfirmSummary), `detail summary exposes operational time/source copy: ${detail.detailConfirmSummary}`),
    () => assert(detail.detailTabs.join("/") === "개요/근거/영상/흐름/반론", `detail tab labels changed: ${detail.detailTabs.join("/")}`),
    () => assert(detail.detailActions.join("/") === "근거/영상/지도", `detail quick actions changed: ${detail.detailActions.join("/")}`),
    () => assert(!viewport.mobile || !detail.detailSummaryVisible, "mobile detail should not repeat the long summary above the overview tab"),
    () => assert(!viewport.mobile || detail.detailHeroRect.height <= 300, `mobile detail hero is too tall: ${detail.detailHeroRect.height}`),
    () => assert(!viewport.mobile || detail.detailActionMinWidth >= 92, `mobile detail action buttons are too narrow: ${detail.detailActionMinWidth}`),
    () => assert(!viewport.mobile || detail.detailActionRight <= viewport.width - 10, `mobile detail action row clips at viewport edge: right=${detail.detailActionRight}`),
    () => assert(!viewport.mobile || !detail.navOverlap, "mobile detail controls overlap bottom navigation")
  ], serviceDetail(detail));

  await selectPrimaryView(client, viewport, "reels");
  await waitForExpression(client, "document.querySelector('#reels-section') && getComputedStyle(document.querySelector('#reels-section')).display !== 'none'");
  await waitForExpression(client, `(() => {
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0 && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    };
    const labels = [...document.querySelectorAll("[data-reel-action] span, [data-reel-empty-action] span")]
      .filter(visible)
      .map((node) => node.textContent.trim());
    return labels.includes("근거") && labels.some((label) => /현장|지도/.test(label));
  })()`, 4_000);
  await sleep(220);
  const reels = await evaluate(client, visualMetrics("reels"));
  await captureEvidence(client, `${viewport.id}_reels`);
  scenario(`${viewport.id}_reels`, [
    () => assert(reels.scrollWidth <= viewport.width, `reels overflows horizontally: ${reels.scrollWidth} > ${viewport.width}`),
    () => assert(reels.forbidden.length === 0, `forbidden reels copy: ${reels.forbidden.join(", ")}`),
    () => assert(reels.reelActionLabels.includes("근거"), `reels evidence action missing: ${reels.reelActionLabels.join(", ")}`),
    () => assert(reels.reelActionLabels.some((label) => /현장|지도/.test(label)), `reels occurrence action missing: ${reels.reelActionLabels.join(", ")}`),
    () => assert(!requireReels || reels.reelVideoCount >= 1, "staging reels must render at least one playable public video"),
    () => assert(reels.reelPendingFullCount === 0, "posterless pending claims should not render as full-screen video reels"),
    () => assert(reels.issueContextTitle.length >= 6, "reels issue context title is missing"),
    () => assert(!viewport.mobile || !reels.navOverlap, "mobile reels action surface overlaps bottom navigation")
  ], serviceDetail(reels));

  if (requireReels) {
    const reelTarget = await evaluate(client, `(() => {
      const reel = document.querySelector('.reel-card.reel-full[data-reel-target-id]');
      return reel ? { id: reel.dataset.reelTargetId, title: reel.querySelector('.reel-overlay strong')?.textContent?.trim() || "" } : null;
    })()`);
    await click(client, '[data-reel-action="occurrence"]');
    await waitForExpression(client, `document.documentElement.dataset.selectedOccurrenceId === ${JSON.stringify(reelTarget?.id || "")}`);
    const linked = await evaluate(client, `({
      selectedOccurrenceId: document.documentElement.dataset.selectedOccurrenceId || "",
      mapTitle: document.querySelector('#map-title')?.textContent?.trim() || "",
      detailTitle: document.querySelector('#detail-title')?.textContent?.trim() || ""
    })`);
    scenario(`${viewport.id}_reel_occurrence_link`, [
      () => assert(Boolean(reelTarget?.id), "staging reel target is missing"),
      () => assert(linked.selectedOccurrenceId === reelTarget?.id, `reel occurrence selection diverged: ${linked.selectedOccurrenceId} !== ${reelTarget?.id}`),
      () => assert(linked.mapTitle === reelTarget?.title || linked.detailTitle === reelTarget?.title, `reel occurrence context title diverged: ${linked.mapTitle} / ${linked.detailTitle}`)
    ], { ...serviceDetail(reels), reelTarget, linked });
  }

  await selectPrimaryView(client, viewport, "laws");
  await waitForExpression(client, "document.querySelector('#law-section') && getComputedStyle(document.querySelector('#law-section')).display !== 'none'");
  await sleep(220);
  // An offline live Web must disclose an empty official-law feed, not manufacture preview laws.
  // The overall run still fails on its non-live service state; this branch keeps the failure
  // focused on the actual deployment defect instead of treating the protected empty state as one.
  const expectsEmptyLawFeed = productionFallbackMode || (liveUrl && home.serviceSyncState !== "live");
  const laws = await evaluate(client, `(() => {
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const cards = [...document.querySelectorAll('.law-card')].filter(visible);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      sortLabels: [...document.querySelectorAll('[data-law-sort]')].filter(visible).map((node) => node.textContent.trim()),
      selectedSort: document.querySelector('[data-law-sort][aria-pressed="true"]')?.dataset.lawSort || "",
      cardCount: cards.length,
      cardTexts: cards.map((node) => node.textContent.trim()),
      emptyTitle: document.querySelector('#laws .empty-state strong')?.textContent?.trim() || ""
    };
  })()`);
  await captureEvidence(client, `${viewport.id}_laws`);
  scenario(`${viewport.id}_laws`, [
    () => assert(laws.scrollWidth <= viewport.width, `laws overflows horizontally: ${laws.scrollWidth} > ${viewport.width}`),
    () => assert(laws.sortLabels.join('/') === '현장 관심/최근 발의', `law sort controls changed: ${laws.sortLabels.join('/')}`),
    () => assert(laws.selectedSort === 'interest', `law default sort changed: ${laws.selectedSort}`),
    () => assert(
      expectsEmptyLawFeed ? laws.cardCount === 0 && /표시할 법령·의안이 없습니다/.test(laws.emptyTitle) : laws.cardCount >= 1,
      expectsEmptyLawFeed ? `offline live law tab must be an honest empty state: ${laws.emptyTitle}` : `local law tab is missing preview coverage: ${laws.cardCount}`
    ),
    () => assert(expectsEmptyLawFeed || laws.cardTexts.every((text) => /국회 의안|현행 법령/.test(text) && /발의|공포|시행/.test(text)), `law cards lack official source/date: ${laws.cardTexts.join(' / ')}`)
  ], { ...serviceDetail(laws), expectsEmptyLawFeed, laws });

  if (!expectsEmptyLawFeed) {
    await click(client, '[data-law-sort="proposed_desc"]');
    await waitForExpression(client, "document.querySelector('[data-law-sort=\"proposed_desc\"]')?.getAttribute('aria-pressed') === 'true'");
    await waitForExpression(client, "document.querySelectorAll('.law-card').length >= 1");
    const recentBills = await evaluate(client, `({
      selectedSort: document.querySelector('[data-law-sort][aria-pressed="true"]')?.dataset.lawSort || '',
      cards: [...document.querySelectorAll('.law-card')].map((node) => node.textContent.trim())
    })`);
    scenario(`${viewport.id}_laws_recent_proposals`, [
      () => assert(recentBills.selectedSort === 'proposed_desc', `recent proposal sort did not activate: ${recentBills.selectedSort}`),
      () => assert(recentBills.cards.length >= 1 && recentBills.cards.every((text) => /국회 의안/.test(text) && /발의/.test(text)), `recent proposal list contains non-bill or missing date: ${recentBills.cards.join(' / ')}`)
    ], { ...serviceDetail(laws), recentBills });
    await click(client, '.law-card');
    await waitForExpression(client, "document.querySelector('[data-law-occurrence-id]')");
    const lawOccurrence = await evaluate(client, "document.querySelector('[data-law-occurrence-id]')?.dataset.lawOccurrenceId || ''");
    await click(client, '[data-law-occurrence-id]');
    await waitForExpression(client, `document.documentElement.dataset.selectedOccurrenceId === ${JSON.stringify(lawOccurrence)}`);
    const linkedOccurrence = await evaluate(client, `({
      selectedOccurrenceId: document.documentElement.dataset.selectedOccurrenceId || '',
      mapTitle: document.querySelector('#map-title')?.textContent?.trim() || '',
      detailTitle: document.querySelector('#detail-title')?.textContent?.trim() || ''
    })`);
    scenario(`${viewport.id}_law_occurrence_link`, [
      () => assert(Boolean(lawOccurrence), 'law detail has no linked occurrence'),
      () => assert(linkedOccurrence.selectedOccurrenceId === lawOccurrence, `law occurrence selection diverged: ${linkedOccurrence.selectedOccurrenceId} !== ${lawOccurrence}`),
      () => assert(linkedOccurrence.mapTitle === linkedOccurrence.detailTitle, `law-linked map/detail titles diverged: ${linkedOccurrence.mapTitle} / ${linkedOccurrence.detailTitle}`)
    ], { ...serviceDetail(laws), lawOccurrence, linkedOccurrence });
  }

  await selectPrimaryView(client, viewport, "explore");
  await waitForExpression(client, "document.querySelector('#map-section') && getComputedStyle(document.querySelector('#map-section')).display !== 'none'");
  await sleep(260);
  const map = await evaluate(client, visualMetrics("map"));
  await captureEvidence(client, `${viewport.id}_map`);
  scenario(`${viewport.id}_map`, [
    () => assert(map.scrollWidth <= viewport.width, `map overflows horizontally: ${map.scrollWidth} > ${viewport.width}`),
    () => assert(map.forbidden.length === 0, `forbidden map copy: ${map.forbidden.join(", ")}`),
    () => assert(map.mapRect.height >= (viewport.mobile ? 300 : 360), `map is too short: ${map.mapRect.height}`),
    () => assert(map.mapKeyLabels.join("/") === "자료 위치/인증 범위", `map key changed: ${map.mapKeyLabels.join("/")}`),
    () => assert(!/자료 기준/.test(map.mapSummary) && /(기준|일정|\d{1,2}월)/.test(map.mapSummary), `map summary exposes operational time/source copy: ${map.mapSummary}`),
    () => assert(map.mapKeyHiddenCount === 0, `map key labels are not readable: hidden=${map.mapKeyHiddenCount}`),
    () => assert(map.mapSheetHeight <= (viewport.mobile ? 260 : 220), `map sheet too tall: ${map.mapSheetHeight}`),
    () => assert(!viewport.mobile || !map.navOverlap, "mobile map sheet overlaps bottom navigation")
  ], serviceDetail(map));

  await selectPrimaryView(client, viewport, "report");
  await waitForExpression(client, "document.querySelector('#report-section') && getComputedStyle(document.querySelector('#report-section')).display !== 'none'");
  await sleep(220);
  const report = await evaluate(client, visualMetrics("report"));
  await captureEvidence(client, `${viewport.id}_report`);
  scenario(`${viewport.id}_report`, [
    () => assert(report.scrollWidth <= viewport.width, `report overflows horizontally: ${report.scrollWidth} > ${viewport.width}`),
    () => assert(report.forbidden.length === 0, `forbidden report copy: ${report.forbidden.join(", ")}`),
    () => assert(report.reportStage === "locate", `report should start from locate stage, got ${report.reportStage}`),
    () => assert(report.reportPrimaryAction === "근처 현장 찾기", `report primary action changed: ${report.reportPrimaryAction}`),
    () => assert(report.nearbyTargetsVisible, "report must show nearby target candidate surface before location permission"),
    () => assert(report.nearbyWaitingPreviewVisible, "report must preview what nearby target selection will show"),
    () => assert(report.visibleReportPanels.length === 0, `report exposes target/capture panels before user action: ${report.visibleReportPanels.join(", ")}`),
    () => assert(!viewport.mobile || !report.navOverlap, "mobile report surface overlaps bottom navigation")
  ], serviceDetail(report));
}

async function captureEvidence(client, scenarioId) {
  if (!evidenceDir) return;
  const safeId = scenarioId.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  const fileName = `${safeId}.png`;
  const outputPath = join(evidenceDir, fileName);
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  writeFileSync(outputPath, Buffer.from(result.data || "", "base64"));
  evidenceScreenshots.push(relativeFromCwd(outputPath));
}

async function runReportFlow(client, url) {
  const viewport = { id: "report_flow_mobile_390", width: 390, height: 844, mobile: true };
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: viewport.width,
    screenHeight: viewport.height
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await navigate(client, url);
  await waitForExpression(client, "document.querySelectorAll('.issue-card').length >= 1", 20_000);
  await selectPrimaryView(client, viewport, "report");
  await waitForExpression(client, "document.querySelector('#report-section')?.dataset.reportStage === 'locate'");
  const initial = await evaluate(client, reportFlowSnapshot());
  await click(client, "#start-capture-action");
  await waitForExpression(client, "document.querySelectorAll('[data-report-target-id]').length >= 1 && document.querySelector('#report-section')?.dataset.reportStage === 'target'");
  const located = await evaluate(client, reportFlowSnapshot());
  await click(client, "#start-capture-action");
  await waitForExpression(client, "document.querySelector('#start-capture-action')?.textContent?.trim() === '7초 촬영하기'");
  const confirmed = await evaluate(client, reportFlowSnapshot());
  await click(client, "#start-capture-action");
  await waitForExpression(client, "document.querySelector('#identity-sheet')?.getAttribute('aria-hidden') === 'false'");
  await click(client, "#identity-start-action");
  await waitForReportStage(client, "preview");
  const preview = await evaluate(client, reportFlowSnapshot());
  await captureEvidence(client, `${viewport.id}_preview`);
  await click(client, "#change-capture-target-action");
  await waitForExpression(client, "document.querySelector('#report-section')?.dataset.reportStage === 'target' && document.querySelector('#start-capture-action')?.textContent?.trim() === '이 현장 확정'");
  const changedTarget = await evaluate(client, reportFlowSnapshot());
  await click(client, "#start-capture-action");
  await waitForExpression(client, "document.querySelector('#start-capture-action')?.textContent?.trim() === '7초 촬영하기'");
  await click(client, "#start-capture-action");
  await waitForReportStage(client, "preview");
  await click(client, "#submit-capture-action");
  await waitForExpression(client, "document.querySelector('#report-section')?.dataset.reportStage === 'review' && !document.querySelector('#report-receipt')?.hidden", 12_000);
  const receipt = await evaluate(client, reportFlowSnapshot());
  await captureEvidence(client, `${viewport.id}_receipt`);
  await navigate(client, url);
  await waitForExpression(client, "document.querySelectorAll('.issue-card').length >= 1", 20_000);
  await selectPrimaryView(client, viewport, "report");
  await waitForExpression(client, `(() => {
    const receipt = document.querySelector('#report-receipt');
    if (!receipt || receipt.hidden) return false;
    const rect = receipt.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < innerHeight && rect.bottom > 0;
  })()`, 4_000);
  const restored = await evaluate(client, reportFlowSnapshot());

  scenario("report_flow_target_confirmation", [
    () => assert(initial.mediaRequests === 0, `camera opened before location/target confirmation: ${initial.mediaRequests}`),
    () => assert(located.candidateCount >= 1 && located.primaryAction === "이 현장 확정", `nearby candidate flow did not produce an explicit confirmation: ${JSON.stringify(located)}`),
    () => assert(confirmed.mediaRequests === 0 && confirmed.primaryAction === "7초 촬영하기", `camera opened before the confirmed capture action: ${JSON.stringify(confirmed)}`)
  ], { initial, located, confirmed });
  scenario("report_flow_preview_recovery", [
    () => assert(preview.stage === "preview", `capture did not reach preview: ${preview.stage}`),
    () => assert(preview.previewTarget.length >= 4 && preview.previewTime.length >= 4 && preview.previewDistance.length >= 2, `preview is missing target/time/distance confirmation: ${JSON.stringify(preview)}`),
    () => assert(preview.previewActions.join("/") === "검토로 제출/다시 촬영/대상 바꾸기", `preview actions must be submit/retake/change only: ${preview.previewActions.join("/")}`),
    () => assert(changedTarget.stage === "target" && changedTarget.mediaRequests === 1, `changing target should return to confirmation without reopening camera: ${JSON.stringify(changedTarget)}`)
  ], { preview, changedTarget });
  scenario("report_flow_receipt_and_restore", [
    () => assert(receipt.stage === "review" && receipt.receiptVisible, `receipt did not enter review: ${JSON.stringify(receipt)}`),
    () => assert(receipt.receiptId.length >= 8 && receipt.receiptClaim.length >= 8, `receipt is missing report or claim identifier: ${JSON.stringify(receipt)}`),
    () => assert(receipt.receiptTarget.length >= 4 && receipt.receiptIssue.length >= 4 && receipt.receiptReceived.length >= 4 && /반경\s*\d+m/.test(receipt.receiptRadius), `receipt is missing target, issue, time, or public radius: ${JSON.stringify(receipt)}`),
    () => assert(restored.receiptVisible && restored.receiptId === receipt.receiptId && restored.receiptClaim === receipt.receiptClaim, `receipt was not restored after refresh: ${JSON.stringify(restored)}`)
  ], { receipt, restored });
}

function reportFlowSnapshot() {
  return `(() => {
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && !node.hidden && rect.width > 0 && rect.height > 0;
    };
    return {
      stage: document.querySelector('#report-section')?.dataset.reportStage || '',
      formStatus: document.querySelector('#form-status')?.textContent?.trim() || '',
      identityStatus: document.querySelector('#identity-status')?.textContent?.trim() || '',
      identitySheetOpen: document.querySelector('#identity-sheet')?.getAttribute('aria-hidden') === 'false',
      candidateCount: document.querySelectorAll('[data-report-target-id]').length,
      primaryAction: document.querySelector('#start-capture-action')?.textContent?.trim() || '',
      mediaRequests: Number(window.__musunilReportMediaRequests || 0),
      previewTarget: document.querySelector('#preview-target')?.textContent?.trim() || '',
      previewTime: document.querySelector('#preview-time')?.textContent?.trim() || '',
      previewDistance: document.querySelector('#preview-distance')?.textContent?.trim() || '',
      previewActions: ['#submit-capture-action', '#retake-capture-action', '#change-capture-target-action']
        .map((selector) => document.querySelector(selector))
        .filter(visible)
        .map((node) => node.textContent.trim()),
      receiptVisible: visible(document.querySelector('#report-receipt')),
      receiptId: document.querySelector('#receipt-id')?.textContent?.trim() || '',
      receiptClaim: document.querySelector('#receipt-claim')?.textContent?.trim() || '',
      receiptTarget: document.querySelector('#receipt-target')?.textContent?.trim() || '',
      receiptIssue: document.querySelector('#receipt-issue')?.textContent?.trim() || '',
      receiptReceived: document.querySelector('#receipt-received')?.textContent?.trim() || '',
      receiptRadius: document.querySelector('#receipt-radius')?.textContent?.trim() || ''
    };
  })()`;
}

async function waitForReportStage(client, expectedStage, timeoutMs = 12_000) {
  try {
    await waitForExpression(client, `document.querySelector('#report-section')?.dataset.reportStage === ${JSON.stringify(expectedStage)}`, timeoutMs);
  } catch {
    const snapshot = await evaluate(client, reportFlowSnapshot());
    throw new Error(`report did not reach ${expectedStage}: ${JSON.stringify(snapshot)}`);
  }
}

function reportFlowBrowserMocks() {
  return `(() => {
    const position = { coords: { longitude: 126.978, latitude: 37.5665, accuracy: 18 } };
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition(success) { queueMicrotask(() => success(position)); } }
    });
    const stream = new MediaStream();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => { window.__musunilReportMediaRequests = Number(window.__musunilReportMediaRequests || 0) + 1; return stream; } }
    });
    class TestMediaRecorder {
      static isTypeSupported() { return true; }
      constructor() { this.mimeType = 'video/webm;codecs=vp8'; }
      start() {}
      stop() {
        this.ondataavailable?.({ data: new Blob(['musunil-report-flow-video'], { type: this.mimeType }) });
        queueMicrotask(() => this.onstop?.());
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: TestMediaRecorder });
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...rest) => nativeSetTimeout(callback, delay === 7000 ? 20 : delay, ...rest);
  })();`;
}

function serviceDetail(metrics) {
  return {
    serviceSyncState: metrics.serviceSyncState,
    serviceBannerVisible: metrics.serviceBannerVisible,
    serviceBannerTitle: metrics.serviceBannerTitle,
    firstIssueTitle: metrics.firstIssueTitle,
    sourceBundleFirst: metrics.sourceBundleFirst,
    issueCount: metrics.issueCount,
    storyCount: metrics.storyCount,
    firstIssueRect: metrics.firstIssueRect,
    issueEmptyStateVisible: metrics.issueEmptyStateVisible,
    issueEmptyTitle: metrics.issueEmptyTitle,
    issueEmptyBody: metrics.issueEmptyBody,
    issueEmptyActions: metrics.issueEmptyActions
  };
}

function visualMetrics(label) {
  return `(() => {
    const visible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0 && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
    };
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return { width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 };
      const value = node.getBoundingClientRect();
      return { width: Math.round(value.width), height: Math.round(value.height), top: Math.round(value.top), bottom: Math.round(value.bottom), left: Math.round(value.left), right: Math.round(value.right) };
    };
    const text = document.body.innerText || "";
    const forbidden = [...new Set(text.match(/좋아요|댓글|찬반|추천|비추천|팔로우|사용자 원문|raw GPS|private media|현장 Claim|공개 Claim|KPI/g) || [])];
    const dashboardVisible = [".global-strip", ".metric", ".mini-stat", ".summary-grid", ".reels-review-panel"]
      .flatMap((selector) => [...document.querySelectorAll(selector)].filter(visible).map(() => selector));
    const nav = document.querySelector(".mobile-nav");
    const navRect = nav && visible(nav) ? nav.getBoundingClientRect() : null;
    const watched = ["#record-section .tabs", ".detail-action-row", ".reel-actions", ".map-sheet", ".report-actions", ".capture-preview", ".report-receipt"]
      .map((selector) => document.querySelector(selector))
      .filter(visible)
      .map((node) => node.getBoundingClientRect());
    const navOverlap = Boolean(navRect && watched.some((item) => item.bottom > navRect.top + 1 && item.top < navRect.bottom - 1));
    const firstIssue = document.querySelector(".issue-card");
    const serviceBanner = document.querySelector("#service-banner");
    const serviceBannerVisible = visible(serviceBanner);
    return {
      label: ${JSON.stringify(label)},
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      visibleText: text.slice(0, 2400),
      serviceSyncState: document.documentElement.dataset.serviceSyncState || serviceBanner?.dataset.state || "unknown",
      serviceBannerVisible,
      serviceBannerRect: rect("#service-banner"),
      serviceBannerTitle: serviceBannerVisible ? (document.querySelector("#service-banner-title")?.textContent?.trim() || "") : "",
      serviceBannerRetryVisible: visible(document.querySelector("#service-retry")),
      forbidden,
      dashboardVisible,
      navOverlap,
      storyCount: [...document.querySelectorAll(".story-ring")].filter(visible).length,
      issueCount: [...document.querySelectorAll(".issue-card")].filter(visible).length,
      issueEmptyStateVisible: visible(document.querySelector("[data-issue-empty-state='sync-waiting']")),
      issueEmptyTitle: document.querySelector("[data-issue-empty-state='sync-waiting'] strong")?.textContent?.trim() || "",
      issueEmptyBody: document.querySelector("[data-issue-empty-state='sync-waiting'] span")?.textContent?.trim() || "",
      issueEmptyActions: [...document.querySelectorAll("[data-issue-empty-action]")].filter(visible).map((node) => node.textContent.trim()),
      homeRect: rect("#home-section"),
      firstIssueRect: rect(".issue-card"),
      placePeekCount: [...document.querySelectorAll(".issue-location-strip")].filter(visible).length,
      placePeekMapCount: [...document.querySelectorAll(".issue-place-map")]
        .filter((node) => visible(node)).length,
      placePeekAreaCount: [...document.querySelectorAll(".issue-place-area")]
        .filter((node) => visible(node)).length,
      firstIssueTitle: firstIssue?.querySelector(".issue-feed-title .title")?.textContent?.trim() || "",
      firstIssueDeck: firstIssue?.querySelector(".issue-card-deck")?.textContent?.trim() || "",
      firstIssueSummary: [
        ...[...(firstIssue?.querySelectorAll(".issue-card-proof-row em") || [])].map((node) => node.textContent.trim())
      ].filter(Boolean).join(" · "),
      sourceBundleFirst: /공개\\s*(일정|자료)|신고[·\\s-]*개최|신고\\s*통계|집회\\s*신고\\s*통계/.test(firstIssue?.querySelector(".issue-feed-title .title")?.textContent?.trim() || ""),
      firstIssueActions: [...(firstIssue?.querySelectorAll(".issue-card-action-label") || [])].filter((node) => visible(node)).map((node) => node.textContent.trim()),
      firstIssueActionCount: [...(firstIssue?.querySelectorAll(".issue-card-action-label") || [])].filter((node) => visible(node)).length,
      firstIssuePrimaryActionCount: [...(firstIssue?.querySelectorAll(".issue-card-action.primary-action") || [])].filter(visible).length,
      firstIssueInteractiveCount: [...(firstIssue?.querySelectorAll("button, a, [role='button']") || [])].filter(visible).length,
      firstIssueChipCount: [...(firstIssue?.querySelectorAll(".chip") || [])].filter(visible).length,
      detailTitle: document.querySelector("#detail-title")?.textContent?.trim() || "",
      detailConfirmSummary: document.querySelector("#detail-confirm-summary")?.textContent?.trim() || "",
      detailSummaryVisible: visible(document.querySelector("#detail-summary")),
      detailHeroRect: rect(".hero-status"),
      detailTabs: [...document.querySelectorAll("#record-section .tabs button")].filter(visible).map((node) => node.textContent.trim()),
      detailActions: [...document.querySelectorAll(".detail-action-row button span")].filter(visible).map((node) => node.textContent.trim()),
      detailActionMinWidth: Math.min(...[...document.querySelectorAll(".detail-action-row button")].filter(visible).map((node) => Math.round(node.getBoundingClientRect().width)), 999),
      detailActionRight: Math.max(0, ...[...document.querySelectorAll(".detail-action-row button")].filter(visible).map((node) => Math.round(node.getBoundingClientRect().right))),
      reelActionLabels: [...document.querySelectorAll("[data-reel-action] span, [data-reel-empty-action] span")].filter(visible).map((node) => node.textContent.trim()),
      reelVideoCount: [...document.querySelectorAll(".reel-card.reel-full video.reel-video[src]")].filter(visible).length,
      reelPendingCardCount: [...document.querySelectorAll(".reel-pending-card")].filter(visible).length,
      reelPendingFullCount: [...document.querySelectorAll(".reel-card.reel-full.reel-pending")].filter(visible).length,
      issueContextTitle: document.querySelector("#reels-anchor-title")?.textContent?.trim() || "",
      mapRect: rect(".map-shell"),
      mapSheetHeight: rect(".map-sheet").height,
      mapSummary: document.querySelector("#map-summary")?.textContent?.trim() || "",
      mapKeyLabels: [...document.querySelectorAll(".map-key span")].filter(visible).map((node) => node.textContent.trim()),
      mapKeyHiddenCount: [...document.querySelectorAll(".map-key span")]
        .filter(visible)
        .filter((node) => {
          const style = getComputedStyle(node);
          return parseFloat(style.fontSize || "0") < 9 || style.color === "rgba(0, 0, 0, 0)" || style.color === "transparent";
        }).length,
      reportStage: document.querySelector("#report-section")?.dataset.reportStage || "",
      reportPrimaryAction: document.querySelector("#start-capture-action")?.textContent?.trim() || "",
      nearbyTargetsVisible: visible(document.querySelector(".nearby-targets")),
      nearbyWaitingPreviewVisible: visible(document.querySelector(".nearby-waiting-preview")),
      visibleReportPanels: [".report-target-panel", ".capture-preview", ".report-receipt"]
        .flatMap((selector) => [...document.querySelectorAll(selector)].filter(visible).map(() => selector))
    };
  })()`;
}

async function selectPrimaryView(client, viewport, view) {
  const selector = viewport.mobile ? `.mobile-nav button[data-tab-view="${view}"]` : `.rail-item[data-rail-view="${view}"]`;
  await click(client, selector);
}

async function navigate(client, url) {
  const loaded = once(client, "Page.loadEventFired", 12_000);
  await client.send("Page.navigate", { url });
  await loaded;
  await waitForExpression(client, "document.readyState === 'complete'");
}

async function click(client, selector) {
  await evaluate(client, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) throw new Error(${JSON.stringify(`missing click target: ${selector}`)});
    node.scrollIntoView({ block: "center", inline: "center" });
    node.click();
    return true;
  })()`);
}

async function waitForExpression(client, expression, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const value = await evaluate(client, `Boolean(${expression})`);
      if (value) return;
    } catch {
      // Keep polling until timeout.
    }
    await sleep(120);
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (response.exceptionDetails) {
    const description = response.exceptionDetails.exception?.description || response.exceptionDetails.text || "Runtime.evaluate failed";
    throw new Error(description);
  }
  return response.result?.value;
}

function scenario(id, assertions, detail = {}) {
  const before = failures.length;
  for (const assertion of assertions) {
    try {
      assertion();
    } catch (error) {
      failures.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  scenarios.push({ id, ok: failures.length === before, assertions: assertions.length, detail });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function visualBaseUrlFromArgs() {
  const value = argValue("--base-url") ?? process.env.MUSUNIL_VISUAL_BASE_URL;
  if (!value) return "";
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid visual surface base URL: ${value}`);
  }
  const isLocalHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !isLocalHttp) {
    throw new Error(`Visual surface base URL must be HTTPS or localhost HTTP: ${value}`);
  }
  if (!parsed.pathname) parsed.pathname = "/";
  return parsed.toString();
}

function evidenceDirFromArgs() {
  const value = argValue("--evidence-dir") ?? process.env.MUSUNIL_VISUAL_EVIDENCE_DIR;
  if (!value) return "";
  return resolve(cwd, value);
}

function relativeFromCwd(value) {
  const absolute = resolve(value);
  return absolute.startsWith(`${cwd}/`) ? absolute.slice(cwd.length + 1) : absolute;
}

function stableEvidenceBaseUrl(appUrl, options = {}) {
  if (options.visualBaseUrl) return appUrl;
  return options.productionFallbackMode ? "local-static://production-fallback" : "local-static://default";
}

function argValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function run(command, args, runEnv) {
  const result = spawnSync(command === "node" ? process.execPath : command, args, {
    cwd,
    env: runEnv,
    stdio: "inherit"
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

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

async function waitForWeb(url) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`web server exited early with ${server.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await sleep(150);
    }
  }
  throw new Error("web server did not become ready in time");
}

async function waitForHttp(url) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(5_000)
      });
      if (response.status >= 200 && response.status < 400) return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`visual surface base URL did not become ready: ${url}`);
}

async function waitForPageWebSocket(port) {
  const deadline = Date.now() + 45_000;
  let lastError = "";
  while (Date.now() < deadline) {
    if (chrome.exitCode !== null) throw new Error(`chrome exited early with ${chrome.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(2_000) });
      if (!response.ok) {
        lastError = `/json/list returned ${response.status}`;
        await sleep(250);
        continue;
      }
      const pages = await response.json();
      const page = pages.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
      lastError = `no debuggable page in ${pages.length} target(s)`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }
  throw new Error(`Chrome remote debugging page did not become ready in time${lastError ? `: ${lastError}` : ""}`);
}

function once(client, eventName, timeoutMs) {
  return new Promise((resolveOnce, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for CDP event ${eventName}`));
    }, timeoutMs);
    const handler = (params) => {
      cleanup();
      resolveOnce(params);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      client.off(eventName, handler);
    };
    client.on(eventName, handler);
  });
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
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
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      resolveExit(signal === "SIGTERM" ? 0 : code ?? 0);
    });
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium"
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener("message", (event) => this.handleMessage(event.data));
    socket.addEventListener("close", () => {
      for (const { reject } of this.pending.values()) reject(new Error("CDP socket closed"));
      this.pending.clear();
    });
  }

  static connect(url) {
    return new Promise((resolveConnect, reject) => {
      const socket = new WebSocket(url);
      socket.addEventListener("open", () => resolveConnect(new CdpClient(socket)), { once: true });
      socket.addEventListener("error", () => reject(new Error("Failed to connect to Chrome DevTools Protocol")), { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolveSend, reject) => {
      this.pending.set(id, { resolve: resolveSend, reject });
      this.socket.send(payload);
    });
  }

  on(eventName, handler) {
    const handlers = this.listeners.get(eventName) || new Set();
    handlers.add(handler);
    this.listeners.set(eventName, handlers);
  }

  off(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) this.listeners.delete(eventName);
  }

  close() {
    this.socket.close();
  }

  handleMessage(data) {
    const message = JSON.parse(String(data));
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || "CDP command failed"));
      else pending.resolve(message.result || {});
      return;
    }
    const handlers = this.listeners.get(message.method);
    if (!handlers) return;
    for (const handler of handlers) handler(message.params || {});
  }
}

await main();
