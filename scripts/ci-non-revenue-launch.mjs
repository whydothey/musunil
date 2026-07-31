import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const configSourceYaml = read("config/musunil.user-inputs.template.yaml");
const configSource = read("packages/config/src/index.ts");
const apiSource = read("services/api/src/app.ts");
const apiServerSource = read("services/api/src/server.ts");
const routeSources = [
  read("apps/web/app/src/App.tsx"),
  read("apps/web/app/src/components.tsx"),
  read("apps/web/app/src/screens/HomeScreen.tsx")
].join("\n");

for (const key of [
  "donations_enabled",
  "operating_support_enabled",
  "influence_on_ranking_enabled",
  "influence_on_alerts_enabled",
  "influence_on_trust_enabled"
]) {
  assert.match(configSourceYaml, new RegExp(`^\\s{2}${key}: false$`, "m"));
}
assert.match(configSourceYaml, /^\s{2}mode: "disabled"$/m);

assert.match(configSource, /payments\.operating_support_enabled must stay false for the non-revenue launch/);
assert.match(configSource, /payments\.mode must stay disabled for the non-revenue launch/);
assert.match(apiSource, /operatingMode: "public_read_only"/);
assert.match(apiSource, /paymentsAvailable: false/);
assert.match(apiSource, /recurringPaymentsAvailable: false/);
assert.match(apiSource, /contributionAvailable: false/);
assert.match(apiServerSource, /payments\.donations_disabled/);
assert.match(apiServerSource, /payments\.operating_support_disabled/);
assert.match(apiServerSource, /payments\.mode_disabled/);

assert.doesNotMatch(apiSource, /path === "\/(?:payments|billing|checkout|donations|support)(?:\/|")/);
assert.doesNotMatch(routeSources, /\/(?:payments|billing|checkout|donations|support)(?:["'/]|$)/);
assert.doesNotMatch(routeSources, /후원하기|결제하기|정기\s*결제\s*(?:신청|시작)/);

console.log(JSON.stringify({
  ok: true,
  operatingMode: "public_read_only",
  paymentsAvailable: false,
  recurringPaymentsAvailable: false,
  assertions: [
    "launch config is hard-locked to disabled payments",
    "public API advertises non-revenue mode",
    "no payment or billing endpoint is exposed",
    "primary product navigation contains no payment CTA"
  ]
}, null, 2));
