import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve } from "node:path";
import axe from "axe-core";
import { chromium } from "playwright-core";

const cwd = resolve(import.meta.dirname, "..");
const externalBaseUrl = valueAfter("--base-url") || process.env.MUSUNIL_VISUAL_BASE_URL || "";
const evidenceDir = resolve(cwd, valueAfter("--evidence-dir") || (externalBaseUrl ? "docs/visual-evidence/live-current" : "docs/visual-evidence/react-splus-candidate"));
const failures = [];
const results = [];
const port = externalBaseUrl ? 0 : await freePort();
const baseUrl = externalBaseUrl.replace(/\/$/, "") || `http://127.0.0.1:${port}`;
const chromePath = findChrome();
if (!chromePath) throw new Error("Chrome executable not found. Set CHROME_PATH.");
mkdirSync(evidenceDir, { recursive: true });

const server = externalBaseUrl ? undefined : spawn("corepack", ["pnpm", "--filter", "@musunil/web", "exec", "vite", "preview", "--config", "vite.config.ts", "--host", "127.0.0.1", "--port", String(port)], {
  cwd,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"]
});

let browser;
try {
  await waitForHttp(baseUrl);
  browser = await chromium.launch({ executablePath: chromePath, headless: true });
  for (const viewport of [
    { id: "mobile_390", width: 390, height: 844 },
    { id: "mobile_430", width: 430, height: 932 },
    { id: "tablet_768", width: 768, height: 1024 },
    { id: "desktop_1440", width: 1440, height: 960 }
  ]) {
    if (externalBaseUrl) await verifyLiveViewport(browser, viewport);
    else await verifyFixtureViewport(browser, viewport);
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
  if (server) await waitForExit(server);
}

const payload = {
  checked: externalBaseUrl ? "react_live_surface" : "react_splus_candidate",
  ok: failures.length === 0,
  baseUrl: externalBaseUrl ? baseUrl : "local-fixture",
  results,
  failures
};
writeFileSync(resolve(evidenceDir, "visual-evidence.json"), `${JSON.stringify(payload, null, 2)}\n`);
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(JSON.stringify(payload, null, 2));

async function verifyFixtureViewport(browserInstance, viewport) {
  const context = await browserInstance.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce", locale: "ko-KR" });
  await context.grantPermissions(["geolocation"], { origin: new URL(baseUrl).origin });
  await context.setGeolocation({ latitude: 37.5665, longitude: 126.978 });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    const externalMapFailure = page.url().includes("/explore") && (/openfreemap\.org|AJAXError|Failed to fetch/.test(text));
    if (!externalMapFailure) failures.push(`${viewport.id}: console ${text}`);
  });
  page.on("pageerror", (error) => failures.push(`${viewport.id}: page ${error.message}`));
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "load" });
    await page.locator('[data-screen="home"] .issue-row').first().waitFor({ state: "visible" });
    const home = await metrics(page);
    const visibleIssueTitles = await page.locator('.issue-row h2').evaluateAll((nodes) => nodes.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    }).map((node) => node.textContent));
    check(home.overflowX === false, `${viewport.id}: home horizontal overflow`);
    check(home.nestedInteractive === 0, `${viewport.id}: home nested interactive controls`);
    check(viewport.width >= 768 || visibleIssueTitles.length >= 3, `${viewport.id}: fewer than three issue titles in first viewport`);
    check(viewport.width < 1080 || home.mapCount === 0, `${viewport.id}: desktop home includes map`);
    if (viewport.width >= 1080) {
      const feedBox = await page.locator('[data-screen="home"]').boundingBox();
      check(Boolean(feedBox && feedBox.width >= 880), `${viewport.id}: desktop feed remains a narrow mobile column`);
    }
    await assertAxe(page, `${viewport.id}: home`);
    await shot(page, `${viewport.id}_home.png`);

    await page.locator('a[href="/issues/issue-network-act"]').click();
    await page.waitForURL("**/issues/issue-network-act");
    await page.locator('[data-screen="issue"]').waitFor({ state: "visible" });
    check(await page.locator('[role="tab"]').count() === 4, `${viewport.id}: issue detail must expose exactly four tabs`);
    check(await page.locator('.occurrence-row').count() >= 3, `${viewport.id}: issue detail occurrence list missing`);
    await shot(page, `${viewport.id}_issue.png`);
    await assertAxe(page, `${viewport.id}: issue occurrences`);
    for (const tab of [{ label: "영상", file: "videos" }, { label: "근거", file: "evidence" }, { label: "법안", file: "laws" }]) {
      await page.getByRole("tab", { name: tab.label }).click();
      await page.waitForTimeout(80);
      await assertAxe(page, `${viewport.id}: issue ${tab.file}`);
      await shot(page, `${viewport.id}_issue_${tab.file}.png`);
    }
    await page.getByRole("tab", { name: "현장" }).click();

    await page.locator('a[href="/occurrences/occ-network-seoul"]').click();
    await page.waitForURL("**/occurrences/occ-network-seoul");
    await page.locator('[data-screen="occurrence"]').waitFor({ state: "visible" });
    check((await page.locator('.fact-row').count()) === 5, `${viewport.id}: occurrence facts missing`);
    check((await page.locator('.context-actions a').count()) === 3, `${viewport.id}: occurrence context actions changed`);
    check((await page.locator('.occurrence-video-cover').count()) === 0, `${viewport.id}: occurrence video action is duplicated by a second cover`);
    await assertAxe(page, `${viewport.id}: occurrence`);
    await shot(page, `${viewport.id}_occurrence.png`);
    await page.goBack();
    await page.locator('[data-screen="issue"]').waitFor({ state: "visible" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("href") === "/occurrences/occ-network-seoul", undefined, { timeout: 2_500 }).catch(() => undefined);
    const restoredHref = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    check(restoredHref === "/occurrences/occ-network-seoul", `${viewport.id}: back navigation did not restore occurrence focus`);

    await page.goto(`${baseUrl}/reels`, { waitUntil: "load" });
    await page.locator('.reel-card').first().waitFor({ state: "visible" });
    const reelBox = await page.locator('.reel-card').first().boundingBox();
    check(Boolean(reelBox && reelBox.height >= viewport.height * 0.82), `${viewport.id}: reel does not fill the content viewport`);
    check((await page.locator('.reel-card').first().locator('.reel-actions a').count()) === 3, `${viewport.id}: reel action rail changed`);
    await assertAxe(page, `${viewport.id}: reels`);
    await shot(page, `${viewport.id}_reels.png`);
    await page.goto(`${baseUrl}/reels?occurrence=occ-network-seoul`, { waitUntil: "load" });
    await page.locator('.reel-card').first().waitFor({ state: "visible" });
    check((await page.locator('.reels-topbar button[aria-label="이전 화면"]').count()) === 1, `${viewport.id}: contextual reels back action missing`);
    await page.getByRole("link", { name: "근거 보기" }).first().click();
    await page.waitForURL("**/occurrences/occ-network-seoul#evidence");
    await page.locator("#evidence").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.activeElement?.id === "evidence", undefined, { timeout: 2_500 }).catch(() => undefined);
    check(await page.evaluate(() => document.activeElement?.id === "evidence"), `${viewport.id}: reel evidence action did not focus the evidence section`);

    await page.goto(`${baseUrl}/explore`, { waitUntil: "load" });
    await page.locator('.maplibregl-canvas').waitFor({ state: "visible" });
    await page.locator('[data-map-ready="true"]').waitFor({ state: "visible" });
    await page.locator('[data-basemap-ready="true"]').waitFor({ state: "visible", timeout: 12_000 });
    const mapBox = await page.locator('.map-canvas').boundingBox();
    check(Boolean(mapBox && mapBox.height >= viewport.height * 0.8), `${viewport.id}: map canvas collapsed`);
    await page.waitForTimeout(1_000);
    const mapPixels = await pixelMetrics(context, await page.locator('.map-canvas').screenshot({ type: "png" }));
    check(mapPixels.colorGroups >= 60 && mapPixels.dominantRatio <= 0.82, `${viewport.id}: basemap has insufficient visual context (${JSON.stringify(mapPixels)})`);
    await page.getByLabel("지도 검색").fill("인천");
    await page.locator('.map-results button').click();
    await page.locator('.map-selection').waitFor({ state: "visible" });
    check((await page.locator('.map-selection .primary-button').count()) === 1, `${viewport.id}: map selection must have one primary action`);
    const selectionBox = await page.locator('.map-selection').boundingBox();
    check(Boolean(selectionBox && selectionBox.y >= 0 && selectionBox.y + selectionBox.height <= viewport.height), `${viewport.id}: map selection is outside the viewport`);
    check((await page.locator('.map-selection h2').innerText()).includes("정보통신망법"), `${viewport.id}: map selection topic is missing`);
    check((await page.locator('.map-selection .selection-event').innerText()).includes("인천"), `${viewport.id}: map selection event does not match the searched occurrence`);
    await page.waitForTimeout(2_500);
    const selectedMapPixels = await pixelMetrics(context, await page.locator('.map-canvas').screenshot({ type: "png" }));
    check(selectedMapPixels.colorGroups >= 60 && selectedMapPixels.dominantRatio <= 0.88, `${viewport.id}: selected basemap did not finish painting (${JSON.stringify(selectedMapPixels)})`);
    await assertAxe(page, `${viewport.id}: explore selection`);
    await shot(page, `${viewport.id}_explore.png`);

    await page.goto(`${baseUrl}/laws`, { waitUntil: "load" });
    await page.locator('[data-screen="laws"]').waitFor({ state: "visible" });
    check((await page.locator('.segmented-control button').count()) === 2, `${viewport.id}: law sort must have two options`);
    check((await page.locator('.law-row').count()) >= 3, `${viewport.id}: fixture law rows missing`);
    check((await page.locator('.law-row').first().getAttribute("href"))?.startsWith("/laws/") === true, `${viewport.id}: law row is not a full semantic link`);
    await assertAxe(page, `${viewport.id}: laws`);
    await shot(page, `${viewport.id}_laws.png`);
    await page.locator('.law-row').first().click();
    await page.locator('[data-screen="law-group"]').waitFor({ state: "visible" });
    check((await page.locator('.law-row').count()) >= 1, `${viewport.id}: law group rows missing`);
    check((await page.locator('.news-link-row').count()) >= 1, `${viewport.id}: approved law-group news links missing`);
    check((await page.locator('.law-issue-news-card a a').count()) === 0, `${viewport.id}: law-group news contains nested links`);
    await assertAxe(page, `${viewport.id}: law group detail`);
    await shot(page, `${viewport.id}_law_topic_detail.png`);
    await page.locator('.law-row').first().click();
    await page.locator('[data-screen="law"]').waitFor({ state: "visible" });
    check((await page.locator('.official-law-link').count()) === 1, `${viewport.id}: law detail official source action missing`);
    await assertAxe(page, `${viewport.id}: law detail`);
    await shot(page, `${viewport.id}_law_detail.png`);

    await page.goto(`${baseUrl}/report`, { waitUntil: "load" });
    await page.locator('[data-screen="report"]').waitFor({ state: "visible" });
    const reportActions = await page.locator('main button').count();
    check(reportActions === 1, `${viewport.id}: report entry must expose one action, got ${reportActions}`);
    check((await page.getByRole("button", { name: "근처 현장 찾기" }).count()) === 1, `${viewport.id}: report primary action missing`);
    await assertAxe(page, `${viewport.id}: report entry`);
    await shot(page, `${viewport.id}_report.png`);
    await page.getByRole("button", { name: "근처 현장 찾기" }).click();
    await page.locator('.candidate-row').first().waitFor({ state: "visible" });
    await shot(page, `${viewport.id}_report_candidates.png`);
    await page.locator('.candidate-row').first().click();
    await page.getByRole("button", { name: "이 현장 촬영하기" }).waitFor({ state: "visible" });
    await shot(page, `${viewport.id}_report_target.png`);
    await page.getByRole("button", { name: "이 현장 촬영하기" }).click();
    await page.getByRole("button", { name: "본인확인 계속" }).waitFor({ state: "visible" });
    await shot(page, `${viewport.id}_report_identity.png`);
    await page.getByRole("button", { name: "본인확인 계속" }).click();
    await page.getByRole("button", { name: "7초 촬영 완료" }).waitFor({ state: "visible" });
    await shot(page, `${viewport.id}_report_camera.png`);
    await page.getByRole("button", { name: "7초 촬영 완료" }).click();
    await page.getByRole("button", { name: "이 현장에 제출" }).waitFor({ state: "visible" });
    const submitBox = await page.getByRole("button", { name: "이 현장에 제출" }).boundingBox();
    const tabBox = await page.locator('.mobile-tabbar').isVisible() ? await page.locator('.mobile-tabbar').boundingBox() : undefined;
    check(Boolean(submitBox && (!tabBox || submitBox.y + submitBox.height <= tabBox.y)), `${viewport.id}: report submit action is covered by navigation`);
    await assertAxe(page, `${viewport.id}: report preview`);
    await shot(page, `${viewport.id}_report_preview.png`);
    await page.getByRole("button", { name: "이 현장에 제출" }).click();
    await page.locator('.receipt-stage').waitFor({ state: "visible" });
    await assertAxe(page, `${viewport.id}: report receipt`);
    await shot(page, `${viewport.id}_report_receipt.png`);

    const finalMetrics = await metrics(page);
    check(finalMetrics.overflowX === false, `${viewport.id}: final horizontal overflow`);
    check(finalMetrics.forbidden.length === 0, `${viewport.id}: forbidden UI ${finalMetrics.forbidden.join(", ")}`);
    results.push({ viewport, visibleIssueTitles, home, mapPixels, selectedMapPixels, finalMetrics, axeViolations: 0 });
  } finally {
    await context.close();
  }
}

