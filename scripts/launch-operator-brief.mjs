import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const stdout = args.includes("--stdout");
const refresh = args.includes("--refresh");
const outputPath = resolve(cwd, "docs/launch-operator-brief.md");

const gitSha = runText("git", ["rev-parse", "HEAD"]).trim() || null;
const generatedAt = new Date().toISOString();

const rehearsal = runJson("cutover rehearsal", [
  "scripts/launch-cutover-rehearsal.mjs",
  "--",
  "--json",
  ...(refresh ? ["--refresh"] : [])
]);
const cutoverPlan = runJson("cutover plan", ["scripts/launch-cutover-plan.mjs", "--", "--json"]);
const webSettings = runJson("Render Web settings", ["scripts/render-web-settings.mjs", "--", "--json"]);
const apiSettings = runJson("Render API settings", ["scripts/render-api-settings.mjs", "--", "--json"]);

const helperFailures = [rehearsal, cutoverPlan, webSettings, apiSettings].filter((item) => !item.ok);
const brief = buildBrief();

if (json) {
  console.log(JSON.stringify(brief, null, 2));
} else {
  const markdown = renderMarkdown(brief);
  if (stdout) {
    console.log(markdown);
  } else {
    writeFileSync(outputPath, markdown);
    console.log(`Wrote docs/launch-operator-brief.md`);
    console.log(`Stage: ${brief.stage}`);
    console.log(`Release blocked: ${brief.releaseBlocked ? "yes" : "no"}`);
    console.log(`Next: ${brief.nextOperatorCommand}`);
  }
}

if (helperFailures.length > 0) process.exitCode = 1;

function buildBrief() {
  const rehearsalData = rehearsal.data || {};
  const planData = cutoverPlan.data || {};
  const webData = webSettings.data || {};
  const apiData = apiSettings.data || {};
  const requiredActions = rehearsalData.requiredActions || [];
  const failedChecks = rehearsalData.failedChecks || [];
  const skippedChecks = rehearsalData.skippedChecks || [];
  return {
    checked: "launch_operator_brief",
    generatedAt,
    gitSha,
    refreshAttempted: refresh,
    helperFailures,
    goalState: rehearsalData.goalState || "active",
    launchState: rehearsalData.launchState || (helperFailures.length > 0 || Boolean(rehearsalData.releaseBlocked) ? "blocked" : "ready_for_final_gate"),
    releaseBlocked: helperFailures.length > 0 || Boolean(rehearsalData.releaseBlocked),
    stage: rehearsalData.stage || "unknown",
    nextOperatorCommand: rehearsalData.nextOperatorCommand || "pnpm launch:cutover-rehearsal -- --refresh",
    serviceWatch: rehearsalData.report || {
      lastChecked: null,
      stale: true,
      reportAgeMinutes: null,
      staleAfterMinutes: null,
      status: "unknown"
    },
    counts: rehearsalData.counts || {
      pass: 0,
      fail: failedChecks.length,
      skip: skippedChecks.length,
      requiredActions: requiredActions.length
    },
    failedChecks,
    skippedChecks,
    requiredActions,
    renderStaticSite: webData,
    renderApiService: apiData,
    cloudflareDnsTemplate: planData.cloudflareDnsTemplate || {},
    cloudflareDns: planData.cloudflareDns || [],
    cloudflareCacheRules: planData.cloudflareCacheRules || [],
    userInputPriority: planData.userInputPriority || [],
    verificationOrder: planData.verificationOrder || [],
    successCriteria: planData.successCriteria || []
  };
}

