import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const apiBlock = renderServiceBlock(renderYaml, "musunil-api");

const envVars = readEnvVars(apiBlock);
const settings = {
  service: "musunil-api",
  type: readServiceType(apiBlock),
  runtime: readScalar(apiBlock, "runtime"),
  region: readScalar(apiBlock, "region"),
  plan: readScalar(apiBlock, "plan"),
  branch: "main",
  rootDirectory: "",
  buildCommand: readScalar(apiBlock, "buildCommand"),
  preDeployCommand: readScalar(apiBlock, "preDeployCommand"),
  startCommand: readScalar(apiBlock, "startCommand"),
  healthCheckPath: readScalar(apiBlock, "healthCheckPath"),
  maxShutdownDelaySeconds: readScalar(apiBlock, "maxShutdownDelaySeconds"),
  customDomain: "api.musunil.com",
  env: envVars,
  envSummary: {
    fixed: envVars.filter((item) => item.source === "fixed").map((item) => `${item.key}=${item.value}`),
    renderGenerated: envVars.filter((item) => item.source === "generated").map((item) => item.key),
    renderManaged: envVars.filter((item) => item.source === "managed").map((item) => `${item.key} <- ${item.from}`),
    operatorInput: envVars.filter((item) => item.source === "operator").map((item) => item.key)
  },
  cloudflareDns: {
    name: "api",
    type: "CNAME",
    target: "Render musunil-api custom-domain target shown in Render",
    targetEnv: "MUSUNIL_RENDER_API_DNS_TARGET",
    proxy: "DNS only until /health, /ready, CORS, media, and identity boundary smoke pass"
  },
  afterSave: [
    "Deploy musunil-api after MUSUNIL_USER_INPUTS_B64 and generated secrets are present.",
    "Attach api.musunil.com in Render Custom Domains and copy the Render target to Cloudflare DNS.",
    "export MUSUNIL_RENDER_API_DNS_TARGET=\"<Render musunil-api custom-domain target>\"",
    "pnpm cloudflare:dns",
    "pnpm cloudflare:check:strict",
    "pnpm launch:post-deploy-smoke -- --require-laws",
    "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com pnpm service:watch -- --once",
    "pnpm launch:final-gate"
  ]
};

const failures = [];
for (const key of ["buildCommand", "preDeployCommand", "startCommand", "healthCheckPath"]) {
  if (!settings[key]) failures.push(`musunil-api ${key} is missing`);
}
for (const key of ["NODE_VERSION", "MUSUNIL_RUNTIME_ENV", "MUSUNIL_INTERNAL_API_KEY", "MUSUNIL_USER_TOKEN_SECRET", "MUSUNIL_ENCRYPTION_KEY", "DATABASE_URL", "REDIS_URL", "MUSUNIL_USER_INPUTS_B64"]) {
  if (!envVars.some((item) => item.key === key)) failures.push(`musunil-api env var missing: ${key}`);
}
if (!settings.buildCommand.includes("pnpm launch:check")) failures.push("musunil-api buildCommand must run pnpm launch:check");
if (settings.healthCheckPath !== "/ready") failures.push("musunil-api healthCheckPath must be /ready");
if (settings.envSummary.operatorInput.length !== 1 || settings.envSummary.operatorInput[0] !== "MUSUNIL_USER_INPUTS_B64") {
  failures.push("musunil-api must require only MUSUNIL_USER_INPUTS_B64 as manual secret input in render.yaml");
}
if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(settings, null, 2));
} else {
  console.log("Render API Service settings for musunil-api");
  console.log("");
  console.log(`Branch: ${settings.branch}`);
  console.log("Root Directory: (blank)");
  console.log(`Runtime: ${settings.runtime}`);
  console.log(`Region: ${settings.region}`);
  console.log(`Plan: ${settings.plan}`);
  console.log(`Build Command: ${settings.buildCommand}`);
  console.log(`Pre Deploy Command: ${settings.preDeployCommand}`);
  console.log(`Start Command: ${settings.startCommand}`);
  console.log(`Health Check Path: ${settings.healthCheckPath}`);
  console.log(`Max Shutdown Delay Seconds: ${settings.maxShutdownDelaySeconds}`);
  console.log("");
  console.log("Environment variables:");
  console.log("- Fixed:");
  for (const item of settings.envSummary.fixed) console.log(`  - ${item}`);
  console.log("- Render generated:");
  for (const item of settings.envSummary.renderGenerated) console.log(`  - ${item}`);
  console.log("- Render managed:");
  for (const item of settings.envSummary.renderManaged) console.log(`  - ${item}`);
  console.log("- Operator input:");
  for (const item of settings.envSummary.operatorInput) console.log(`  - ${item}`);
  console.log("");
  console.log("Custom domain and Cloudflare:");
  console.log(`- Render Custom Domain: ${settings.customDomain}`);
  console.log(`- Cloudflare DNS: ${settings.cloudflareDns.name} ${settings.cloudflareDns.type} -> ${settings.cloudflareDns.target}`);
  console.log(`- Exact target env: ${settings.cloudflareDns.targetEnv}`);
  console.log(`- Proxy: ${settings.cloudflareDns.proxy}`);
  console.log("- DNS/edge preflight: pnpm cloudflare:check:strict");
  console.log("");
  console.log("After saving:");
  for (const step of settings.afterSave) console.log(`- ${step}`);
}

