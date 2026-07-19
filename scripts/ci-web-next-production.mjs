import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const root = resolve(cwd, "apps/web/dist");
const failures = [];
const files = walk(root);
const textFiles = files.filter((file) => /\.(?:html|js|css|json|svg)$/.test(file));
const forbiddenTokens = [
  "issue-network-act",
  "occ-network-seoul",
  "정보통신망법 개정안 관련 집회",
  "preview-occ-live",
  "preview-busan-live",
  "preview-daejeon-live",
  "preview-presence",
  "_sample",
  "_mock",
  "preview-only"
];

for (const file of textFiles) {
  const source = readFileSync(resolve(root, file), "utf8");
  for (const token of forbiddenTokens) {
    if (source.includes(token)) failures.push(`${file} contains production-forbidden token ${token}`);
  }
}
for (const file of files) {
  if (/\.(?:webm|mp4)$/.test(file)) failures.push(`production bundle contains fixture media ${file}`);
  if (/preview/i.test(file)) failures.push(`production bundle contains preview asset ${file}`);
}
for (const required of ["index.html", "config.js", "build-info.js", "build-info.json", "_headers", "favicon.svg"]) {
  if (!files.includes(required)) failures.push(`production bundle is missing ${required}`);
}

const config = parseWindowJson("config.js", "MUSUNIL_WEB_CONFIG");
if (JSON.stringify(Object.keys(config).sort()) !== JSON.stringify(["apiBaseUrl", "mapStyleUrl"])) {
  failures.push(`public config keys changed: ${Object.keys(config).sort().join(", ")}`);
}
if (config.apiBaseUrl !== "https://api.musunil.com") failures.push(`production API base changed: ${config.apiBaseUrl || "missing"}`);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ checked: "react_production_bundle", files: files.length, fixtureTokens: 0, fixtureMedia: 0, configKeys: Object.keys(config).sort() }, null, 2));

function walk(directory) {
  const output = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = resolve(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && statSync(absolute).isFile()) output.push(relative(directory, absolute).split(sep).join("/"));
    }
  };
  visit(directory);
  return output.sort();
}

function parseWindowJson(file, name) {
  const source = readFileSync(resolve(root, file), "utf8");
  const match = source.match(new RegExp(`window\\.${name}\\s*=\\s*({[\\s\\S]*?})\\s*;?\\s*$`));
  if (!match) {
    failures.push(`${file} is missing window.${name}`);
    return {};
  }
  try { return JSON.parse(match[1]); }
  catch { failures.push(`${file} has invalid ${name}`); return {}; }
}
