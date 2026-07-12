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
    nextOperatorCommand: nextCommandForStage(blockerStage, actions),
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
      "pnpm render:api-settings",
      "pnpm render:web-settings",
      "pnpm cloudflare:dns",
      "pnpm cloudflare:headers",
      "pnpm cloudflare:check",
      "pnpm cloudflare:check:strict",
      "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      "MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      "pnpm launch:post-deploy-smoke -- --require-laws",
      "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm service:watch:visual",
      "pnpm launch:final-gate"
    ]
  };
}

function determineBlockerStage({ refreshFailed, freshness, status, failed, skipped, actions, releaseBlocked }) {
  if (refreshFailed) return "refresh_live_evidence_failed";
  if (freshness.stale) return "refresh_live_evidence";
  const actionIds = new Set(actions.map((action) => action.id));
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

function nextCommandForStage(stage, actions) {
  if (stage === "refresh_live_evidence" || stage === "refresh_live_evidence_failed") return "pnpm launch:blockers -- --refresh";
  if (stage === "connect_api_endpoint") return "pnpm render:api-settings && pnpm cloudflare:dns && pnpm cloudflare:check";
  if (stage === "apply_static_headers") {
    return "pnpm render:web-settings && pnpm cloudflare:headers && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy";
  }
  if (stage === "publish_build_metadata") {
    return "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy";
  }
  if (stage === "restore_live_issue_sync" || stage === "restore_issue_first_data" || stage === "fix_api_readiness") return "pnpm launch:final-gate";
  if (actions[0]?.verify) return actions[0].verify;
  if (stage === "ready_for_final_gate") return "pnpm launch:final-gate";
  return "pnpm launch:blockers -- --refresh";
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
  console.log(`Next command: \`${summary.nextOperatorCommand}\``);
  console.log("");
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
