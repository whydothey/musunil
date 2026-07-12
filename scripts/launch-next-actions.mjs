import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const refresh = args.includes("--refresh");
const failOnBlockers = args.includes("--fail-on-blockers") || args.includes("--strict");
const cwd = resolve(import.meta.dirname, "..");
const reportPath = resolve(cwd, "docs/splus-service-watch.md");
let refreshResult = { attempted: false };
const launchApplyPlan = runLaunchApplyPlan();
const headerApplyPlan = runLaunchApplyPlan("--cloudflare-headers-only");

if (refresh) {
  refreshResult = refreshServiceWatch();
}

if (!existsSync(reportPath)) {
  const fallback = {
    status: "missing_report",
    lastChecked: null,
    message: "docs/splus-service-watch.md is missing. Run pnpm service:watch:visual first.",
    commands: ["pnpm service:watch:visual", "pnpm render:api-settings", "pnpm render:web-settings"]
  };
  if (json) console.log(JSON.stringify(fallback, null, 2));
  else {
    console.log("# Launch Next Actions");
    console.log("");
    console.log(fallback.message);
    for (const command of fallback.commands) console.log(`- ${command}`);
  }
  process.exit(1);
}

const report = readFileSync(reportPath, "utf8");
const summary = parseReport(report, refreshResult);

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printMarkdown(summary);
}
if (failOnBlockers && summary.releaseBlocked) {
  console.error("Launch blockers are active. Refresh live evidence and clear all failed/skipped checks before launch.");
  process.exitCode = 1;
}

function parseReport(source, refreshMetadata = { attempted: false }) {
  const lastChecked = source.match(/^Last checked:\s*(.+)$/m)?.[1]?.trim() || null;
  const refreshReportUpdated = refreshMetadata.attempted ? Boolean(lastChecked && lastChecked !== refreshMetadata.beforeLastChecked) : null;
  const refreshFailed = refreshMetadata.attempted && (!refreshReportUpdated || Boolean(refreshMetadata.error));
  const freshness = reportFreshness(lastChecked);
  const status = source.match(/^Status:\s*(.+)$/m)?.[1]?.trim() || "unknown";
  const checks = parseTable(source, "Check", "Required Actions").map((row) => ({
    id: row[0] || "",
    result: row[1] || "",
    detail: row[2] || ""
  })).filter((row) => row.id && row.id !== "---");
  const actions = parseTable(source, "ID", "History").map((row) => ({
    id: row[0] || "",
    owner: row[1] || "",
    action: row[2] || "",
    verify: row[3] || "",
    reference: row[4] || ""
  })).filter((row) => row.id && row.id !== "-" && row.id !== "---");
  const failed = checks.filter((item) => item.result === "fail");
  const skipped = checks.filter((item) => item.result === "skip");
  const ok = checks.filter((item) => item.result === "ok");
  const releaseBlocked = refreshFailed || freshness.stale || status !== "S+ Guard" || failed.length > 0 || skipped.length > 0 || actions.length > 0;
  const blockerStage = determineBlockerStage({
    refreshFailed,
    freshness,
    status,
    failed,
    skipped,
    actions,
    releaseBlocked
  });
  return {
    checked: "launch_next_actions",
    goalState: "active",
    goalNote: "Codex active goal continues until final launch evidence passes; this helper tracks deploy readiness only.",
    launchState: releaseBlocked ? "blocked" : "ready_for_final_gate",
    blockerStage,
    launchApplyInputsReady: launchApplyInputsReady(launchApplyPlan),
    headerApplyInputsReady: launchApplyInputsReady(headerApplyPlan),
    requiredLaunchInputsMissing: requiredLaunchInputsMissing(launchApplyPlan),
    requiredHeaderInputsMissing: requiredLaunchInputsMissing(headerApplyPlan),
    nextOperatorPrerequisite: prerequisiteForStage(blockerStage, actions, launchApplyPlan, headerApplyPlan),
    nextOperatorCommand: nextCommandForStage(blockerStage, actions, launchApplyPlan, headerApplyPlan),
    splitApplyPaths: splitApplyPaths({ failed, actions, launchApplyPlan, headerApplyPlan }),
    lastChecked,
    reportAgeMinutes: freshness.ageMinutes,
    staleAfterMinutes: freshness.staleAfterMinutes,
    stale: freshness.stale,
    refreshRequired: freshness.stale,
    refresh: refreshMetadata.attempted
      ? {
          attempted: true,
          command: refreshMetadata.command,
          exitStatus: refreshMetadata.exitStatus,
          signal: refreshMetadata.signal,
          error: refreshMetadata.error,
          beforeLastChecked: refreshMetadata.beforeLastChecked,
          afterLastChecked: lastChecked,
          reportUpdated: refreshReportUpdated
        }
      : { attempted: false },
    status,
    releaseBlocked,
    launchApply: launchApplyPlan,
    headerApply: headerApplyPlan,
    passCount: ok.length,
    failCount: failed.length,
    skipCount: skipped.length,
    failedChecks: failed,
    skippedChecks: skipped,
    requiredActions: actions,
    helperCommands: [
      "pnpm launch:blockers -- --refresh",
      "pnpm launch:blockers:strict",
      "pnpm launch:blockers:refresh-strict",
      "pnpm launch:apply",
      "pnpm launch:apply -- --apply",
      "pnpm launch:apply -- --apply --deploy-web",
      "pnpm launch:apply -- --apply --cloudflare-headers",
      "pnpm launch:apply -- --apply --cloudflare-headers-only",
      "pnpm render:api-settings",
      "pnpm render:web-settings",
      "pnpm render:apply",
      "pnpm render:apply -- --api-domain",
      "pnpm render:apply -- --api-domain --apply",
      "pnpm render:apply -- --web-headers",
      "pnpm render:apply -- --web-headers --apply",
      "pnpm cloudflare:dns",
      "pnpm cloudflare:apply -- --dns",
      "pnpm cloudflare:apply -- --dns --apply",
      "pnpm cloudflare:apply -- --headers",
      "pnpm cloudflare:apply -- --headers --apply",
      ': "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}" && pnpm cloudflare:check:strict',
      "pnpm cloudflare:headers",
      "pnpm cloudflare:check",
      "pnpm cloudflare:check:strict",
      "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      "MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      "pnpm sources:refresh-preflight",
      "pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes",
      "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm service:watch:visual",
      "pnpm launch:final-gate"
    ]
  };
}

