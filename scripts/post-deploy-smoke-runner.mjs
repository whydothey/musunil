import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const listOnly = args.includes("--list");
const scriptArgs = args.filter((arg) => arg !== "--list");
const launchEnv = deriveLaunchEnv(process.env);
const postDeployArgs = [
  "--disable-warning=ExperimentalWarning",
  "--experimental-strip-types",
  "scripts/post-deploy-smoke.mjs",
  ...scriptArgs
];
const steps = [
  {
    id: "post_deploy_smoke",
    command: [process.execPath, ...postDeployArgs].join(" ")
  },
  {
    id: "web_deploy_check",
    command: [pnpmCommand(), "check:web-deploy"].join(" ")
  }
];

if (listOnly) {
  console.log(JSON.stringify({
    checked: "post_deploy_smoke_runner_plan",
    env: launchEnv.summary,
    steps
  }, null, 2));
  process.exit(0);
}

run(process.execPath, postDeployArgs);
run(pnpmCommand(), ["check:web-deploy"]);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: launchEnv.env,
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

function deriveLaunchEnv(baseEnv) {
  const env = { ...baseEnv };
  const defaults = [];
  setDefault(env, defaults, "MUSUNIL_WEB_BASE_URL", "https://musunil.com");
  setDefault(env, defaults, "MUSUNIL_API_BASE_URL", "https://api.musunil.com");
  setDefault(env, defaults, "MUSUNIL_EXPECTED_API_BASE_URL", env.MUSUNIL_API_BASE_URL);
  setDefault(env, defaults, "MUSUNIL_EXPECTED_COMMIT_SHA", env.RENDER_GIT_COMMIT || gitHead());
  return {
    env,
    summary: {
      webBaseUrl: env.MUSUNIL_WEB_BASE_URL,
      apiBaseUrl: env.MUSUNIL_API_BASE_URL,
      expectedApiBaseUrl: env.MUSUNIL_EXPECTED_API_BASE_URL,
      expectedCommitSha: env.MUSUNIL_EXPECTED_COMMIT_SHA || null,
      defaulted: defaults
    }
  };
}

function setDefault(env, defaults, key, value) {
  if (env[key] || !value) return;
  env[key] = value;
  defaults.push(key);
}

function gitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });
  if (result.status !== 0) return "";
  return result.stdout.trim();
}
