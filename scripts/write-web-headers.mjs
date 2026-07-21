import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const webBlock = renderServiceBlock(renderYaml, "musunil-web");
const headers = readHeaders(webBlock);
const outputPath = resolve(cwd, "apps/web/public/_headers");
const requiredHeaders = [
  "Cache-Control",
  "Content-Security-Policy",
  "Permissions-Policy",
  "Referrer-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options"
];

for (const name of requiredHeaders) {
  if (!headers.some((header) => header.name === name && header.value)) {
    console.error(`render.yaml musunil-web header is missing: ${name}`);
    process.exit(1);
  }
}

const groupedHeaders = new Map();
for (const header of headers) {
  const group = groupedHeaders.get(header.path) || [];
  group.push(header);
  groupedHeaders.set(header.path, group);
}
const output = [
  "# Generated from render.yaml by scripts/write-web-headers.mjs.",
  "# Render manual Static Sites still require Dashboard Headers; this file keeps portable static hosts aligned.",
  ...[...groupedHeaders.entries()].flatMap(([path, rules]) => [path, ...rules.map((header) => `  ${header.name}: ${header.value}`)]),
  ""
].join("\n");

if (process.argv.includes("--check")) {
  const current = readFileSync(outputPath, "utf8");
  if (current !== output) {
    console.error("apps/web/public/_headers is stale. Run pnpm build:web-headers.");
    process.exit(1);
  }
} else {
  writeFileSync(outputPath, output);
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
  const rules = [];
  let current;
  for (const line of sectionLines) {
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
