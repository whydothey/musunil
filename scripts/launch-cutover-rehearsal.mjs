import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const refresh = args.includes("--refresh");
const strict = args.includes("--strict") || args.includes("--fail-on-blockers");

const blockers = runJson("launch:blockers", [
  "scripts/launch-next-actions.mjs",
  "--",
  "--json",
  ...(refresh ? ["--refresh"] : [])
]);
const cutoverPlan = runJson("launch:cutover-plan", ["scripts/launch-cutover-plan.mjs", "--", "--json"]);
const finalGatePlan = runJson("launch:final-gate --list", ["scripts/launch-final-gate.mjs", "--", "--list"]);
const launchReadyPlan = runJson("launch:ready --list", ["scripts/launch-ready.mjs", "--", "--list"]);
const externalSmokePlan = runJson("launch:external-smoke --list", ["scripts/external-smoke.mjs", "--", "--list"]);

const summary = buildSummary({ blockers, cutoverPlan, finalGatePlan, launchReadyPlan, externalSmokePlan });

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printMarkdown(summary);
}

if (strict && summary.releaseBlocked) {
  console.error("Cutover rehearsal is still blocked. Clear the current stage before launch.");
  process.exitCode = 1;
}

function runJson(label, commandArgs) {
  const result = spawnSync("node", commandArgs, {
    cwd,
    env: process.env,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  if (result.error) {
    return { ok: false, label, command: ["node", ...commandArgs].join(" "), error: result.error.message };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      label,
      command: ["node", ...commandArgs].join(" "),
      status: result.status,
      stderr: compact(result.stderr, 1000),
      stdout: compact(result.stdout, 1000)
    };
  }
  try {
    return {
      ok: true,
      label,
      command: ["node", ...commandArgs].join(" "),
      data: JSON.parse(result.stdout)
    };
  } catch (error) {
    return {
      ok: false,
      label,
      command: ["node", ...commandArgs].join(" "),
      error: `invalid JSON output: ${error instanceof Error ? error.message : String(error)}`,
      stdout: compact(result.stdout, 1000)
    };
  }
}

function buildSummary(results) {
  const blockersData = results.blockers.data || {};
  const cutoverData = results.cutoverPlan.data || {};
  const finalGateData = results.finalGatePlan.data || {};
  const helperFailures = Object.values(results).filter((result) => !result.ok);
  const failedChecks = blockersData.failedChecks || [];
  const skippedChecks = blockersData.skippedChecks || [];
  const requiredActions = prioritizeActions(blockersData.requiredActions || []);
  const launchApplyPlan = blockersData.launchApply || {};
  const releaseBlocked = helperFailures.length > 0 || Boolean(blockersData.releaseBlocked);
  const stage = determineStage({ helperFailures, blockersData, requiredActions, skippedChecks });

  return {
    checked: "launch_cutover_rehearsal",
    generatedAt: new Date().toISOString(),
    refreshAttempted: refresh,
    strict,
    goalState: blockersData.goalState || "active",
    launchState: blockersData.launchState || (releaseBlocked ? "blocked" : "ready_for_final_gate"),
    releaseBlocked,
    stage,
    report: {
      lastChecked: blockersData.lastChecked || null,
      stale: Boolean(blockersData.stale),
      reportAgeMinutes: blockersData.reportAgeMinutes ?? null,
      staleAfterMinutes: blockersData.staleAfterMinutes ?? null,
      status: blockersData.status || "unknown"
    },
    counts: {
      pass: blockersData.passCount ?? 0,
      fail: blockersData.failCount ?? failedChecks.length,
      skip: blockersData.skipCount ?? skippedChecks.length,
      requiredActions: requiredActions.length
    },
    helperFailures,
    failedChecks: failedChecks.map(slimCheck),
    skippedChecks: skippedChecks.map(slimCheck),
    requiredActions,
    launchApplyInputsReady: launchApplyInputsReady(launchApplyPlan),
    requiredLaunchInputsMissing: requiredLaunchInputsMissing(launchApplyPlan),
    splitApplyPaths: blockersData.splitApplyPaths || [],
    nextOperatorPrerequisite: blockersData.nextOperatorPrerequisite || nextOperatorPrerequisite(stage, launchApplyPlan),
    nextOperatorCommand: blockersData.nextOperatorCommand || nextOperatorCommand(stage, requiredActions, launchApplyPlan),
    nextOperatorCommandScope: blockersData.nextOperatorCommandScope || commandScopeForStage(stage, launchApplyPlan),
    nextApplyCommand: blockersData.nextApplyCommand || nextApplyCommandForStage(stage, launchApplyPlan),
    cutover: {
      domains: cutoverData.domains || { web: "https://musunil.com", api: "https://api.musunil.com" },
      renderStaticSite: cutoverData.renderStaticSite || null,
      renderApiService: cutoverData.renderApiService || null,
      cloudflareDns: cutoverData.cloudflareDns || [],
      userInputPriority: cutoverData.userInputPriority || [],
      verificationOrder: cutoverData.verificationOrder || [],
      successCriteria: cutoverData.successCriteria || []
    },
    launchReady: {
      inputPath: results.launchReadyPlan.data?.inputPath || "config/musunil.user-inputs.local.yaml",
      steps: results.launchReadyPlan.data?.steps || []
    },
    externalSmoke: {
      steps: results.externalSmokePlan.data?.steps || []
    },
    finalGate: {
      env: finalGateData.env || null,
      steps: finalGateData.steps || []
    }
  };
}

function determineStage({ helperFailures, blockersData, requiredActions, skippedChecks }) {
  if (helperFailures.length > 0) return "helper_failure";
  if (blockersData.stale) return "refresh_live_evidence";
  const actionIds = new Set(requiredActions.map((action) => action.id));
  if (actionIds.has("deploy_latest_static")) return "deploy_latest_static";
  if (actionIds.has("connect_api_endpoint") || actionIds.has("connect_api_dns")) return "connect_api_endpoint";
  if (actionIds.has("apply_static_headers")) return "apply_static_headers";
  if (actionIds.has("publish_build_metadata")) return "publish_build_metadata";
  if (actionIds.has("stop_live_visual_surface_regression")) return "restore_live_issue_sync";
  if (skippedChecks.length > 0) return "clear_skipped_checks";
  if (blockersData.releaseBlocked) return "clear_remaining_blockers";
  return "ready_for_final_gate";
}

function prioritizeActions(actions) {
  const order = [
    "deploy_latest_static",
    "connect_api_endpoint",
    "connect_api_dns",
    "apply_static_headers",
    "publish_build_metadata",
    "stop_live_visual_surface_regression",
    "fix_api_runtime",
    "fix_web_config",
    "connect_web_dns"
  ];
  return [...actions]
    .sort((left, right) => actionRank(left.id, order) - actionRank(right.id, order))
    .map((action, index) => ({
      order: index + 1,
      id: action.id,
      owner: action.owner || "operator",
      action: action.action || "",
      verify: action.verify || "",
      reference: action.reference || ""
    }));
}

function actionRank(id, order) {
  const index = order.indexOf(id);
  return index === -1 ? order.length : index;
}

function slimCheck(check) {
  return {
    id: check.id,
    result: check.result,
    detail: compact(check.detail || check.message || "", 320)
  };
}

function nextOperatorCommand(stage, actions, launchApplyPlan) {
  if (stage === "refresh_live_evidence") return "pnpm launch:cutover-rehearsal -- --refresh";
  if (stage === "deploy_latest_static") {
    return "pnpm check:web-render-build-command && pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy";
  }
  if (stage === "connect_api_endpoint") {
    if (!launchApplyInputsReady(launchApplyPlan)) return "pnpm launch:apply";
    return "pnpm launch:apply -- --apply && pnpm launch:final-gate";
  }
  if (stage === "apply_static_headers") {
    if (!launchApplyInputsReady(launchApplyPlan)) return "pnpm launch:apply -- --cloudflare-headers-only";
    return "pnpm launch:apply -- --apply --cloudflare-headers-only && pnpm launch:final-gate";
  }
  if (stage === "publish_build_metadata") {
    return "pnpm check:web-render-build-command && pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy";
  }
  if (stage === "restore_live_issue_sync") return "pnpm launch:final-gate";
  if (actions[0]?.verify) return actions[0].verify;
  if (stage === "ready_for_final_gate") return "pnpm launch:final-gate";
  return "pnpm launch:blockers -- --refresh";
}

function commandScopeForStage(stage, launchApplyPlan, command = "") {
  if ((stage === "connect_api_endpoint" || stage === "apply_static_headers") && !launchApplyInputsReady(launchApplyPlan)) return "dry_run_only";
  if (/--apply/.test(command)) return "apply";
  if (/final-gate|check:web-deploy|cloudflare:check|service:watch/.test(command)) return "verify";
  return "diagnostic";
}

function nextApplyCommandForStage(stage, launchApplyPlan) {
  if (stage === "connect_api_endpoint" && !launchApplyInputsReady(launchApplyPlan)) return "pnpm launch:apply -- --apply";
  if (stage === "apply_static_headers" && !launchApplyInputsReady(launchApplyPlan)) return "pnpm launch:apply -- --apply --cloudflare-headers-only";
  return "";
}

function nextOperatorPrerequisite(stage, launchApplyPlan = null) {
  if (stage === "deploy_latest_static") {
    return "`pnpm check:web-render-build-command`로 Render 전용 build contract가 로컬에서 통과하는지 먼저 확인한다. 이후 Render musunil-web가 현재 main 커밋을 배포했는지 확인한다. live static manifest가 local manifest와 다르면 Clear build cache & deploy를 실행하고 완료 후 다시 검증한다.";
  }
  if (stage === "connect_api_endpoint") {
    if (!launchApplyInputsReady(launchApplyPlan)) {
      return "먼저 `pnpm launch:apply` dry-run의 `requiredEnv`와 `operatorInputs`를 채운다. 필수 입력이 비어 있으면 실제 적용과 `pnpm launch:final-gate`를 다음 단계로 안내하지 않는다.";
    }
    return "Render API token과 Cloudflare token이 있으면 `pnpm launch:apply -- --apply`가 api.musunil.com custom domain 생성, Render onrender.com target 파생, Cloudflare DNS 적용을 한 번에 처리한다. token이 없으면 dry-run 출력의 requiredEnv만 채우고, 하위 확인은 `pnpm render:api-settings`와 `pnpm cloudflare:dns`를 사용한다.";
  }
  if (stage === "apply_static_headers") {
    if (!launchApplyInputsReady(launchApplyPlan)) {
      return "먼저 `pnpm launch:apply -- --cloudflare-headers-only` dry-run으로 Web header 적용에 필요한 Cloudflare 입력을 확인한다. 필수 입력이 비어 있으면 `pnpm launch:final-gate`를 다음 단계로 안내하지 않는다.";
    }
    return "Render API token이 있으면 `pnpm launch:apply -- --apply --deploy-web`으로 musunil-web Headers를 적용하고 배포까지 요청한다. Render headers가 live에 계속 없거나 Render token 없이 Web header만 먼저 고치려면 `pnpm cloudflare:check`에서 `web_proxy_mode.proxyObserved=true`를 확인한 뒤 `pnpm launch:apply -- --apply --cloudflare-headers-only`로 Web 전용 Cloudflare fallback을 추가한다.";
  }
  if (stage === "publish_build_metadata") {
    return "`pnpm check:web-render-build-command`로 Render 전용 build contract를 먼저 검증한다. 이후 Render musunil-web Build Command가 pnpm build:web-static:render인지 확인하고 Clear build cache & deploy 뒤 build-info를 다시 검증한다.";
  }
  if (stage === "restore_live_issue_sync") {
    return "Web config.js가 https://api.musunil.com을 보고 있고 api.musunil.com /health, /ready가 응답하는 상태에서 live issue sync를 검증한다.";
  }
  return "";
}

function launchApplyInputsReady(plan) {
  return !requiredLaunchInputsMissing(plan);
}

function requiredLaunchInputsMissing(plan) {
  if (!plan?.ok) return true;
  if ((plan.requiredEnv || []).length > 0) return true;
  return (plan.operatorInputs || []).some((input) => {
    const required = input.required || input.requiredMode === "one_of";
    return required && /missing|invalid|placeholder/i.test(input.status || "");
  });
}

function printMarkdown(value) {
  console.log("# Musunil Launch Cutover Rehearsal");
  console.log("");
  console.log(`Generated: ${value.generatedAt}`);
  console.log(`Active goal: ${value.goalState}`);
  console.log(`Launch readiness: ${value.launchState}`);
  console.log(`Stage: ${value.stage}`);
  console.log(`Release blocked: ${value.releaseBlocked ? "yes" : "no"}`);
  console.log(`Service watch: ${value.report.lastChecked || "unknown"} (${value.report.stale ? "stale" : "fresh"})`);
  console.log(`Checks: ${value.counts.pass} ok, ${value.counts.fail} fail, ${value.counts.skip} skip, ${value.counts.requiredActions} actions`);
  console.log("");
  if (value.nextOperatorPrerequisite) {
    const label = value.nextOperatorCommandScope === "dry_run_only" ? "Before apply command" : "Before next command";
    console.log(`${label}: ${value.nextOperatorPrerequisite}`);
  }
  if (value.nextOperatorCommandScope === "dry_run_only") {
    console.log(`Immediate safe command: \`${value.nextOperatorCommand}\``);
    if (value.nextApplyCommand) console.log(`Apply command after inputs: \`${value.nextApplyCommand}\``);
  } else {
    console.log(`Next command: \`${value.nextOperatorCommand}\``);
  }
  console.log("");

  if (value.helperFailures.length > 0) {
    console.log("## Helper Failures");
    console.log("");
    for (const failure of value.helperFailures) console.log(`- ${failure.label}: ${failure.error || failure.stderr || `exit ${failure.status}`}`);
    console.log("");
  }

  if (value.failedChecks.length > 0) {
    console.log("## Blocking Checks");
    console.log("");
    for (const check of value.failedChecks) console.log(`- ${check.id}: ${check.detail}`);
    console.log("");
  }

  if (value.skippedChecks.length > 0) {
    console.log("## Skipped Until Blockers Clear");
    console.log("");
    for (const check of value.skippedChecks) console.log(`- ${check.id}: ${check.detail}`);
    console.log("");
  }

  if (value.requiredActions.length > 0) {
    console.log("## Ordered Operator Actions");
    console.log("");
    for (const action of value.requiredActions) {
      console.log(`${action.order}. ${action.id} (${action.owner})`);
      console.log(`   Action: ${action.action}`);
      console.log(`   Verify: ${action.verify}`);
      if (action.reference && action.reference !== "-") console.log(`   Reference: ${action.reference}`);
    }
    console.log("");
  }

  if (value.splitApplyPaths.length > 0) {
    console.log("## Split Apply Paths");
    console.log("");
    for (const path of value.splitApplyPaths) {
      console.log(`- ${path.id}: ${path.note}`);
      console.log(`  - Requires: ${(path.requires || []).map((item) => `\`${item}\``).join(", ")}`);
      console.log(`  - Inputs ready: ${path.inputsReady ? "yes" : "no"}`);
      if (!path.inputsReady && path.missingInputs?.length) console.log(`  - Missing: ${path.missingInputs.map((item) => `\`${item}\``).join(", ")}`);
      console.log(`  - Dry-run: \`${path.dryRun}\``);
      console.log(`  - Apply: \`${path.apply}\``);
      console.log(`  - Verify: \`${path.verify}\``);
    }
    console.log("");
  }

  console.log("## Launch Ready Plan");
  console.log("");
  console.log(`- Input file: \`${value.launchReady.inputPath}\``);
  for (const step of value.launchReady.steps) console.log(`- ${formatStep(step)}`);
  console.log("");

  console.log("## External Smoke Proofs");
  console.log("");
  for (const step of value.externalSmoke.steps) console.log(`- ${formatStep(step)}`);
  console.log("");

  console.log("## Final Gate Steps");
  console.log("");
  for (const step of value.finalGate.steps) console.log(`- ${step.id}: \`${step.command}\``);
  console.log("");

  console.log("## Success Criteria");
  console.log("");
  for (const item of value.cutover.successCriteria) console.log(`- ${item}`);
}

function compact(value, maxLength = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function formatStep(step) {
  const proof = step.proofMarker ? `, proof: \`${step.proofMarker}\`` : "";
  const proofContract = step.proofContract ? `, contract: ${step.proofContract}` : "";
  const forbidden = step.forbiddenMarker ? `, forbidden: \`${step.forbiddenMarker}\`` : "";
  return `${step.id}: \`${step.command}\`${proof}${proofContract}${forbidden}`;
}