async function assertAxe(page, label) {
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ content: axe.source });
  const axeResult = await page.evaluate(async () => window.axe.run(document, { resultTypes: ["violations"] }));
  const serious = axeResult.violations.filter((item) => ["serious", "critical"].includes(item.impact || ""));
  check(serious.length === 0, `${label}: axe serious violations ${JSON.stringify(serious.map((item) => ({ id: item.id, nodes: item.nodes.slice(0, 3).map((node) => node.target) })))}`);
}

async function pixelMetrics(context, png) {
  const probe = await context.newPage();
  try {
    await probe.setContent('<canvas id="canvas"></canvas>');
    return await probe.evaluate(async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.querySelector("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context2d = canvas.getContext("2d");
      context2d.drawImage(image, 0, 0);
      const pixels = context2d.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Map();
      let total = 0;
      const stride = Math.max(4, Math.floor(Math.min(canvas.width, canvas.height) / 80));
      for (let y = 0; y < canvas.height; y += stride) {
        for (let x = 0; x < canvas.width; x += stride) {
          const index = (y * canvas.width + x) * 4;
          const key = `${pixels[index] >> 3}:${pixels[index + 1] >> 3}:${pixels[index + 2] >> 3}`;
          colors.set(key, (colors.get(key) || 0) + 1);
          total += 1;
        }
      }
      const dominant = Math.max(...colors.values());
      return { colorGroups: colors.size, dominantRatio: Number((dominant / total).toFixed(4)) };
    }, `data:image/png;base64,${png.toString("base64")}`);
  } finally {
    await probe.close();
  }
}