function determineBlockerStage({ refreshFailed, freshness, status, failed, skipped, actions, releaseBlocked }) {
  if (refreshFailed) return "refresh_live_evidence_failed";
  if (freshness.stale) return "refresh_live_evidence";
  const actionIds = new Set(actions.map((action) => action.id));
  if (actionIds.has("deploy_latest_static")) return "deploy_latest_static";
  if (actionIds.has("connect_api_endpoint") || actionIds.has("connect_api_dns")) return "connect_api_endpoint";
  if (actionIds.has("apply_static_headers")) return "apply_static_headers";
  if (actionIds.has("publish_build_metadata")) return "publish_build_metadata";
  if (actionIds.has("stop_live_visual_surface_regression")) return "restore_live_issue_sync";
  if (actionIds.has("restore_issue_first_api_payload") || actionIds.has("restore_issue_first_live_data")) return "restore_issue_first_data";
  if (actionIds.has("fix_api_readiness")) return "fix_api_readiness";
  if (skipped.length > 0) return "clear_skipped_checks";
  if (failed.length > 0) return failed[0].id || "clear_failed_checks";
  if (status !== "S+ Guard") return "service_watch_not_green";
  if (releaseBlocked) return "clear_remaining_blockers";
  return "ready_for_final_gate";
}

function nextCommandForStage(stage, actions, launchApplyPlan, headerApplyPlan) {
  if (stage === "refresh_live_evidence" || stage === "refresh_live_evidence_failed") return "pnpm launch:blockers -- --refresh";
  if (stage === "deploy_latest_static") {
    return "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy";
  }
  if (stage === "connect_api_endpoint") {
    if (!launchApplyInputsReady(launchApplyPlan) && canApplyHeaderOnly(actions, headerApplyPlan)) return "pnpm launch:apply -- --apply --cloudflare-headers-only";
    if (!launchApplyInputsReady(launchApplyPlan)) return "pnpm launch:apply";
    return "pnpm launch:apply -- --apply && pnpm launch:final-gate";
  }
  if (stage === "apply_static_headers") {
    if (!launchApplyInputsReady(headerApplyPlan)) return "pnpm launch:apply -- --cloudflare-headers-only";
    return "pnpm launch:apply -- --apply --cloudflare-headers-only && pnpm launch:final-gate";
  }
  if (stage === "publish_build_metadata") {
    return "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy";
  }
  if (stage === "restore_live_issue_sync" || stage === "restore_issue_first_data" || stage === "fix_api_readiness") return "pnpm launch:final-gate";
  if (actions[0]?.verify) return actions[0].verify;
  if (stage === "ready_for_final_gate") return "pnpm launch:final-gate";
  return "pnpm launch:blockers -- --refresh";
}

