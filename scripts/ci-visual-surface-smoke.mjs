import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";


const cwd = resolve(import.meta.dirname, "..");
const failures = [];
const scenarios = [];
const args = process.argv.slice(2).filter((arg) => arg !== "--");
let server;
let chrome;

async function main() {
  const visualBaseUrl = visualBaseUrlFromArgs();
  const chromePath = findChrome();
  if (!chromePath) {
    console.error("Chrome executable not found. Set CHROME_PATH to run visual surface smoke.");
    process.exit(1);
  }

  const debugPort = await freePort();
  const userDataDir = mkdtempSync(join(tmpdir(), "musunil-chrome-"));
  let appUrl = visualBaseUrl;

  if (!appUrl) {
    const webPort = await freePort();
    const deadApiPort = await freePort();
    const env = {
      ...process.env,
      PORT: String(webPort),
      MUSUNIL_WEB_API_BASE_URL: `http://localhost:${deadApiPort}`
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
      for (const viewport of [
        { id: "mobile_390", width: 390, height: 844, mobile: true },
        { id: "mobile_430", width: 430, height: 932, mobile: true },
        { id: "tablet_768", width: 768, height: 1024, mobile: true },
        { id: "desktop_1440", width: 1440, height: 960, mobile: false }
      ]) {
        await runViewport(client, viewport, appUrl);
      }
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

  if (failures.length > 0) {
    console.error(["Visual surface smoke failed:", ...failures.map((failure) => `- ${failure}`)].join("\n"));
    exitCode = 1;
  } else {
    const serviceStates = [...new Set(scenarios.map((item) => item.detail?.serviceSyncState).filter(Boolean))];
    console.log(JSON.stringify({
      checked: "commercial_visual_surface",
      mode: visualBaseUrl ? "live_url" : "local_static",
      baseUrl: appUrl,
      serviceStates,
      serviceBannerVisibleCount: scenarios.filter((item) => item.detail?.serviceBannerVisible).length,
      scenarios
    }, null, 2));
  }

  process.exit(exitCode);
}

async function runViewport(client, viewport, url) {
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
      "document.querySelectorAll('.issue-card').length >= 3 && document.querySelectorAll('.story-ring').length >= 3",
      20_000
    );
  } catch {
    homeReady = false;
  }
  await sleep(260);

  const home = await evaluate(client, visualMetrics("home"));
  scenario(`${viewport.id}_home`, [
    () => assert(
      homeReady,
      `home issue feed not ready: issues=${home.issueCount}, stories=${home.storyCount}, state=${home.serviceSyncState}, banner=${home.serviceBannerTitle || "none"}, first=${home.firstIssueTitle || "none"}, empty=${home.issueEmptyStateVisible ? "controlled" : "missing"}, emptyActions=${home.issueEmptyActions.join("/") || "none"}`
    ),
    () => assert(homeReady || home.issueEmptyStateVisible, "home issue feed has no cards and no controlled empty state"),
    () => assert(homeReady || home.issueEmptyActions.join("/") === "다시 확인/탐색 보기", `home issue empty recovery actions changed: ${home.issueEmptyActions.join("/")}`),
    () => assert(home.scrollWidth <= viewport.width, `home overflows horizontally: ${home.scrollWidth} > ${viewport.width}`),
    () => assert(home.forbidden.length === 0, `forbidden public UI copy: ${home.forbidden.join(", ")}`),
    () => assert(home.dashboardVisible.length === 0, `dashboard-like visible elements: ${home.dashboardVisible.join(", ")}`),
    () => assert(home.storyCount >= 3, `expected at least 3 issue story rings, got ${home.storyCount}`),
    () => assert(home.issueCount >= 3, `expected at least 3 issue cards, got ${home.issueCount}`),
    () => assert(home.firstIssueTitle.length >= 6, "first issue title is missing"),
    () => assert(!home.sourceBundleFirst, `first issue is a public source bundle, not a topic issue: ${home.firstIssueTitle}`),
    () => assert(/상세 보기/.test(home.firstIssueActions.join(" ")), `first issue primary path missing: ${home.firstIssueActions.join(", ")}`),
    () => assert(viewport.mobile || home.homeRect.width >= Math.round(home.mapRect.width * 1.35), `desktop home issue feed should dominate map context: home=${home.homeRect.width}, map=${home.mapRect.width}`),
    () => assert(viewport.mobile || home.mapRect.height <= 310, `desktop home map should be context-sized, got ${home.mapRect.height}`),
    () => assert(home.placePeekCount === 0 || home.placePeekMapCount === home.placePeekCount, `issue place previews must use mini-map surfaces: ${home.placePeekMapCount}/${home.placePeekCount}`),
    () => assert(home.placePeekCount === 0 || home.placePeekAreaCount === home.placePeekCount, `issue place previews must show public area context: ${home.placePeekAreaCount}/${home.placePeekCount}`),
    () => assert(!/KPI|진행\/예정/.test(home.visibleText), "top-level dashboard metric copy is visible")
  ], serviceDetail(home));
  if (!homeReady) return;

  await click(client, ".issue-card");
  await waitForExpression(client, viewport.mobile
    ? "document.querySelector('.layout')?.classList.contains('mobile-detail-open')"
    : "document.querySelector('.layout')?.classList.contains('desktop-detail-open')");
  await sleep(220);
  const detail = await evaluate(client, visualMetrics("detail"));
  scenario(`${viewport.id}_detail`, [
    () => assert(detail.scrollWidth <= viewport.width, `detail overflows horizontally: ${detail.scrollWidth} > ${viewport.width}`),
    () => assert(detail.forbidden.length === 0, `forbidden detail copy: ${detail.forbidden.join(", ")}`),
    () => assert(detail.detailTitle.length >= 6, "detail title is missing"),
    () => assert(detail.detailTabs.join("/") === "개요/근거/영상/흐름/반론", `detail tab labels changed: ${detail.detailTabs.join("/")}`),
    () => assert(detail.detailActions.join("/") === "근거/영상/지도", `detail quick actions changed: ${detail.detailActions.join("/")}`),
    () => assert(!viewport.mobile || !detail.navOverlap, "mobile detail controls overlap bottom navigation")
  ], serviceDetail(detail));

  await selectPrimaryView(client, viewport, "reels");
  await waitForExpression(client, "document.querySelector('#reels-section') && getComputedStyle(document.querySelector('#reels-section')).display !== 'none'");
  await sleep(220);
  const reels = await evaluate(client, visualMetrics("reels"));
  scenario(`${viewport.id}_reels`, [
    () => assert(reels.scrollWidth <= viewport.width, `reels overflows horizontally: ${reels.scrollWidth} > ${viewport.width}`),
    () => assert(reels.forbidden.length === 0, `forbidden reels copy: ${reels.forbidden.join(", ")}`),
    () => assert(reels.reelActionLabels.includes("근거"), `reels evidence action missing: ${reels.reelActionLabels.join(", ")}`),
    () => assert(reels.reelActionLabels.some((label) => /위치|지도/.test(label)), `reels location action missing: ${reels.reelActionLabels.join(", ")}`),
    () => assert(reels.issueContextTitle.length >= 6, "reels issue context title is missing"),
    () => assert(!viewport.mobile || !reels.navOverlap, "mobile reels action surface overlaps bottom navigation")
  ], serviceDetail(reels));

  await selectPrimaryView(client, viewport, "explore");
  await waitForExpression(client, "document.querySelector('#map-section') && getComputedStyle(document.querySelector('#map-section')).display !== 'none'");
  await sleep(260);
  const map = await evaluate(client, visualMetrics("map"));
  scenario(`${viewport.id}_map`, [
    () => assert(map.scrollWidth <= viewport.width, `map overflows horizontally: ${map.scrollWidth} > ${viewport.width}`),
    () => assert(map.forbidden.length === 0, `forbidden map copy: ${map.forbidden.join(", ")}`),
    () => assert(map.mapRect.height >= (viewport.mobile ? 300 : 360), `map is too short: ${map.mapRect.height}`),
    () => assert(map.mapKeyLabels.join("/") === "자료 위치/인증 범위", `map key changed: ${map.mapKeyLabels.join("/")}`),
    () => assert(map.mapKeyHiddenCount === 0, `map key labels are not readable: hidden=${map.mapKeyHiddenCount}`),
    () => assert(map.mapSheetHeight <= (viewport.mobile ? 260 : 220), `map sheet too tall: ${map.mapSheetHeight}`),
    () => assert(!viewport.mobile || !map.navOverlap, "mobile map sheet overlaps bottom navigation")
  ], serviceDetail(map));

  await selectPrimaryView(client, viewport, "report");
  await waitForExpression(client, "document.querySelector('#report-section') && getComputedStyle(document.querySelector('#report-section')).display !== 'none'");
  await sleep(220);
  const report = await evaluate(client, visualMetrics("report"));
  scenario(`${viewport.id}_report`, [
    () => assert(report.scrollWidth <= viewport.width, `report overflows horizontally: ${report.scrollWidth} > ${viewport.width}`),
    () => assert(report.forbidden.length === 0, `forbidden report copy: ${report.forbidden.join(", ")}`),
    () => assert(report.reportStage === "locate", `report should start from locate stage, got ${report.reportStage}`),
    () => assert(report.reportPrimaryAction === "근처 현장 찾기", `report primary action changed: ${report.reportPrimaryAction}`),
    () => assert(report.visibleReportPanels.length === 0, `report exposes target panels before user action: ${report.visibleReportPanels.join(", ")}`),
    () => assert(!viewport.mobile || !report.navOverlap, "mobile report surface overlaps bottom navigation")
  ], serviceDetail(report));
}

