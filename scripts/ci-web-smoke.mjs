import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const port = await freePort();
const env = { ...process.env, PORT: String(port) };
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
  assert(index.includes("현장 촬영 시작"), "field capture entry missing");
  assert(index.includes("전국 현황"), "national issue snapshot missing");
  assert(index.includes("주제 묶음 근거"), "topic grouping rationale missing");
  assert(index.includes("지역·시간이 다르면 별도 현장"), "topic grouping separation policy missing");
  assert(index.includes("지역별 현장 신호"), "regional issue signal missing");
  assert(index.includes("공식 자료 없음"), "regional official status missing");
  assert(index.includes("이견 없음"), "regional dispute status missing");
  assert(index.includes("규모 추정"), "crowd estimate panel missing");
  assert(index.includes("추정 한계"), "crowd estimate limitation missing");
  assert(index.includes("자동 갱신 추정"), "derived crowd estimate label missing");
  assert(index.includes("estimateClaim"), "crowd estimate Claim metadata missing");
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
  assert(!/internal|secret|jwt|postgres|redis|database|MUSUNIL_USER_INPUTS/i.test(config), "web config leaked internal/secret pattern");

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
