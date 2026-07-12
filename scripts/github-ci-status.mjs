import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const requireSuccess = args.includes("--require-success");
const options = parseOptions(args.filter((arg) => arg !== "--json" && arg !== "--require-success"));

const plan = buildPlan(options);
const result = readCiStatus(plan);
const ok = result.run ? result.run.status === "completed" && result.run.conclusion === "success" : false;
const payload = {
  checked: "github_ci_status",
  ok: requireSuccess ? ok : result.ghAvailable && Boolean(result.run),
  repo: plan.repo,
  branch: plan.branch,
  commit: plan.commit,
  workflow: plan.workflow,
  run: result.run,
  listCommand: result.listCommand,
  watchCommand: result.watchCommand,
  notes: result.notes,
  error: result.error
};

if (json) {
  console[payload.ok ? "log" : "error"](JSON.stringify(payload, null, 2));
  if (requireSuccess && !ok) process.exit(1);
  process.exit(result.ghAvailable ? 0 : 1);
}

console.log(renderText(payload));
if (requireSuccess && !ok) process.exit(1);
if (!result.ghAvailable) process.exit(1);

function buildPlan(options) {
  return {
    repo: options.repo || process.env.MUSUNIL_GITHUB_REPO || inferGitHubRepo() || "whydothey/musunil",
    branch: options.branch || process.env.MUSUNIL_GITHUB_REF || gitBranch() || "main",
    commit: options.commit || process.env.MUSUNIL_EXPECTED_COMMIT_SHA || gitHead(),
    workflow: options.workflow || process.env.MUSUNIL_GITHUB_CI_WORKFLOW || "ci.yml"
  };
}

function readCiStatus(plan) {
  const listArgs = [
    "run", "list",
    "--repo", plan.repo,
    "--workflow", plan.workflow,
    "--branch", plan.branch,
    "--commit", plan.commit,
    "--limit", "3",
    "--json", "databaseId,status,conclusion,displayTitle,headSha,event,createdAt,url"
  ];
  const listCommand = shellJoin(["gh", ...listArgs]);
  const list = spawnSync("gh", listArgs, { cwd: process.cwd(), encoding: "utf8" });
  if (list.error && list.error.code === "ENOENT") {
    return {
      ghAvailable: false,
      run: undefined,
      listCommand,
      watchCommand: "",
      notes: ["Install and authenticate GitHub CLI (`gh`) to inspect remote CI status locally."],
      error: "gh_not_available"
    };
  }
  if (list.status !== 0) {
    return {
      ghAvailable: true,
      run: undefined,
      listCommand,
      watchCommand: "",
      notes: ["GitHub CLI returned a non-zero status. Run the list command directly to inspect auth or network errors."],
      error: list.stderr.trim() || `gh exited with status ${list.status}`
    };
  }

  const runs = JSON.parse(list.stdout || "[]");
  const run = runs.find((candidate) => candidate.headSha === plan.commit) || runs[0];
  const watchCommand = run ? shellJoin(["gh", "run", "watch", "--repo", plan.repo, String(run.databaseId), "--exit-status"]) : "";
  const notes = [];
  if (!run) {
    notes.push("No CI run was found for this branch/commit/workflow yet. Confirm the commit was pushed to GitHub and Actions are enabled.");
  } else if (run.status === "queued") {
    notes.push("Queued means GitHub has accepted the workflow but has not assigned a runner yet. This is not a code failure by itself.");
  } else if (run.status === "in_progress") {
    notes.push("The workflow is running. Use the watch command to stream the result.");
  } else if (run.status === "completed" && run.conclusion === "success") {
    notes.push("The latest matching CI run passed.");
  } else if (run.status === "completed") {
    notes.push("The latest matching CI run completed without success. Inspect the run before deploying.");
  }
  return {
    ghAvailable: true,
    run,
    listCommand,
    watchCommand,
    notes,
    error: ""
  };
}

function renderText(payload) {
  const lines = [
    "# GitHub CI Status",
    "",
    `Repo: ${payload.repo}`,
    `Workflow: ${payload.workflow}`,
    `Branch: ${payload.branch}`,
    `Commit: ${payload.commit}`,
    ""
  ];
  if (!payload.run) {
    lines.push("Run: not found");
  } else {
    lines.push(
      `Run: ${payload.run.databaseId}`,
      `Title: ${payload.run.displayTitle}`,
      `Status: ${payload.run.status}`,
      `Conclusion: ${payload.run.conclusion || "pending"}`,
      `Created: ${payload.run.createdAt}`,
      `URL: ${payload.run.url || ""}`
    );
  }
  lines.push("", "Commands:", `- List: ${payload.listCommand}`);
  if (payload.watchCommand) lines.push(`- Watch: ${payload.watchCommand}`);
  if (payload.error) lines.push("", `Error: ${payload.error}`);
  if (payload.notes.length) lines.push("", "Notes:", ...payload.notes.map((note) => `- ${note}`));
  return lines.join("\n");
}

function parseOptions(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const arg = values[index];
    const [rawKey, inlineValue] = arg.startsWith("--") ? arg.slice(2).split("=", 2) : ["", ""];
    if (!rawKey) continue;
    const value = inlineValue ?? values[index + 1] ?? "";
    if (inlineValue === undefined) index += 1;
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    parsed[key] = value;
  }
  return parsed;
}

function gitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function gitBranch() {
  const result = spawnSync("git", ["branch", "--show-current"], { cwd: process.cwd(), encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : "main";
}

function inferGitHubRepo() {
  const result = spawnSync("git", ["config", "--get", "remote.origin.url"], { cwd: process.cwd(), encoding: "utf8" });
  if (result.status !== 0) return "";
  const remote = result.stdout.trim();
  const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
  return match?.[1] || "";
}

function shellJoin(values) {
  return values.map(shellQuote).join(" ");
}

function shellQuote(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:=@-]*$/.test(text)) return text;
  return `'${text.replace(/'/g, "'\\''")}'`;
}