function serviceDetail(metrics) {
  return {
    serviceSyncState: metrics.serviceSyncState,
    serviceBannerVisible: metrics.serviceBannerVisible,
    serviceBannerTitle: metrics.serviceBannerTitle,
    firstIssueTitle: metrics.firstIssueTitle,
    sourceBundleFirst: metrics.sourceBundleFirst,
    issueCount: metrics.issueCount
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
      serviceBannerTitle: serviceBannerVisible ? (document.querySelector("#service-banner-title")?.textContent?.trim() || "") : "",
      forbidden,
      dashboardVisible,
      navOverlap,
      storyCount: [...document.querySelectorAll(".story-ring")].filter(visible).length,
      issueCount: [...document.querySelectorAll(".issue-card")].filter(visible).length,
      issueEmptyStateVisible: visible(document.querySelector("[data-issue-empty-state='sync-waiting']")),
      issueEmptyActions: [...document.querySelectorAll("[data-issue-empty-action]")].filter(visible).map((node) => node.textContent.trim()),
      homeRect: rect("#home-section"),
      placePeekCount: [...document.querySelectorAll(".issue-place-peek")].filter(visible).length,
      placePeekMapCount: [...document.querySelectorAll(".issue-place-peek .issue-place-map")]
        .filter((node) => visible(node.closest(".issue-place-peek"))).length,
      placePeekAreaCount: [...document.querySelectorAll(".issue-place-peek .issue-place-area")]
        .filter((node) => visible(node.closest(".issue-place-peek"))).length,
      firstIssueTitle: firstIssue?.querySelector(".issue-feed-title .title")?.textContent?.trim() || "",
      sourceBundleFirst: /공개\\s*(일정|자료)|신고[·\\s-]*개최|신고\\s*통계|집회\\s*신고\\s*통계/.test(firstIssue?.querySelector(".issue-feed-title .title")?.textContent?.trim() || ""),
      firstIssueActions: [...(firstIssue?.querySelectorAll(".issue-card-action-label") || [])].filter((node) => visible(node)).map((node) => node.textContent.trim()),
      detailTitle: document.querySelector("#detail-title")?.textContent?.trim() || "",
      detailTabs: [...document.querySelectorAll("#record-section .tabs button")].filter(visible).map((node) => node.textContent.trim()),
      detailActions: [...document.querySelectorAll(".detail-action-row button span")].filter(visible).map((node) => node.textContent.trim()),
      reelActionLabels: [...document.querySelectorAll("[data-reel-action] span, [data-reel-empty-action] span")].filter(visible).map((node) => node.textContent.trim()),
      issueContextTitle: document.querySelector("#reels-anchor-title")?.textContent?.trim() || "",
      mapRect: rect(".map-shell"),
      mapSheetHeight: rect(".map-sheet").height,
      mapKeyLabels: [...document.querySelectorAll(".map-key span")].filter(visible).map((node) => node.textContent.trim()),
      mapKeyHiddenCount: [...document.querySelectorAll(".map-key span")]
        .filter(visible)
        .filter((node) => {
          const style = getComputedStyle(node);
          return parseFloat(style.fontSize || "0") < 9 || style.color === "rgba(0, 0, 0, 0)" || style.color === "transparent";
        }).length,
      reportStage: document.querySelector("#report-section")?.dataset.reportStage || "",
      reportPrimaryAction: document.querySelector("#start-capture-action")?.textContent?.trim() || "",
      visibleReportPanels: [".nearby-targets", ".report-target-panel", ".capture-preview", ".report-receipt"]
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
  return new URL("/", parsed).toString();
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
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (chrome.exitCode !== null) throw new Error(`chrome exited early with ${chrome.exitCode}`);
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = pages.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      await sleep(150);
    }
  }
  throw new Error("Chrome remote debugging page did not become ready in time");
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
