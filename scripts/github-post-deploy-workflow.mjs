import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const check = args.includes("--check");
const options = parseOptions(args.filter((arg) => arg !== "--json" && arg !== "--check"));
const plan = buildPlan(options, process.env);
const issues = validatePlan(plan);

if (json || check) {
  const payload = {
    checked: "github_post_deploy_workflow_command",
    ok: issues.length === 0,
    workflow: plan.workflow,
    repo: plan.repo,
    ref: plan.ref,
    inputs: plan.inputs,
    shellCommand: plan.shellCommand,
    listRunCommand: plan.listRunCommand,
    watchCommand: plan.watchCommand,
    notes: plan.notes,
    issues
  };
  console[issues.length === 0 ? "log" : "error"](JSON.stringify(payload, null, 2));
  if (check && issues.length > 0) process.exit(1);
  process.exit(0);
}

console.log([
  "# GitHub Post-Deploy Workflow Command",
  "",
  `Workflow: ${plan.workflow}`,
  `Mode: ${plan.inputs.verification_mode}`,
  `GitHub environment: ${plan.inputs.github_environment}`,
  `Expected deploy SHA: ${plan.inputs.expected_commit_sha}`,
  "",
  "Run after Render deploy finishes:",
  "",
  plan.shellCommand,
  "",
  "Then watch the matching workflow_dispatch run:",
  "",
  plan.watchCommand,
  "",
  "Notes:",
  ...plan.notes.map((note) => `- ${note}`)
].join("\n"));

function buildPlan(options, env) {
  const workflow = "post-deploy.yml";
  const repo = options.repo || env.MUSUNIL_GITHUB_REPO || inferGitHubRepo() || "whydothey/musunil";
  const ref = options.ref || env.MUSUNIL_GITHUB_REF || gitBranch() || "main";
  const inputs = {
    verification_mode: normalizeMode(options.mode || env.MUSUNIL_POST_DEPLOY_MODE || "final-gate"),
    web_base_url: deployedHttpsUrl(options.webBaseUrl || env.MUSUNIL_WEB_BASE_URL || "https://musunil.com"),
    api_base_url: deployedHttpsUrl(options.apiBaseUrl || env.MUSUNIL_API_BASE_URL || "https://api.musunil.com"),
    expected_api_base_url: deployedHttpsUrl(
      options.expectedApiBaseUrl || env.MUSUNIL_EXPECTED_API_BASE_URL || env.MUSUNIL_API_BASE_URL || "https://api.musunil.com"
    ),
    expected_commit_sha: options.expectedCommitSha || env.MUSUNIL_EXPECTED_COMMIT_SHA || gitHead(),
    render_api_dns_target: normalizeRenderTarget(options.renderApiDnsTarget || env.MUSUNIL_RENDER_API_DNS_TARGET || ""),
    github_environment: options.githubEnvironment || env.MUSUNIL_GITHUB_ENVIRONMENT || "production"
  };

  const ghArgs = [
    "gh", "workflow", "run", workflow,
    "--repo", repo,
    "--ref", ref,
    ...Object.entries(inputs).flatMap(([key, value]) => ["-f", `${key}=${value}`])
  ];
  const listRunCommand = shellJoin([
    "gh", "run", "list",
    "--repo", repo,
    "--workflow", workflow,
    "--branch", ref,
    "--event", "workflow_dispatch",
    "--commit", inputs.expected_commit_sha,
    "--limit", "1",
    "--json", "databaseId",
    "--jq", ".[0].databaseId // \"\""
  ]);
  const watchCommand = [
    `run_id=$(${listRunCommand})`,
    'test -n "$run_id"',
    shellJoin(["gh", "run", "watch", "--repo", repo, "$run_id", "--exit-status"])
  ].join(" && ");
  return {
    workflow,
    repo,
    ref,
    inputs,
    shellCommand: shellJoin(ghArgs),
    listRunCommand,
    watchCommand,
    notes: [
      "This command passes only workflow inputs. It does not print or pass secret values on the CLI.",
      "For final-gate, keep github_environment=production unless you intentionally store secrets at repository level only.",
      "If GitHub cannot read RENDER_API_TOKEN or MUSUNIL_RENDER_API_TOKEN, fill render_api_dns_target with the Render api.musunil.com DNS target hostname.",
      "Set expected_commit_sha to the Git SHA deployed by Render, not an old handoff document value.",
      "The watch command resolves the workflow_dispatch run id by workflow, branch, and expected_commit_sha before watching it."
    ]
  };
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

function validatePlan(plan) {
  const issues = [];
  if (!["final-gate", "web-deploy"].includes(plan.inputs.verification_mode)) {
    issues.push(`verification_mode must be final-gate or web-deploy, got ${plan.inputs.verification_mode}`);
  }
  for (const key of ["web_base_url", "api_base_url", "expected_api_base_url"]) {
    if (!/^https:\/\//.test(plan.inputs[key])) issues.push(`${key} must be an https URL`);
  }
  if (!/^[a-f0-9]{40}$/i.test(plan.inputs.expected_commit_sha)) {
    issues.push("expected_commit_sha must be a 40-character Git SHA");
  }
  if (!plan.inputs.github_environment) issues.push("github_environment must be set");
  if (plan.inputs.render_api_dns_target && /[:/]/.test(plan.inputs.render_api_dns_target)) {
    issues.push("render_api_dns_target must be a hostname only");
  }
  for (const required of ["verification_mode", "web_base_url", "api_base_url", "expected_api_base_url", "expected_commit_sha", "render_api_dns_target", "github_environment"]) {
    if (!plan.shellCommand.includes(`${required}=`)) issues.push(`shell command is missing ${required}`);
  }
  for (const required of ["--workflow", "post-deploy.yml", "--event", "workflow_dispatch", "--branch", plan.ref, "--commit", plan.inputs.expected_commit_sha]) {
    if (!plan.watchCommand.includes(required)) issues.push(`watch command is missing ${required}`);
  }
  if (!/gh run watch .*\$run_id.*--exit-status/.test(plan.watchCommand)) {
    issues.push("watch command must resolve and watch a specific workflow run id");
  }
  return issues;
}

function normalizeMode(value) {
  return value === "web-deploy" ? "web-deploy" : "final-gate";
}

function deployedHttpsUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error(`${value} must use https`);
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function normalizeRenderTarget(value) {
  return String(value || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
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
  if (text === "$run_id") return text;
  if (/^[A-Za-z0-9_./:=@-]*$/.test(text)) return text;
  return `'${text.replace(/'/g, "'\\''")}'`;
}