function renderMarkdown(value) {
  return [
    "# Launch Operator Brief",
    "",
    "이 문서는 마지막 운영 연결 단계에서 사람이 Render/Cloudflare/Secret 입력을 할 때 보는 단일 브리프다. 여기 나온 값만 기준으로 맞추고, 완료 판단은 `pnpm launch:final-gate` 통과로만 한다.",
    "",
    "> 실제 Render/Cloudflare 화면을 열기 직전에는 반드시 `pnpm launch:operator-brief -- --refresh`를 다시 실행한다. 이 파일은 마지막 생성 시점의 스냅샷이며, 오래된 Git SHA나 blocker 상태를 출시 판단 증거로 쓰지 않는다.",
    "",
    "## Current State",
    "",
    `- Generated: ${value.generatedAt}`,
    `- Git SHA: ${value.gitSha || "unknown"}`,
    `- Refresh command: \`pnpm launch:operator-brief -- --refresh\``,
    `- Active goal: ${value.goalState}`,
    `- Launch readiness: ${value.launchState}`,
    `- Stage: ${value.stage}`,
    `- Release blocked: ${value.releaseBlocked ? "yes" : "no"}`,
    `- Service watch: ${value.serviceWatch.lastChecked || "unknown"} (${value.serviceWatch.stale ? "stale" : "fresh"})`,
    `- Checks: ${value.counts.pass} ok, ${value.counts.fail} fail, ${value.counts.skip} skip, ${value.counts.requiredActions} actions`,
    `- Next command: \`${value.nextOperatorCommand}\``,
    "",
    ...helperFailureSection(value.helperFailures),
    "## What To Do Now",
    "",
    ...actionLines(value.requiredActions),
    "",
    "## Render Web Static Site",
    "",
    `- Service: \`musunil-web\``,
    `- Branch: \`${value.renderStaticSite.branch || "main"}\``,
    "- Root Directory: blank",
    `- Build Command: \`${value.renderStaticSite.buildCommand || "(missing)"}\``,
    `- Publish Directory: \`${value.renderStaticSite.publishDirectory || "(missing)"}\``,
    "- Static Web에는 DB/Redis, 사용자 입력 YAML, token secret, encryption key, internal API key를 넣지 않는다.",
    "",
    "Environment variables:",
    ...envLines(value.renderStaticSite.envVars || []),
    "",
    "Headers to copy into Render Dashboard when this is a manual Static Site:",
    ...headerLines(value.renderStaticSite.headers || []),
    "",
    "Header application mode:",
    ...listLines(value.renderStaticSite.headerApplicationModes || []),
    "",
    "## Render API Service",
    "",
    `- Service: \`${value.renderApiService.service || "musunil-api"}\``,
    `- Branch: \`${value.renderApiService.branch || "main"}\``,
    "- Root Directory: blank",
    `- Runtime: \`${value.renderApiService.runtime || "(missing)"}\``,
    `- Region: \`${value.renderApiService.region || "(missing)"}\``,
    `- Plan: \`${value.renderApiService.plan || "(missing)"}\``,
    `- Build Command: \`${value.renderApiService.buildCommand || "(missing)"}\``,
    `- Pre Deploy Command: \`${value.renderApiService.preDeployCommand || "(missing)"}\``,
    `- Start Command: \`${value.renderApiService.startCommand || "(missing)"}\``,
    `- Health Check Path: \`${value.renderApiService.healthCheckPath || "(missing)"}\``,
    `- Custom Domain: \`${value.renderApiService.customDomain || "api.musunil.com"}\``,
    "",
    "Environment source summary:",
    ...envSummaryLines(value.renderApiService.envSummary || {}),
    "",
    "## Cloudflare",
    "",
    "Render Dashboard가 보여주는 custom-domain target을 그대로 복사한다. API는 smoke 통과 전까지 DNS only가 안전하다.",
    "",
    `DNS template: \`${value.cloudflareDnsTemplate.command || "pnpm cloudflare:dns"}\` -> \`${value.cloudflareDnsTemplate.docsPath || "docs/cloudflare-dns-records.md"}\`, \`${value.cloudflareDnsTemplate.terraformPath || "infra/cloudflare/dns-records.tf.example"}\``,
    "",
    "Web headers fallback:",
    "",
    "- Render Static Site Headers가 live 응답에 반영되지 않으면 `pnpm cloudflare:headers`로 Cloudflare Response Header Transform Rule 템플릿을 갱신한다.",
    "- Web 레코드가 Cloudflare proxied 상태일 때만 Cloudflare response header rule이 적용된다.",
    "- API 레코드는 `/health`, `/ready`, CORS, media smoke 통과 전까지 DNS only를 유지한다.",
    "",
    ...cloudflareLines(value.cloudflareDns),
    "",
    "Cache rules:",
    ...listLines(value.cloudflareCacheRules),
    "",
    "## User Inputs",
    "",
    "사용자가 마지막에 채울 값의 우선순위다. Static Web에는 secret을 넣지 않고, API/Secret File에만 주입한다.",
    "",
    ...listLines(value.userInputPriority),
    "",
    "## Verification",
    "",
    ...listLines(value.verificationOrder),
    "",
    "## Success Criteria",
    "",
    ...listLines(value.successCriteria),
    ""
  ].join("\n");
}

