import assert from "node:assert/strict";
import { createApp, emptyStore, stripPreviewData } from "../services/api/src/app.ts";
import { loadPostgresStore, savePostgresStore } from "../services/api/src/postgres-store.ts";
import { loadUserInputs } from "../packages/config/src/index.ts";
import { fetchLawPayloads, readLawRuntime } from "../workers/public-source-ingest/src/laws.ts";

const databaseUrl = process.env.DATABASE_URL?.trim();
const encryptionKey = process.env.MUSUNIL_ENCRYPTION_KEY?.trim() || undefined;
const verifyUpdate = process.argv.includes("--verify-update");

assert.ok(databaseUrl, "DATABASE_URL is required.");

const loaded = loadUserInputs({ allowTemplate: true });
const runtime = readLawRuntime(loaded.config);
assert.ok(runtime.assemblyBillApiKey || runtime.lawApiOc, "At least one official law-source credential is required.");

const internalApiKey = "law_db_sync_internal_key";
const initialStore = stripPreviewData(await loadPostgresStore(databaseUrl, emptyStore(), encryptionKey));
const beforeCount = initialStore.lawItems.length;
const app = createApp(initialStore, { internalApiKey });
const ingest = async (laws) => {
  const response = await app.handle({
    method: "POST",
    path: "/internal/ingest/laws",
    headers: { "x-musunil-internal-key": internalApiKey },
    body: { laws }
  });
  assert.equal(response.status, 200, "Official law ingest must succeed.");
};

const firstPayloads = await fetchLawPayloads(runtime, { existingAssemblyBills: initialStore.lawItems });
assert.ok(firstPayloads.length > 0, "Official law sources returned no matching rows.");
assert.equal(new Set(firstPayloads.map((item) => item.id)).size, firstPayloads.length, "Official payload ids must be unique.");
await ingest(firstPayloads);
await savePostgresStore(databaseUrl, app.store, encryptionKey);

const firstPersisted = await loadPostgresStore(databaseUrl, emptyStore(), encryptionKey);
const firstPersistedCount = firstPersisted.lawItems.length;
assert.equal(firstPersistedCount, new Set(firstPersisted.lawItems.map((item) => item.id)).size, "Persisted law ids must be unique.");

const refreshPayloads = await fetchLawPayloads(runtime, { existingAssemblyBills: app.store.lawItems });
await ingest(refreshPayloads);
await savePostgresStore(databaseUrl, app.store, encryptionKey);

const repeatedPersisted = await loadPostgresStore(databaseUrl, emptyStore(), encryptionKey);
const repeatedPersistedCount = repeatedPersisted.lawItems.length;
assert.equal(repeatedPersistedCount, new Set(repeatedPersisted.lawItems.map((item) => item.id)).size, "Repeated sync must not create duplicate law ids.");

let updateVerified = false;
let officialRestoreVerified = false;
if (verifyUpdate) {
  const probe = refreshPayloads[0];
  assert.ok(probe?.id, "An official row is required for the update probe.");
  const probeStage = `${probe.stage} [db-update-probe]`;
  await ingest([{ ...probe, stage: probeStage }]);
  await savePostgresStore(databaseUrl, app.store, encryptionKey);
  const probePersisted = await loadPostgresStore(databaseUrl, emptyStore(), encryptionKey);
  updateVerified = probePersisted.lawItems.find((item) => item.id === probe.id)?.stage === probeStage;
  assert.ok(updateVerified, "A stable official id must update the persisted row.");

  await ingest([probe]);
  await savePostgresStore(databaseUrl, app.store, encryptionKey);
  const restoredPersisted = await loadPostgresStore(databaseUrl, emptyStore(), encryptionKey);
  officialRestoreVerified = restoredPersisted.lawItems.find((item) => item.id === probe.id)?.stage === probe.stage
    && !JSON.stringify(restoredPersisted).includes("db-update-probe");
  assert.ok(officialRestoreVerified, "The official payload must restore the probe row.");
}

const finalStore = await loadPostgresStore(databaseUrl, emptyStore(), encryptionKey);
const assemblyBillCount = finalStore.lawItems.filter((item) => item.source === "assembly_bill").length;
const effectiveLawCount = finalStore.lawItems.filter((item) => item.source === "law_effective").length;

console.log(JSON.stringify({
  checked: "law_db_sync",
  ok: true,
  source: loaded.source,
  era: runtime.assemblyBillEra,
  initialFetchCount: firstPayloads.length,
  refreshFetchCount: refreshPayloads.length,
  beforeCount,
  firstPersistedCount,
  repeatedPersistedCount,
  finalCount: finalStore.lawItems.length,
  assemblyBillCount,
  effectiveLawCount,
  duplicateCount: finalStore.lawItems.length - new Set(finalStore.lawItems.map((item) => item.id)).size,
  updateVerified,
  officialRestoreVerified
}, null, 2));
