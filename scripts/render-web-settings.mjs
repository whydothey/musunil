import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const webBlock = renderServiceBlock(renderYaml, "musunil-web");
const buildCommand = readScalar(webBlock, "buildCommand");
const publishDirectory = readScalar(webBlock, "staticPublishPath");
const headers = readHeaders(webBlock);
const envVars = readEnvVars(webBlock);
const requiredHeaders = [
  "Cache-Control",
  "Content-Security-Policy",
  "Permissions-Policy",
  "Referrer-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options"
];
const forbiddenEnvKeys = [
  "DATABASE_URL",
  "REDIS_URL",
  "MUSUNIL_USER_INPUTS_B64",
  "MUSUNIL_USER_TOKEN_SECRET",
  "MUSUNIL_ENCRYPTION_KEY",
  "MUSUNIL_INTERNAL_API_KEY"
];

const failures = [];
if (!buildCommand) failures.push("musunil-web buildCommand is missing");
if (!publishDirectory) failures.push("musunil-web staticPublishPath is missing");
if (!envVars.some((envVar) => envVar.key === "NODE_VERSION" && envVar.value === "24")) failures.push("musunil-web NODE_VERSION=24 env var is missing");
if (!envVars.some((envVar) => envVar.key === "MUSUNIL_RUNTIME_ENV" && envVar.value === "production")) {
  failures.push("musunil-web MUSUNIL_RUNTIME_ENV=production env var is missing");
}
for (const key of forbiddenEnvKeys) {
  if (envVars.some((envVar) => envVar.key === key)) failures.push(`musunil-web must not receive backend secret/runtime env var: ${key}`);
}
for (const name of requiredHeaders) {
  if (!headers.some((header) => header.name === name)) failures.push(`musunil-web header is missing: ${name}`);
}
if (!headers.some((header) => header.name === "Cache-Control" && header.value === "no-store")) {
  failures.push("musunil-web Cache-Control header must be no-store");
}
if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

const settings = {
  branch: "main",
  rootDirectory: "",
  buildCommand,
  publishDirectory,
  portableHeadersFile: "apps/web/_headers",
  envVars,
  headers,
  officialDocs: {
    staticHeaders: "https://render.com/docs/static-site-headers",
    blueprintHeaders: "https://render.com/docs/blueprint-spec#static-sites"
  },
  headerApplicationModes: [
    "Manual Static Site: open Render musunil-web > Settings > Headers and copy every header rule below. render.yaml does not sync into a manually created Static Site.",
    "Blueprint-managed service: sync render.yaml and confirm the musunil-web headers section is applied by Render."
  ],
  afterSave: [
    "Clear build cache & deploy",
    "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
    "MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
    "pnpm check:visual-surface:live",
    "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm service:watch:visual"
  ]
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(settings, null, 2));
} else {
  console.log("Render Static Site settings for musunil-web");
  console.log("");
  console.log(`Branch: ${settings.branch}`);
  console.log("Root Directory: (blank)");
  console.log(`Build Command: ${settings.buildCommand}`);
  console.log(`Publish Directory: ${settings.publishDirectory}`);
  console.log(`Portable Headers File: ${settings.portableHeadersFile}`);
  console.log("");
  console.log("Header application mode:");
  for (const mode of settings.headerApplicationModes) console.log(`- ${mode}`);
  console.log(`- Render docs: ${settings.officialDocs.staticHeaders}`);
  console.log(`- Blueprint docs: ${settings.officialDocs.blueprintHeaders}`);
  console.log("");
  console.log("Environment Variables:");
  for (const envVar of settings.envVars) {
    console.log(`- ${envVar.key}: ${envVar.value}`);
  }
  console.log("");
  console.log("Headers:");
  for (const header of settings.headers) {
    console.log(`- Path: ${header.path}`);
    console.log(`  Name: ${header.name}`);
    console.log(`  Value: ${header.value}`);
  }
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
  return match ? stripQuotes(match[1].trim()) : undefined;
}

function readHeaders(block) {
  const lines = block.split("\n");
  const headerIndex = lines.findIndex((line) => /^\s*headers:\s*$/.test(line));
  if (headerIndex < 0) return [];
  const headerIndent = lines[headerIndex].match(/^(\s*)/)?.[1].length || 0;
  const sectionLines = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && (line.match(/^(\s*)/)?.[1].length || 0) <= headerIndent) break;
    sectionLines.push(line);
  }
  const section = sectionLines.join("\n");
  const rules = [];
  let current;
  for (const line of section.split("\n")) {
    const path = line.match(/^\s*-\s+path:\s*(.+)$/);
    if (path) {
      current = { path: stripQuotes(path[1].trim()), name: "", value: "" };
      rules.push(current);
      continue;
    }
    const name = line.match(/^\s+name:\s*(.+)$/);
    if (name && current) {
      current.name = stripQuotes(name[1].trim());
      continue;
    }
    const value = line.match(/^\s+value:\s*(.+)$/);
    if (value && current) current.value = stripQuotes(value[1].trim());
  }
  return rules.filter((rule) => rule.path && rule.name && rule.value);
}

function readEnvVars(block) {
  const lines = block.split("\n");
  const envIndex = lines.findIndex((line) => /^\s*envVars:\s*$/.test(line));
  if (envIndex < 0) return [];
  const envIndent = lines[envIndex].match(/^(\s*)/)?.[1].length || 0;
  const sectionLines = [];
  for (let index = envIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && (line.match(/^(\s*)/)?.[1].length || 0) <= envIndent) break;
    sectionLines.push(line);
  }
  const envVars = [];
  let current;
  for (const line of sectionLines) {
    const key = line.match(/^\s*-\s+key:\s*(.+)$/);
    if (key) {
      current = { key: stripQuotes(key[1].trim()), value: "" };
      envVars.push(current);
      continue;
    }
    const value = line.match(/^\s+value:\s*(.+)$/);
    if (value && current) current.value = stripQuotes(value[1].trim());
  }
  return envVars.filter((envVar) => envVar.key && envVar.value);
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
