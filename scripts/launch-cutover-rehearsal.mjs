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

const summary = buildSummary({ blockers, cutoverPlan, finalGatePlan });

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
    nextOperatorCommand: nextOperatorCommand(stage, requiredActions),
    cutover: {
      domains: cutoverData.domains || { web: "https://musunil.com", api: "https://api.musunil.com" },
      renderStaticSite: cutoverData.renderStaticSite || null,
      renderApiService: cutoverData.renderApiService || null,
      cloudflareDns: cutoverData.cloudflareDns || [],
      userInputPriority: cutoverData.userInputPriority || [],
      verificationOrder: cutoverData.verificationOrder || [],
      successCriteria: cutoverData.successCriteria || []
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

function nextOperatorCommand(stage, actions) {
  if (stage === "refresh_live_evidence") return "pnpm launch:cutover-rehearsal -- --refresh";
  if (stage === "connect_api_endpoint") return "pnpm render:api-settings && pnpm cloudflare:dns && pnpm cloudflare:check";
  if (stage === "apply_static_headers") {
    return "pnpm render:web-settings && pnpm cloudflare:headers && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy";
  }
  if (stage === "publish_build_metadata") {
    return "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy";
  }
  if (stage === "restore_live_issue_sync") return "pnpm launch:final-gate";
  if (actions[0]?.verify) return actions[0].verify;
  if (stage === "ready_for_final_gate") return "pnpm launch:final-gate";
  return "pnpm launch:blockers -- --refresh";
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
  console.log(`Next command: \`${value.nextOperatorCommand}\``);
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
