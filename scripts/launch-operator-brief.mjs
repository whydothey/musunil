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
const launchApplyPlan = runJson("launch apply plan", ["scripts/launch-apply.mjs", "--", "--json"]);
const launchReadyPlan = runJson("launch ready plan", ["scripts/launch-ready.mjs", "--", "--list"]);
const externalSmokePlan = runJson("external smoke plan", ["scripts/external-smoke.mjs", "--", "--list"]);

const helperFailures = [rehearsal, cutoverPlan, webSettings, apiSettings, launchApplyPlan, launchReadyPlan, externalSmokePlan].filter((item) => !item.ok);
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
    if (brief.nextOperatorCommandScope === "dry_run_only") {
      console.log(`Immediate safe command: ${brief.nextOperatorCommand}`);
      if (brief.nextApplyCommand) console.log(`Apply command after inputs: ${brief.nextApplyCommand}`);
    } else {
      console.log(`Next: ${brief.nextOperatorCommand}`);
    }
  }
}

if (helperFailures.length > 0) process.exitCode = 1;

function buildBrief() {
  const rehearsalData = rehearsal.data || {};
  const planData = cutoverPlan.data || {};
  const webData = webSettings.data || {};
  const apiData = apiSettings.data || {};
  const launchApplyData = launchApplyPlan.data || {};
  const launchReadyData = launchReadyPlan.data || {};
  const externalSmokeData = externalSmokePlan.data || {};
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
    nextOperatorPrerequisite: rehearsalData.nextOperatorPrerequisite || "",
    nextOperatorCommand: rehearsalData.nextOperatorCommand || "pnpm launch:cutover-rehearsal -- --refresh",
    nextOperatorCommandScope: rehearsalData.nextOperatorCommandScope || "diagnostic",
    nextApplyCommand: rehearsalData.nextApplyCommand || "",
    serviceWatch: rehearsalData.report || {
      lastChecked: null,
      stale: true,
      reportAgeMinutes: null,
      staleAfterMinutes: null,
      status: "unknown"
    },
    staleDecisionWarning: rehearsalData.staleDecisionWarning || (rehearsalData.report?.stale
      ? "STALE LIVE EVIDENCE: run pnpm launch:handoff before applying operator actions or declaring blockers cleared."
      : ""),
    actionsAdvisoryOnly: Boolean(rehearsalData.actionsAdvisoryOnly || rehearsalData.report?.stale),
    counts: rehearsalData.counts || {
      pass: 0,
      fail: failedChecks.length,
      skip: skippedChecks.length,
      requiredActions: requiredActions.length
    },
    failedChecks,
    skippedChecks,
    requiredActions,
    preExternalChangeChecks: rehearsalData.preExternalChangeChecks || [],
    splitApplyPaths: rehearsalData.splitApplyPaths || [],
    renderStaticSite: webData,
    renderApiService: apiData,
    launchApply: launchApplyData,
    cloudflareDnsTemplate: planData.cloudflareDnsTemplate || {},
    cloudflareDns: planData.cloudflareDns || [],
    cloudflareCacheRules: planData.cloudflareCacheRules || [],
    userInputPriority: planData.userInputPriority || [],
    verificationOrder: planData.verificationOrder || [],
    successCriteria: planData.successCriteria || [],
    launchReady: {
      inputPath: launchReadyData.inputPath || "config/musunil.user-inputs.local.yaml",
      steps: launchReadyData.steps || []
    },
    externalSmoke: {
      steps: externalSmokeData.steps || []
    }
  };
}

