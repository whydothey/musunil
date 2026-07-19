import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = resolve(import.meta.dirname, "..");
const full = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const backend = readFileSync(resolve(cwd, "render.backend.yaml"), "utf8");

for (const name of ["musunil-redis", "musunil-api", "musunil-ops-scheduler"]) {
  assert.equal(normalize(renderServiceBlock(full, name)), normalize(renderServiceBlock(backend, name)), `${name} drifted between Blueprints`);
}
assert.equal(normalize(databaseBlock(full, "musunil-postgres")), normalize(databaseBlock(backend, "musunil-postgres")));
assert.doesNotMatch(backend, /name:\s*musunil-web\b/);
assert.match(full, /name:\s*musunil-web\b/);
assert.match(renderServiceBlock(backend, "musunil-api"), /branch:\s*main[\s\S]*autoDeployTrigger:\s*checksPass/);
assert.match(renderServiceBlock(backend, "musunil-ops-scheduler"), /plan:\s*starter[\s\S]*branch:\s*main[\s\S]*autoDeployTrigger:\s*checksPass/);

const dryRun = spawnSync(process.execPath, ["scripts/render-provisioning-plan.mjs", "--", "--json"], {
  cwd,
  env: { ...process.env, MUSUNIL_RENDER_PAID_RESOURCE_APPROVAL: "" },
  encoding: "utf8"
});
assert.equal(dryRun.status, 0, dryRun.stderr || dryRun.stdout);
const plan = JSON.parse(dryRun.stdout);
assert.equal(plan.checked, "render_backend_provisioning_plan");
assert.equal(plan.mode, "dry_run");
assert.equal(plan.blueprintPath, "render.backend.yaml");
assert.equal(plan.existingWeb.includedInBlueprint, false);
assert.equal(plan.estimatedMinimumUsdPerMonth, 14);
assert.equal(plan.paidApproval.configured, false);

const blocked = spawnSync(process.execPath, ["scripts/render-provisioning-plan.mjs", "--", "--json", "--require-approved"], {
  cwd,
  env: { ...process.env, MUSUNIL_RENDER_PAID_RESOURCE_APPROVAL: "" },
  encoding: "utf8"
});
assert.equal(blocked.status, 1);
assert.equal(JSON.parse(blocked.stdout).ok, false);

console.log("Render backend Blueprint contract passed.");

function renderServiceBlock(source, name) {
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s{2}-\s+type:\s+/.test(lines[index])) continue;
    let end = index + 1;
    while (end < lines.length && !/^\s{2}-\s+type:\s+/.test(lines[end]) && !/^databases:/.test(lines[end])) end += 1;
    const block = lines.slice(index, end).join("\n");
    if (new RegExp(`^\\s{4}name:\\s*${escapeRegExp(name)}\\s*$`, "m").test(block)) return block;
  }
  throw new Error(`service not found: ${name}`);
}

function databaseBlock(source, name) {
  const start = source.search(new RegExp(`^\\s{2}-\\s+name:\\s*${escapeRegExp(name)}\\s*$`, "m"));
  if (start < 0) throw new Error(`database not found: ${name}`);
  return source.slice(start).trim();
}

function normalize(value) {
  return value.trim().replace(/\r\n/g, "\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