function renderServiceBlock(source, name) {
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const start = lines[index].match(/^(\s*)-\s+type:\s+/);
    if (!start) continue;
    const indent = start[1].length;
    const preview = lines.slice(index, index + 8).join("\n");
    if (!new RegExp(`^\\s+name:\\s+${escapeRegExp(name)}\\b`, "m").test(preview)) continue;
    let end = index + 1;
    const nextService = new RegExp(`^\\s{${indent}}-\\s+type:\\s+`);
    while (end < lines.length && !nextService.test(lines[end]) && !/^databases:/.test(lines[end])) end += 1;
    return lines.slice(index, end).join("\n");
  }
  throw new Error(`render.yaml service block not found: ${name}`);
}

function readScalar(block, key) {
  const match = block.match(new RegExp(`^\\s*${escapeRegExp(key)}:\\s*(.+)$`, "m"));
  return match ? stripQuotes(match[1].trim()) : "";
}

function readServiceType(block) {
  const match = block.match(/^\s*-\s+type:\s*(.+)$/m);
  return match ? stripQuotes(match[1].trim()) : "";
}

function readEnvVars(block) {
  const lines = block.split("\n");
  const envIndex = lines.findIndex((line) => /^\s*envVars:\s*$/.test(line));
  if (envIndex < 0) return [];
  const envIndent = lines[envIndex].match(/^(\s*)/)?.[1].length || 0;
  const entries = [];
  let current;
  for (let index = envIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && (line.match(/^(\s*)/)?.[1].length || 0) <= envIndent) break;
    const key = line.match(/^\s*-\s+key:\s*([A-Z0-9_]+)\s*$/);
    if (key) {
      current = { key: key[1], source: "operator", value: "", from: "" };
      entries.push(current);
      continue;
    }
    if (!current) continue;
    const value = line.match(/^\s+value:\s*(.+)$/);
    if (value) {
      current.source = "fixed";
      current.value = stripQuotes(value[1].trim());
      continue;
    }
    if (/^\s+generateValue:\s*true\s*$/.test(line)) {
      current.source = "generated";
      continue;
    }
    const fromDatabase = line.match(/^\s+fromDatabase:\s*$/);
    if (fromDatabase) {
      current.source = "managed";
      current.from = "Render Postgres musunil-postgres connectionString";
      continue;
    }
    const fromService = line.match(/^\s+fromService:\s*$/);
    if (fromService) {
      current.source = "managed";
      current.from = "Render Key Value musunil-redis connectionString";
      continue;
    }
    if (/^\s+sync:\s*false\s*$/.test(line)) {
      current.source = "operator";
    }
  }
  return entries;
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
