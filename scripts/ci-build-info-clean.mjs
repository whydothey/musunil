import { spawnSync } from "node:child_process";

const files = ["apps/web/public/build-info.js", "apps/web/public/build-info.json"];
const result = spawnSync("git", ["diff", "--exit-code", "--", ...files], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (result.status === 0) {
  console.log(JSON.stringify({ checked: "build_info_placeholders_clean", files }, null, 2));
  process.exit(0);
}

console.error("build-info placeholders were modified by a local check/build command.");
console.error("Render builds may write real build metadata, but local release checks must preserve tracked placeholders.");
if (result.stdout) console.error(result.stdout.trim());
if (result.stderr) console.error(result.stderr.trim());
process.exit(result.status ?? 1);