async function verifyLiveViewport(browserInstance, viewport) {
  const context = await browserInstance.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce", locale: "ko-KR" });
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push(`${viewport.id}: page ${error.message}`));
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.locator(".app-shell").waitFor({ state: "visible" });
    await page.waitForTimeout(1_000);
    const home = await metrics(page);
    check(home.overflowX === false, `${viewport.id}: live home horizontal overflow`);
    check(home.nestedInteractive === 0, `${viewport.id}: live home nested interactive controls`);
    check(home.forbidden.length === 0, `${viewport.id}: live forbidden UI ${home.forbidden.join(", ")}`);
    check((await page.locator(".mobile-tabbar .tab-link").count()) === 5, `${viewport.id}: live navigation is not five tabs`);
    check(viewport.width < 1080 || home.mapCount === 0, `${viewport.id}: live desktop home includes map`);
    const bodyText = await page.locator("body").innerText();
    check(!bodyText.includes("정보통신망법 개정안 관련 집회"), `${viewport.id}: fixture issue leaked to live`);
    const issueCount = await page.locator(".issue-row").count();
    if (issueCount === 0) {
      check(/확인된 주요 이슈가 없습니다|자료 연결을 확인하고 있습니다/.test(bodyText), `${viewport.id}: live empty state is not honest`);
    } else {
      await page.locator(".issue-row").first().click();
      await page.locator('[data-screen="issue"]').waitFor({ state: "visible" });
      check((await page.locator('[role="tab"]').count()) === 4, `${viewport.id}: live issue detail does not have four tabs`);
    }
    await shot(page, `${viewport.id}_home.png`);

    await page.goto(`${baseUrl}/reels`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const reelCount = await page.locator(".reel-card").count();
    if (reelCount > 0) check((await page.locator(".reel-card").first().locator(".reel-actions a").count()) === 3, `${viewport.id}: live reel action rail changed`);
    else check(/공개된 현장 영상이 없습니다|자료 연결을 확인하고 있습니다/.test(await page.locator("body").innerText()), `${viewport.id}: live reels empty state is not honest`);
    await shot(page, `${viewport.id}_reels.png`);

    await page.goto(`${baseUrl}/explore`, { waitUntil: "domcontentloaded" });
    await page.locator(".map-canvas").waitFor({ state: "visible" });
    await page.locator('[data-basemap-ready="true"]').waitFor({ state: "visible", timeout: 12_000 });
    const mapBox = await page.locator(".map-canvas").boundingBox();
    check(Boolean(mapBox && mapBox.height >= viewport.height * 0.8), `${viewport.id}: live map canvas collapsed`);
    await page.waitForTimeout(1_000);
    const mapPixels = await pixelMetrics(context, await page.locator('.map-canvas').screenshot({ type: "png" }));
    check(mapPixels.colorGroups >= 60 && mapPixels.dominantRatio <= 0.82, `${viewport.id}: live basemap has insufficient visual context (${JSON.stringify(mapPixels)})`);
    await page.getByLabel("지도 검색").fill("집회");
    const liveMapResult = page.locator('.map-results button').first();
    check((await liveMapResult.count()) === 1, `${viewport.id}: live map has no searchable occurrence`);
    if ((await liveMapResult.count()) === 1) {
      await liveMapResult.click();
      await page.locator('.map-selection').waitFor({ state: "visible" });
      const selectionTitle = await page.locator('.map-selection h2').innerText();
      const selectionTopic = await page.locator('.map-selection .selection-topic').innerText();
      check(!selectionTitle.includes("집회 일정"), `${viewport.id}: live event still exposes a generic schedule title`);
      check(/^(확인된 주제|주제 후보|주제 미확인) · /u.test(selectionTopic), `${viewport.id}: live event topic context is missing`);
    }
    await shot(page, `${viewport.id}_explore.png`);

    await page.goto(`${baseUrl}/laws`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-screen="laws"]').waitFor({ state: "visible" });
    check((await page.locator(".segmented-control button").count()) === 2, `${viewport.id}: live law sort changed`);
    await shot(page, `${viewport.id}_laws.png`);

    await page.goto(`${baseUrl}/report`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-screen="report"]').waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes("근처 현장 찾기") || text.includes("검증된 현장 제보를 준비하고 있습니다");
    }, undefined, { timeout: 10_000 });
    const liveReportEntryReady = (await page.getByRole("button", { name: "근처 현장 찾기" }).count()) === 1;
    const liveReportEntryHeld = (await page.getByRole("heading", { name: "검증된 현장 제보를 준비하고 있습니다" }).count()) === 1
      && (await page.getByText("현재 웹에서는 영상을 접수하지 않습니다.", { exact: false }).count()) === 1;
    check(liveReportEntryReady || liveReportEntryHeld, `${viewport.id}: live report entry changed`);
    await shot(page, `${viewport.id}_report.png`);

    const finalMetrics = await metrics(page);
    check(finalMetrics.overflowX === false, `${viewport.id}: live final horizontal overflow`);
    check(finalMetrics.forbidden.length === 0, `${viewport.id}: live final forbidden UI ${finalMetrics.forbidden.join(", ")}`);
    results.push({ viewport, issueCount, reelCount, mapPixels, home, finalMetrics });
  } finally {
    await context.close();
  }
}

