import { spawnSync } from "node:child_process";

const postDeployArgs = [
  "--disable-warning=ExperimentalWarning",
  "--experimental-strip-types",
  "scripts/post-deploy-smoke.mjs",
  ...process.argv.slice(2)
];

run(process.execPath, postDeployArgs);
run(pnpmCommand(), ["check:web-deploy"]);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`${command} exited via signal ${result.signal}`);
    process.exit(1);
  }
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}