function splitApplyPaths({ failed, actions, launchApplyPlan, headerApplyPlan }) {
  const actionIds = new Set(actions.map((action) => action.id));
  const failedIds = new Set(failed.map((check) => check.id));
  const paths = [];
  if (actionIds.has("apply_static_headers") || failedIds.has("web_header_contract")) {
    paths.push({
      id: "web_headers_only",
      clears: ["web_header_contract"],
      requires: ["CLOUDFLARE_API_TOKEN", "Cloudflare proxied Web record for musunil.com/www"],
      inputsReady: launchApplyInputsReady(headerApplyPlan),
      missingInputs: requiredInputs(headerApplyPlan),
      dryRun: "pnpm launch:apply -- --cloudflare-headers-only",
      apply: "pnpm launch:apply -- --apply --cloudflare-headers-only",
      verify: "pnpm cloudflare:check && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy",
      note: "Render target/API DNS 없이 Web 보안 헤더 blocker만 먼저 줄인다. Cloudflare Response Header Transform Rule은 proxied Web record에서만 실제 응답에 적용된다. 최종 출시는 API DNS와 live API sync가 별도로 통과해야 한다."
    });
  }
  if (actionIds.has("connect_api_endpoint") || actionIds.has("connect_api_dns") || failedIds.has("api_endpoint_preflight")) {
    paths.push({
      id: "api_dns_and_render_domain",
      clears: ["api_endpoint_preflight", "api_health_ready", "web_visual_surface"],
      requires: ["RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET", "CLOUDFLARE_API_TOKEN"],
      inputsReady: launchApplyInputsReady(launchApplyPlan),
      missingInputs: requiredInputs(launchApplyPlan),
      dryRun: "pnpm launch:apply",
      apply: "pnpm launch:apply -- --apply",
      verify: "pnpm launch:final-gate",
      note: "Render API custom domain, api.musunil.com DNS, live API 동기화까지 한 번에 검증하는 주 경로다."
    });
  }
  return paths;
}

function prerequisiteForStage(stage, actions, launchApplyPlan = null, headerApplyPlan = null) {
  if (stage === "deploy_latest_static") {
    return "Render musunil-web가 현재 main 커밋을 배포했는지 확인한다. 아직 이전 정적 manifest가 보이면 Render musunil-web에서 Clear build cache & deploy를 실행하고 배포 완료 후 검증한다.";
  }
  if (stage === "connect_api_endpoint") {
    if (!launchApplyInputsReady(launchApplyPlan) && canApplyHeaderOnly(actions, headerApplyPlan)) {
      return "전체 API DNS 적용 입력은 아직 부족하지만 Web header-only 경로는 준비됐다. 먼저 Web 보안 헤더 blocker를 줄인 뒤 `pnpm launch:blockers -- --refresh`로 남은 API DNS/live sync blocker를 다시 확인한다.";
    }
    if (!launchApplyInputsReady(launchApplyPlan)) {
      return "먼저 `pnpm launch:apply` dry-run의 `requiredEnv`와 `operatorInputs`를 채운다. 필수 입력이 비어 있으면 실제 적용과 `pnpm launch:final-gate`를 다음 단계로 안내하지 않는다.";
    }
    return "Render API token과 Cloudflare token이 있으면 `pnpm launch:apply -- --apply`가 api.musunil.com custom domain 생성, Render onrender.com target 파생, Cloudflare DNS 적용을 한 번에 처리한다. token이 없으면 dry-run 출력의 requiredEnv만 채운다.";
  }
  if (stage === "apply_static_headers") {
    if (!launchApplyInputsReady(headerApplyPlan)) {
      return "먼저 `pnpm launch:apply -- --cloudflare-headers-only` dry-run으로 Web header 적용에 필요한 Cloudflare 입력을 확인한다. 필수 입력이 비어 있으면 `pnpm launch:final-gate`를 다음 단계로 안내하지 않는다.";
    }
    return "Render API token이 있으면 `pnpm launch:apply -- --apply --deploy-web`으로 musunil-web Headers를 적용하고 배포까지 요청한다. Render headers가 live에 계속 없거나 Render token 없이 Web header만 먼저 고치려면 `pnpm cloudflare:check`에서 `web_proxy_mode.proxyObserved=true`를 확인한 뒤 `pnpm launch:apply -- --apply --cloudflare-headers-only`로 Web 전용 Cloudflare fallback을 추가한다.";
  }
  if (stage === "publish_build_metadata") {
    return "Render musunil-web Build Command가 pnpm build:web-static:render인지 먼저 확인하고 Clear build cache & deploy로 새 산출물을 publish한다.";
  }
  if (stage === "restore_live_issue_sync") {
    return "api.musunil.com DNS와 Web config.js의 apiBaseUrl이 https://api.musunil.com으로 맞은 상태에서 live API 응답을 확인한다.";
  }
  return "";
}

