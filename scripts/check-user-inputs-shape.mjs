import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(new URL("../packages/config/package.json", import.meta.url));
const YAML = require("yaml");

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const inputArg = args.find((arg) => arg !== "--json");
const cwd = process.cwd();
const inputPath = resolve(cwd, inputArg ?? "config/musunil.user-inputs.local.yaml");
const templatePath = resolve(cwd, "config/musunil.user-inputs.template.yaml");

const result = {
  checked: "user_inputs_shape",
  inputPath,
  templatePath,
  ok: false,
  missingPaths: [],
  templatePathCount: 0
};

try {
  const input = readYaml(inputPath, "input");
  const template = readYaml(templatePath, "template");
  const templatePaths = leafPaths(template);
  result.templatePathCount = templatePaths.length;
  result.missingPaths = templatePaths.filter((path) => !hasPath(input, path.split(".")));
  result.ok = result.missingPaths.length === 0;
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
}

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`User inputs shape passed: ${inputPath}`);
} else {
  console.error(`User inputs shape failed: ${inputPath}`);
  if (result.error) console.error(`- ${result.error}`);
  for (const path of result.missingPaths) console.error(`- missing ${path}`);
}

if (!result.ok) process.exit(1);

function readYaml(path, label) {
  if (!existsSync(path)) throw new Error(`${label} YAML not found: ${path}`);
  const parsed = YAML.parse(readFileSync(path, "utf8"));
  if (!isPlainObject(parsed)) throw new Error(`${label} YAML must be an object: ${path}`);
  return parsed;
}

function leafPaths(value, prefix = "") {
  if (!isPlainObject(value)) return prefix ? [prefix] : [];
  const entries = Object.entries(value);
  if (entries.length === 0) return prefix ? [prefix] : [];
  return entries.flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

function hasPath(value, parts) {
  let current = value;
  for (const part of parts) {
    if (!isPlainObject(current) || !(part in current)) return false;
    current = current[part];
  }
  return true;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