async function metrics(page) {
  return page.evaluate(() => {
    const text = document.body.innerText;
    const forbidden = ["좋아요", "댓글", "찬반", "추천", "비추천", "팔로우", "traffic_control", "WEAKLY_OBSERVED"].filter((token) => text.includes(token));
    return {
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      nestedInteractive: document.querySelectorAll("a a, a button, button a, button button").length,
      mapCount: document.querySelectorAll(".map-canvas").length,
      forbidden
    };
  });
}

async function shot(page, file) {
  await page.locator("video").evaluateAll(async (videos) => {
    await Promise.all(videos.map(async (video) => {
      video.pause();
      if (video.readyState < HTMLMediaElement.HAVE_METADATA || video.currentTime === 0) return;
      await new Promise((resolveSeek) => {
        const timer = window.setTimeout(resolveSeek, 300);
        video.addEventListener("seeked", () => {
          window.clearTimeout(timer);
          resolveSeek();
        }, { once: true });
        video.currentTime = 0;
      });
    }));
  });
  await page.screenshot({ path: resolve(evidenceDir, file), fullPage: false });
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function waitForHttp(url) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null && server?.exitCode !== undefined) throw new Error(`Web preview exited with ${server.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 120));
  }
  throw new Error("Web preview did not become ready");
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

async function waitForExit(child) {
  if (child.exitCode !== null) return child.exitCode;
  return new Promise((resolveExit) => {
    const timer = setTimeout(() => { child.kill("SIGKILL"); }, 5_000);
    child.once("exit", (code) => { clearTimeout(timer); resolveExit(code); });
  });
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => resolvePort(typeof address === "object" && address ? address.port : 0));
    });
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}
