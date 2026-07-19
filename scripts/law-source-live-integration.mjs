import assert from "node:assert/strict";
import { createApp, emptyStore } from "../services/api/src/app.ts";
import { loadUserInputs } from "../packages/config/src/index.ts";
import { fetchLawPayloads, readLawRuntime } from "../workers/public-source-ingest/src/laws.ts";

const officialLawGoKrSampleOc = "test";
const internalApiKey = "law_live_integration_internal_key";
const loaded = loadUserInputs({ allowTemplate: true });
const configuredRuntime = readLawRuntime(loaded.config);
const runtime = {
  ...configuredRuntime,
  lawApiOc: configuredRuntime.lawApiOc ?? officialLawGoKrSampleOc,
  keywords: configuredRuntime.keywords.length > 0
    ? configuredRuntime.keywords
    : ["집회 및 시위에 관한 법률", "정보통신망법", "공직선거법", "국회법"]
};

const payloads = await fetchLawPayloads(runtime);
const effectiveLaws = payloads.filter((item) => item.source === "law_effective");
const assemblyBills = payloads.filter((item) => item.source === "assembly_bill");

assert.ok(effectiveLaws.length > 0, "The official law.go.kr response must contain at least one effective law.");
for (const requiredLaw of ["집회 및 시위에 관한 법률", "공직선거법", "국회법"]) {
  assert.ok(effectiveLaws.some((item) => item.lawName === requiredLaw), `Missing official law.go.kr row: ${requiredLaw}`);
}
assert.equal(new Set(payloads.map((item) => item.id)).size, payloads.length, "Official source payload ids must be unique.");
for (const item of payloads) {
  assert.ok(item.id, "Every official source payload must have a stable id.");
  assert.ok(item.officialUrl, `Missing official URL for ${item.id}.`);
  const officialUrl = new URL(item.officialUrl);
  const expectedHostSuffix = item.source === "assembly_bill" ? "assembly.go.kr" : "law.go.kr";
  assert.ok(
    officialUrl.protocol === "https:" && (officialUrl.hostname === expectedHostSuffix || officialUrl.hostname.endsWith(`.${expectedHostSuffix}`)),
    `Untrusted official URL for ${item.id}.`
  );
}

const app = createApp(emptyStore(), { internalApiKey });
const ingest = async (laws) => app.handle({
  method: "POST",
  path: "/internal/ingest/laws",
  headers: { "x-musunil-internal-key": internalApiKey },
  body: { laws }
});
const list = async (sort = "interest") => app.handle({ method: "GET", path: `/laws?sort=${sort}` });

const firstIngest = await ingest(payloads);
assert.equal(firstIngest.status, 200);
const firstList = await list();
assert.equal(firstList.status, 200);
assert.equal(firstList.body.laws.length, payloads.length, "First ingest must expose every fetched official row exactly once.");
assert.equal(firstList.body.lawInterestItems.length, payloads.length, "The Web law-feed contract must include every official row.");
assert.ok(firstList.body.lawInterestItems.every((item) => item.title && item.stage && item.officialUrl));

const refreshedPayloads = await fetchLawPayloads(runtime);
const expectedIdsAfterRefresh = new Set([...payloads, ...refreshedPayloads].map((item) => item.id));
const repeatedIngest = await ingest(refreshedPayloads);
assert.equal(repeatedIngest.status, 200);
const repeatedList = await list();
assert.equal(repeatedList.body.laws.length, expectedIdsAfterRefresh.size, "Repeated official fetch must upsert by stable id without duplicates.");

const probe = refreshedPayloads[0];
const updateProbeStage = `${probe.stage} [update-probe]`;
const updateIngest = await ingest([{ ...probe, stage: updateProbeStage }]);
assert.equal(updateIngest.status, 200);
const updatedDetail = await app.handle({ method: "GET", path: `/laws/${probe.id}` });
assert.equal(updatedDetail.status, 200);
assert.equal(updatedDetail.body.law.stage, updateProbeStage, "A stable official id must update the existing row.");
assert.equal((await list()).body.laws.length, expectedIdsAfterRefresh.size, "Updating a row must preserve the total row count.");

const restoreIngest = await ingest([probe]);
assert.equal(restoreIngest.status, 200);
const restoredDetail = await app.handle({ method: "GET", path: `/laws/${probe.id}` });
assert.equal(restoredDetail.body.law.stage, probe.stage, "The official payload must restore the updated row.");
assert.equal(JSON.stringify((await list()).body).includes("update-probe"), false);

if (assemblyBills.length > 0) {
  const proposed = await list("proposed_desc");
  assert.equal(proposed.status, 200);
  assert.ok(proposed.body.laws.length > 0, "Configured Assembly API must return at least one matching bill.");
  assert.ok(proposed.body.laws.every((item) => item.source === "assembly_bill"));
  for (let index = 1; index < proposed.body.laws.length; index += 1) {
    const previous = new Date(proposed.body.laws[index - 1].proposedDate ?? 0).getTime();
    const current = new Date(proposed.body.laws[index].proposedDate ?? 0).getTime();
    assert.ok(previous >= current, "Recent-proposal sorting must be descending by the official proposal date.");
  }
}

console.log(JSON.stringify({
  checked: "law_source_live_integration",
  ok: true,
  sourceConfig: {
    inputSource: loaded.source,
    lawGoKrCredential: configuredRuntime.lawApiOc ? "configured" : "official_documented_sample",
    assemblyBillCredential: configuredRuntime.assemblyBillApiKey ? "configured" : "missing"
  },
  officialFetch: {
    firstFetchTotal: payloads.length,
    refreshFetchTotal: refreshedPayloads.length,
    effectiveLawCount: effectiveLaws.length,
    assemblyBillCount: assemblyBills.length,
    requiredEffectiveLawsFound: ["집회 및 시위에 관한 법률", "공직선거법", "국회법"]
  },
  updateContract: {
    firstIngestCount: firstList.body.laws.length,
    repeatedIngestCount: repeatedList.body.laws.length,
    duplicateCount: repeatedList.body.laws.length - new Set(repeatedList.body.laws.map((item) => item.id)).size,
    webFeedContractCount: firstList.body.lawInterestItems.length,
    updateVerified: true,
    officialRestoreVerified: true
  },
  remainingExternalInput: configuredRuntime.assemblyBillApiKey
    ? []
    : ["public_data_sources.national_assembly_bill_api_key"]
}, null, 2));
