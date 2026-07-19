import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(cwd, "render.backend.yaml"), "utf8");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const requireApproved = args.includes("--require-approved");
const approval = process.env.MUSUNIL_RENDER_PAID_RESOURCE_APPROVAL || "";
const approvalValue = "APPROVE_MINIMUM_14_USD_PLUS_USAGE_TAX";
const approved = approval === approvalValue;

const resources = [
  {
    name: "musunil-api",
    kind: "web",
    plan: "starter",
    billing: "monthly_fixed",
    minimumUsd: 7
  },
  {
    name: "musunil-postgres",
    kind: "postgres",
    plan: "basic-256mb",
    billing: "monthly_fixed_plus_storage",
    minimumUsd: 6
  },
  {
    name: "musunil-ops-scheduler",
    kind: "cron",
    plan: "starter",
    billing: "metered_with_monthly_minimum",
    minimumUsd: 1
  },
  {
    name: "musunil-redis",
    kind: "keyvalue",
    plan: "free",
    billing: "free_non_persistent",
    minimumUsd: 0
  }
];

const failures = [];
for (const resource of resources) {
  if (!new RegExp(`name:\\s*${escapeRegExp(resource.name)}\\b`).test(source)) {
    failures.push(`backend Blueprint is missing ${resource.name}`);
  }
}
if (/name:\s*musunil-web\b/.test(source)) failures.push("backend Blueprint must not manage the existing musunil-web service");
if (!/autoDeployTrigger:\s*checksPass/g.test(source)) failures.push("Git services must wait for CI checks before automatic deploy");
if (!/MUSUNIL_USER_INPUTS_FILE_PATH[\s\S]*\/etc\/secrets\/musunil\.user-inputs\.yaml/.test(source)) {
  failures.push("backend Blueprint must use the Render Secret File runtime path");
}

const plan = {
  checked: "render_backend_provisioning_plan",
  mode: "dry_run",
  blueprintPath: "render.backend.yaml",
  existingWeb: {
    name: "musunil-web",
    serviceId: "srv-d98ftqq8qa3s73feiph0",
    management: "manual_existing_preserved",
    includedInBlueprint: false
  },
  resources,
  estimatedMinimumUsdPerMonth: resources.reduce((sum, resource) => sum + resource.minimumUsd, 0),
  additionalCharges: [
    "cron runtime above the monthly minimum",
    "Postgres storage growth",
    "outbound bandwidth and build minutes above included quotas",
    "applicable taxes"
  ],
  paidApproval: {
    configured: approved,
    env: "MUSUNIL_RENDER_PAID_RESOURCE_APPROVAL",
    requiredValue: approvalValue
  },
  safeguards: [
    "Select render.backend.yaml as the Blueprint Path; do not use the root render.yaml for first backend provisioning.",
    "The Blueprint preview must list exactly musunil-api, musunil-postgres, musunil-ops-scheduler, and musunil-redis.",
    "The preview must not list musunil-web or any suffixed duplicate of it.",
    "Do not deploy until the user explicitly approves the minimum monthly cost plus usage and tax.",
    "After services exist, run pnpm render:runtime-secret before requiring /ready to pass."
  ],
  verification: [
    "pnpm render:runtime-secret",
    "pnpm render:api-settings",
    "pnpm launch:apply",
    "pnpm launch:final-gate"
  ],
  ok: failures.length === 0 && (!requireApproved || approved),
  failures: [
    ...failures,
    ...(requireApproved && !approved ? [`MUSUNIL_RENDER_PAID_RESOURCE_APPROVAL must equal ${approvalValue}`] : [])
  ]
};

if (json) console.log(JSON.stringify(plan, null, 2));
else {
  console.log("Render backend provisioning plan");
  console.log(`Blueprint Path: ${plan.blueprintPath}`);
  console.log(`Existing Web: ${plan.existingWeb.name} (${plan.existingWeb.management})`);
  console.log(`Estimated minimum: USD ${plan.estimatedMinimumUsdPerMonth}/month, plus usage and tax`);
  for (const resource of resources) {
    console.log(`- ${resource.name}: ${resource.plan}, ${resource.billing}, minimum USD ${resource.minimumUsd}/month`);
  }
  console.log(`Paid approval configured: ${approved ? "yes" : "no"}`);
  console.log("Safeguards:");
  for (const safeguard of plan.safeguards) console.log(`- ${safeguard}`);
  if (plan.failures.length) {
    console.log("Failures:");
    for (const failure of plan.failures) console.log(`- ${failure}`);
  }
}

if (!plan.ok) process.exitCode = 1;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