function launchApplyInputsReady(plan) {
  return !requiredLaunchInputsMissing(plan);
}

function canApplyHeaderOnly(actions, headerApplyPlan) {
  return actions.some((action) => action.id === "apply_static_headers") && launchApplyInputsReady(headerApplyPlan);
}

function requiredLaunchInputsMissing(plan) {
  if (!plan?.ok) return true;
  if ((plan.requiredEnv || []).length > 0) return true;
  return (plan.operatorInputs || []).some((input) => {
    const required = input.required || input.requiredMode === "one_of";
    return required && /missing|invalid|placeholder/i.test(input.status || "");
  });
}

function requiredInputs(plan) {
  if (!plan?.ok) return ["launch_apply_plan_unavailable"];
  const missing = [...(plan.requiredEnv || [])];
  for (const input of plan.operatorInputs || []) {
    const required = input.required || input.requiredMode === "one_of";
    if (required && /missing|invalid|placeholder/i.test(input.status || "")) {
      const envNames = input.env || [];
      const alreadyCovered = envNames.some((envName) => missing.some((item) => item.includes(envName)));
      if (!alreadyCovered) missing.push(input.id || envNames.join(" or ") || "required_input");
    }
  }
  return [...new Set(missing)];
}

function parseTable(source, firstHeader, nextHeading) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.startsWith("| ") && line.includes(`| ${firstHeader} |`));
  if (start < 0) return [];
  const rows = [];
  for (let index = start + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("## ") && line.includes(nextHeading)) break;
    if (!line.startsWith("|")) continue;
    rows.push(splitMarkdownRow(line));
  }
  return rows;
}

function splitMarkdownRow(line) {
  const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let current = "";
  let escaped = false;
  for (const char of trimmed) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function printMarkdown(summary) {
  console.log("# Launch Next Actions");
  console.log("");
  console.log(`Last checked: ${summary.lastChecked || "unknown"}`);
  if (typeof summary.reportAgeMinutes === "number") {
    console.log(`Report freshness: ${summary.stale ? "stale" : "fresh"} (${summary.reportAgeMinutes}m old, refresh after ${summary.staleAfterMinutes}m)`);
  } else {
    console.log(`Report freshness: unknown (run pnpm launch:blockers -- --refresh)`);
  }
  console.log(`Active goal: ${summary.goalState}`);
  console.log(`Launch readiness: ${summary.launchState}`);
  console.log(`Current stage: ${summary.blockerStage}`);
  console.log(`Service watch status: ${summary.status}`);
  console.log(`Checks: ${summary.passCount} ok, ${summary.failCount} fail, ${summary.skipCount} skip`);
  console.log("");
  if (summary.nextOperatorPrerequisite) {
    console.log(`Before next command: ${summary.nextOperatorPrerequisite}`);
  }
  console.log(`Next command: \`${summary.nextOperatorCommand}\``);
  console.log("");
  console.log("## Launch Apply Inputs");
  console.log("");
  printLaunchApplyInputs(summary.launchApply);
  console.log("");
  if (summary.splitApplyPaths.length > 0) {
    console.log("## Split Apply Paths");
    console.log("");
    for (const path of summary.splitApplyPaths) {
      console.log(`- ${path.id}: ${path.note}`);
      console.log(`  - Requires: ${path.requires.map((item) => `\`${item}\``).join(", ")}`);
      console.log(`  - Inputs ready: ${path.inputsReady ? "yes" : "no"}`);
      if (!path.inputsReady && path.missingInputs?.length) console.log(`  - Missing: ${path.missingInputs.map((item) => `\`${item}\``).join(", ")}`);
      console.log(`  - Dry-run: \`${path.dryRun}\``);
      console.log(`  - Apply: \`${path.apply}\``);
      console.log(`  - Verify: \`${path.verify}\``);
    }
    console.log("");
  }
  if (summary.stale) {
    console.log("> This blocker summary is based on stale live evidence. Run `pnpm launch:blockers -- --refresh` before making a launch decision.");
    console.log("");
  }
  if (summary.refresh.attempted && !summary.refresh.reportUpdated) {
    console.log("> Live evidence refresh did not update `docs/splus-service-watch.md`; treat this as blocked until the refresh command writes a new report.");
    console.log("");
  }
  if (!summary.releaseBlocked) {
    console.log("No launch blockers are recorded in the latest service watch report.");
    return;
  }
  console.log("## Blocking Checks");
  console.log("");
  for (const check of summary.failedChecks) {
    console.log(`- ${check.id}: ${compact(check.detail)}`);
  }
  if (summary.skippedChecks.length) {
    console.log("");
    console.log("Skipped until blockers clear:");
    for (const check of summary.skippedChecks) console.log(`- ${check.id}: ${compact(check.detail, 120)}`);
  }
  console.log("");
  console.log("## Required Actions");
  console.log("");
  for (let index = 0; index < summary.requiredActions.length; index += 1) {
    const action = summary.requiredActions[index];
    console.log(`${index + 1}. ${action.id} (${action.owner || "operator"})`);
    console.log(`   Action: ${action.action}`);
    console.log(`   Verify: ${action.verify}`);
    if (action.reference && action.reference !== "-") console.log(`   Reference: ${action.reference}`);
  }
  console.log("");
  console.log("## Helper Commands");
  console.log("");
  for (const command of summary.helperCommands) console.log(`- ${command}`);
}

