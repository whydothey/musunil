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

const payload = { checked: externalBaseUrl ? "react_live_surface" : "react_splus_candidate", ok: failures.length === 0, baseUrl, results, failures };
writeFileSync(resolve(evidenceDir, "visual-evidence.json"), `${JSON.stringify(payload, null, 2)}\n`);
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(JSON.stringify(payload, null, 2));

async function verifyFixtureViewport(browserInstance, viewport) {
  const context = await browserInstance.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: "reduce", locale: "ko-KR" });
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
    await shot(page, `${viewport.id}_home.png`);

    await page.locator('a[href="/issues/issue-network-act"]').click();
    await page.waitForURL("**/issues/issue-network-act");
    await page.locator('[data-screen="issue"]').waitFor({ state: "visible" });
    check(await page.locator('[role="tab"]').count() === 4, `${viewport.id}: issue detail must expose exactly four tabs`);
    check(await page.locator('.occurrence-row').count() >= 3, `${viewport.id}: issue detail occurrence list missing`);
    await shot(page, `${viewport.id}_issue.png`);

    await page.locator('a[href="/occurrences/occ-network-seoul"]').click();
    await page.waitForURL("**/occurrences/occ-network-seoul");
    await page.locator('[data-screen="occurrence"]').waitFor({ state: "visible" });
    check((await page.locator('.fact-row').count()) === 4, `${viewport.id}: occurrence facts missing`);
    check((await page.locator('.context-actions a').count()) === 3, `${viewport.id}: occurrence context actions changed`);
    await shot(page, `${viewport.id}_occurrence.png`);
    await page.goBack();
    await page.locator('[data-screen="issue"]').waitFor({ state: "visible" });
    const restoredHref = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    check(restoredHref === "/occurrences/occ-network-seoul", `${viewport.id}: back navigation did not restore occurrence focus`);

    await page.goto(`${baseUrl}/reels`, { waitUntil: "load" });
    await page.locator('.reel-card').first().waitFor({ state: "visible" });
    const reelBox = await page.locator('.reel-card').first().boundingBox();
    check(Boolean(reelBox && reelBox.height >= viewport.height * 0.82), `${viewport.id}: reel does not fill the content viewport`);
    check((await page.locator('.reel-card').first().locator('.reel-actions a').count()) === 3, `${viewport.id}: reel action rail changed`);
    await shot(page, `${viewport.id}_reels.png`);

    await page.goto(`${baseUrl}/explore`, { waitUntil: "load" });
    await page.locator('.maplibregl-canvas').waitFor({ state: "visible" });
    await page.locator('[data-map-ready="true"]').waitFor({ state: "visible" });
    const mapBox = await page.locator('.map-canvas').boundingBox();
    check(Boolean(mapBox && mapBox.height >= viewport.height * 0.8), `${viewport.id}: map canvas collapsed`);
    await page.getByLabel("지도 검색").fill("인천");
    await page.locator('.map-results button').click();
    check((await page.locator('.map-selection').count()) === 1, `${viewport.id}: map selection panel missing`);
    check((await page.locator('.map-selection .primary-button').count()) === 1, `${viewport.id}: map selection must have one primary action`);
    await shot(page, `${viewport.id}_explore.png`);

    await page.goto(`${baseUrl}/laws`, { waitUntil: "load" });
    await page.locator('[data-screen="laws"]').waitFor({ state: "visible" });
    check((await page.locator('.segmented-control button').count()) === 2, `${viewport.id}: law sort must have two options`);
    check((await page.locator('.law-row').count()) >= 3, `${viewport.id}: fixture law rows missing`);
    await shot(page, `${viewport.id}_laws.png`);

    await page.goto(`${baseUrl}/report`, { waitUntil: "load" });
    await page.locator('[data-screen="report"]').waitFor({ state: "visible" });
    const reportActions = await page.locator('main button').count();
    check(reportActions === 1, `${viewport.id}: report entry must expose one action, got ${reportActions}`);
    check((await page.getByRole("button", { name: "근처 현장 찾기" }).count()) === 1, `${viewport.id}: report primary action missing`);
    await shot(page, `${viewport.id}_report.png`);

    await page.addScriptTag({ content: axe.source });
    const axeResult = await page.evaluate(async () => window.axe.run(document, { resultTypes: ["violations"] }));
    const serious = axeResult.violations.filter((item) => ["serious", "critical"].includes(item.impact || ""));
    check(serious.length === 0, `${viewport.id}: axe serious violations ${JSON.stringify(serious.map((item) => ({ id: item.id, nodes: item.nodes.slice(0, 3).map((node) => node.target) })))}`);

    const finalMetrics = await metrics(page);
    check(finalMetrics.overflowX === false, `${viewport.id}: final horizontal overflow`);
    check(finalMetrics.forbidden.length === 0, `${viewport.id}: forbidden UI ${finalMetrics.forbidden.join(", ")}`);
    results.push({ viewport, visibleIssueTitles, home, finalMetrics, axeViolations: serious.length });
  } finally {
    await context.close();
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
    const mapBox = await page.locator(".map-canvas").boundingBox();
    check(Boolean(mapBox && mapBox.height >= viewport.height * 0.8), `${viewport.id}: live map canvas collapsed`);
    await shot(page, `${viewport.id}_explore.png`);

    await page.goto(`${baseUrl}/laws`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-screen="laws"]').waitFor({ state: "visible" });
    check((await page.locator(".segmented-control button").count()) === 2, `${viewport.id}: live law sort changed`);
    await shot(page, `${viewport.id}_laws.png`);

    await page.goto(`${baseUrl}/report`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-screen="report"]').waitFor({ state: "visible" });
    check((await page.getByRole("button", { name: "근처 현장 찾기" }).count()) === 1, `${viewport.id}: live report entry changed`);
    await shot(page, `${viewport.id}_report.png`);

    const finalMetrics = await metrics(page);
    check(finalMetrics.overflowX === false, `${viewport.id}: live final horizontal overflow`);
    check(finalMetrics.forbidden.length === 0, `${viewport.id}: live final forbidden UI ${finalMetrics.forbidden.join(", ")}`);
    results.push({ viewport, issueCount, reelCount, home, finalMetrics });
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
