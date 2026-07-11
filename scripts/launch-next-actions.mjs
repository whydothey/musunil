import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const refresh = args.includes("--refresh");
const cwd = resolve(import.meta.dirname, "..");
const reportPath = resolve(cwd, "docs/splus-service-watch.md");

if (refresh) {
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
const summary = parseReport(report);

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  printMarkdown(summary);
}

function parseReport(source) {
  const lastChecked = source.match(/^Last checked:\s*(.+)$/m)?.[1]?.trim() || null;
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
  return {
    checked: "launch_next_actions",
    lastChecked,
    status,
    releaseBlocked: status !== "S+ Guard" || failed.length > 0 || actions.length > 0,
    passCount: ok.length,
    failCount: failed.length,
    skipCount: skipped.length,
    failedChecks: failed,
    skippedChecks: skipped,
    requiredActions: actions,
    helperCommands: [
      "pnpm launch:blockers -- --refresh",
      "pnpm render:api-settings",
      "pnpm render:web-settings",
      "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      "MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
      "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm launch:post-deploy-smoke -- --require-laws",
      "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm service:watch:visual"
    ]
  };
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
  console.log(`Status: ${summary.status}`);
  console.log(`Checks: ${summary.passCount} ok, ${summary.failCount} fail, ${summary.skipCount} skip`);
  console.log("");
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