function helperFailureSection(items) {
  if (!items.length) return [];
  return [
    "## Helper Failures",
    "",
    ...items.map((item) => `- ${item.label}: ${compact(item.error || item.stderr || `exit ${item.status}`)}`),
    ""
  ];
}

function actionLines(actions) {
  if (!actions.length) return ["- No required action is recorded. Run `pnpm launch:final-gate` to prove launch readiness."];
  return actions.flatMap((action) => [
    `${action.order || "-"}. ${action.id} (${action.owner || "operator"})`,
    `   - Action: ${action.action || ""}`,
    `   - Verify: \`${action.verify || "pnpm launch:final-gate"}\``,
    action.reference && action.reference !== "-" ? `   - Reference: ${action.reference}` : ""
  ].filter(Boolean));
}

function envLines(items) {
  if (!items.length) return ["- (none)"];
  return items.map((item) => `- \`${item.key}\`: \`${item.value}\``);
}

function headerLines(items) {
  if (!items.length) return ["- (none)"];
  return items.flatMap((header) => [
    `- Path: \`${header.path}\``,
    `  - Name: \`${header.name}\``,
    "  - Value:",
    "    ```text",
    `    ${header.value}`,
    "    ```"
  ]);
}

function envSummaryLines(summary) {
  const groups = [
    ["Fixed", summary.fixed || []],
    ["Render generated", summary.renderGenerated || []],
    ["Render managed", summary.renderManaged || []],
    ["Operator input", summary.operatorInput || []]
  ];
  return groups.flatMap(([label, values]) => [
    `- ${label}:`,
    ...(values.length ? values.map((item) => `  - \`${item}\``) : ["  - (none)"])
  ]);
}

function cloudflareLines(records) {
  if (!records?.length) return ["- (none)"];
  return records.map((record) => `- \`${record.name}\`: ${record.type} -> ${record.target}. Proxy: ${record.proxy}.`);
}

function listLines(items) {
  if (!items?.length) return ["- (none)"];
  return items.map((item) => `- ${item}`);
}

function runJson(label, commandArgs) {
  const result = spawnSync("node", commandArgs, {
    cwd,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 60 * 1024 * 1024
  });
  if (result.error) return { ok: false, label, error: result.error.message };
  if (result.status !== 0) {
    return {
      ok: false,
      label,
      status: result.status,
      stderr: compact(result.stderr, 1600),
      stdout: compact(result.stdout, 1600)
    };
  }
  try {
    return { ok: true, label, data: JSON.parse(result.stdout) };
  } catch (error) {
    return {
      ok: false,
      label,
      error: `invalid JSON output: ${error instanceof Error ? error.message : String(error)}`,
      stdout: compact(result.stdout, 1600)
    };
  }
}

function runText(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: process.env,
    encoding: "utf8"
  });
  if (result.status !== 0 || result.error) return "";
  return result.stdout;
}

function compact(value, maxLength = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}