function printLaunchApplyInputs(plan) {
  if (!plan?.ok) {
    console.log(`- Could not read launch apply dry-run: ${compact(plan?.error || "unknown error")}`);
    console.log("- Run `pnpm launch:apply` directly.");
    return;
  }
  console.log(`- Mode: \`${plan.mode || "unknown"}\``);
  console.log(`- Required env: ${(plan.requiredEnv || []).length ? plan.requiredEnv.map((item) => `\`${item}\``).join(", ") : "(none)"}`);
  console.log("");
  console.log("| ID | Required | Status | Env |");
  console.log("|---|---|---|---|");
  for (const input of plan.operatorInputs || []) {
    const required = input.requiredMode === "one_of" ? "one_of" : input.required ? "yes" : "no";
    const env = [...(input.env || []), ...(input.alternatives || []).map((item) => `alt:${item}`)].join("<br>") || "-";
    console.log(`| ${input.id || ""} | ${required} | ${input.status || ""} | ${env} |`);
  }
}

function runLaunchApplyPlan(...extraArgs) {
  const result = spawnSync("node", ["scripts/launch-apply.mjs", "--", ...extraArgs, "--json"], {
    cwd,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024
  });
  if (result.error) return { ok: false, error: result.error.message };
  if (result.status !== 0) return { ok: false, error: compact(result.stderr || result.stdout || `exit ${result.status}`) };
  try {
    const data = JSON.parse(result.stdout);
    return {
      ok: data.ok !== false,
      mode: data.mode,
      requiredEnv: data.requiredEnv || [],
      operatorInputs: data.operatorInputs || [],
      derivedTargets: data.derivedTargets || {},
      targetSource: data.targetSource || {},
      tokenState: data.tokenState || {}
    };
  } catch (error) {
    return { ok: false, error: `invalid JSON output: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function compact(value, maxLength = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function refreshServiceWatch() {
  const beforeLastChecked = existsSync(reportPath) ? parseLastChecked(readFileSync(reportPath, "utf8")) : null;
  const result = spawnSync("pnpm", ["service:watch:visual"], {
    cwd,
    env: {
      ...process.env,
      MUSUNIL_WEB_BASE_URL: process.env.MUSUNIL_WEB_BASE_URL || "https://musunil.com",
      MUSUNIL_API_BASE_URL: process.env.MUSUNIL_API_BASE_URL || "https://api.musunil.com",
      MUSUNIL_EXPECTED_API_BASE_URL: process.env.MUSUNIL_EXPECTED_API_BASE_URL || "https://api.musunil.com"
    },
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024
  });
  if (result.error) {
    console.error(`Could not refresh service watch: ${result.error.message}`);
  }
  return {
    attempted: true,
    command: "pnpm service:watch:visual",
    exitStatus: typeof result.status === "number" ? result.status : null,
    signal: result.signal ?? null,
    error: result.error?.message ?? null,
    beforeLastChecked
  };
}

function parseLastChecked(source) {
  return source.match(/^Last checked:\s*(.+)$/m)?.[1]?.trim() || null;
}

function reportFreshness(lastChecked) {
  const staleAfterMinutes = Number(process.env.MUSUNIL_LAUNCH_BLOCKERS_STALE_AFTER_MINUTES ?? 15);
  if (!lastChecked) return { ageMinutes: null, staleAfterMinutes, stale: true };
  const timestamp = Date.parse(lastChecked);
  if (!Number.isFinite(timestamp)) return { ageMinutes: null, staleAfterMinutes, stale: true };
  const ageMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  return { ageMinutes, staleAfterMinutes, stale: ageMinutes > staleAfterMinutes };
}