function renderMarkdown(value) {
  return [
    "# Launch Operator Brief",
    "",
    "이 문서는 마지막 운영 연결 단계에서 사람이 Render/Cloudflare/Secret 입력을 할 때 보는 단일 브리프다. 여기 나온 값만 기준으로 맞추고, 완료 판단은 `pnpm launch:final-gate` 통과로만 한다.",
    "",
    "> 실제 Render/Cloudflare 화면을 열기 직전에는 반드시 `pnpm launch:handoff`를 다시 실행한다. 이 명령은 live blocker를 한 번만 갱신하고 운영 브리프와 입력 체크리스트를 같은 보고서 기준으로 다시 쓴다.",
    "",
    "## Current State",
    "",
    `- Generated: ${value.generatedAt}`,
    "- Expected deploy SHA: run `git rev-parse HEAD` immediately before Render deploy and `pnpm launch:final-gate`.",
    `- Refresh command: \`pnpm launch:handoff\``,
    `- Active goal: ${value.goalState}`,
    `- Launch readiness: ${value.launchState}`,
    `- Stage: ${value.stage}`,
    `- Release blocked: ${value.releaseBlocked ? "yes" : "no"}`,
    "- Push CI: run `pnpm ci:status` after every push. `queued` means GitHub has accepted the workflow but has not assigned a runner yet; use the printed watch command for the final result.",
    `- Service watch: ${value.serviceWatch.lastChecked || "unknown"} (${value.serviceWatch.stale ? "stale" : "fresh"})`,
    `- Checks: ${value.counts.pass} ok, ${value.counts.fail} fail, ${value.counts.skip} skip, ${value.counts.requiredActions} actions`,
    ...(value.staleDecisionWarning ? [`- Evidence warning: ${value.staleDecisionWarning}`] : []),
    ...operatorCommandLines(value),
    "",
    ...staleEvidenceSection(value),
    ...helperFailureSection(value.helperFailures),
    ...preExternalChangeSection(value.preExternalChangeChecks),
    "## One Command Apply",
    "",
    "- `pnpm launch:apply`는 Render와 Cloudflare 적용 계획을 한 번에 보여주는 dry-run이다.",
    "- 출력의 `operatorInputs`와 `requiredEnv`가 마지막에 채워야 할 값이다. 현재 핵심 묶음은 `RENDER_API_TOKEN` 또는 `MUSUNIL_RENDER_API_DNS_TARGET`, `CLOUDFLARE_API_TOKEN`이다.",
    "- `RENDER_API_TOKEN`, `CLOUDFLARE_API_TOKEN`이 있으면 `pnpm launch:apply -- --apply`로 Render custom domain, Render Web headers, Cloudflare DNS를 적용한다. Cloudflare zone은 기본적으로 `musunil.com` 이름으로 조회하며, token 권한 때문에 조회가 실패할 때만 `CLOUDFLARE_ZONE_ID`를 추가한다.",
    "- Render API에서 서비스 URL을 읽을 수 있으면 Cloudflare DNS target은 Render `onrender.com` host로 자동 전달된다.",
    "- Web header가 계속 live에 반영되지 않을 때는 `pnpm cloudflare:check`에서 `web_proxy_mode.proxyObserved=true`를 먼저 확인하고, `pnpm launch:apply -- --apply --cloudflare-headers-only`로 Web 전용 Cloudflare fallback만 적용할 수 있다. 이 경로는 Render target을 요구하지 않는다.",
    "- Web build metadata까지 새로 반영해야 하면 `pnpm launch:apply -- --apply --deploy-web`을 사용한다.",
    "- 적용 후 완료 판정은 항상 `pnpm launch:final-gate`다.",
    "",
    "Required launch inputs from current dry-run:",
    "",
    ...launchInputLines(value.launchApply),
    "",
    value.actionsAdvisoryOnly ? "Split apply paths from current blockers (stale evidence):" : "Split apply paths from current blockers:",
    "",
    ...splitApplyPathLines(value.splitApplyPaths),
    "",
    value.actionsAdvisoryOnly ? "## What To Do Now (stale evidence)" : "## What To Do Now",
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
    "Render API automation:",
    "",
    "- `pnpm render:apply`는 기본 dry-run이며 `--apply` 없이는 Render에 쓰지 않는다.",
    "- `RENDER_API_TOKEN`이 있으면 `pnpm render:apply -- --web-headers --apply`로 `musunil-web` Headers를 생성·갱신한다.",
    "- 필요하면 `MUSUNIL_RENDER_WEB_SERVICE_ID`를 넣어 서비스명 조회 대신 정확한 service id를 사용한다.",
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
    "Render API automation:",
    "",
    "- `RENDER_API_TOKEN`이 있으면 `pnpm render:apply -- --api-domain --apply`로 `api.musunil.com` custom domain을 생성·확인한다.",
    "- DNS 적용 후에는 `pnpm render:apply -- --api-domain --verify-domains --apply`로 Render verification을 요청할 수 있다.",
    "- 필요하면 `MUSUNIL_RENDER_API_SERVICE_ID`를 넣어 서비스명 조회 대신 정확한 service id를 사용한다.",
    "- 이 자동화는 Render env var나 secret file을 교체하지 않는다.",
    "",
    "## Cloudflare",
    "",
    "Render Dashboard가 보여주는 custom-domain target을 그대로 복사한다. API는 smoke 통과 전까지 DNS only가 안전하다.",
    "Custom Domains에서 api.musunil.com의 DNS target을 복사해 MUSUNIL_RENDER_API_DNS_TARGET에 넣은 뒤 Cloudflare api 레코드에 적용한다.",
    "",
    `DNS template: \`${value.cloudflareDnsTemplate.command || "pnpm cloudflare:dns"}\` -> \`${value.cloudflareDnsTemplate.docsPath || "docs/cloudflare-dns-records.md"}\`, \`${value.cloudflareDnsTemplate.terraformPath || "infra/cloudflare/dns-records.tf.example"}\``,
    `Exact target env: \`${(value.cloudflareDnsTemplate.exactTargetEnv || ["MUSUNIL_RENDER_WEB_DNS_TARGET", "MUSUNIL_RENDER_API_DNS_TARGET"]).join("`, `")}\``,
    `Local exact copy: \`${value.cloudflareDnsTemplate.localDocsPath || "docs/cloudflare-dns-records.local.md"}\`, \`${value.cloudflareDnsTemplate.localTfvarsPath || "infra/cloudflare/dns-records.local.tfvars"}\``,
    "",
    "Web headers fallback:",
    "",
    "- Render Static Site Headers가 live 응답에 반영되지 않으면 `pnpm cloudflare:headers`로 Cloudflare Response Header Transform Rule 템플릿을 갱신한다.",
    "- Cloudflare token만 준비된 경우 `pnpm cloudflare:check`에서 `web_proxy_mode.proxyObserved=true`를 확인하고, `pnpm launch:apply -- --cloudflare-headers-only`로 dry-run을 본 뒤 `pnpm launch:apply -- --apply --cloudflare-headers-only`로 Web header rule만 적용한다.",
    "- Web 레코드가 Cloudflare proxied 상태일 때만 Cloudflare response header rule이 적용된다.",
    "- API 레코드는 `/health`, `/ready`, CORS, media smoke 통과 전까지 DNS only를 유지한다.",
    "",
    "Cloudflare API automation:",
    "",
    "- `pnpm cloudflare:apply`는 기본 dry-run이며 `--apply` 없이는 Cloudflare에 쓰지 않는다.",
    "- `CLOUDFLARE_API_TOKEN`과 Render target env를 넣은 뒤 `pnpm cloudflare:apply -- --dns --apply`와 `pnpm cloudflare:apply -- --headers --apply`를 순서대로 실행할 수 있다. Zone name 조회 권한이 없을 때만 `CLOUDFLARE_ZONE_ID`를 추가한다.",
    "- 적용 후에는 `pnpm cloudflare:check:strict`와 `pnpm launch:final-gate`로만 완료를 판단한다.",
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
    "- 정확한 누락 입력값과 proof marker는 `pnpm launch:handoff`가 함께 갱신하는 `docs/launch-missing-inputs.md`에서 확인한다.",
    "",
    ...listLines(value.userInputPriority),
    "",
    "## Launch Ready Plan",
    "",
    `- Input file: \`${value.launchReady.inputPath}\``,
    ...stepLines(value.launchReady.steps),
    "",
    "## External Smoke Proofs",
    "",
    "실제 운영 직전에는 아래 proof marker가 각 명령 출력에 있어야 한다. 이 단계는 mock 성공이나 문서상 준비 상태가 아니라 provider 연결 증거를 요구한다.",
    "storage smoke는 실제 PUT/DELETE를 수행한다. `MUSUNIL_STORAGE_SMOKE_KEY`를 직접 지정해야 할 때도 `private/live/smoke/` prefix 아래 값만 허용하고, 기존 원본 미디어 key를 쓰지 않는다.",
    "",
    ...stepLines(value.externalSmoke.steps),
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

function operatorCommandLines(value) {
  if (value.nextOperatorCommandScope === "dry_run_only") {
    return [
      value.nextOperatorPrerequisite ? `- Before apply command: ${value.nextOperatorPrerequisite}` : "",
      `- Immediate safe command: \`${value.nextOperatorCommand}\``,
      value.nextApplyCommand ? `- Apply command after inputs: \`${value.nextApplyCommand}\`` : ""
    ].filter(Boolean);
  }
  return [
    value.nextOperatorPrerequisite ? `- Before next command: ${value.nextOperatorPrerequisite}` : "",
    `- Next command: \`${value.nextOperatorCommand}\``
  ].filter(Boolean);
}

function staleEvidenceSection(value) {
  if (!value.actionsAdvisoryOnly) return [];
  return [
    "## Stale Evidence Warning",
    "",
    `- ${value.staleDecisionWarning}`,
    "- Treat the commands, split apply paths, and ordered actions below as diagnostic only until `pnpm launch:handoff` refreshes live evidence.",
    "- Do not change Render/Cloudflare settings or mark launch blockers cleared from this stale operator brief.",
    ""
  ];
}

function preExternalChangeSection(checks = []) {
  if (!checks.length) return [];
  return [
    "## Pre-External-Change Checks",
    "",
    "Render/Cloudflare 화면을 바꾸기 전에 아래 명령이 먼저 통과하거나 dry-run으로 입력 상태를 설명해야 한다.",
    "",
    ...checks.flatMap((check) => [
      `- ${check.id}: \`${check.command}\``,
      `  - ${check.note || ""}`
    ]),
    ""
  ];
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

function launchInputLines(plan) {
  const requiredEnv = plan?.requiredEnv || [];
  const inputs = plan?.operatorInputs || [];
  const lines = [];
  lines.push(`- Mode: \`${plan?.mode || "unknown"}\``);
  lines.push(`- Required env: ${requiredEnv.length ? requiredEnv.map((item) => `\`${item}\``).join(", ") : "(none)"}`);
  if (!inputs.length) return [...lines, "- Inputs: (none)"];
  lines.push("");
  lines.push("| ID | Required | Status | Env | Purpose | Where | Validate |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const input of inputs) {
    const required = input.requiredMode === "one_of" ? "one_of" : input.required ? "yes" : "no";
    const env = [...(input.env || []), ...(input.alternatives || []).map((item) => `alt:${item}`)].join("<br>");
    lines.push(`| ${input.id || ""} | ${required} | ${input.status || ""} | ${env || "-"} | ${input.purpose || ""} | ${input.whereToFind || ""} | ${input.howToValidate || ""} |`);
  }
  return lines;
}

function splitApplyPathLines(paths) {
  if (!paths?.length) return ["- (none)"];
  return paths.flatMap((path) => {
    const missing = path.missingInputs || [];
    return [
      `- ${path.id}: ${path.note || ""}`,
      `  - Requires: ${(path.requires || []).map((item) => `\`${item}\``).join(", ") || "(none)"}`,
      `  - Inputs ready: ${path.inputsReady ? "yes" : "no"}`,
      ...(!path.inputsReady && missing.length ? [`  - Missing: ${missing.map((item) => `\`${item}\``).join(", ")}`] : []),
      ...(path.webProxyMode ? [`  - Web proxy observed: ${webProxyModeLabel(path.webProxyMode)}`] : []),
      `  - Dry-run: \`${path.dryRun}\``,
      `  - Apply: \`${path.apply}\``,
      `  - Verify: \`${path.verify}\``
    ];
  });
}

function webProxyModeLabel(mode) {
  const observed = mode.proxyObserved ? "yes" : "no";
  const parts = [`${observed}`];
  if (mode.checked === false) parts.push("not checked");
  if (mode.status) parts.push(`status=${mode.status}`);
  if (mode.server) parts.push(`server=${mode.server}`);
  if (typeof mode.cfRayPresent === "boolean") parts.push(`cfRayPresent=${mode.cfRayPresent}`);
  if (mode.note) parts.push(mode.note);
  return parts.join(", ");
}

function stepLines(steps) {
  if (!steps.length) return ["- (none)"];
  return steps.map((step) => {
    const proof = step.proofMarker ? `, proof: \`${step.proofMarker}\`` : "";
    const proofContract = step.proofContract ? `, contract: ${step.proofContract}` : "";
    const forbidden = step.forbiddenMarker ? `, forbidden: \`${step.forbiddenMarker}\`` : "";
    return `- ${step.id}: \`${step.command}\`${proof}${proofContract}${forbidden}`;
  });
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
