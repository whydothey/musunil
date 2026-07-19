import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(cwd, "scripts/render-runtime-secret.mjs"), "utf8");

for (const contract of [
  "render_runtime_secret_file",
  "MUSUNIL_RENDER_SECRET_APPLY_CONFIRM",
  "APPLY_RUNTIME_SECRET_FILE",
  "owner_only_permissions_required",
  "MUSUNIL_USER_INPUTS_FILE_PATH",
  "/etc/secrets/",
  "/secret-files/",
  "/env-vars/"
]) {
  assert.match(source, new RegExp(escapeRegExp(contract)));
}
assert.match(source, /if \(!apply\)/);
assert.match(source, /stat\.mode & 0o077/);
assert.match(source, /1024 \* 1024/);
assert.doesNotMatch(source, /console\.log\((content|readFileSync\(sourcePath)/);

const dir = mkdtempSync(resolve(tmpdir(), "musunil-render-secret-"));
try {
  const unsafePath = resolve(dir, "user-inputs.yaml");
  writeFileSync(unsafePath, readFileSync(resolve(cwd, "config/musunil.user-inputs.template.yaml")), { mode: 0o644 });
  chmodSync(unsafePath, 0o644);
  const run = spawnSync(process.execPath, ["scripts/render-runtime-secret.mjs", "--", "--json", "--source", unsafePath], {
    cwd,
    env: {
      ...process.env,
      RENDER_API_TOKEN: "",
      MUSUNIL_RENDER_API_TOKEN: "",
      MUSUNIL_RENDER_SECRET_APPLY_CONFIRM: ""
    },
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const result = JSON.parse(run.stdout);
  assert.equal(result.checked, "render_runtime_secret_file");
  assert.equal(result.mode, "dry_run");
  assert.equal(result.applied, false);
  assert.equal(result.secretFile.validation, "owner_only_permissions_required");
  assert.equal(result.secretFile.ready, false);
  assert.equal(result.readyForApply, false);
  assert.equal(JSON.stringify(result).includes("CHANGE_ME_PORTONE"), false);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("Render runtime secret safety check passed.");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
