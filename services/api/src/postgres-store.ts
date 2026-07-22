import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import type { Store } from "./app.ts";
import { buildLawGroups } from "./law-topics.ts";
import { resolveOfficialLocationEstimate } from "./location-resolution.ts";
import { publicAssemblySources } from "../../../packages/schemas/src/public-sources.ts";

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
      [["notification_dispatch", "public_source_ingest", "law_source_ingest", "news_source_ingest", "media_redaction", "privacy_purge"]]
    );
    if (result.rows[0]?.task_count !== 6) throw new Error("ops scheduler task rows are incomplete");
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

export function hydrateStore(store: Store): Store {
  const legacy = store as unknown as Store & {
    lawTopics?: Array<{ id: string; billIds: string[]; updatedAt: unknown }>;
    lawTopicMemberships?: Array<{ lawItemId: string; lawTopicId: string }>;
    issueLawLinks?: Array<{
      issueId: string;
      lawItemId: string;
      matchBasis: "law_name" | "keyword" | "bill_title" | "manual";
      confidence: "low" | "medium" | "high";
      claimIds: string[];
    }>;
  };
  for (const law of store.lawItems ?? []) {
    law.proposedDate = optionalDate(law.proposedDate);
    law.statusDate = optionalDate(law.statusDate);
    law.effectiveDate = optionalDate(law.effectiveDate);
  }
  const builtGroups = buildLawGroups(store.lawItems ?? []);
  store.lawGroups ??= builtGroups.groups;
  store.lawGroupMemberships ??= builtGroups.memberships;
  store.issueLawGroupLinks ??= [];
  store.newsIssueCandidates ??= [];
  store.newsProviderUsage ??= [];
  store.issueSynthesisSnapshots ??= [];
  store.occurrenceIssueLinks ??= [];
  store.legacyLawTopicAliases ??= {};
  for (const law of store.lawItems ?? []) law.lawGroupId = builtGroups.assignments.get(law.id)?.groupId;
  for (const topic of legacy.lawTopics ?? []) {
    const groupId = topic.billIds.map((lawId) => builtGroups.assignments.get(lawId)?.groupId).find(Boolean);
    if (groupId) store.legacyLawTopicAliases[topic.id] = groupId;
  }
  if (store.issueLawGroupLinks.length === 0) {
    const migrated = new Map<string, Store["issueLawGroupLinks"][number]>();
    for (const link of legacy.issueLawLinks ?? []) {
      const lawGroupId = builtGroups.assignments.get(link.lawItemId)?.groupId;
      if (!lawGroupId) continue;
      const key = `${link.issueId}:${lawGroupId}`;
      const existing = migrated.get(key);
      migrated.set(key, {
        issueId: link.issueId,
        lawGroupId,
        matchBasis: existing?.matchBasis === "manual" || link.matchBasis === "manual" ? "manual" : link.matchBasis === "bill_title" ? "group_title" : link.matchBasis === "law_name" ? "law_name" : "core_topic",
        confidence: existing?.confidence === "high" || link.confidence === "high" ? "high" : existing?.confidence === "medium" || link.confidence === "medium" ? "medium" : "low",
        status: existing?.status === "approved" || link.matchBasis === "manual" ? "approved" : "candidate",
        claimIds: [...new Set([...(existing?.claimIds ?? []), ...link.claimIds])]
      });
    }
    store.issueLawGroupLinks = [...migrated.values()];
  }
  delete legacy.lawTopics;
  delete legacy.lawTopicMemberships;
  delete legacy.issueLawLinks;
  for (const issue of store.issues) {
    if (!issue.kind) {
      issue.kind = issue.id.startsWith("issue_public_") || issue.topicTags.includes("장소별 일정") ? "schedule_cluster" : "topic";
      const createdAt = new Date();
      const reason = issue.kind === "schedule_cluster" ? "기존 장소 일정 묶음을 주제와 구분하도록 분류했습니다." : "기존 이슈를 주제 유형으로 분류했습니다.";
      store.auditLogs.push({ id: randomUUID(), action: "state_change", targetType: "issue", targetId: issue.id, createdAt, reason });
      store.transparencyLogs.push({ id: randomUUID(), action: "state_change", targetType: "issue", targetId: issue.id, createdAt, publicReason: reason });
    }
    issue.firstSeenAt = date(issue.firstSeenAt);
    issue.lastUpdatedAt = date(issue.lastUpdatedAt);
  }
  for (const snapshot of store.issueSynthesisSnapshots) {
    snapshot.windowStartedAt = date(snapshot.windowStartedAt);
    snapshot.windowEndedAt = date(snapshot.windowEndedAt);
    snapshot.generatedAt = date(snapshot.generatedAt);
  }
  for (const link of store.occurrenceIssueLinks) {
    link.createdAt = date(link.createdAt);
    link.reviewedAt = optionalDate(link.reviewedAt);
  }
  const existingOccurrenceLinkKeys = new Set(store.occurrenceIssueLinks.map((link) => `${link.occurrenceId}:${link.issueId}`));
  for (const occurrence of store.occurrences ?? []) {
    if (!occurrence.issueId) continue;
    const key = `${occurrence.id}:${occurrence.issueId}`;
    if (existingOccurrenceLinkKeys.has(key)) continue;
    store.occurrenceIssueLinks.push({
      occurrenceId: occurrence.id,
      issueId: occurrence.issueId,
      status: "approved",
      matchBasis: "manual",
      confidence: "high",
      supportingClaimIds: [...occurrence.claimIds],
      supportingEvidenceIds: [...occurrence.evidenceIds],
      createdAt: occurrence.startsAt ?? new Date(),
      reviewedAt: occurrence.startsAt ?? new Date(),
      reviewNote: "기존 단일 이슈 연결을 다대다 승인 링크로 이전"
    });
  }
  for (const group of store.lawGroups) group.updatedAt = date(group.updatedAt);
  for (const link of store.issueLawGroupLinks) link.reviewedAt = optionalDate(link.reviewedAt);
  for (const candidate of store.newsIssueCandidates) {
    candidate.createdAt = date(candidate.createdAt);
    candidate.updatedAt = date(candidate.updatedAt);
    candidate.reviewedAt = optionalDate(candidate.reviewedAt);
  }
  for (const usage of store.newsProviderUsage) usage.updatedAt = date(usage.updatedAt);
  for (const occurrence of store.occurrences) {
    occurrence.startsAt = optionalDate(occurrence.startsAt);
    occurrence.endsAt = optionalDate(occurrence.endsAt);
    if (occurrence.publicLocation?.updatedAt) occurrence.publicLocation.updatedAt = date(occurrence.publicLocation.updatedAt);
    if (occurrence.sourcePublicLocation?.updatedAt) occurrence.sourcePublicLocation.updatedAt = date(occurrence.sourcePublicLocation.updatedAt);
    const hadLocationStatus = Boolean(occurrence.locationStatus);
    if (occurrence.publicLocation) {
      const inferredStatus: NonNullable<typeof occurrence.publicLocation.status> = occurrence.publicLocation.status
        ?? (occurrence.locationStatus === "TEXT_ONLY" ? undefined : occurrence.locationStatus)
        ?? (occurrence.publicLocation.source === "field_evidence" ? "FIELD_CORROBORATED" : "SOURCE_GEOCODED");
      occurrence.locationStatus = inferredStatus;
      occurrence.publicLocation.status = inferredStatus;
      occurrence.publicLocation.publicRadiusM ??= 300;
      occurrence.publicLocation.uncertaintyRadiusM ??= occurrence.publicLocation.publicRadiusM;
      occurrence.publicLocation.fieldEvidenceCount ??= 0;
      occurrence.locationText ??= occurrence.publicLocation.label;
      if (!occurrence.sourcePublicLocation && occurrence.publicLocation.source !== "field_evidence") {
        occurrence.sourcePublicLocation = { ...occurrence.publicLocation, status: "SOURCE_GEOCODED", fieldEvidenceCount: 0 };
      }
    } else {
      occurrence.locationStatus ??= "TEXT_ONLY";
      const officialEvidence = occurrence.evidenceIds
        .map((evidenceId) => store.evidence.find((evidence) => evidence.id === evidenceId))
        .find((evidence) => evidence?.externalProvider === "official_public_source" && evidence.sourceGranularity === "individual_schedule");
      const officialSource = officialEvidence?.externalId
        ? publicAssemblySources.find((source) => officialEvidence.externalId?.startsWith(`${source.id}:`))
        : undefined;
      const officialLocationText = occurrence.locationText ?? officialLocationTextFromTitle(occurrence.title);
      const estimate = officialSource && officialLocationText
        ? resolveOfficialLocationEstimate(officialSource.regionCode, officialLocationText)
        : undefined;
      if (estimate) {
        occurrence.locationText = officialLocationText;
        occurrence.locationStatus = estimate.status;
        occurrence.sourcePublicLocation = estimate;
        occurrence.publicLocation = estimate;
        const createdAt = new Date();
        const reason = "기존 공식 개별 일정의 공개 장소 문구를 행정구역 위치 정보와 연결해 흐린 예상 위치를 생성했습니다.";
        store.auditLogs.push({ id: randomUUID(), action: "state_change", targetType: "occurrence", targetId: occurrence.id, createdAt, reason });
        store.transparencyLogs.push({ id: randomUUID(), action: "state_change", targetType: "occurrence", targetId: occurrence.id, createdAt, publicReason: reason });
      }
    }
    if (!hadLocationStatus) {
      const createdAt = new Date();
      const reason = occurrence.locationStatus === "TEXT_ONLY"
        ? "기존 일정의 위치 상태를 좌표 확인 중으로 명시했습니다."
        : "기존 공개 위치를 공개자료 기반 위치 상태로 이전했습니다.";
      store.auditLogs.push({ id: randomUUID(), action: "state_change", targetType: "occurrence", targetId: occurrence.id, createdAt, reason });
      store.transparencyLogs.push({ id: randomUUID(), action: "state_change", targetType: "occurrence", targetId: occurrence.id, createdAt, publicReason: reason });
    }
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
    evidence.sourcePublishedAt = optionalDate(evidence.sourcePublishedAt);
    evidence.sourceCheckedAt = optionalDate(evidence.sourceCheckedAt);
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
  for (const refresh of store.publicSourceRefreshes) {
    refresh.checkedAt = date(refresh.checkedAt);
    refresh.lastSuccessfulAt = optionalDate(refresh.lastSuccessfulAt);
  }
  return store;
}

function officialLocationTextFromTitle(title: string): string | undefined {
  const match = title.match(/^(.{2,120}\s일대)\s집회 일정$/u);
  return match?.[1]?.trim();
}

function date(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function optionalDate(value: unknown): Date | undefined {
  return value === undefined || value === null ? undefined : date(value);
}
