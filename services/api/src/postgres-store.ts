import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import pg from "pg";
import type { Store } from "./app.ts";

const { Pool } = pg;
const snapshotId = "main";

export async function loadPostgresStore(databaseUrl: string, fallback: Store, encryptionKey?: string): Promise<Store> {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await ensureSnapshotTable(pool);
    const result = await pool.query("select state, state_ciphertext from store_snapshots where id = $1", [snapshotId]);
    if (result.rowCount === 0) {
      await savePostgresStore(databaseUrl, fallback, encryptionKey);
      return fallback;
    }
    const row = result.rows[0] as { state: Store; state_ciphertext?: string | null };
    if (row.state_ciphertext) {
      if (!encryptionKey) throw new Error("security.encryption_key is required to read encrypted store snapshot.");
      return hydrateStore(JSON.parse(decryptSnapshot(row.state_ciphertext, encryptionKey)) as Store);
    }
    return hydrateStore(row.state as Store);
  } finally {
    await pool.end();
  }
}

export async function savePostgresStore(databaseUrl: string, store: Store, encryptionKey?: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await ensureSnapshotTable(pool);
    // ponytail: single-row JSONB persistence for v1; switch to normalized tables when query volume requires it.
    const serialized = JSON.stringify(store);
    const state = encryptionKey ? "{}" : serialized;
    const stateCiphertext = encryptionKey ? encryptSnapshot(serialized, encryptionKey) : null;
    await pool.query(
      "insert into store_snapshots(id, state, state_ciphertext, updated_at) values ($1, $2, $3, now()) on conflict (id) do update set state = excluded.state, state_ciphertext = excluded.state_ciphertext, updated_at = now()",
      [snapshotId, state, stateCiphertext]
    );
  } finally {
    await pool.end();
  }
}

export async function pingPostgres(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 1500 });
  try {
    await pool.query("select 1");
  } finally {
    await pool.end();
  }
}

export async function pingOpsSchedulerSchema(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 1500 });
  try {
    const result = await pool.query<{ task_count: number }>(
      `select count(*)::integer as task_count
       from ops_task_leases
       where task_id = any($1::text[])`,
      [["notification_dispatch", "public_source_ingest", "law_source_ingest", "privacy_purge"]]
    );
    if (result.rows[0]?.task_count !== 4) throw new Error("ops scheduler task rows are incomplete");
  } finally {
    await pool.end();
  }
}

async function ensureSnapshotTable(pool: pg.Pool): Promise<void> {
  await pool.query(`
    create table if not exists store_snapshots (
      id text primary key,
      state jsonb not null,
      state_ciphertext text,
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query("alter table store_snapshots add column if not exists state_ciphertext text");
}

export function encryptSnapshot(raw: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", snapshotKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSnapshot(payload: string, secret: string): string {
  const [version, iv, tag, ciphertext] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Invalid encrypted store snapshot.");
  const decipher = createDecipheriv("aes-256-gcm", snapshotKey(secret), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

function snapshotKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function hydrateStore(store: Store): Store {
  for (const issue of store.issues) {
    issue.firstSeenAt = date(issue.firstSeenAt);
    issue.lastUpdatedAt = date(issue.lastUpdatedAt);
  }
  for (const law of store.lawItems) {
    law.proposedDate = optionalDate(law.proposedDate);
    law.statusDate = optionalDate(law.statusDate);
    law.effectiveDate = optionalDate(law.effectiveDate);
  }
  for (const occurrence of store.occurrences) {
    occurrence.startsAt = optionalDate(occurrence.startsAt);
    occurrence.endsAt = optionalDate(occurrence.endsAt);
  }
  for (const presence of store.continuousPresences) {
    presence.firstProofOfPresenceAt = optionalDate(presence.firstProofOfPresenceAt);
    presence.lastProofOfPresenceAt = optionalDate(presence.lastProofOfPresenceAt);
  }
  for (const estimate of store.crowdEstimates) estimate.observedAt = date(estimate.observedAt);
  for (const claim of store.claims) {
    claim.occurredAt = optionalDate(claim.occurredAt);
    claim.observedAt = optionalDate(claim.observedAt);
    claim.createdAt = date(claim.createdAt);
  }
  for (const evidence of store.evidence) {
    evidence.uploadedAt = date(evidence.uploadedAt);
    evidence.capturedAt = optionalDate(evidence.capturedAt);
    evidence.deviceIntegrityCheckedAt = optionalDate(evidence.deviceIntegrityCheckedAt);
    evidence.redactionCheckedAt = optionalDate(evidence.redactionCheckedAt);
  }
  for (const subscription of store.subscriptions) subscription.mutedUntil = optionalDate(subscription.mutedUntil);
  for (const notification of store.notificationOutbox) {
    notification.scheduledFor = date(notification.scheduledFor);
    notification.sentAt = optionalDate(notification.sentAt);
  }
  for (const audit of store.auditLogs) audit.createdAt = date(audit.createdAt);
  for (const log of store.transparencyLogs) log.createdAt = date(log.createdAt);
  for (const report of store.reports) report.createdAt = date(report.createdAt);
  store.liveUploads ??= [];
  for (const upload of store.liveUploads) upload.uploadedAt = date(upload.uploadedAt);
  store.verifiedUsers ??= [];
  for (const user of store.verifiedUsers) {
    user.verifiedAt = date(user.verifiedAt);
    user.lastSeenAt = date(user.lastSeenAt);
  }
  store.identityVerificationSessions ??= [];
  for (const session of store.identityVerificationSessions) {
    session.requestedAt = date(session.requestedAt);
    session.expiresAt = date(session.expiresAt);
    session.verifiedAt = optionalDate(session.verifiedAt);
  }
  store.userSessions ??= [];
  for (const session of store.userSessions) {
    session.createdAt = date(session.createdAt);
    session.lastSeenAt = date(session.lastSeenAt);
    session.expiresAt = date(session.expiresAt);
    session.revokedAt = optionalDate(session.revokedAt);
  }
  store.publicSourceRefreshes ??= [];
  for (const refresh of store.publicSourceRefreshes) refresh.checkedAt = date(refresh.checkedAt);
  return store;
}

function date(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function optionalDate(value: unknown): Date | undefined {
  return value === undefined || value === null ? undefined : date(value);
}
