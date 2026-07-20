import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { childEnvironment, opsLeaseSeconds, opsTaskDefinitions, taskById } from "./ops-scheduler-contract.ts";

assert.deepEqual(opsTaskDefinitions.map((task) => task.id), [
  "notification_dispatch",
  "public_source_ingest",
  "law_source_ingest",
  "news_source_ingest",
  "media_redaction",
  "privacy_purge"
]);
assert.deepEqual(opsTaskDefinitions.map((task) => task.cadenceSeconds), [300, 3600, 43200, 3600, 300, 86400]);
assert.equal(new Set(opsTaskDefinitions.map((task) => task.priority)).size, opsTaskDefinitions.length);
assert.equal(opsTaskDefinitions.every((task) => task.retrySeconds > 0 && task.retrySeconds < task.cadenceSeconds), true);
assert.equal(opsLeaseSeconds >= Math.max(...opsTaskDefinitions.map((task) => task.retrySeconds)), true);
assert.equal(taskById("law_source_ingest")?.args.join(" ").includes("workers/public-source-ingest/src/index.ts --laws --post"), true);
assert.equal(taskById("news_source_ingest")?.args.join(" ").includes("workers/public-source-ingest/src/index.ts --news --post"), true);
assert.equal(taskById("media_redaction")?.args.join(" ").includes("scripts/redaction-worker.mjs"), true);
assert.equal(taskById("unknown"), undefined);

const sourceEnv = {
  MUSUNIL_USER_INPUTS_B64: "secret-yaml",
  MUSUNIL_USER_INPUTS_FILE_PATH: "/secret/file",
  MUSUNIL_INTERNAL_API_KEY: "internal-key"
};
const publicSourceEnv = childEnvironment(taskById("public_source_ingest")!, sourceEnv);
assert.equal(publicSourceEnv.MUSUNIL_USER_INPUTS_B64, undefined);
assert.equal(publicSourceEnv.MUSUNIL_USER_INPUTS_FILE_PATH, undefined);
assert.equal(publicSourceEnv.MUSUNIL_INTERNAL_API_KEY, "internal-key");
const lawEnv = childEnvironment(taskById("law_source_ingest")!, sourceEnv);
assert.equal(lawEnv.MUSUNIL_USER_INPUTS_B64, "secret-yaml");
assert.equal(lawEnv.MUSUNIL_USER_INPUTS_FILE_PATH, "/secret/file");
const newsEnv = childEnvironment(taskById("news_source_ingest")!, sourceEnv);
assert.equal(newsEnv.MUSUNIL_USER_INPUTS_B64, "secret-yaml");
assert.equal(newsEnv.MUSUNIL_USER_INPUTS_FILE_PATH, "/secret/file");
const redactionEnv = childEnvironment(taskById("media_redaction")!, sourceEnv);
assert.equal(redactionEnv.MUSUNIL_USER_INPUTS_B64, "secret-yaml");
assert.equal(redactionEnv.MUSUNIL_USER_INPUTS_FILE_PATH, "/secret/file");

const schedulerSource = readFileSync(new URL("./ops-scheduler.ts", import.meta.url), "utf8");
assert.match(schedulerSource, /for update skip locked\s+limit 1/i);
assert.match(schedulerSource, /setInterval\(\(\) =>[\s\S]*renewLease\(task\)/);
assert.match(schedulerSource, /lease_until = now\(\) \+ \(\$3::integer \* interval '1 second'\)/);

console.log(JSON.stringify({
  checked: "ops_scheduler_contract",
  tasks: opsTaskDefinitions.map((task) => ({ id: task.id, cadenceSeconds: task.cadenceSeconds })),
  leaseSeconds: opsLeaseSeconds,
  singleTaskClaims: true,
  leaseHeartbeat: true,
  nonLawSecretScrub: true,
  secretFilePropagation: true
}, null, 2));
