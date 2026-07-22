import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { canServePublicRedactedMedia, createApp, createSeedStore, decryptLiveMediaBytes, emptyStore, isOccurrenceWithinPublicDiscoveryWindow, koreaRecentCalendarCutoff, reconcileEvidenceSynthesizedTopics, reconcileLegacyLocationScheduleIssues } from "./app.ts";
import { enforcePublicWriteRateLimit, publicWriteRateLimitKey, readJsonBody } from "./http-boundary.ts";
import { assertStorageSmokeKey, storageSmokeKey, storageSmokePrefix } from "./live-media-storage.ts";
import { decryptSnapshot, encryptSnapshot, hydrateStore, reconcileLegacyOfficialTextLocations } from "./postgres-store.ts";
import { blurPublicCoordinate, metersBetween, reconcileLocationFromFieldEvidence, resolveOfficialLocationEstimate } from "./location-resolution.ts";

const now = new Date("2026-07-07T09:00:00.000Z");
const daeguSourceEstimate = resolveOfficialLocationEstimate("daegu", "남산동, 중구 선거관리위원회 앞", now);
assert.ok(daeguSourceEstimate);
assert.equal(daeguSourceEstimate.status, "SOURCE_GEOCODED");
assert.equal(daeguSourceEstimate.publicRadiusM, 300);
assert.equal(daeguSourceEstimate.uncertaintyRadiusM, 1_500);
assert.deepEqual(blurPublicCoordinate(128.59, 35.864, 300), { lng: daeguSourceEstimate.lng, lat: daeguSourceEstimate.lat });
const fieldPoints = [
  { evidenceId: "field-a", lng: 128.5902, lat: 35.8641, gpsAccuracyM: 18, capturedAt: now },
  { evidenceId: "field-b", lng: 128.5904, lat: 35.8642, gpsAccuracyM: 24, capturedAt: now }
];
const corroboratedLocation = reconcileLocationFromFieldEvidence(daeguSourceEstimate, daeguSourceEstimate, fieldPoints, daeguSourceEstimate.label, now);
assert.equal(corroboratedLocation.status, "FIELD_CORROBORATED");
assert.equal(corroboratedLocation.location?.source, "field_evidence");
assert.equal(corroboratedLocation.fieldEvidenceCount, 2);
const remoteFieldPoints = [
  { evidenceId: "remote-a", lng: 128.6311, lat: 35.8581, gpsAccuracyM: 20, capturedAt: now },
  { evidenceId: "remote-b", lng: 128.6312, lat: 35.8582, gpsAccuracyM: 20, capturedAt: now }
];
const disputedLocation = reconcileLocationFromFieldEvidence(daeguSourceEstimate, daeguSourceEstimate, remoteFieldPoints, daeguSourceEstimate.label, now);
assert.equal(disputedLocation.status, "LOCATION_DISPUTED");
assert.equal(disputedLocation.location?.lng, daeguSourceEstimate.lng);
const correctedLocation = reconcileLocationFromFieldEvidence(daeguSourceEstimate, daeguSourceEstimate, [
  ...remoteFieldPoints,
  { evidenceId: "remote-c", lng: 128.6313, lat: 35.8583, gpsAccuracyM: 25, capturedAt: now }
], daeguSourceEstimate.label, now);
assert.equal(correctedLocation.status, "CORRECTED");
assert.equal(correctedLocation.location?.source, "field_evidence");
assert.equal(metersBetween(correctedLocation.location!, daeguSourceEstimate) > 1_500, true);
const conflictingLocation = reconcileLocationFromFieldEvidence(daeguSourceEstimate, daeguSourceEstimate, [
  ...fieldPoints,
  ...remoteFieldPoints
], daeguSourceEstimate.label, now);
assert.equal(conflictingLocation.status, "LOCATION_DISPUTED");
const store = createSeedStore();
const internalHeaders = { "x-musunil-internal-key": "test_internal_key" };
const testUserTokenSecret = "test_user_token_secret_32_bytes_minimum";
const testIdentity = {
  provider: "portone" as const,
  storeId: "test_store",
  identityChannelKey: "test_identity_channel",
  apiSecret: "test_portone_api_secret_32_bytes",
  sessionCookieDomain: ".musunil.test",
  testMode: true
};
const app = createApp(store, {
  internalApiKey: "test_internal_key",
  userTokenSecret: testUserTokenSecret,
  identity: testIdentity,
  publicDiscoveryNow: () => now,
  readiness: () => ({ ready: true, checks: [{ id: "test", ok: true, message: "ok" }] })
});
const productionSeed = createSeedStore({ includeMockData: false });
assert.equal(productionSeed.occurrences.some((item) => item.id === "occ_daegu_0709_public"), true);
assert.equal(productionSeed.occurrences.some((item) => item.id === "occ_1" || item.id.includes("_mock") || item.id.includes("_sample")), false);
assert.equal(productionSeed.claims.some((item) => item.id.includes("_mock") || item.id.includes("_sample") || item.targetId === "occ_1"), false);
assert.equal(productionSeed.areaClusters.some((item) => item.id === "area_busan" || item.id === "area_seoul"), false);
assert.equal(productionSeed.lawItems.length, 0);
assert.equal(productionSeed.issueLawGroupLinks.length, 0);
const productionSeedText = JSON.stringify(productionSeed);
for (const previewToken of [
  "_mock",
  "_sample",
  "preview-",
  "law_info_network_amendment",
  "law_national_assembly_impeachment",
  "law_public_official_election",
  "occ_1",
  "presence_1",
  "transit_1",
  "crowd_1",
  "checkpoint_1",
  "\"id\":\"area_seoul\"",
  "\"id\":\"area_busan\"",
  "\"id\":\"area_daejeon\""
]) {
  assert.equal(productionSeedText.includes(previewToken), false);
}
const linkReviewStore = createSeedStore();
createApp(linkReviewStore);
const linkReviewGroup = linkReviewStore.lawGroups[0];
linkReviewStore.issues.push({
  id: "issue_law_group_review",
  title: linkReviewGroup.coreTopics[0]?.label || linkReviewGroup.lawName,
  kind: "topic",
  normalizedTopicKey: "law-group-review",
  topicTags: linkReviewGroup.coreTopics[0]?.representativeKeywords || [linkReviewGroup.lawName],
  status: "active",
  firstSeenAt: now,
  lastUpdatedAt: now
});
const linkReviewApp = createApp(linkReviewStore, { internalApiKey: "test_internal_key" });
const lawGroupCandidatesResponse = await linkReviewApp.handle({ method: "GET", path: "/admin/law-group-link-candidates", headers: internalHeaders });
assert.equal(lawGroupCandidatesResponse.status, 200);
const lawGroupCandidates = (lawGroupCandidatesResponse.body as { candidates: Array<{ link: { issueId: string; lawGroupId: string } }> }).candidates;
assert.equal(lawGroupCandidates.length > 0, true);
const firstLawGroupCandidate = lawGroupCandidates.find((candidate) => candidate.link.issueId === "issue_law_group_review")?.link;
assert.ok(firstLawGroupCandidate);
const approvedLawGroupLink = await linkReviewApp.handle({
  method: "PATCH",
  path: `/admin/law-group-links/${firstLawGroupCandidate.issueId}/${firstLawGroupCandidate.lawGroupId}`,
  headers: internalHeaders,
  body: { status: "approved", reviewNote: "self-check approval" }
});
assert.equal(approvedLawGroupLink.status, 200);
const approvedLawGroupDetail = await linkReviewApp.handle({ method: "GET", path: `/law-groups/${firstLawGroupCandidate.lawGroupId}` });
assert.equal((approvedLawGroupDetail.body as { issues: unknown[] }).issues.length > 0, true);
const approvedGroup = linkReviewApp.store.lawGroups.find((group) => group.id === firstLawGroupCandidate.lawGroupId);
const approvedGroupLawDetail = await linkReviewApp.handle({ method: "GET", path: `/laws/${approvedGroup?.billIds[0]}` });
assert.equal((approvedGroupLawDetail.body as { issues: unknown[] }).issues.length > 0, true);
assert.equal((approvedGroupLawDetail.body as { lawGroup?: { id: string } }).lawGroup?.id, firstLawGroupCandidate.lawGroupId);
const newsReviewStore = createSeedStore();
const newsReviewApp = createApp(newsReviewStore, { internalApiKey: "test_internal_key" });
const newsReviewGroup = newsReviewStore.lawGroups.find((group) => group.coreTopics.length > 0)!;
const newsReviewTopic = newsReviewGroup.coreTopics[0];
for (const [index, hostname] of ["news-one.example", "news-two.example"].entries()) {
  const response = await newsReviewApp.handle({
    method: "POST",
    path: "/internal/ingest/news",
    headers: internalHeaders,
    body: {
      provider: "publisher_rss",
      lawGroupId: newsReviewGroup.id,
      coreTopicKey: newsReviewTopic.key,
      sourceTitle: `공개 응답에 노출하면 안 되는 원제목 ${index + 1}`,
      sourceUrl: `https://${hostname}/article-${index + 1}`,
      publisherLabel: "테스트매체",
      publishedAt: new Date(Date.now() - index * 60_000).toISOString(),
      providerItemId: `news-provider-item-${index + 1}`,
      directBillMatch: index === 0,
      sourceId: "news_rss_test",
      sourceCheckedAt: new Date().toISOString(),
      sourceBatchSize: 2
    }
  });
  assert.equal(response.status, 201);
}
const newsCandidatesResponse = await newsReviewApp.handle({ method: "GET", path: "/admin/news-issue-candidates", headers: internalHeaders });
assert.equal(newsCandidatesResponse.status, 200);
assert.equal((newsCandidatesResponse.body as { candidates: unknown[] }).candidates.length, 0);
const synthesizedNewsCandidate = newsReviewStore.newsIssueCandidates.find((candidate) => candidate.lawGroupId === newsReviewGroup.id)!;
assert.equal(synthesizedNewsCandidate.status, "approved");
assert.equal(synthesizedNewsCandidate.approvedEvidenceIds.length, 2);
assert.equal(typeof synthesizedNewsCandidate.issueId, "string");
const synthesisSnapshot = newsReviewStore.issueSynthesisSnapshots.find((snapshot) => snapshot.issueId === synthesizedNewsCandidate.issueId);
assert.equal(synthesisSnapshot?.evidenceCount, 2);
assert.equal(synthesisSnapshot?.facets.some((facet) => facet.coreTopicKey === newsReviewTopic.key && facet.claimIds.length === 2), true);
assert.equal(newsReviewStore.lawGroupMemberships.every((membership) => Boolean(membership.coreTopicKey && membership.classificationBasis)), true);
const synthesizedHome = await newsReviewApp.handle({ method: "GET", path: "/home" });
assert.equal((synthesizedHome.body as { issueOverviews: Array<{ id: string; occurrenceCount: number }> }).issueOverviews.some((issue) => issue.id === synthesizedNewsCandidate.issueId), false);
const newsGroupDetail = await newsReviewApp.handle({ method: "GET", path: `/law-groups/${newsReviewGroup.id}` });
assert.equal((newsGroupDetail.body as { issues: Array<{ newsCount: number; recentNews: unknown[] }> }).issues.some((issue) => issue.newsCount === 2 && issue.recentNews.length === 2), true);
const filteredGroupDetail = await newsReviewApp.handle({ method: "GET", path: `/law-groups/${newsReviewGroup.id}?coreTopic=${encodeURIComponent(newsReviewTopic.key)}&pageSize=1&page=1` });
assert.equal((filteredGroupDetail.body as { selectedCoreTopicKey: string }).selectedCoreTopicKey, newsReviewTopic.key);
assert.equal((filteredGroupDetail.body as { bills: unknown[] }).bills.length <= 1, true);
assert.equal((filteredGroupDetail.body as { pagination: { total: number } }).pagination.total >= 1, true);
assert.equal(JSON.stringify(newsGroupDetail.body).includes("공개 응답에 노출하면 안 되는 원제목"), false);
const newsIssueDetail = await newsReviewApp.handle({ method: "GET", path: `/issues/${synthesizedNewsCandidate.issueId}` });
assert.equal((newsIssueDetail.body as { newsArticles: unknown[] }).newsArticles.length, 2);
assert.equal(JSON.stringify(newsIssueDetail.body).includes("공개 응답에 노출하면 안 되는 원제목"), false);
assert.equal((newsIssueDetail.body as { topicGrouping: { synthesisBasis: string; basis: string[] } }).topicGrouping.synthesisBasis, "evidence_aggregate");
assert.equal((newsIssueDetail.body as { topicGrouping: { basis: string[] } }).topicGrouping.basis.some((item) => item.includes("공통 쟁점")), true);
assert.equal((newsIssueDetail.body as { topicGrouping: { synthesis: { evidenceCount: number; facets: unknown[] } } }).topicGrouping.synthesis.evidenceCount, 2);
assert.equal((newsIssueDetail.body as { relatedLawGroups: Array<{ id: string }> }).relatedLawGroups.some((group) => group.id === newsReviewGroup.id), true);
const evidenceLinkedOccurrence = await newsReviewApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrence",
  headers: internalHeaders,
  body: {
    id: "occ_evidence_synthesis_link",
    type: "static_assembly",
    areaClusterId: "area_seoul",
    regionLabel: "서울",
    title: "공개 공지 기반 집회",
    startsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    lifecycleState: "UPCOMING",
    sourceProvenance: "organizer_or_group",
    claimantLabel: "공개 공지",
    normalizedStatement: `${newsReviewGroup.lawName} ${newsReviewTopic.label} 개선 요구 집회가 공지되었습니다.`
  }
});
assert.equal(evidenceLinkedOccurrence.status, 201);
assert.equal((evidenceLinkedOccurrence.body as { occurrence: { issueId?: string } }).occurrence.issueId, synthesizedNewsCandidate.issueId);
assert.equal(newsReviewStore.occurrenceIssueLinks.some((link) => link.occurrenceId === "occ_evidence_synthesis_link" && link.issueId === synthesizedNewsCandidate.issueId && link.status === "approved"), true);
const eventTopicStore = createSeedStore();
const eventTopicApp = createApp(eventTopicStore, { internalApiKey: "test_internal_key" });
const eventTopicStartsAt = new Date(Date.now() + 6 * 60 * 60_000);
const eventTopicDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(eventTopicStartsAt);
const eventTopicOccurrence = await eventTopicApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrence",
  headers: internalHeaders,
  body: {
    id: "occ_event_topic_candidate",
    type: "static_assembly",
    areaClusterId: "area_seoul",
    regionLabel: "서울",
    title: "홍대입구역 일대 집회 일정",
    publicLocationText: "홍대입구역 일대",
    startsAt: eventTopicStartsAt.toISOString(),
    lifecycleState: "UPCOMING",
    sourceProvenance: "government_or_police",
    claimantLabel: "경찰 공개자료",
    normalizedStatement: "경찰 공개자료에 홍대입구역 일대 집회 일정이 안내되었습니다."
  }
});
assert.equal(eventTopicOccurrence.status, 201);
for (const [index, publisherLabel] of ["테스트일보", "검증뉴스"].entries()) {
  const response = await eventTopicApp.handle({
    method: "POST",
    path: "/internal/ingest/event-topic-evidence",
    headers: internalHeaders,
    body: {
      provider: "publisher_rss",
      occurrenceId: "occ_event_topic_candidate",
      eventDate: eventTopicDate,
      topicTitle: "재선거 요구 관련 집회",
      topicTags: ["재선거", "요구", "집회"],
      sourceTitle: `공개 응답에 그대로 노출하지 않을 이벤트 보도 제목 ${index + 1}`,
      sourceUrl: `https://event-news-${index + 1}.example/article`,
      publisherLabel,
      publishedAt: new Date(eventTopicStartsAt.getTime() - 24 * 60 * 60_000).toISOString(),
      providerItemId: `event-topic-provider-${index + 1}`,
      matchedLocationTerms: ["홍대입구역"],
      dateMatched: true,
      locationMatched: true,
      timeMatched: true,
      uniqueLocationMatched: true
    }
  });
  assert.equal(response.status, 201);
  assert.equal((response.body as { linkStatus: string }).linkStatus, index === 0 ? "candidate" : "approved");
  if (index === 0) {
    const candidateDetail = await eventTopicApp.handle({ method: "GET", path: "/occurrences/occ_event_topic_candidate" });
    const candidateDigest = (candidateDetail.body as { occurrenceDigest: { issueTitle?: string; topicStatus: string; topicCandidate?: { title: string; sourceCount: number } } }).occurrenceDigest;
    assert.equal(candidateDigest.issueTitle, undefined);
    assert.equal(candidateDigest.topicStatus, "candidate");
    assert.equal(candidateDigest.topicCandidate?.title, "재선거 요구 관련 집회");
    assert.equal(candidateDigest.topicCandidate?.sourceCount, 1);
    assert.equal(JSON.stringify(candidateDetail.body).includes("공개 응답에 그대로 노출하지 않을 이벤트 보도 제목"), false);
  }
}
const approvedEventTopicDetail = await eventTopicApp.handle({ method: "GET", path: "/occurrences/occ_event_topic_candidate" });
const approvedEventTopicDigest = (approvedEventTopicDetail.body as { occurrenceDigest: { issueTitle?: string; topicStatus: string; topicCandidate?: unknown } }).occurrenceDigest;
assert.equal(approvedEventTopicDigest.issueTitle, "재선거 요구 관련 집회");
assert.equal(approvedEventTopicDigest.topicStatus, "linked");
assert.equal(approvedEventTopicDigest.topicCandidate, undefined);
assert.equal(eventTopicStore.auditLogs.some((log) => log.targetId === "occ_event_topic_candidate" && log.action === "hold"), true);
assert.equal(eventTopicStore.auditLogs.some((log) => log.targetId === "occ_event_topic_candidate" && log.action === "merge"), true);
const alternateIssue = newsReviewStore.issues.find((issue) => issue.id !== synthesizedNewsCandidate.issueId)!;
newsReviewStore.occurrenceIssueLinks.push({ occurrenceId: "occ_evidence_synthesis_link", issueId: alternateIssue.id, status: "candidate", matchBasis: "occurrence_claim", confidence: "medium", supportingClaimIds: [], supportingEvidenceIds: [], createdAt: new Date() });
const occurrenceLinkCandidates = await newsReviewApp.handle({ method: "GET", path: "/admin/occurrence-issue-link-candidates", headers: internalHeaders });
assert.equal((occurrenceLinkCandidates.body as { candidates: unknown[] }).candidates.length >= 1, true);
const rejectedOccurrenceLink = await newsReviewApp.handle({ method: "PATCH", path: `/admin/occurrence-issue-links/occ_evidence_synthesis_link/${alternateIssue.id}`, headers: internalHeaders, body: { status: "rejected", reviewNote: "self-check ambiguity rejection" } });
assert.equal((rejectedOccurrenceLink.body as { link: { status: string } }).link.status, "rejected");
assert.equal(newsReviewStore.auditLogs.some((log) => log.targetId === "occ_evidence_synthesis_link" && log.action === "merge"), true);
assert.equal(reconcileEvidenceSynthesizedTopics(newsReviewStore), 0);
const initialNewsBudget = await newsReviewApp.handle({ method: "GET", path: "/internal/news-ingest-budget", headers: internalHeaders });
assert.equal((initialNewsBudget.body as { remaining: number }).remaining, 20_000);
const updatedNewsBudget = await newsReviewApp.handle({ method: "POST", path: "/internal/news-ingest-usage", headers: internalHeaders, body: { provider: "publisher_rss", month: new Date().toISOString().slice(0, 7), callCount: 24 } });
assert.equal((updatedNewsBudget.body as { callCount: number; remaining: number }).callCount, 24);
assert.equal((updatedNewsBudget.body as { remaining: number }).remaining, 19_976);
const productionHome = await createApp(productionSeed).handle({ method: "GET", path: "/home" });
assert.equal(JSON.stringify(productionHome.body).includes("대구 0709(목) 오늘의 집회 공개 일정"), false);
assert.equal(JSON.stringify(productionHome.body).includes("부산 도심 행진 가능성"), false);
assert.equal(JSON.stringify(productionHome.body).includes("issueCards"), true);
assert.equal((productionHome.body as { issueCards: unknown[] }).issueCards.length, 0);
const productionLaws = await createApp(productionSeed).handle({ method: "GET", path: "/laws" });
assert.equal((productionLaws.body as { laws: unknown[] }).laws.length, 0);
assert.equal((await createApp(productionSeed).handle({ method: "GET", path: "/laws/law_info_network_amendment" })).status, 404);
const productionReels = await createApp(productionSeed).handle({ method: "GET", path: "/reels?seed=production-check" });
assert.equal(productionReels.status, 200);
assert.equal((productionReels.body as { reels: unknown[] }).reels.length, 0);
assert.equal(JSON.stringify(productionReels.body).includes("preview-"), false);
const encryptedSnapshot = encryptSnapshot('{"raw":"사용자 원문"}', "test_encryption_key_32_bytes_minimum");
assert.equal(encryptedSnapshot.includes("사용자 원문"), false);
assert.equal(decryptSnapshot(encryptedSnapshot, "test_encryption_key_32_bytes_minimum"), '{"raw":"사용자 원문"}');
assert.throws(() => decryptSnapshot(encryptedSnapshot, "wrong_encryption_key_32_bytes_minimum"));
const legacySourceStore = createSeedStore();
createApp(legacySourceStore);
const legacySourceGroup = legacySourceStore.lawGroups[0];
const legacySnapshot = JSON.parse(JSON.stringify(legacySourceStore)) as Record<string, unknown>;
const legacyTextOccurrenceId = "occ_legacy_official_text_location";
(legacySnapshot.occurrences as Array<Record<string, unknown>>).push({
  id: legacyTextOccurrenceId,
  type: "static_assembly",
  areaClusterId: "area_seoul",
  regionLabel: "서울",
  title: "서초구 파고다타워 일대 집회 일정",
  publicVisibility: "public",
  locationStatus: "TEXT_ONLY",
  startsAt: "2026-07-17T07:00:00.000Z",
  endsAt: "2026-07-17T11:00:00.000Z",
  lifecycleState: "ENDED",
  claimIds: [],
  evidenceIds: ["ev_legacy_official_text_location"]
});
(legacySnapshot.evidence as Array<Record<string, unknown>>).push({
  id: "ev_legacy_official_text_location",
  evidenceType: "official_doc",
  uploadedAt: "2026-07-16T22:23:18.000Z",
  proofOfPresenceStatus: "material_only",
  externalProvider: "official_public_source",
  externalId: "seoul_assembly_control:2013:event:4",
  sourceGranularity: "individual_schedule"
});
legacySnapshot.lawTopics = [{ id: "law_topic_legacy", billIds: legacySourceGroup.billIds, updatedAt: legacySourceGroup.updatedAt }];
legacySnapshot.lawTopicMemberships = legacySourceGroup.billIds.map((lawItemId) => ({ lawItemId, lawTopicId: "law_topic_legacy" }));
legacySnapshot.issueLawLinks = [{ issueId: legacySourceStore.issues[0].id, lawItemId: legacySourceGroup.billIds[0], matchBasis: "manual", confidence: "high", claimIds: [] }];
delete legacySnapshot.lawGroups;
delete legacySnapshot.lawGroupMemberships;
delete legacySnapshot.issueLawGroupLinks;
delete legacySnapshot.legacyLawTopicAliases;
delete (legacySnapshot.issues as Array<Record<string, unknown>>)[0]?.kind;
const hydratedLegacyStore = hydrateStore(legacySnapshot as unknown as typeof legacySourceStore);
assert.equal(reconcileLegacyOfficialTextLocations(hydratedLegacyStore), 1);
assert.equal(hydratedLegacyStore.lawGroups.length > 0, true);
assert.equal(hydratedLegacyStore.legacyLawTopicAliases.law_topic_legacy, hydratedLegacyStore.lawItems.find((law) => law.id === legacySourceGroup.billIds[0])?.lawGroupId);
assert.equal(hydratedLegacyStore.issueLawGroupLinks.some((link) => link.status === "approved" && link.matchBasis === "manual"), true);
assert.equal("lawTopics" in hydratedLegacyStore, false);
assert.equal(hydratedLegacyStore.issues[0]?.kind, "schedule_cluster");
assert.equal(hydratedLegacyStore.auditLogs.some((log) => log.targetId === hydratedLegacyStore.issues[0]?.id && log.action === "state_change"), true);
const hydratedLocatedOccurrence = hydratedLegacyStore.occurrences.find((occurrence) => occurrence.publicLocation);
assert.ok(hydratedLocatedOccurrence);
assert.equal(hydratedLocatedOccurrence.locationStatus, "SOURCE_GEOCODED");
assert.equal(hydratedLocatedOccurrence.publicLocation?.publicRadiusM, 300);
assert.equal(hydratedLocatedOccurrence.sourcePublicLocation?.source, hydratedLocatedOccurrence.publicLocation?.source);
const hydratedLegacyTextOccurrence = hydratedLegacyStore.occurrences.find((occurrence) => occurrence.id === legacyTextOccurrenceId);
assert.equal(hydratedLegacyTextOccurrence?.locationStatus, "SOURCE_GEOCODED");
assert.equal(hydratedLegacyTextOccurrence?.publicLocation?.publicRadiusM, 300);
assert.equal(hydratedLegacyTextOccurrence?.publicLocation?.label, "서초구 파고다타워 일대");
const legacyTextLocationLogCount = hydratedLegacyStore.auditLogs.filter((log) => log.targetId === legacyTextOccurrenceId && log.action === "state_change").length;
const locationMigrationLogCount = hydratedLegacyStore.auditLogs.filter((log) => log.targetId === hydratedLocatedOccurrence.id && log.action === "state_change").length;
hydrateStore(hydratedLegacyStore);
assert.equal(reconcileLegacyOfficialTextLocations(hydratedLegacyStore), 0);
assert.equal(hydratedLegacyStore.auditLogs.filter((log) => log.targetId === hydratedLocatedOccurrence.id && log.action === "state_change").length, locationMigrationLogCount);
assert.equal(hydratedLegacyStore.auditLogs.filter((log) => log.targetId === legacyTextOccurrenceId && log.action === "state_change").length, legacyTextLocationLogCount);
const generatedStorageSmokeKey = storageSmokeKey();
assert.equal(generatedStorageSmokeKey.startsWith(storageSmokePrefix()), true);
assert.doesNotThrow(() => assertStorageSmokeKey(generatedStorageSmokeKey));
assert.doesNotThrow(() => assertStorageSmokeKey(`${storageSmokePrefix()}manual-smoke.txt`));
for (const unsafeStorageSmokeKey of [
  "private/live/original/occ-live-1.webm",
  `${storageSmokePrefix()}../original/occ-live-1.webm`,
  `${storageSmokePrefix()}nested//bad.txt`,
  "private/live/smoke"
]) {
  assert.throws(() => assertStorageSmokeKey(unsafeStorageSmokeKey), /MUSUNIL_STORAGE_SMOKE_KEY must stay under/);
}
const user1Session = await verifiedIdentitySession(app);
const user1Headers = userHeaders(user1Session);
const routeOnlySession = await verifiedIdentitySession(app);
const mutedSession = await verifiedIdentitySession(app);
const attackerSession = await verifiedIdentitySession(app);
const cookieOnlySession = await verifiedIdentitySession(app);

assert.equal((await app.handle({ method: "GET", path: "/health" })).status, 200);
const sourceCoverage = await app.handle({ method: "GET", path: "/public-sources/coverage" });
assert.equal(sourceCoverage.status, 200);
assert.equal((sourceCoverage.body as { coverage: { totalPoliceRegions: number; activeScheduleRegions: number; policy: string } }).coverage.totalPoliceRegions, 18);
assert.equal((sourceCoverage.body as { coverage: { totalPoliceRegions: number; activeScheduleRegions: number; policy: string } }).coverage.activeScheduleRegions, 18);
assert.equal(
  (sourceCoverage.body as { coverage: { totalPoliceRegions: number; activeScheduleRegions: number; policy: string } }).coverage.policy,
  "absence_of_public_source_is_not_absence_of_assembly"
);
assert.equal(typeof (sourceCoverage.body as { coverage: { eventCoverage: { sourceReachRegions: number; eventLevelRegions: number; geocodedEventRegions: number; boardPostOnlyRegions: string[] } } }).coverage.eventCoverage.sourceReachRegions, "number");
assert.equal(Array.isArray((sourceCoverage.body as { coverage: { eventCoverage: { boardPostOnlyRegions: string[] } } }).coverage.eventCoverage.boardPostOnlyRegions), true);
const coverageBody = sourceCoverage.body as {
  coverage: {
    candidateScheduleRegions: number;
    statisticsOnlyRegions: number;
    needsDiscoveryRegions: number;
    nextRefreshAt?: string;
    regions: Array<{ code: string; refreshCadenceHours: number; lastCheckedAt: string; nextRefreshAt: string; gapReason: string; coverageLevel: string }>;
  };
};
assert.equal(coverageBody.coverage.candidateScheduleRegions, 0);
assert.equal(coverageBody.coverage.statisticsOnlyRegions, 0);
assert.equal(coverageBody.coverage.needsDiscoveryRegions, 0);
assert.equal(typeof coverageBody.coverage.nextRefreshAt, "string");
assert.equal(coverageBody.coverage.regions.length, 18);
assert.equal(coverageBody.coverage.regions.every((region) => region.refreshCadenceHours > 0 && region.lastCheckedAt && region.nextRefreshAt && region.gapReason), true);
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "seoul")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "sejong")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "gangwon")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "busan")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "gyeonggi_south")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "gyeonggi_north")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "gwangju")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "incheon")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "gyeongbuk")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "gyeongnam")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "jeju")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "chungbuk")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "ulsan")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "chungnam")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "jeonbuk")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "jeonnam")?.coverageLevel, "daily_schedule");
assert.equal(coverageBody.coverage.regions.find((region) => region.code === "daejeon")?.coverageLevel, "daily_schedule");
const publicPayloads = [
  await app.handle({ method: "GET", path: "/home" }),
  await app.handle({ method: "GET", path: "/occurrences/occ_1" }),
  await app.handle({ method: "GET", path: "/continuous-presences/presence_1" }),
  await app.handle({ method: "GET", path: "/issues/issue_1" }),
  await app.handle({ method: "GET", path: "/laws" }),
  await app.handle({ method: "GET", path: "/laws/law_info_network_amendment" }),
  await app.handle({ method: "GET", path: "/targets/occurrence/occ_1/live-claims" }),
  await app.handle({ method: "GET", path: "/targets/issue/issue_1/live-claims" }),
  await app.handle({ method: "GET", path: "/reels?seed=public-surface" }),
  await app.handle({ method: "GET", path: "/area-clusters" }),
  await app.handle({ method: "GET", path: "/map" }),
  await app.handle({ method: "GET", path: "/transparency/logs" })
];
for (const payload of publicPayloads) {
  assert.equal(payload.status, 200);
  assertPublicPayloadSafe(payload.body);
}
const transparencyPage = await app.handle({ method: "GET", path: "/transparency/logs?limit=2" });
assert.equal((transparencyPage.body as { logs: unknown[] }).logs.length <= 2, true);
assert.equal(JSON.stringify(transparencyPage.body).includes("statement"), false);
const liveClaims = await app.handle({ method: "GET", path: "/targets/occurrence/occ_1/live-claims" });
assert.equal(liveClaims.status, 200);
assert.equal((liveClaims.body as { liveClaims: Array<{ claim: { id: string }; redactionStatus: string; media: { redactedClipUrl: string } }> }).liveClaims[0]?.claim.id, "claim_occ_live_1");
assert.equal((liveClaims.body as { liveClaims: Array<{ redactionStatus: string }> }).liveClaims[0]?.redactionStatus, "completed");
assert.equal((liveClaims.body as { liveClaims: Array<{ media: { redactedClipUrl: string; redactedPosterUrl?: string } }> }).liveClaims[0]?.media.redactedClipUrl, "/media/redacted/preview-occ-live-1.webm");
assert.equal((liveClaims.body as { liveClaims: Array<{ media: { redactedPosterUrl?: string } }> }).liveClaims[0]?.media.redactedPosterUrl, "/media/redacted/preview-occ-live-1-poster.png");
const globalReels = await app.handle({ method: "GET", path: "/reels?seed=fairness-check" });
assert.equal(globalReels.status, 200);
const globalReelBody = globalReels.body as {
  reels: Array<{
    id: string;
    claimId: string;
    occurrenceId: string;
    targetType: string;
    issueId?: string;
    regionLabel: string;
    summary: string;
    media: { redactedClipUrl: string; redactedPosterUrl?: string };
    occurrenceDigest: { id: string; targetType: string };
  }>;
  eligibleBucketCount: number;
  policy: string;
};
assert.equal(globalReelBody.policy, "issue_occurrence_region_round_robin");
assert.equal(globalReelBody.reels.length >= 3, true);
assert.equal(globalReelBody.eligibleBucketCount, new Set(globalReelBody.reels.map((reel) => `${reel.issueId}:${reel.regionLabel}:${reel.occurrenceId}`)).size);
assert.equal(globalReelBody.reels.every((reel) => reel.targetType === "occurrence" || reel.targetType === "continuous_presence"), true);
assert.equal(globalReelBody.reels.every((reel) => reel.claimId && reel.occurrenceId && reel.summary && reel.media.redactedClipUrl && reel.occurrenceDigest.id === reel.occurrenceId), true);
assertPublicPayloadSafe(globalReelBody);
const seenReelIds = new Set<string>();
for (let index = 0; index < 10_000; index += 1) {
  const response = await app.handle({ method: "GET", path: `/reels?seed=fairness-${index}` });
  const body = response.body as { reels: typeof globalReelBody.reels };
  for (const reel of body.reels) seenReelIds.add(reel.id);
  for (let reelIndex = 0; reelIndex < body.reels.length - 1; reelIndex += 1) {
    const currentIssue = body.reels[reelIndex].issueId || "unlinked";
    const laterHasDifferentIssue = body.reels.slice(reelIndex + 1).some((reel) => (reel.issueId || "unlinked") !== currentIssue);
    if (laterHasDifferentIssue) assert.notEqual(body.reels[reelIndex + 1].issueId || "unlinked", currentIssue);
  }
}
assert.deepEqual([...seenReelIds].sort(), globalReelBody.reels.map((reel) => reel.id).sort());
const missingPublicRedactionStore = createSeedStore();
const missingPublicRedactionEvidence = missingPublicRedactionStore.evidence.find((item) => item.id === "ev_occ_live_1");
if (missingPublicRedactionEvidence) missingPublicRedactionEvidence.publicStorageKey = undefined;
const missingPublicRedactionClaims = await createApp(missingPublicRedactionStore).handle({ method: "GET", path: "/targets/occurrence/occ_1/live-claims" });
assert.equal((missingPublicRedactionClaims.body as { liveClaims: unknown[] }).liveClaims.length, 0);
const missingPublicPosterStore = createSeedStore();
const missingPublicPosterEvidence = missingPublicPosterStore.evidence.find((item) => item.id === "ev_occ_live_1");
if (missingPublicPosterEvidence) missingPublicPosterEvidence.publicPosterKey = undefined;
const missingPublicPosterClaims = await createApp(missingPublicPosterStore).handle({ method: "GET", path: "/targets/occurrence/occ_1/live-claims" });
assert.equal((missingPublicPosterClaims.body as { liveClaims: unknown[] }).liveClaims.length, 0);
for (const evidenceId of ["ev_occ_live_1", "ev_presence_1", "ev_sample_daejeon_live"]) {
  const evidence = missingPublicRedactionStore.evidence.find((item) => item.id === evidenceId);
  if (evidence) evidence.publicStorageKey = undefined;
}
const missingPublishableIssue = await createApp(missingPublicRedactionStore).handle({ method: "GET", path: "/issues/issue_1" });
assert.equal((missingPublishableIssue.body as { nationalSummary: { liveClaimCount: number } }).nationalSummary.liveClaimCount, 0);
assert.equal((missingPublishableIssue.body as { crowdEstimates: unknown[] }).crowdEstimates.length, 0);
assert.equal(
  (missingPublishableIssue.body as { nationalTimeline: { moments: Array<{ title: string }> } }).nationalTimeline.moments.some((moment) => moment.title.includes("현장 영상 Claim")),
  false
);
assert.equal(JSON.stringify(missingPublishableIssue.body).includes("공개 Claim"), false);
assert.equal(JSON.stringify(missingPublishableIssue.body).includes("현장 Claim"), false);
const missingPublishablePosterStore = createSeedStore();
for (const evidenceId of ["ev_occ_live_1", "ev_presence_1", "ev_sample_daejeon_live"]) {
  const evidence = missingPublishablePosterStore.evidence.find((item) => item.id === evidenceId);
  if (evidence) evidence.publicPosterKey = undefined;
}
const missingPublishablePosterIssue = await createApp(missingPublishablePosterStore).handle({ method: "GET", path: "/issues/issue_1" });
assert.equal((missingPublishablePosterIssue.body as { nationalSummary: { liveClaimCount: number } }).nationalSummary.liveClaimCount, 0);
assert.equal((missingPublishablePosterIssue.body as { crowdEstimates: unknown[] }).crowdEstimates.length, 0);
const integrityStore = createSeedStore();
const integrityApp = createApp(integrityStore, { internalApiKey: "test_internal_key" });
const unauthedIntegrityPatch = await integrityApp.handle({
  method: "PATCH",
  path: "/internal/evidence/ev_occ_live_1/device-integrity",
  body: { deviceIntegrityStatus: "unknown" }
});
assert.equal(unauthedIntegrityPatch.status, 401);
const invalidIntegrityPatch = await integrityApp.handle({
  method: "PATCH",
  path: "/internal/evidence/ev_occ_live_1/device-integrity",
  headers: internalHeaders,
  body: { deviceIntegrityStatus: "trusted_by_client" }
});
assert.equal(invalidIntegrityPatch.status, 400);
const missingIntegrityProof = await integrityApp.handle({
  method: "PATCH",
  path: "/internal/evidence/ev_occ_live_1/device-integrity",
  headers: internalHeaders,
  body: { deviceIntegrityStatus: "pass", provider: "play_integrity" }
});
assert.equal(missingIntegrityProof.status, 400);
assert.equal((missingIntegrityProof.body as { error: string }).error, "device_integrity_proof_required");
const trustedIntegrityPatch = await integrityApp.handle({
  method: "PATCH",
  path: "/internal/evidence/ev_occ_live_1/device-integrity",
  headers: internalHeaders,
  body: { deviceIntegrityStatus: "unknown", provider: "play_integrity", attestationToken: "integrity-unknown-token" }
});
assert.equal(trustedIntegrityPatch.status, 200);
assert.equal(integrityStore.evidence.find((item) => item.id === "ev_occ_live_1")?.deviceIntegrityStatus, "unknown");
assert.equal(integrityStore.evidence.find((item) => item.id === "ev_occ_live_1")?.deviceIntegrityProvider, "play_integrity");
assert.equal(JSON.stringify(trustedIntegrityPatch.body).includes("integrity-unknown-token"), false);
const trustedIntegrityPass = await integrityApp.handle({
  method: "PATCH",
  path: "/internal/evidence/ev_occ_live_1/device-integrity",
  headers: internalHeaders,
  body: { deviceIntegrityStatus: "pass", provider: "app_attest", attestationHash: "sha256-trusteddeviceintegrityhash" }
});
assert.equal(trustedIntegrityPass.status, 200);
assert.equal(integrityStore.evidence.find((item) => item.id === "ev_occ_live_1")?.deviceIntegrityStatus, "pass");
assert.equal(integrityStore.evidence.find((item) => item.id === "ev_occ_live_1")?.deviceIntegrityProvider, "app_attest");
assert.equal(integrityStore.evidence.find((item) => item.id === "ev_occ_live_1")?.deviceIntegrityProofHash, "sha256-trusteddeviceintegrityhash");
const staleFieldCapturedAt = new Date(Date.now() - 10 * 60_000).toISOString();
const freshFieldCapturedAt = new Date(Date.now() - 60_000).toISOString();
const unscopedVerification = await app.handle({
  method: "POST",
  path: "/claims/claim_occ_live_1/field-verifications",
  body: {
    fieldVerification: "field_aligned",
    capturedAt: freshFieldCapturedAt,
    uploadedAt: new Date("2026-07-07T09:04:00.000Z").toISOString(),
    foregroundGps: true,
    gpsAccuracyM: 30,
    gpsLng: 126.9783,
    gpsLat: 37.5667,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    deviceAttestation: "field-device-cluster"
  }
});
assert.equal(unscopedVerification.status, 401);
const badVerification = await app.handle({
  method: "POST",
  path: "/claims/claim_occ_live_1/field-verifications",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    fieldVerification: "field_aligned",
    capturedAt: staleFieldCapturedAt,
    uploadedAt: new Date(Date.now() - 9 * 60_000).toISOString(),
    foregroundGps: true,
    gpsAccuracyM: 30,
    gpsLng: 126.9783,
    gpsLat: 37.5667,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    deviceAttestation: "field-device-cluster"
  }
});
assert.equal(badVerification.status, 422);
const alignedVerification = await app.handle({
  method: "POST",
  path: "/claims/claim_occ_live_1/field-verifications",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    fieldVerification: "field_aligned",
    capturedAt: freshFieldCapturedAt,
    uploadedAt: new Date("2026-07-07T09:04:00.000Z").toISOString(),
    foregroundGps: true,
    gpsAccuracyM: 30,
    gpsLng: 126.9783,
    gpsLat: 37.5667,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    deviceAttestation: "field-device-cluster"
  }
});
assert.equal(alignedVerification.status, 202);
const alignedVerificationClaimId = (alignedVerification.body as { claim: { id: string; visibility: string }; evidenceId: string }).claim.id;
const alignedVerificationEvidenceId = (alignedVerification.body as { claim: { id: string; visibility: string }; evidenceId: string }).evidenceId;
assert.equal((alignedVerification.body as { claim: { visibility: string } }).claim.visibility, "held_private");
assert.equal((alignedVerification.body as { liveClaim: { fieldVerification: { aligned: number; disputed: number } } }).liveClaim.fieldVerification.aligned, 0);
const publishUntrustedFieldVerification = await app.handle({
  method: "PATCH",
  path: `/admin/claims/${alignedVerificationClaimId}`,
  headers: internalHeaders,
  body: { visibility: "public", riskLevel: "low", publicReason: "현장 판단 공개 전 검증 누락" }
});
assert.equal(publishUntrustedFieldVerification.status, 400);
assert.equal((publishUntrustedFieldVerification.body as { error: string }).error, "device_integrity_required");
const trustedAlignedFieldVerification = await app.handle({
  method: "PATCH",
  path: `/internal/evidence/${alignedVerificationEvidenceId}/device-integrity`,
  headers: internalHeaders,
  body: { deviceIntegrityStatus: "pass", provider: "play_integrity", attestationToken: "trusted-field-aligned-token" }
});
assert.equal(trustedAlignedFieldVerification.status, 200);
assert.equal(store.evidence.find((item) => item.id === alignedVerificationEvidenceId)?.deviceIntegrityProofHash?.startsWith("sha256-"), true);
assert.equal(
  (
    await app.handle({
      method: "PATCH",
      path: `/admin/claims/${alignedVerificationClaimId}`,
      headers: internalHeaders,
      body: { visibility: "public", riskLevel: "low", publicReason: "현장 판단 verifier 통과" }
    })
  ).status,
  200
);
const liveClaimsAfterAlignedVerification = await app.handle({ method: "GET", path: "/targets/occurrence/occ_1/live-claims" });
assert.equal((liveClaimsAfterAlignedVerification.body as { liveClaims: Array<{ fieldVerification: { aligned: number; disputed: number; statusLabel: string } }> }).liveClaims[0]?.fieldVerification.aligned, 1);
assert.equal((liveClaimsAfterAlignedVerification.body as { liveClaims: Array<{ fieldVerification: { aligned: number; disputed: number; statusLabel: string } }> }).liveClaims[0]?.fieldVerification.disputed, 0);
const disputedVerification = await app.handle({
  method: "POST",
  path: "/claims/claim_occ_live_1/field-verifications",
  headers: userHeaders(routeOnlySession),
  body: {
    userId: routeOnlySession.userId,
    fieldVerification: "different_place_possible",
    capturedAt: freshFieldCapturedAt,
    uploadedAt: new Date("2026-07-07T09:04:00.000Z").toISOString(),
    foregroundGps: true,
    gpsAccuracyM: 30,
    gpsLng: 126.9783,
    gpsLat: 37.5667,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    deviceAttestation: "field-device-cluster"
  }
});
assert.equal(disputedVerification.status, 202);
const disputedVerificationClaimId = (disputedVerification.body as { claim: { id: string }; evidenceId: string }).claim.id;
const disputedVerificationEvidenceId = (disputedVerification.body as { claim: { id: string }; evidenceId: string }).evidenceId;
assert.equal((disputedVerification.body as { liveClaim: { fieldVerification: { disputed: number } } }).liveClaim.fieldVerification.disputed, 0);
assert.equal(store.claims.find((item) => item.id === "claim_occ_live_1")?.disputedByClaimIds.includes(disputedVerificationClaimId), false);
assert.equal(
  (
    await app.handle({
      method: "PATCH",
      path: `/internal/evidence/${disputedVerificationEvidenceId}/device-integrity`,
      headers: internalHeaders,
      body: { deviceIntegrityStatus: "pass", provider: "play_integrity", attestationToken: "trusted-field-disputed-token" }
    })
  ).status,
  200
);
assert.equal(
  (
    await app.handle({
      method: "PATCH",
      path: `/admin/claims/${disputedVerificationClaimId}`,
      headers: internalHeaders,
      body: { visibility: "public", riskLevel: "misleading_possible", publicReason: "현장 이견 verifier 통과" }
    })
  ).status,
  200
);
assert.equal(store.claims.find((item) => item.id === "claim_occ_live_1")?.disputedByClaimIds.includes(disputedVerificationClaimId), true);
const independentLocationVerification = await app.handle({
  method: "POST",
  path: "/claims/claim_occ_live_1/field-verifications",
  headers: userHeaders(cookieOnlySession),
  body: {
    userId: cookieOnlySession.userId,
    fieldVerification: "rights_review_needed",
    capturedAt: freshFieldCapturedAt,
    foregroundGps: true,
    gpsAccuracyM: 25,
    gpsLng: 126.9784,
    gpsLat: 37.5668,
    deviceAttestation: "field-device-independent"
  }
});
assert.equal(independentLocationVerification.status, 202);
const independentLocationClaimId = (independentLocationVerification.body as { claim: { id: string }; evidenceId: string }).claim.id;
const independentLocationEvidenceId = (independentLocationVerification.body as { claim: { id: string }; evidenceId: string }).evidenceId;
assert.equal((await app.handle({
  method: "PATCH",
  path: `/internal/evidence/${independentLocationEvidenceId}/device-integrity`,
  headers: internalHeaders,
  body: { deviceIntegrityStatus: "pass", provider: "play_integrity", attestationToken: "trusted-field-location-token" }
})).status, 200);
assert.equal((await app.handle({
  method: "PATCH",
  path: `/admin/claims/${independentLocationClaimId}`,
  headers: internalHeaders,
  body: { visibility: "public", riskLevel: "rights_risk", publicReason: "독립 현장 위치 근거 검수 통과" }
})).status, 200);
const fieldLocatedOccurrence = store.occurrences.find((item) => item.id === "occ_1");
assert.equal(fieldLocatedOccurrence?.locationStatus, "FIELD_CORROBORATED");
assert.equal(fieldLocatedOccurrence?.publicLocation?.source, "field_evidence");
assert.equal(fieldLocatedOccurrence?.publicLocation?.fieldEvidenceCount, 2);
assert.equal(fieldLocatedOccurrence?.publicLocation?.publicRadiusM, 300);
assert.equal(store.auditLogs.some((log) => log.targetId === "occ_1" && log.reason.includes("독립적인 현장 위치 근거 2건")), true);
const fieldLocatedPublicDetail = await app.handle({ method: "GET", path: "/occurrences/occ_1" });
assert.equal((fieldLocatedPublicDetail.body as { occurrence: { locationStatus: string } }).occurrence.locationStatus, "FIELD_CORROBORATED");
assert.equal(JSON.stringify(fieldLocatedPublicDetail.body).includes("privateLng"), false);
assert.equal(JSON.stringify(fieldLocatedPublicDetail.body).includes("sourcePublicLocation"), false);
const liveClaimsAfterVerification = await app.handle({ method: "GET", path: "/targets/occurrence/occ_1/live-claims" });
const verifiedLiveClaim = (liveClaimsAfterVerification.body as { liveClaims: Array<{ fieldVerification: { aligned: number; disputed: number; statusLabel: string } }> }).liveClaims[0];
assert.equal(verifiedLiveClaim.fieldVerification.aligned, 1);
assert.equal(verifiedLiveClaim.fieldVerification.disputed, 1);
assert.equal(verifiedLiveClaim.fieldVerification.statusLabel, "현장 이견 있음");
assertPublicPayloadSafe(liveClaimsAfterVerification.body);
const issueLiveClaimsAfterVerification = await app.handle({ method: "GET", path: "/targets/issue/issue_1/live-claims" });
const issueLiveClaim = (
  issueLiveClaimsAfterVerification.body as {
    liveClaims: Array<{ targetTitle: string; regionLabel: string; claim: { id: string }; fieldVerification: { statusLabel: string } }>;
  }
).liveClaims.find((item) => item.claim.id === "claim_occ_live_1");
assert.equal(issueLiveClaimsAfterVerification.status, 200);
assert.equal(issueLiveClaim?.regionLabel, "서울");
assert.equal(typeof issueLiveClaim?.targetTitle, "string");
assert.equal(issueLiveClaim?.fieldVerification.statusLabel, "현장 이견 있음");
assertPublicPayloadSafe(issueLiveClaimsAfterVerification.body);
const defaultReady = await createApp().handle({ method: "GET", path: "/ready" });
assert.equal(defaultReady.status, 503);
assert.equal((defaultReady.body as { summary: { failedIds: string[]; blockingGroups: string[] }; requiredActions: Array<{ id: string }> }).summary.failedIds.includes("runtime"), true);
assert.equal((defaultReady.body as { summary: { blockingGroups: string[] } }).summary.blockingGroups.includes("runtime"), true);
assert.equal((defaultReady.body as { requiredActions: Array<{ id: string }> }).requiredActions.some((item) => item.id === "runtime"), true);
const publicReadiness = await createApp().handle({ method: "GET", path: "/readiness" });
assert.equal(publicReadiness.status, 200);
assert.equal((publicReadiness.body as { gates: { operator: { ready: boolean } } }).gates.operator.ready, false);
const readyResponse = await app.handle({ method: "GET", path: "/ready" });
assert.equal(readyResponse.status, 200);
assert.equal((readyResponse.body as { summary: { failedCount: number } }).summary.failedCount, 0);
assert.equal((readyResponse.body as { requiredActions: Array<unknown> }).requiredActions.length, 0);
assert.equal(
  (await createApp(createSeedStore(), { readiness: async () => ({ ready: false, checks: [{ id: "postgres", ok: false, message: "postgres unreachable" }] }) }).handle({
    method: "GET",
    path: "/ready"
  })).status,
  503
);
assert.equal(
  (await createApp(createSeedStore(), { readiness: async () => ({ ready: false, checks: [{ id: "redis", ok: false, message: "redis unreachable" }] }) }).handle({
    method: "GET",
    path: "/ready"
  })).status,
  503
);
const notReadyWriteApp = createApp(createSeedStore(), {
  internalApiKey: "test_internal_key",
  requireReadyForWrites: true,
  readiness: async () => ({ ready: false, checks: [{ id: "postgres.database_url", ok: false, message: "postgres missing" }] })
});
const notReadySession = await notReadyWriteApp.handle({ method: "POST", path: "/session/anonymous" });
assert.equal(notReadySession.status, 503);
assert.equal((notReadySession.body as { error: string }).error, "runtime_not_ready");
assert.equal((notReadySession.body as { summary: { failedIds: string[]; blockingGroups: string[] } }).summary.failedIds.includes("postgres.database_url"), true);
assert.equal((notReadySession.body as { summary: { blockingGroups: string[] } }).summary.blockingGroups.includes("database"), true);
assert.equal((notReadySession.body as { requiredActions: Array<{ id: string }> }).requiredActions.some((item) => item.id === "database"), true);
const productionAnonymousSession = await createApp(createSeedStore(), { allowAnonymousSession: false, userTokenSecret: testUserTokenSecret }).handle({
  method: "POST",
  path: "/session/anonymous"
});
assert.equal(productionAnonymousSession.status, 404);
assert.equal((productionAnonymousSession.body as { error: string }).error, "not_found");
const notReadyInternalWrite = await notReadyWriteApp.handle({
  method: "POST",
  path: "/internal/ingest/public-source",
  headers: internalHeaders,
  body: {}
});
assert.equal(notReadyInternalWrite.status, 400);
assert.notEqual((notReadyInternalWrite.body as { error: string }).error, "runtime_not_ready");
assert.deepEqual(await fakeJsonRequest(Buffer.from('{"ok":true}')), { ok: true });
await assert.rejects(() => fakeJsonRequest(Buffer.from("{")), { status: 400, code: "invalid_json" });
await assert.rejects(() => fakeJsonRequest(Buffer.alloc(257 * 1024, "x")), { status: 413, code: "body_too_large" });
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
for (let index = 0; index < 30; index += 1) {
  enforcePublicWriteRateLimit({ method: "POST", url: "/reports/material", headers: { "x-forwarded-for": "198.51.100.1" } }, rateBuckets, 1_000);
}
assert.throws(
  () => enforcePublicWriteRateLimit({ method: "POST", url: "/reports/material", headers: { "x-forwarded-for": "198.51.100.1" } }, rateBuckets, 1_000),
  { status: 429, code: "rate_limited" }
);
enforcePublicWriteRateLimit({ method: "POST", url: "/reports/material", headers: { "x-forwarded-for": "198.51.100.1" } }, rateBuckets, 62_000);
enforcePublicWriteRateLimit({ method: "GET", url: "/home", headers: { "x-forwarded-for": "198.51.100.1" } }, rateBuckets, 1_000);
const distributedRateLimitKey = publicWriteRateLimitKey("198.51.100.1", testUserTokenSecret);
assert.match(distributedRateLimitKey, /^musunil:write-limit:[a-f0-9]{64}$/);
assert.equal(distributedRateLimitKey.includes("198.51.100.1"), false);
assert.equal(publicWriteRateLimitKey("198.51.100.1", testUserTokenSecret), distributedRateLimitKey);
assert.notEqual(publicWriteRateLimitKey("198.51.100.2", testUserTokenSecret), distributedRateLimitKey);

const forbiddenEngagementCounts = {
  claims: store.claims.length,
  reports: store.reports.length,
  notifications: store.notificationOutbox.length
};
for (const path of ["/comments", "/votes", "/likes", "/reactions", "/donations", "/sponsorships"]) {
  assert.equal((await app.handle({ method: "POST", path, body: { targetType: "occurrence", targetId: "occ_1" } })).status, 404);
}
assert.deepEqual(
  { claims: store.claims.length, reports: store.reports.length, notifications: store.notificationOutbox.length },
  forbiddenEngagementCounts
);

const badLive = await app.handle({
  method: "POST",
  path: "/reports/live",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: now.toISOString(),
    uploadedAt: new Date("2026-07-07T09:10:00.000Z").toISOString(),
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("bad-live"),
    rawText: "이 원문은 공개 응답에 나오면 안 된다"
  }
});
assert.equal(badLive.status, 422);

const unscopedLive = await app.handle({
  method: "POST",
  path: "/reports/live",
  body: {
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: now.toISOString(),
    uploadedAt: new Date("2026-07-07T09:04:00.000Z").toISOString(),
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("unscoped-live")
  }
});
assert.equal(unscopedLive.status, 401);

const orphan = await app.handle({
  method: "POST",
  path: "/reports/material",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "missing",
    rawText: "없는 타깃에는 Claim이 붙으면 안 된다"
  }
});
assert.equal(orphan.status, 404);

const liveUpload = await app.handle({
  method: "POST",
  path: "/uploads/live",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    mediaMimeType: "video/webm",
    mediaBase64: Buffer.from("live upload bytes").toString("base64")
  }
});
assert.equal(liveUpload.status, 201);
assert.match((liveUpload.body as { storageKey: string }).storageKey, /^private\/live\/browser\//);
const liveUploadedAt = (liveUpload.body as { uploadedAt: string }).uploadedAt;
const liveCapturedAt = new Date(new Date(liveUploadedAt).getTime() - 60_000).toISOString();

const forgedUploadTimeLive = await app.handle({
  method: "POST",
  path: "/reports/live",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: new Date(new Date(liveUploadedAt).getTime() - 10 * 60_000).toISOString(),
    uploadedAt: new Date(new Date(liveUploadedAt).getTime() - 9 * 60_000).toISOString(),
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("live"),
    storageKey: (liveUpload.body as { storageKey: string }).storageKey,
    hash: (liveUpload.body as { hash: string }).hash
  }
});
assert.equal(forgedUploadTimeLive.status, 422);
assert.equal((forgedUploadTimeLive.body as { error: string }).error, "proof_of_presence_failed");

const galleryLive = await app.handle({
  method: "POST",
  path: "/reports/live",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: liveCapturedAt,
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("live"),
    captureMode: "gallery",
    storageKey: (liveUpload.body as { storageKey: string }).storageKey,
    hash: (liveUpload.body as { hash: string }).hash,
    uploadedAt: liveUploadedAt
  }
});
assert.equal(galleryLive.status, 422);
assert.equal((galleryLive.body as { error: string }).error, "proof_of_presence_failed");

const shortLive = await app.handle({
  method: "POST",
  path: "/reports/live",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: liveCapturedAt,
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("live"),
    durationMs: 1000,
    storageKey: (liveUpload.body as { storageKey: string }).storageKey,
    hash: (liveUpload.body as { hash: string }).hash,
    uploadedAt: liveUploadedAt
  }
});
assert.equal(shortLive.status, 422);
assert.equal((shortLive.body as { error: string }).error, "proof_of_presence_failed");

const forgedDistanceLive = await app.handle({
  method: "POST",
  path: "/reports/live",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: liveCapturedAt,
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 0,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("live"),
    gpsLng: 129.0756,
    gpsLat: 35.1796,
    storageKey: (liveUpload.body as { storageKey: string }).storageKey,
    hash: (liveUpload.body as { hash: string }).hash,
    uploadedAt: liveUploadedAt
  }
});
assert.equal(forgedDistanceLive.status, 422);
assert.equal((forgedDistanceLive.body as { error: string }).error, "proof_of_presence_failed");

const live = await app.handle({
  method: "POST",
  path: "/reports/live",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: liveCapturedAt,
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("live"),
    storageKey: (liveUpload.body as { storageKey: string }).storageKey,
    hash: (liveUpload.body as { hash: string }).hash,
    uploadedAt: liveUploadedAt,
    rawText: "이 원문은 공개 응답에 나오면 안 된다"
  }
});

assert.equal(live.status, 202);
assert.equal(JSON.stringify(live.body).includes("이 원문은 공개 응답에 나오면 안 된다"), false);
const liveReceipt = live.body as {
  reportId: string;
  claimId: string;
  status: string;
  targetTitle: string;
  issueTitle: string;
  regionLabel: string;
  publicRadiusM: number;
  nextStepLabel: string;
};
assert.equal(typeof liveReceipt.reportId, "string");
assert.equal(typeof liveReceipt.claimId, "string");
assert.equal(liveReceipt.status, "review");
assert.equal(liveReceipt.targetTitle.length > 0, true);
assert.equal(liveReceipt.issueTitle.length > 0, true);
assert.equal(liveReceipt.regionLabel.length > 0, true);
assert.equal(liveReceipt.publicRadiusM, 200);
assert.equal(liveReceipt.nextStepLabel, "비식별 검토 중");

const heldStore = createSeedStore();
const heldApp = createApp(heldStore, {
  internalApiKey: "test_internal_key",
  userTokenSecret: "test_user_token_secret_32_bytes_minimum",
  identity: testIdentity,
  autoPublishLiveReports: false
});
const heldSession = await verifiedIdentitySession(heldApp);
const heldUpload = await heldApp.handle({
  method: "POST",
  path: "/uploads/live",
  headers: userHeaders(heldSession),
  body: {
    userId: heldSession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    mediaMimeType: "video/webm",
    mediaBase64: Buffer.from("held live upload bytes").toString("base64")
  }
});
assert.equal(heldUpload.status, 201);
const heldUploadedAt = (heldUpload.body as { uploadedAt: string }).uploadedAt;
const heldCapturedAt = new Date(new Date(heldUploadedAt).getTime() - 60_000).toISOString();
const heldLive = await heldApp.handle({
  method: "POST",
  path: "/reports/live",
  headers: userHeaders(heldSession),
  body: {
    userId: heldSession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: heldCapturedAt,
    uploadedAt: heldUploadedAt,
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("held-live"),
    storageKey: (heldUpload.body as { storageKey: string }).storageKey,
    hash: (heldUpload.body as { hash: string }).hash,
    rawText: "검수 전 공개되면 안 되는 LIVE 원문"
  }
});
assert.equal(heldLive.status, 202);
const heldClaimId = (heldLive.body as { claim: { id: string; visibility: string } }).claim.id;
const heldEvidenceId = (heldLive.body as { evidenceId: string }).evidenceId;
assert.equal((heldLive.body as { claim: { visibility: string } }).claim.visibility, "held_private");
assert.equal(heldStore.evidence.find((item) => item.id === heldEvidenceId)?.deviceIntegrityStatus, "unknown");
assert.equal(heldStore.evidence.find((item) => item.id === heldEvidenceId)?.publicRadiusM, 200);

const missingStorageApp = createApp(createSeedStore(), {
  userTokenSecret: "test_user_token_secret_32_bytes_minimum",
  identity: testIdentity,
  requireExternalLiveStorage: true
});
const missingStorageSession = await verifiedIdentitySession(missingStorageApp);
const missingStorageUpload = await missingStorageApp.handle({
  method: "POST",
  path: "/uploads/live",
  headers: userHeaders(missingStorageSession),
  body: {
    userId: missingStorageSession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    mediaMimeType: "video/webm",
    mediaBase64: Buffer.from("external storage required").toString("base64")
  }
});
assert.equal(missingStorageUpload.status, 503);
assert.equal((missingStorageUpload.body as { error: string }).error, "live_storage_unavailable");

const unencryptedStorageApp = createApp(createSeedStore(), {
  userTokenSecret: "test_user_token_secret_32_bytes_minimum",
  identity: testIdentity,
  requireExternalLiveStorage: true,
  liveMediaStorage: { put: async () => undefined }
});
const unencryptedStorageSession = await verifiedIdentitySession(unencryptedStorageApp);
const unencryptedStorageUpload = await unencryptedStorageApp.handle({
  method: "POST",
  path: "/uploads/live",
  headers: userHeaders(unencryptedStorageSession),
  body: {
    userId: unencryptedStorageSession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    mediaMimeType: "video/webm",
    mediaBase64: Buffer.from("unencrypted storage rejected").toString("base64")
  }
});
assert.equal(unencryptedStorageUpload.status, 503);
assert.equal((unencryptedStorageUpload.body as { error: string }).error, "live_storage_unavailable");

const externalStorageStore = createSeedStore();
const liveMediaEncryptionKey = "test_live_media_encryption_key_32_bytes";
const externalStorageWrites: Array<{ storageKey: string; mediaMimeType: string; bytes: Buffer }> = [];
const externalStorageApp = createApp(externalStorageStore, {
  userTokenSecret: "test_user_token_secret_32_bytes_minimum",
  identity: testIdentity,
  requireExternalLiveStorage: true,
  liveMediaEncryptionKey,
  liveMediaStorage: {
    put: async ({ storageKey, mediaMimeType, bytes }) => {
      externalStorageWrites.push({ storageKey, mediaMimeType, bytes });
    }
  }
});
const externalStorageSession = await verifiedIdentitySession(externalStorageApp);
const externalStorageUpload = await externalStorageApp.handle({
  method: "POST",
  path: "/uploads/live",
  headers: userHeaders(externalStorageSession),
  body: {
    userId: externalStorageSession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    mediaMimeType: "video/webm",
    mediaBase64: Buffer.from("external storage bytes").toString("base64")
  }
});
assert.equal(externalStorageUpload.status, 201);
assert.equal(externalStorageWrites.length, 1);
assert.equal(externalStorageWrites[0]?.mediaMimeType, "application/vnd.musunil.live-media+json");
assert.notEqual(externalStorageWrites[0]?.bytes.toString("utf8"), "external storage bytes");
assert.equal(decryptLiveMediaBytes(externalStorageWrites[0]!.bytes, liveMediaEncryptionKey).toString("utf8"), "external storage bytes");
assert.equal(externalStorageStore.liveUploads[0]?.privateMediaBase64, undefined);

const heldDetail = await heldApp.handle({ method: "GET", path: "/occurrences/occ_1" });
assert.equal(JSON.stringify(heldDetail.body).includes(heldClaimId), false);
assert.equal(heldStore.occurrences.find((item) => item.id === "occ_1")?.claimIds.includes(heldClaimId), false);
const heldQueue = await heldApp.handle({ method: "GET", path: "/admin/review-queue", headers: internalHeaders });
assert.equal(JSON.stringify(heldQueue.body).includes(heldClaimId), true);
const unsafePublishHeld = await heldApp.handle({
  method: "PATCH",
  path: `/admin/claims/${heldClaimId}`,
  headers: internalHeaders,
  body: { visibility: "public", riskLevel: "rights_risk", publicReason: "비식별 없이 공개 시도" }
});
assert.equal(unsafePublishHeld.status, 400);
assert.equal((unsafePublishHeld.body as { error: string }).error, "live_redaction_required");
assert.equal(heldStore.occurrences.find((item) => item.id === "occ_1")?.claimIds.includes(heldClaimId), false);
const httpRedactionPublishHeld = await heldApp.handle({
  method: "PATCH",
  path: `/admin/claims/${heldClaimId}`,
  headers: internalHeaders,
  body: { visibility: "public", riskLevel: "rights_risk", redactedClipUrl: "http://cdn.musunil.test/held-live.webm", publicReason: "비HTTPS 공개본" }
});
assert.equal(httpRedactionPublishHeld.status, 400);
assert.equal((httpRedactionPublishHeld.body as { error: string }).error, "redaction_worker_required");
const privateRedactionPublishHeld = await heldApp.handle({
  method: "PATCH",
  path: `/admin/claims/${heldClaimId}`,
  headers: internalHeaders,
  body: { visibility: "public", riskLevel: "rights_risk", redactedClipUrl: "/private/live/held-live.webm", publicReason: "비공개 경로 공개 시도" }
});
assert.equal(privateRedactionPublishHeld.status, 400);
assert.equal((privateRedactionPublishHeld.body as { error: string }).error, "redaction_worker_required");
assert.equal(heldStore.occurrences.find((item) => item.id === "occ_1")?.claimIds.includes(heldClaimId), false);
assert.equal(heldStore.evidence.find((item) => item.id === heldEvidenceId)?.redactionStatus, "pending");
assert.equal(heldStore.evidence.find((item) => item.id === heldEvidenceId)?.publicStorageKey, undefined);
const unauthedRedactionQueue = await heldApp.handle({ method: "GET", path: "/internal/redaction-queue?limit=1" });
assert.equal(unauthedRedactionQueue.status, 401);
const redactionQueue = await heldApp.handle({ method: "GET", path: "/internal/redaction-queue?limit=1", headers: internalHeaders });
assert.equal(redactionQueue.status, 200);
const queuedJob = (redactionQueue.body as { jobs: Array<{ evidenceId: string; storageKey: string; expectedHash: string; encrypted: boolean }> }).jobs[0];
assert.equal(queuedJob?.evidenceId, heldEvidenceId);
assert.equal(queuedJob?.storageKey, heldStore.evidence.find((item) => item.id === heldEvidenceId)?.storageKey);
assert.equal(queuedJob?.expectedHash, heldStore.evidence.find((item) => item.id === heldEvidenceId)?.hash);
assert.equal(queuedJob?.encrypted, false);
const unauthedRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  body: { redactedClipUrl: "/media/redacted/held-live.webm" }
});
assert.equal(unauthedRedaction.status, 401);
const invalidWorkerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "/private/live/held-live.webm" }
});
assert.equal(invalidWorkerRedaction.status, 400);
assert.equal((invalidWorkerRedaction.body as { error: string }).error, "redactedClipUrl_invalid");
const invalidTraversalWorkerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "/media/redacted/%2e%2e/private/held-live.webm", redactedPosterUrl: "/media/redacted/held-live-poster.webp", redactionProofToken: "trusted-redaction-report" }
});
assert.equal(invalidTraversalWorkerRedaction.status, 400);
assert.equal((invalidTraversalWorkerRedaction.body as { error: string }).error, "redactedClipUrl_invalid");
const invalidExternalWorkerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "https://evil.example/media/redacted/held-live.webm", redactedPosterUrl: "/media/redacted/held-live-poster.webp", redactionProofToken: "trusted-redaction-report" }
});
assert.equal(invalidExternalWorkerRedaction.status, 400);
assert.equal((invalidExternalWorkerRedaction.body as { error: string }).error, "redactedClipUrl_invalid");
const invalidClipExtensionWorkerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "/media/redacted/held-live.webp", redactedPosterUrl: "/media/redacted/held-live-poster.webp", redactionProofToken: "trusted-redaction-report" }
});
assert.equal(invalidClipExtensionWorkerRedaction.status, 400);
assert.equal((invalidClipExtensionWorkerRedaction.body as { error: string }).error, "redactedClipUrl_invalid");
const invalidPosterWorkerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "/media/redacted/held-live.webm", redactedPosterUrl: "/private/live/held-live-poster.webp", redactionProofToken: "trusted-redaction-report" }
});
assert.equal(invalidPosterWorkerRedaction.status, 400);
assert.equal((invalidPosterWorkerRedaction.body as { error: string }).error, "redactedPosterUrl_invalid");
const missingPosterWorkerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "/media/redacted/held-live.webm", redactionProofToken: "trusted-redaction-report" }
});
assert.equal(missingPosterWorkerRedaction.status, 400);
assert.equal((missingPosterWorkerRedaction.body as { error: string }).error, "redactedPosterUrl_invalid");
const invalidPosterExtensionWorkerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "/media/redacted/held-live.webm", redactedPosterUrl: "/media/redacted/held-live-poster.webm", redactionProofToken: "trusted-redaction-report" }
});
assert.equal(invalidPosterExtensionWorkerRedaction.status, 400);
assert.equal((invalidPosterExtensionWorkerRedaction.body as { error: string }).error, "redactedPosterUrl_invalid");
const prooflessWorkerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "/media/redacted/held-live.webm", redactedPosterUrl: "/media/redacted/held-live-poster.webp" }
});
assert.equal(prooflessWorkerRedaction.status, 400);
assert.equal((prooflessWorkerRedaction.body as { error: string }).error, "redaction_proof_required");
const workerRedaction = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/redaction`,
  headers: internalHeaders,
  body: { redactedClipUrl: "/media/redacted/held-live.webm", redactedPosterUrl: "/media/redacted/held-live-poster.webp", redactionProofToken: "trusted-redaction-report" }
});
assert.equal(workerRedaction.status, 200);
assert.equal((workerRedaction.body as { evidence: { redactionStatus: string; publicMediaUrl: string; publicPosterUrl?: string; redactionProofHash: string } }).evidence.redactionStatus, "completed");
assert.equal((workerRedaction.body as { evidence: { publicPosterUrl?: string } }).evidence.publicPosterUrl, "/media/redacted/held-live-poster.webp");
assert((workerRedaction.body as { evidence: { redactionProofHash: string } }).evidence.redactionProofHash.startsWith("sha256-"));
assert.equal(JSON.stringify(workerRedaction.body).includes("trusted-redaction-report"), false);
assert.equal(JSON.stringify(workerRedaction.body).includes("storageKey"), false);
assert.equal(canServePublicRedactedMedia(heldStore, "/media/redacted/held-live.webm"), false);
const completedRedactionQueue = await heldApp.handle({ method: "GET", path: "/internal/redaction-queue?limit=10", headers: internalHeaders });
assert.equal((completedRedactionQueue.body as { jobs: Array<unknown> }).jobs.some((job) => JSON.stringify(job).includes(heldEvidenceId)), false);
const publishBeforeDeviceIntegrity = await heldApp.handle({
  method: "PATCH",
  path: `/admin/claims/${heldClaimId}`,
  headers: internalHeaders,
  body: { visibility: "public", riskLevel: "rights_risk", publicReason: "기기 무결성 전 공개 시도" }
});
assert.equal(publishBeforeDeviceIntegrity.status, 400);
assert.equal((publishBeforeDeviceIntegrity.body as { error: string }).error, "device_integrity_required");
const trustedDeviceIntegrity = await heldApp.handle({
  method: "PATCH",
  path: `/internal/evidence/${heldEvidenceId}/device-integrity`,
  headers: internalHeaders,
  body: { deviceIntegrityStatus: "pass", provider: "play_integrity", attestationToken: "trusted-device-token" }
});
assert.equal(trustedDeviceIntegrity.status, 200);
assert.equal(heldStore.evidence.find((item) => item.id === heldEvidenceId)?.deviceIntegrityStatus, "pass");
assert.equal(heldStore.evidence.find((item) => item.id === heldEvidenceId)?.deviceIntegrityProofHash?.startsWith("sha256-"), true);
const publishHeld = await heldApp.handle({
  method: "PATCH",
  path: `/admin/claims/${heldClaimId}`,
  headers: internalHeaders,
  body: { visibility: "public", riskLevel: "rights_risk", publicReason: "검수 후 공개" }
});
assert.equal(publishHeld.status, 200);
assert.equal(canServePublicRedactedMedia(heldStore, "/media/redacted/held-live.webm"), true);
assert.equal(canServePublicRedactedMedia(heldStore, "/media/redacted/held-live-poster.webp"), true);
const publishedDetail = await heldApp.handle({ method: "GET", path: "/occurrences/occ_1" });
assert.equal(JSON.stringify(publishedDetail.body).includes(heldClaimId), true);
assert.equal(heldStore.occurrences.find((item) => item.id === "occ_1")?.claimIds.includes(heldClaimId), true);
const publishedLiveClaims = await heldApp.handle({ method: "GET", path: "/targets/occurrence/occ_1/live-claims" });
assert.equal(JSON.stringify(publishedLiveClaims.body).includes("/media/redacted/held-live.webm"), true);
assert.equal(JSON.stringify(publishedLiveClaims.body).includes("private/live/test/held-live.mp4"), false);
assert.equal((publishedLiveClaims.body as { liveClaims: Array<{ publicRadiusM?: number }> }).liveClaims[0]?.publicRadiusM, 200);
assertPublicPayloadSafe(publishedLiveClaims.body);
const heldIssueAfterPublish = await heldApp.handle({ method: "GET", path: "/issues/issue_1" });
const heldIssueEstimate = (heldIssueAfterPublish.body as { crowdEstimates: Array<{ id: string; confidence: string }> }).crowdEstimates.find(
  (estimate) => estimate.id === "derived_issue_1_crowd_estimate"
);
assert.equal(heldIssueEstimate?.confidence, "medium");
assert.equal(JSON.stringify(heldIssueAfterPublish.body).includes("device_integrity"), false);

const autoPublishStore = createSeedStore();
const autoPublishApp = createApp(autoPublishStore, {
  internalApiKey: "test_internal_key",
  userTokenSecret: "test_user_token_secret_32_bytes_minimum",
  identity: testIdentity,
  autoPublishLiveReports: true
});
const autoSession = await verifiedIdentitySession(autoPublishApp);
const autoUpload = await autoPublishApp.handle({
  method: "POST",
  path: "/uploads/live",
  headers: userHeaders(autoSession),
  body: {
    userId: autoSession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    mediaMimeType: "video/webm",
    mediaBase64: Buffer.from("auto publish must still wait for redaction").toString("base64")
  }
});
const autoUploadedAt = (autoUpload.body as { uploadedAt: string }).uploadedAt;
const autoLive = await autoPublishApp.handle({
  method: "POST",
  path: "/reports/live",
  headers: userHeaders(autoSession),
  body: {
    userId: autoSession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    capturedAt: new Date(new Date(autoUploadedAt).getTime() - 60_000).toISOString(),
    uploadedAt: autoUploadedAt,
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    ...liveVideoFields("auto-live"),
    storageKey: (autoUpload.body as { storageKey: string }).storageKey,
    hash: (autoUpload.body as { hash: string }).hash
  }
});
assert.equal(autoLive.status, 202);
const autoClaimId = (autoLive.body as { claim: { id: string; visibility: string } }).claim.id;
assert.equal((autoLive.body as { claim: { visibility: string } }).claim.visibility, "held_private");
assert.equal(autoPublishStore.occurrences.find((item) => item.id === "occ_1")?.claimIds.includes(autoClaimId), false);

const detail = await app.handle({ method: "GET", path: "/occurrences/occ_1" });
assert.equal(detail.status, 200);
assert.equal(JSON.stringify(detail.body).includes("이 원문은 공개 응답에 나오면 안 된다"), false);

const publicDetailBeforeQueuedWrites = JSON.stringify(detail.body);
const correction = await app.handle({
  method: "POST",
  path: "/corrections/on-site",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    normalizedStatement: "위치가 일부 다르다는 현장 정정이 접수되었습니다.",
    rawText: "정정 원문도 공개 응답에 나오면 안 된다"
  }
});
assert.equal(correction.status, 202);
assert.equal((correction.body as { claim: { visibility: string; sourceProvenance: string; evidenceStrength: string } }).claim.visibility, "held_private");
assert.equal((correction.body as { claim: { sourceProvenance: string } }).claim.sourceProvenance, "material_report");
assert.equal((correction.body as { claim: { evidenceStrength: string } }).claim.evidenceStrength, "single_source");
assert.equal(JSON.stringify(correction.body).includes("정정 원문도 공개 응답에 나오면 안 된다"), false);
const detailAfterCorrection = await app.handle({ method: "GET", path: "/occurrences/occ_1" });
assert.equal(JSON.stringify(detailAfterCorrection.body).includes("위치가 일부 다르다는 현장 정정이 접수되었습니다."), false);
assert.equal(JSON.stringify(detailAfterCorrection.body), publicDetailBeforeQueuedWrites);

assert.equal(
  (await app.handle({
    method: "POST",
    path: "/reports/material",
    headers: userHeaders(attackerSession),
    body: { userId: user1Session.userId, targetType: "occurrence", targetId: "occ_1", rawText: "소유권 위조" }
  })).status,
  401
);

const rights = await app.handle({
  method: "POST",
  path: "/reports/rights-violation",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    riskLevel: "rights_risk",
    rawText: "신고 원문도 공개 응답에 나오면 안 된다"
  }
});
assert.equal(rights.status, 202);
assert.equal((rights.body as { claim: { visibility: string } }).claim.visibility, "held_private");
assert.equal(JSON.stringify(rights.body).includes("auto_delete"), false);
assert.equal(JSON.stringify(rights.body).includes("신고 원문도 공개 응답에 나오면 안 된다"), false);
for (let index = 0; index < 3; index += 1) {
  assert.equal(
    (
      await app.handle({
        method: "POST",
        path: "/reports/rights-violation",
        headers: user1Headers,
        body: {
          userId: user1Session.userId,
          targetType: "occurrence",
          targetId: "occ_1",
          riskLevel: "rights_risk",
          rawText: `반복 신고 원문 ${index}`
        }
      })
    ).status,
    202
  );
}
assert.equal(store.claims.some((claim) => claim.id === "claim_occ_live_1"), true);
assert.equal(store.claims.find((claim) => claim.id === "claim_occ_live_1")?.visibility ?? "public", "public");
assert.equal(store.auditLogs.some((log) => log.action === "delete" && log.targetType === "occurrence" && log.targetId === "occ_1"), false);
assert.equal(JSON.stringify((await app.handle({ method: "GET", path: "/occurrences/occ_1" })).body).includes("claim_occ_live_1"), true);

const rebuttal = await app.handle({
  method: "POST",
  path: "/rebuttals",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    normalizedStatement: "반론이 접수되었습니다.",
    rawText: "반론 원문도 공개 응답에 나오면 안 된다"
  }
});
assert.equal(rebuttal.status, 202);
assert.equal((rebuttal.body as { claim: { visibility: string; evidenceStrength: string } }).claim.visibility, "held_private");
assert.equal((rebuttal.body as { claim: { evidenceStrength: string } }).claim.evidenceStrength, "single_source");
assert.equal(JSON.stringify(rebuttal.body).includes("반론 원문도 공개 응답에 나오면 안 된다"), false);
assert.equal(JSON.stringify((await app.handle({ method: "GET", path: "/occurrences/occ_1" })).body).includes("반론이 접수되었습니다."), false);

const subscription = await app.handle({
  method: "POST",
  path: "/subscriptions",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    alertLevel: "all",
    alertTypes: ["state_changed"]
  }
});
assert.equal(subscription.status, 201);
const outboxBeforeNonStateReport = store.notificationOutbox.length;
assert.equal(
  (
    await app.handle({
      method: "POST",
      path: "/reports/material",
      headers: user1Headers,
      body: { userId: user1Session.userId, targetType: "occurrence", targetId: "occ_1", rawText: "자료 제보는 단독 알림이 아니다" }
    })
  ).status,
  202
);
assert.equal(store.notificationOutbox.length, outboxBeforeNonStateReport);

const issueSubscription = await app.handle({
  method: "POST",
  path: "/subscriptions",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "issue",
    targetId: "issue_1",
    alertLevel: "major_only",
    alertTypes: ["state_changed"]
  }
});
assert.equal(issueSubscription.status, 201);

const duplicateSubscription = await app.handle({
  method: "POST",
  path: "/subscriptions",
  headers: user1Headers,
  body: {
    userId: user1Session.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    alertLevel: "all",
    alertTypes: ["state_changed"]
  }
});
assert.equal(duplicateSubscription.status, 201);

const routeOnlySubscription = await app.handle({
  method: "POST",
  path: "/subscriptions",
  headers: userHeaders(routeOnlySession),
  body: {
    userId: routeOnlySession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    alertLevel: "all",
    alertTypes: ["rebuttal_added"]
  }
});
assert.equal(routeOnlySubscription.status, 201);

const mutedSubscription = await app.handle({
  method: "POST",
  path: "/subscriptions",
  headers: userHeaders(mutedSession),
  body: {
    userId: mutedSession.userId,
    targetType: "occurrence",
    targetId: "occ_1",
    alertLevel: "all",
    alertTypes: ["state_changed"]
  }
});
assert.equal(mutedSubscription.status, 201);
const mutedSubscriptionId = (mutedSubscription.body as { subscription: { id: string } }).subscription.id;
assert.equal(
  (await app.handle({
    method: "PATCH",
    path: `/subscriptions/${mutedSubscriptionId}`,
    headers: userHeaders(mutedSession),
    body: { mutedUntil: new Date("2099-01-01T00:00:00.000Z").toISOString() }
  })).status,
  200
);

assert.equal(
  (await app.handle({
    method: "POST",
    path: "/subscriptions",
    headers: userHeaders(attackerSession),
    body: { userId: user1Session.userId, targetType: "occurrence", targetId: "occ_1", alertLevel: "all", alertTypes: ["state_changed"] }
  })).status,
  401
);
assert.equal((await app.handle({ method: "GET", path: `/me/reports?userId=${user1Session.userId}` })).status, 401);

const mine = await app.handle({ method: "GET", path: `/me/reports?userId=${user1Session.userId}`, headers: user1Headers });
assert.equal(mine.status, 200);
assert.equal(JSON.stringify(mine.body).includes("이 원문은 공개 응답에 나오면 안 된다"), false);
const myLiveReceipt = (mine.body as { reports: Array<{ reportId: string; claimId: string; status: string; nextStepLabel: string }> }).reports.find(
  (report) => report.reportId === liveReceipt.reportId
);
assert.equal(myLiveReceipt?.claimId, liveReceipt.claimId);
assert.equal(myLiveReceipt?.status, "review");
assert.equal(myLiveReceipt?.nextStepLabel, "비식별 검토 중");
assert.equal(JSON.stringify(mine.body).includes('"userId"'), false);

const cookieMe = await app.handle({ method: "GET", path: "/me", headers: identityCookieHeader(cookieOnlySession) });
assert.equal(cookieMe.status, 200);
assert.equal((cookieMe.body as { authenticated: boolean; userId: string }).authenticated, true);
assert.equal((cookieMe.body as { authenticated: boolean; userId: string }).userId, cookieOnlySession.userId);
const cookieMine = await app.handle({ method: "GET", path: `/me/reports?userId=${cookieOnlySession.userId}`, headers: identityCookieHeader(cookieOnlySession) });
assert.equal(cookieMine.status, 200);
const cookieLogout = await app.handle({ method: "POST", path: "/auth/logout", headers: identityCookieHeader(cookieOnlySession) });
assert.equal(cookieLogout.status, 200);
assert.equal(String(cookieLogout.headers?.["set-cookie"]).includes("Domain=.musunil.test"), true);
assert.equal(String(cookieLogout.headers?.["set-cookie"]).includes("Max-Age=0"), true);
const cookieAfterLogout = await app.handle({ method: "GET", path: "/me", headers: identityCookieHeader(cookieOnlySession) });
assert.equal((cookieAfterLogout.body as { authenticated: boolean }).authenticated, false);

const reconcile = await app.handle({
  method: "POST",
  path: "/internal/agents/reconcile-lifecycle",
  headers: internalHeaders,
  body: { targetId: "occ_1" }
});
assert.equal(reconcile.status, 200);
assert.equal(JSON.stringify(reconcile.body).includes("LIVE"), true);

const dispatch = await app.handle({ method: "POST", path: "/internal/notifications/dispatch", headers: internalHeaders, body: {} });
assert.equal(dispatch.status, 200);
assert.equal(JSON.stringify(dispatch.body).includes("local_dispatch_completed"), true);
const dispatchBody = dispatch.body as { dispatchedCount: number; pendingCount: number; notifications: Array<{ userId: string; status: string; sentAt?: Date }> };
assert.equal(dispatchBody.dispatchedCount, 1);
assert.equal(dispatchBody.pendingCount, 0);
assert.deepEqual(dispatchBody.notifications.map((notification) => notification.userId), [user1Session.userId]);
assert.deepEqual(dispatchBody.notifications.map((notification) => notification.status), ["sent"]);
assert.equal(dispatchBody.notifications[0]?.sentAt instanceof Date, true);
const secondDispatch = await app.handle({ method: "POST", path: "/internal/notifications/dispatch", headers: internalHeaders, body: {} });
assert.equal((secondDispatch.body as { dispatchedCount: number }).dispatchedCount, 0);

const privateClaim = store.claims.find((claim) => claim.id === "claim_occ_live_1");
assert(privateClaim);
privateClaim.statement = "보존 기간 만료 원문";
privateClaim.createdAt = new Date("2020-01-01T00:00:00.000Z");
const privateEvidence = store.evidence.find((evidence) => evidence.id === "ev_occ_live_1");
assert(privateEvidence);
privateEvidence.geoCell = "private-cell";
privateEvidence.privateLng = 126.9783;
privateEvidence.privateLat = 37.5667;
privateEvidence.gpsAccuracyM = 12;
privateEvidence.distanceToTargetM = 34;
privateEvidence.storageKey = "private/live/expired/original.mp4";
privateEvidence.hash = "expired-original-hash";
privateEvidence.uploadedAt = new Date("2020-01-01T00:00:00.000Z");
const oldUpload = {
  storageKey: "private/live/expired/upload.webm",
  userId: "user_expired",
  targetType: "occurrence" as const,
  targetId: "occ_1",
  mediaMimeType: "video/webm",
  byteSize: 4,
  hash: "old-upload-hash",
  uploadedAt: new Date("2020-01-01T00:00:00.000Z"),
  privateMediaBase64: "AAAA"
};
store.liveUploads.push(oldUpload);
store.auditLogs.push({ id: "old_audit_for_purge", action: "hold", targetType: "claim", targetId: privateClaim.id, createdAt: new Date("2010-01-01T00:00:00.000Z"), reason: "expired audit" });
const privacyDashboard = await app.handle({ method: "GET", path: "/admin/privacy-dashboard", headers: internalHeaders });
assert.equal(privacyDashboard.status, 200);
assert.equal((privacyDashboard.body as { policy: string }).policy, "private_originals_precise_location_never_public");
assert.equal((privacyDashboard.body as { summary: { originalMediaStoredCount: number; preciseLocationStoredCount: number; privateUploadBufferCount: number } }).summary.originalMediaStoredCount >= 1, true);
assert.equal((privacyDashboard.body as { summary: { preciseLocationStoredCount: number } }).summary.preciseLocationStoredCount >= 1, true);
assert.equal((privacyDashboard.body as { summary: { privateUploadBufferCount: number } }).summary.privateUploadBufferCount >= 1, true);
assert.equal((privacyDashboard.body as { purgePreview: { liveUploadBuffers: number } }).purgePreview.liveUploadBuffers >= 1, true);
assert.equal(JSON.stringify(privacyDashboard.body).includes("private/live/expired"), false);
assert.equal(JSON.stringify(privacyDashboard.body).includes("privateMediaBase64"), false);
assert.equal(JSON.stringify(privacyDashboard.body).includes("private-cell"), false);
const privacyPurge = await app.handle({ method: "POST", path: "/internal/privacy/purge-expired", headers: internalHeaders, body: {} });
assert.equal(privacyPurge.status, 200);
assert.equal((privacyPurge.body as { auditLogsDeleted: number }).auditLogsDeleted >= 1, true);
assert.equal((privacyPurge.body as { liveUploadBuffersCleared: number }).liveUploadBuffersCleared >= 1, true);
assert.equal(privateClaim.statement, "");
assert.equal(privateEvidence.geoCell, undefined);
assert.equal(privateEvidence.privateLng, undefined);
assert.equal(privateEvidence.privateLat, undefined);
assert.equal(privateEvidence.gpsAccuracyM, undefined);
assert.equal(privateEvidence.distanceToTargetM, undefined);
assert.equal(privateEvidence.storageKey, undefined);
assert.equal(privateEvidence.hash, undefined);
assert.equal(oldUpload.privateMediaBase64, undefined);

const failedDeleteStore = createSeedStore();
const failedDeleteEvidence = failedDeleteStore.evidence.find((evidence) => evidence.id === "ev_occ_live_1");
assert(failedDeleteEvidence);
failedDeleteEvidence.storageKey = "private/live/expired/delete-fails.mp4";
failedDeleteEvidence.uploadedAt = new Date("2020-01-01T00:00:00.000Z");
const failedDeleteApp = createApp(failedDeleteStore, {
  internalApiKey: "test_internal_key",
  liveMediaStorage: { put: async () => undefined, delete: async () => { throw new Error("delete failed"); } }
});
const failedDeletePurge = await failedDeleteApp.handle({ method: "POST", path: "/internal/privacy/purge-expired", headers: internalHeaders, body: {} });
assert.equal(failedDeletePurge.status, 503);
assert.equal((failedDeletePurge.body as { error: string }).error, "privacy_purge_storage_unavailable");
assert.equal(failedDeleteEvidence.storageKey, "private/live/expired/delete-fails.mp4");

const deletedStorageKeys: string[] = [];
const storageDeleteStore = createSeedStore();
const storageDeleteEvidence = storageDeleteStore.evidence.find((evidence) => evidence.id === "ev_occ_live_1");
assert(storageDeleteEvidence);
storageDeleteEvidence.storageKey = "private/live/expired/delete-succeeds.mp4";
storageDeleteEvidence.hash = "delete-succeeds-hash";
storageDeleteEvidence.uploadedAt = new Date("2020-01-01T00:00:00.000Z");
const storageDeleteApp = createApp(storageDeleteStore, {
  internalApiKey: "test_internal_key",
  liveMediaStorage: {
    put: async () => undefined,
    delete: async (storageKey) => {
      deletedStorageKeys.push(storageKey);
    }
  }
});
const storageDeletePurge = await storageDeleteApp.handle({ method: "POST", path: "/internal/privacy/purge-expired", headers: internalHeaders, body: {} });
assert.equal(storageDeletePurge.status, 200);
assert.deepEqual(deletedStorageKeys, ["private/live/expired/delete-succeeds.mp4"]);
assert.equal(storageDeleteEvidence.storageKey, undefined);
assert.equal(storageDeleteEvidence.hash, undefined);

const home = await app.handle({ method: "GET", path: "/home" });
assert.equal(home.status, 200);
assert.equal(JSON.stringify(home.body).includes("issueCards"), true);
assert.equal(JSON.stringify(home.body).includes("정보통신망법 개정 반대 집회"), true);
assert.equal(JSON.stringify(home.body).includes("대통령 탄핵 요구 행진"), true);
assert.equal(JSON.stringify((home.body as { issueCards: unknown }).issueCards).includes("대구 7월 집회 신고 현황"), false);
assert.equal(JSON.stringify(home.body).includes("서울 시청·종각 일대 집회 관련 현장 신호"), false);
assert.equal(JSON.stringify(home.body).includes("\"title\":\"부산 서면-해운대 행진 가능성\""), false);
assert.equal(JSON.stringify(home.body).includes("집회·시위 현장 요약"), false);
assert.equal(JSON.stringify(home.body).includes("\"title\":\"이동·교통 영향\""), false);
assert.equal(JSON.stringify(home.body).includes("issue_sample_impeachment_march"), true);
assert.equal(JSON.stringify(home.body).includes("위치 인증 제보 있음"), true);
assert.equal(JSON.stringify(home.body).includes("부산 도심 행진 가능성"), true);
assert.equal(JSON.stringify(home.body).includes("인파 밀집 신호"), false);
assert.equal(JSON.stringify(home.body).includes("경찰청 2011~2023 집회 신고·개최 통계"), false);
assert.equal(JSON.stringify(home.body).includes("대구 2020~2025 집회 신고·개최 현황"), false);
assert.equal(JSON.stringify(home.body).includes("대구 0709(목) 오늘의 집회 공개 일정"), false);
assert.equal(JSON.stringify(home.body).includes("대구 0707(화) 오늘의 집회 공개 일정"), false);
assert.equal(JSON.stringify(home.body).includes("대구 0706(월) 오늘의 집회 공개 일정"), false);
assert.equal(JSON.stringify(home.body).includes("대구 0704(토)~0705(일) 오늘의 집회 공개 일정"), false);
assert.equal(JSON.stringify(home.body).includes("UPCOMING"), true);
assert.equal(JSON.stringify(home.body).includes("ENDED"), false);
assert.equal(JSON.stringify(home.body).includes("ARCHIVED"), false);
assert.equal(JSON.stringify(home.body).includes("WEAKLY_OBSERVED"), false);
assert.equal(JSON.stringify(home.body).includes("traffic_control"), false);
const homeContract = home.body as {
  issueOverviews: Array<{ id: string; representativeOccurrenceId?: string }>;
  occurrenceDigests: Array<{ id: string; targetType: string; issueId?: string; title: string }>;
};
assert.equal(homeContract.issueOverviews.length > 0, true);
assert.equal(homeContract.occurrenceDigests.length > 0, true);
assert.equal(homeContract.occurrenceDigests.every((digest) => ["occurrence", "continuous_presence"].includes(digest.targetType)), true);
assert.equal(homeContract.occurrenceDigests.every((digest) => Boolean(digest.id) && Boolean(digest.title)), true);
assert.equal(JSON.stringify(homeContract).includes("privateLng"), false);
assert.equal(JSON.stringify(homeContract).includes("privateLat"), false);
assert.equal(JSON.stringify(homeContract).includes("storageKey"), false);

const issue = await app.handle({ method: "GET", path: "/issues/issue_1" });
assert.equal(issue.status, 200);
assert.equal(JSON.stringify(issue.body).includes("targets"), true);
assert.equal(JSON.stringify(issue.body).includes("transit_occurrence"), false);
assert.equal(JSON.stringify(issue.body).includes("crowd_density_signal"), false);
assert.equal(Array.isArray((issue.body as { occurrenceDigests?: unknown[] }).occurrenceDigests), true);
assert.equal(typeof (issue.body as { issueOverview?: { representativeOccurrenceId?: string } }).issueOverview?.representativeOccurrenceId, "string");
assert.equal(JSON.stringify(issue.body).includes("route_segment"), false);
assert.equal(JSON.stringify(issue.body).includes("route_checkpoint"), false);
assert.equal(JSON.stringify(issue.body).includes("nationalSummary"), true);
assert.equal(JSON.stringify(issue.body).includes("topicGrouping"), true);
assert.equal(JSON.stringify(issue.body).includes("regionalSignals"), true);
assert.equal(JSON.stringify(issue.body).includes("nationalTimeline"), true);
assert.equal(JSON.stringify(issue.body).includes("crowdEstimates"), true);
assert.equal(JSON.stringify(issue.body).includes("regionalCrowdEstimates"), true);
assert.equal((issue.body as { nationalSummary: { regionCount: number; liveClaimCount: number } }).nationalSummary.regionCount >= 2, true);
assert.equal((issue.body as { nationalSummary: { regionCount: number; liveClaimCount: number } }).nationalSummary.liveClaimCount >= 1, true);
const issueRegionalSignals = (issue.body as { regionalSignals: Array<{ statusLabels: string[]; officialClaimCount: number; fieldClaimCount: number; disputeCount: number }> }).regionalSignals;
assert.equal(issueRegionalSignals.every((signal) => Array.isArray(signal.statusLabels) && signal.statusLabels.length === 4), true);
assert.equal(issueRegionalSignals.some((signal) => signal.statusLabels.some((label) => label.includes("공식"))), true);
assert.equal(issueRegionalSignals.some((signal) => signal.statusLabels.some((label) => label.includes("이견"))), true);
const issueGrouping = (issue.body as { topicGrouping: { basis: string[]; policy: string; regions: string[]; targetTypes: Array<{ label: string; count: number }> } }).topicGrouping;
assert.equal(issueGrouping.basis.some((item) => item.includes("지역·시간이 다르면 별도 현장")), true);
assert.equal(issueGrouping.policy, "이 묶음은 탐색 단위이며 사실 확정이 아닙니다.");
assert.equal(issueGrouping.regions.length >= 2, true);
assert.equal(issueGrouping.targetTypes.some((item) => item.label === "집회 현장" && item.count >= 1), true);
const issueCrowdEstimates = (
  issue.body as {
    crowdEstimates: Array<{
      id: string;
      minCount: number;
      maxCount: number;
      confidence: string;
      generated?: boolean;
      limitations: string[];
      claim: { sourceProvenance: string; evidenceStrength: string; riskLevel: string; normalizedStatement: string };
    }>;
  }
).crowdEstimates;
assert.equal(issueCrowdEstimates.some((estimate) => estimate.id === "derived_issue_1_crowd_estimate" && estimate.generated === true), true);
assert.equal(issueCrowdEstimates.some((estimate) => estimate.minCount === 1200 && estimate.maxCount === 2600), true);
assert.equal(JSON.stringify(issueCrowdEstimates).includes("자동 갱신 추정"), true);
assert.equal(issueCrowdEstimates[0]?.claim.sourceProvenance, "musunil_ai_estimate");
assert.equal(["multiple_proof_of_presence", "independent_sources_with_field_evidence", "single_source"].includes(issueCrowdEstimates[0]?.claim.evidenceStrength), true);
assert.equal(issueCrowdEstimates[0]?.claim.riskLevel, "misleading_possible");
assert.equal(issueCrowdEstimates[0]?.claim.normalizedStatement.includes("자동 규모 추정 Claim"), true);
const regionalCrowdEstimates = (issue.body as { regionalCrowdEstimates: Array<{ regionLabel: string; minCount: number; maxCount: number; generated?: boolean }> }).regionalCrowdEstimates;
assert.equal(regionalCrowdEstimates.some((estimate) => estimate.regionLabel === "서울" && estimate.generated === true), true);
assert.equal(regionalCrowdEstimates.every((estimate) => estimate.maxCount >= estimate.minCount), true);
const issueVerificationSignals = (issue.body as { verificationSignals: Array<{ id: string; label: string; summary: string }> }).verificationSignals;
assert.equal(issueVerificationSignals.some((signal) => signal.id === "official_absent"), true);
assert.equal(issueVerificationSignals.length >= 1, true);
const issueTimeline = (issue.body as { nationalTimeline: { summary: { label: string }; moments: Array<{ title: string; sourceProvenance?: string; evidenceStrength?: string; riskLevel?: string }> } }).nationalTimeline;
assert.equal(["동시다발 확인", "순차 확산 확인", "단일 권역 확인"].includes(issueTimeline.summary.label), true);
assert.equal(issueTimeline.moments.some((moment) => moment.title.includes("현장 영상")), true);
assert.equal(issueTimeline.moments.some((moment) => moment.title.includes("현장 영상 Claim")), false);
assert.equal(issueTimeline.moments.some((moment) => moment.sourceProvenance && moment.evidenceStrength && moment.riskLevel), true);
assert.equal(JSON.stringify(issue.body).includes("private/live/2026"), false);

const sourceOnlyIssue = await app.handle({ method: "GET", path: "/issues/issue_public_regional_schedule" });
assert.equal(sourceOnlyIssue.status, 404);

const qualityStore = createSeedStore({ includeMockData: false });
qualityStore.issues.push({
  id: "issue_quality_confidence",
  title: "규모 추정 품질 검증 집회",
  kind: "topic",
  normalizedTopicKey: "topic:quality-confidence",
  topicTags: ["품질 검증", "집회"],
  status: "active",
  firstSeenAt: now,
  lastUpdatedAt: now
});
for (let index = 0; index < 4; index += 1) {
  const regionLabel = index < 2 ? "서울" : "부산";
  qualityStore.occurrences.push({
    id: `occ_quality_${index}`,
    issueId: "issue_quality_confidence",
    type: "static_assembly",
    areaClusterId: `area_quality_${regionLabel}`,
    regionLabel,
    title: `${regionLabel} 규모 추정 품질 검증`,
    lifecycleState: "LIVE",
    claimIds: [`claim_quality_${index}`],
    evidenceIds: [`ev_quality_${index}`]
  });
  qualityStore.evidence.push({
    id: `ev_quality_${index}`,
    evidenceType: "live_media",
    uploadedAt: now,
    capturedAt: new Date(now.getTime() - 60_000),
    foregroundGps: true,
    gpsAccuracyM: 30,
    distanceToTargetM: 80,
    deviceIntegrityStatus: "pass",
    deviceIntegrityProvider: "play_integrity",
    deviceIntegrityCheckedAt: now,
    deviceIntegrityProofHash: `sha256-qualitydeviceintegrity${index}`,
    proofOfPresenceStatus: "pass",
	    redactionStatus: "completed",
	    redactionProofHash: `sha256-qualityredactionproof${index}`,
	    publicStorageKey: `/media/redacted/quality-live-${index}.webm`,
	    publicPosterKey: `/media/redacted/quality-live-${index}-poster.webp`,
	    hash: `quality-live-${index}`
	  });
  qualityStore.claims.push({
    id: `claim_quality_${index}`,
    targetType: "occurrence",
    targetId: `occ_quality_${index}`,
    sourceProvenance: "verified_citizen_report",
    claimantLabel: "위치 인증 제보",
    statement: "",
	    normalizedStatement: "규모 추정 품질 검증용 현장 인증 자료입니다.",
    evidenceStrength: "media_time_location_crosscheck",
    riskLevel: "rights_risk",
    createdAt: now,
    evidenceIds: [`ev_quality_${index}`],
    disputedByClaimIds: []
  });
}
const qualityApp = createApp(qualityStore);
const qualityIssue = await qualityApp.handle({ method: "GET", path: "/issues/issue_quality_confidence" });
assert.equal((qualityIssue.body as { crowdEstimates: Array<{ confidence: string; independentViewpointCount: number }> }).crowdEstimates[0]?.confidence, "medium");
assert.equal((qualityIssue.body as { crowdEstimates: Array<{ confidence: string; independentViewpointCount: number }> }).crowdEstimates[0]?.independentViewpointCount, 4);
const weakQualityEvidence = qualityStore.evidence.find((item) => item.id === "ev_quality_0");
if (weakQualityEvidence) {
  weakQualityEvidence.deviceIntegrityStatus = "unknown";
  qualityStore.evidence.find((item) => item.id === "ev_quality_1")!.hash = weakQualityEvidence.hash;
  qualityStore.evidence.find((item) => item.id === "ev_quality_2")!.hash = weakQualityEvidence.hash;
}
const weakQualityIssue = await qualityApp.handle({ method: "GET", path: "/issues/issue_quality_confidence" });
assert.equal((weakQualityIssue.body as { crowdEstimates: Array<{ confidence: string }> }).crowdEstimates[0]?.confidence, "low");
assert.equal(JSON.stringify(weakQualityIssue.body).includes("device_integrity"), true);

const appRiskDashboard = await app.handle({ method: "GET", path: "/admin/risk-dashboard", headers: internalHeaders });
assert.equal(appRiskDashboard.status, 200);
assert.equal((appRiskDashboard.body as { summary: { userClusterCount: number; deviceAttestationClusterCount: number } }).summary.userClusterCount >= 1, true);
assert.equal((appRiskDashboard.body as { summary: { userClusterCount: number; deviceAttestationClusterCount: number } }).summary.deviceAttestationClusterCount >= 1, true);
assert.equal(
  (appRiskDashboard.body as { evidenceSignals: { userClusters: Array<{ userBucket: string }>; deviceAttestationClusters: Array<{ deviceBucket: string }> } }).evidenceSignals.userClusters.every((cluster) =>
    cluster.userBucket.startsWith("user_")
  ),
  true
);
assert.equal(JSON.stringify(appRiskDashboard.body).includes(user1Session.userId), false);
assert.equal(JSON.stringify(appRiskDashboard.body).includes("field-device-cluster"), false);

const map = await app.handle({ method: "GET", path: "/map" });
assert.equal(map.status, 200);
assertPublicPayloadSafe(map.body);
const mapBody = map.body as { geojson: { pins: { features: Array<{ geometry: { type: string } }> }; presenceAreas: { features: Array<{ geometry: { type: string } }> } } };
assert.equal(mapBody.geojson.pins.features.every((feature) => feature.geometry.type === "Point"), true);
assert.equal(mapBody.geojson.presenceAreas.features.every((feature) => feature.geometry.type === "Polygon"), true);
assert.equal(JSON.stringify(map.body).includes("LineString"), false);
assert.equal(mapBody.geojson.presenceAreas.features.length >= 1, true);
const mapContract = map.body as { occurrenceDigests: Array<{ id: string; targetType: string; issueTitle?: string; topicStatus?: string; topicStatusLabel?: string }> };
assert.equal(mapContract.occurrenceDigests.some((digest) => digest.id === "occ_1" && digest.targetType === "occurrence"), true);
const homeOccurrence = homeContract.occurrenceDigests.find((digest) => digest.id === "occ_1");
const mapOccurrence = mapContract.occurrenceDigests.find((digest) => digest.id === "occ_1");
assert.equal(homeOccurrence?.id, mapOccurrence?.id);
assert.equal(homeOccurrence?.targetType, mapOccurrence?.targetType);
assert.equal(mapOccurrence?.topicStatus, "linked");
assert.equal(mapOccurrence?.topicStatusLabel, "연결된 주요 주제");
assert.equal(typeof mapOccurrence?.issueTitle, "string");
assert.equal(JSON.stringify(mapContract).includes("privateLng"), false);
assert.equal(JSON.stringify(mapContract).includes("privateLat"), false);

const publicSourceBody = {
  targetType: "occurrence",
  targetId: "occ_1",
  sourceId: "daegu_today_assembly",
  sourceCheckedAt: "2026-07-12T00:00:00.000Z",
  sourceBatchSize: 2,
  sourceProvenance: "government_or_police",
  claimantLabel: "경찰/지자체 공개 안내",
  normalizedStatement: "공개 자료에서 집회 일정 안내가 확인되었습니다.",
  evidenceStrength: "single_source",
  riskLevel: "misleading_possible",
  rawText: "공공 원천 원문은 공개 응답에 그대로 노출하지 않는다"
};
const publicSource = await app.handle({
  method: "POST",
  path: "/internal/ingest/public-source",
  headers: internalHeaders,
  body: publicSourceBody
});
assert.equal(publicSource.status, 201);
assert.equal(JSON.stringify(publicSource.body).includes("공공 원천 원문은 공개 응답에 그대로 노출하지 않는다"), false);
const duplicatePublicSource = await app.handle({
  method: "POST",
  path: "/internal/ingest/public-source",
  headers: internalHeaders,
  body: { ...publicSourceBody, rawText: "갱신된 공공 원천 원문도 공개 응답에 나오면 안 된다" }
});
assert.equal(duplicatePublicSource.status, 200);
assert.equal(
  store.claims.filter(
    (claim) =>
      claim.targetType === "occurrence" &&
      claim.targetId === "occ_1" &&
      claim.claimantLabel === "경찰/지자체 공개 안내" &&
      claim.normalizedStatement === "공개 자료에서 집회 일정 안내가 확인되었습니다."
  ).length,
  1
);
assert.equal(
  store.claims.find(
    (claim) =>
      claim.targetType === "occurrence" &&
      claim.targetId === "occ_1" &&
      claim.claimantLabel === "경찰/지자체 공개 안내" &&
      claim.normalizedStatement === "공개 자료에서 집회 일정 안내가 확인되었습니다."
  )?.statement,
  "갱신된 공공 원천 원문도 공개 응답에 나오면 안 된다"
);
assert.equal(JSON.stringify(duplicatePublicSource.body).includes("갱신된 공공 원천 원문도 공개 응답에 나오면 안 된다"), false);
const refreshedCoverage = await app.handle({ method: "GET", path: "/public-sources/coverage" });
const refreshedCoverageBody = refreshedCoverage.body as {
  coverage: {
    regions: Array<{ code: string; lastCheckedAt: string }>;
    sourceRefreshes: Array<{ sourceId: string; checkedAt: string; resultCount: number }>;
  };
};
assert.equal(refreshedCoverageBody.coverage.regions.find((region) => region.code === "daegu")?.lastCheckedAt, "2026-07-12T00:00:00.000Z");
assert.equal(refreshedCoverageBody.coverage.sourceRefreshes.some((refresh) => refresh.sourceId === "daegu_today_assembly" && refresh.checkedAt === "2026-07-12T00:00:00.000Z"), true);
assert.equal(refreshedCoverageBody.coverage.sourceRefreshes.find((refresh) => refresh.sourceId === "daegu_today_assembly")?.resultCount, 2);
assert.equal(JSON.stringify(home.body).includes("hazard_area"), false);
assert.equal(JSON.stringify(home.body).includes("service_disruption"), false);

const monthly = await app.handle({ method: "GET", path: "/transparency/monthly" });
assert.equal(monthly.status, 200);

const protectedApp = createApp(createSeedStore(), {
  internalApiKey: "test_internal_key",
  publicDiscoveryNow: () => new Date("2026-07-12T01:00:00.000Z"),
  readiness: () => ({ ready: true, checks: [{ id: "test", ok: true, message: "ok" }] })
});
assert.equal((await protectedApp.handle({ method: "GET", path: "/ready" })).status, 200);
assert.equal((await protectedApp.handle({ method: "GET", path: "/admin/review-queue" })).status, 401);
assert.equal(
  (await protectedApp.handle({ method: "GET", path: "/admin/review-queue", headers: { "x-musunil-internal-key": "wrong_key" } })).status,
  401
);
assert.equal(
  (await protectedApp.handle({ method: "GET", path: "/admin/review-queue", headers: internalHeaders })).status,
  200
);
const riskDashboard = await protectedApp.handle({ method: "GET", path: "/admin/risk-dashboard", headers: internalHeaders });
assert.equal(riskDashboard.status, 200);
assert.equal((riskDashboard.body as { decisionPolicy: string }).decisionPolicy, "signals_prioritize_review_only");
assert.equal((riskDashboard.body as { summary: { reviewQueueCount: number; pendingRedactionCount: number } }).summary.reviewQueueCount >= 0, true);
assert.equal((riskDashboard.body as { issueRisks: Array<{ verificationSignals: unknown[] }> }).issueRisks.some((issue) => issue.verificationSignals.length > 0), true);
assert.equal(JSON.stringify(riskDashboard.body).includes("private/live/2026"), false);
assert.equal(JSON.stringify(riskDashboard.body).includes("privateMediaBase64"), false);
const protectedPrivacyDashboard = await protectedApp.handle({ method: "GET", path: "/admin/privacy-dashboard", headers: internalHeaders });
assert.equal(protectedPrivacyDashboard.status, 200);
assert.equal((protectedPrivacyDashboard.body as { summary: { originalMediaStoredCount: number } }).summary.originalMediaStoredCount >= 1, true);
assert.equal(JSON.stringify(protectedPrivacyDashboard.body).includes("private/live/2026"), false);
assert.equal(JSON.stringify(protectedPrivacyDashboard.body).includes("preview-seoul"), false);

const ingested = await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrence",
  headers: internalHeaders,
  body: {
    id: "occ_daegu_0710_public",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    sourceId: "daegu_today_assembly",
    sourceCheckedAt: "2026-07-12T01:00:00.000Z",
    title: "대구 0710(금) 오늘의 집회 공개 일정",
    startsAt: "2026-07-10T00:00:00.000+09:00",
    lifecycleState: "UPCOMING",
    claimantLabel: "대구경찰청 오늘의 집회시위",
    normalizedStatement: "대구경찰청 게시판에 0710(금) 오늘의 집회 공개 일정 게시물이 등록되었습니다.",
    rawText: "공개하면 안 되는 원문"
  }
});
assert.equal(ingested.status, 201);
assert.equal(JSON.stringify(ingested.body).includes("공개하면 안 되는 원문"), false);

const emptyOfficialStore = emptyStore();
const emptyOfficialApp = createApp(emptyOfficialStore, {
  internalApiKey: "test_internal_key",
  readiness: () => ({ ready: false, checks: [{ id: "launch", ok: false, message: "not launched" }] })
});
const officialBatchBody = {
  sourceId: "jeonnam_today_assembly",
  checkedAt: "2026-07-20T06:00:00.000Z",
  status: "success",
  parsedCount: 1,
  records: [{
    id: "occ_jeonnam_2026_07_20_public",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_jeonnam",
    regionLabel: "전남",
    title: "전남 2026. 7. 20. 오늘의 주요집회 공개 일정",
    startsAt: "2026-07-20T00:00:00.000+09:00",
    lifecycleState: "UPCOMING",
    sourceProvenance: "government_or_police",
    claimantLabel: "전남경찰청 오늘의집회/시위",
    normalizedStatement: "전남경찰청 게시판에 오늘의 주요집회 예정 정보가 등록되었습니다.",
    rawText: "외부에 그대로 노출하면 안 되는 경찰 원문",
    evidenceUploadedAt: "2026-07-20T00:00:00.000+09:00",
    sourceItemId: "445805",
    sourceUrl: "https://www.jnpolice.go.kr/?pid=AP0306&mode=view&bbsBid=445805",
    sourcePublishedAt: "2026-07-20T00:00:00.000+09:00",
    sourceTitle: "2026. 7. 20. 오늘의 주요집회",
    sourceGranularity: "bulletin"
  }]
};
const officialBatch = await emptyOfficialApp.handle({ method: "POST", path: "/internal/ingest/public-occurrences/batch", headers: internalHeaders, body: officialBatchBody });
assert.equal(officialBatch.status, 200);
assert.equal((officialBatch.body as { created: number }).created, 1);
assert.equal(emptyOfficialStore.issues.some((item) => item.id === "issue_public_regional_schedule"), true);
assert.equal(emptyOfficialStore.areaClusters.some((item) => item.id === "area_jeonnam"), true);
assert.equal(emptyOfficialStore.evidence[0]?.externalProvider, "official_public_source");
assert.equal(emptyOfficialStore.evidence[0]?.sourceGranularity, "bulletin");
const officialDetail = await emptyOfficialApp.handle({ method: "GET", path: "/occurrences/occ_jeonnam_2026_07_20_public" });
assert.equal(officialDetail.status, 404);
const sourceOnlyHome = await emptyOfficialApp.handle({ method: "GET", path: "/home" });
assert.equal(JSON.stringify(sourceOnlyHome.body).includes("occ_jeonnam_2026_07_20_public"), false);
const sourceOnlyMap = await emptyOfficialApp.handle({ method: "GET", path: "/map" });
assert.equal(JSON.stringify(sourceOnlyMap.body).includes("occ_jeonnam_2026_07_20_public"), false);
const publicIssuesWithoutSourceBundle = await emptyOfficialApp.handle({ method: "GET", path: "/issues" });
assert.equal(JSON.stringify(publicIssuesWithoutSourceBundle.body).includes("issue_public_regional_schedule"), false);
const officialBatchAgain = await emptyOfficialApp.handle({ method: "POST", path: "/internal/ingest/public-occurrences/batch", headers: internalHeaders, body: officialBatchBody });
assert.equal(officialBatchAgain.status, 200);
assert.equal((officialBatchAgain.body as { unchanged: number }).unchanged, 1);
assert.equal(emptyOfficialStore.evidence.length, 1);
const correctedOfficialBatchBody = structuredClone(officialBatchBody);
correctedOfficialBatchBody.records[0].title = "전남 7월 20일 주요집회 공개 일정";
correctedOfficialBatchBody.records[0].normalizedStatement = "전남경찰청 게시판에 7월 20일 주요집회 예정 정보가 등록되었습니다.";
correctedOfficialBatchBody.records[0].sourceTitle = "7월 20일 주요집회";
const correctedOfficialBatch = await emptyOfficialApp.handle({ method: "POST", path: "/internal/ingest/public-occurrences/batch", headers: internalHeaders, body: correctedOfficialBatchBody });
assert.equal(correctedOfficialBatch.status, 200);
assert.equal(emptyOfficialStore.claims.length, 1);
assert.equal(emptyOfficialStore.evidence.length, 1);
assert.equal(emptyOfficialStore.occurrences[0]?.title, "전남 7월 20일 주요집회 공개 일정");
assert.equal(emptyOfficialStore.claims[0]?.normalizedStatement, "전남경찰청 게시판에 7월 20일 주요집회 예정 정보가 등록되었습니다.");

const individualEventBatch = await emptyOfficialApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrences/batch",
  headers: internalHeaders,
  body: {
    sourceId: "seoul_assembly_control",
    checkedAt: "2026-07-20T07:15:00.000Z",
    status: "success",
    parsedCount: 2,
    records: [{
      id: "occ_seoul_2026_07_20_2021_1",
      type: "static_assembly",
      areaClusterId: "area_seoul_public",
      regionLabel: "서울",
      title: "서울광장 일대 집회 일정",
      startsAt: "2026-07-20T09:00:00.000+09:00",
      endsAt: "2026-07-20T14:00:00.000+09:00",
      lifecycleState: "UPCOMING",
      sourceProvenance: "government_or_police",
      claimantLabel: "서울경찰청 교통정보센터 집회·통제정보",
      normalizedStatement: "서울경찰청 공개 일정에 7월 20일 서울광장 일대 집회 일정이 포함되어 있습니다.",
      rawText: "비공개 원문: 서울광장→광화문교차로 행진 경로",
      evidenceUploadedAt: "2026-07-20T07:11:23.000+09:00",
      sourceItemId: "2021:event:1",
      sourceUrl: "https://www.spatic.go.kr/spatic/assem/getInfoView.do?mgrSeq=2021",
      sourcePublishedAt: "2026-07-20T07:11:23.000+09:00",
      sourceTitle: "7월 20일 (월) 행사 및 집회",
      sourceGranularity: "individual_schedule",
      declaredParticipantCount: 120,
      publicLocationKey: "seoul_civic_center_area"
    }]
  }
});
assert.equal(individualEventBatch.status, 200);
const individualDetail = await emptyOfficialApp.handle({ method: "GET", path: "/occurrences/occ_seoul_2026_07_20_2021_1" });
assert.equal(individualDetail.status, 200);
assert.equal(JSON.stringify(individualDetail.body).includes("광화문교차로 행진 경로"), false);
assert.equal((individualDetail.body as { occurrence: { publicLocation: { label: string; precision: string } } }).occurrence.publicLocation.label, "서울광장·광화문 일대");
assert.equal((individualDetail.body as { occurrence: { publicLocation: { label: string; precision: string } } }).occurrence.publicLocation.precision, "area");
assert.equal((individualDetail.body as { occurrence: { locationStatus: string } }).occurrence.locationStatus, "SOURCE_GEOCODED");
const individualDigest = (individualDetail.body as { occurrenceDigest: { title: string; issueTitle?: string; topicStatus: string; topicStatusLabel: string; declaredParticipantCount?: number; scale?: unknown } }).occurrenceDigest;
assert.equal(individualDigest.title, "서울광장 집회");
assert.equal(individualDigest.issueTitle, undefined);
assert.equal(individualDigest.topicStatus, "source_not_disclosed");
assert.equal(individualDigest.topicStatusLabel, "경찰 공개자료에 주제 미기재");
assert.equal(individualDigest.declaredParticipantCount, 120);
assert.equal(individualDigest.scale, undefined);
const individualIssueId = (individualDetail.body as { occurrence: { issueId?: string } }).occurrence.issueId;
assert.equal(individualIssueId, undefined);
assert.equal(emptyOfficialStore.issues.some((issue) => issue.title === "서울광장·광화문 일대 집회 일정"), false);
const individualHome = await emptyOfficialApp.handle({ method: "GET", path: "/home" });
assert.equal(JSON.stringify((individualHome.body as { issueCards: unknown }).issueCards).includes("서울광장·광화문 일대 집회 일정"), false);
const textLocatedEventBatch = await emptyOfficialApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrences/batch",
  headers: internalHeaders,
  body: {
    sourceId: "daegu_today_assembly",
    checkedAt: "2026-07-20T07:20:00.000Z",
    status: "success",
    parsedCount: 1,
    records: [{
      id: "occ_daegu_location_estimate_test",
      type: "static_assembly",
      areaClusterId: "area_daegu",
      regionLabel: "대구",
      title: "남산동 중구 선거관리위원회 앞 집회 일정",
      startsAt: "2026-07-20T09:00:00.000+09:00",
      lifecycleState: "UPCOMING",
      sourceProvenance: "government_or_police",
      claimantLabel: "대구경찰청 공개자료",
      normalizedStatement: "공개 첨부자료에 남산동 집회 일정이 안내되어 있습니다.",
      rawText: "공개하지 않는 원문",
      evidenceUploadedAt: "2026-07-20T07:15:00.000+09:00",
      sourceItemId: "location-estimate-test",
      sourceUrl: "https://www.dgpolice.go.kr/official-attachment.pdf",
      sourceGranularity: "individual_schedule",
      publicLocationText: "남산동, 중구 선거관리위원회 앞"
    }]
  }
});
assert.equal(textLocatedEventBatch.status, 200);
const textLocatedDetail = await emptyOfficialApp.handle({ method: "GET", path: "/occurrences/occ_daegu_location_estimate_test" });
const textLocatedOccurrence = (textLocatedDetail.body as { occurrence: { locationStatus: string; publicLocation: { publicRadiusM: number; uncertaintyRadiusM: number; source: string } } }).occurrence;
assert.equal(textLocatedOccurrence.locationStatus, "SOURCE_GEOCODED");
assert.equal(textLocatedOccurrence.publicLocation.publicRadiusM, 300);
assert.equal(textLocatedOccurrence.publicLocation.uncertaintyRadiusM, 1_500);
assert.equal(textLocatedOccurrence.publicLocation.source, "public_source");
assert.equal(JSON.stringify(textLocatedDetail.body).includes("sourcePublicLocation"), false);
const textLocatedMap = await emptyOfficialApp.handle({ method: "GET", path: "/map" });
const textLocatedPin = (textLocatedMap.body as { geojson: { pins: { features: Array<{ properties: Record<string, unknown> }> } } }).geojson.pins.features
  .find((feature) => feature.properties.occurrenceUnitId === "occ_daegu_location_estimate_test");
assert.equal(textLocatedPin?.properties.locationStatus, "SOURCE_GEOCODED");
assert.equal(textLocatedPin?.properties.publicRadiusM, 300);
const legacyIndividualStore = structuredClone(emptyOfficialStore);
const legacyIndividualOccurrence = legacyIndividualStore.occurrences.find((item) => item.id === "occ_seoul_2026_07_20_2021_1");
if (!legacyIndividualOccurrence) throw new Error("individual schedule reconcile fixture missing");
const legacyIssueId = "issue_legacy_location_schedule";
legacyIndividualStore.issues.push({
  id: legacyIssueId,
  title: "서울광장·광화문 일대 집회 일정",
  kind: "topic",
  normalizedTopicKey: "topic:legacy-location-schedule",
  topicTags: ["서울광장·광화문 일대", "장소별 일정", "집회 일정"],
  status: "active",
  firstSeenAt: now,
  lastUpdatedAt: now
});
legacyIndividualOccurrence.issueId = legacyIssueId;
assert.equal(reconcileLegacyLocationScheduleIssues(legacyIndividualStore) >= 3, true);
assert.equal(legacyIndividualOccurrence.issueId, undefined);
assert.equal(legacyIndividualStore.issues.find((issue) => issue.id === legacyIssueId)?.status, "archived");
assert.equal(legacyIndividualStore.auditLogs.some((log) => log.targetId === legacyIndividualOccurrence.id && log.action === "split"), true);
assert.equal(reconcileLegacyLocationScheduleIssues(legacyIndividualStore), 0);
const discoveryNow = new Date("2026-07-21T01:00:00.000Z");
assert.equal(koreaRecentCalendarCutoff(discoveryNow).toISOString(), "2026-07-14T15:00:00.000Z");
assert.equal(isOccurrenceWithinPublicDiscoveryWindow({
  ...legacyIndividualOccurrence,
  lifecycleState: "ENDED",
  startsAt: new Date("2026-07-14T15:00:00.000Z"),
  endsAt: new Date("2026-07-14T15:00:00.000Z")
}, discoveryNow), true);
assert.equal(isOccurrenceWithinPublicDiscoveryWindow({
  ...legacyIndividualOccurrence,
  lifecycleState: "ENDED",
  startsAt: new Date("2026-07-14T14:59:59.999Z"),
  endsAt: new Date("2026-07-14T14:59:59.999Z")
}, discoveryNow), false);
assert.equal(isOccurrenceWithinPublicDiscoveryWindow({
  ...legacyIndividualOccurrence,
  lifecycleState: "UPCOMING",
  startsAt: new Date("2026-07-01T00:00:00.000Z"),
  endsAt: new Date("2026-07-01T01:00:00.000Z")
}, discoveryNow), false);
assert.equal(isOccurrenceWithinPublicDiscoveryWindow({
  ...legacyIndividualOccurrence,
  lifecycleState: "UPCOMING",
  startsAt: new Date("2026-07-22T00:00:00.000Z"),
  endsAt: new Date("2026-07-22T01:00:00.000Z")
}, discoveryNow), true);
const individualMap = await emptyOfficialApp.handle({ method: "GET", path: "/map" });
const individualMapPin = (individualMap.body as { geojson: { pins: { features: Array<{ properties: { targetId: string; title: string; topicStatus: string; topicStatusLabel: string } }> } } }).geojson.pins.features.find((pin) => pin.properties.targetId === "occ_seoul_2026_07_20_2021_1");
assert.ok(individualMapPin);
assert.equal(individualMapPin.properties.title, "서울광장 집회");
assert.equal(individualMapPin.properties.title.includes("집회 일정"), false);
assert.equal(individualMapPin.properties.topicStatus, "source_not_disclosed");
assert.equal(individualMapPin.properties.topicStatusLabel, "경찰 공개자료에 주제 미기재");
const emptyOfficialBatch = await emptyOfficialApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrences/batch",
  headers: internalHeaders,
  body: { sourceId: "ulsan_today_assembly", checkedAt: "2026-07-20T06:05:00.000Z", status: "empty", parsedCount: 10, records: [] }
});
assert.equal(emptyOfficialBatch.status, 200);
assert.equal(emptyOfficialStore.publicSourceRefreshes.find((item) => item.sourceId === "ulsan_today_assembly")?.status, "empty");
const duplicateIngest = await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrence",
  headers: internalHeaders,
  body: {
    id: "occ_daegu_0710_public",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    title: "대구 0710(금) 오늘의 집회 공개 일정",
    startsAt: "2026-07-10T00:00:00.000+09:00",
    lifecycleState: "UPCOMING",
    claimantLabel: "대구경찰청 오늘의 집회시위",
    normalizedStatement: "대구경찰청 게시판에 0710(금) 오늘의 집회 공개 일정 게시물이 등록되었습니다."
  }
});
assert.equal(duplicateIngest.status, 200);
const publicBundleTopicOverride = await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrence",
  headers: internalHeaders,
  body: {
    id: "occ_public_bundle_topic_override",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_seoul",
    regionLabel: "서울",
    title: "서울 부정선거 의혹 제기 집회 공개 일정",
    startsAt: "2026-07-11T11:00:00.000+09:00",
    lifecycleState: "UPCOMING",
    claimantLabel: "공개 집회 자료",
    normalizedStatement: "공개 자료에 부정선거 의혹 제기 집회 목적이 포함되었습니다."
  }
});
assert.equal(publicBundleTopicOverride.status, 201);
const publicBundleTopicIssueId = (publicBundleTopicOverride.body as { occurrence: { issueId?: string } }).occurrence.issueId;
assert.equal(typeof publicBundleTopicIssueId, "string");
assert.notEqual(publicBundleTopicIssueId, "issue_public_regional_schedule");
const topicIngest = await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrence",
  headers: internalHeaders,
  body: {
    id: "occ_election_integrity_topic_1",
    topicTitle: "부정선거",
    topicTags: ["부정선거 의혹", "선거 검증", "집회"],
    type: "static_assembly",
    areaClusterId: "area_seoul",
    regionLabel: "서울",
    title: "서울 선거 검증 요구 집회",
    startsAt: "2026-07-11T10:00:00.000+09:00",
    lifecycleState: "UPCOMING",
    claimantLabel: "공개 집회 자료",
    normalizedStatement: "공개 자료에 부정선거 의혹 제기 집회 목적이 포함되었습니다."
  }
});
assert.equal(topicIngest.status, 201);
const topicIssueId = (topicIngest.body as { occurrence: { issueId?: string } }).occurrence.issueId;
assert.equal(typeof topicIssueId, "string");
if (!topicIssueId) throw new Error("topic issue id missing");
assert.equal(topicIssueId, publicBundleTopicIssueId);
const topicIngestAgain = await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrence",
  headers: internalHeaders,
  body: {
    id: "occ_election_integrity_topic_2",
    topicTitle: "선거 검증 요구",
    type: "static_assembly",
    areaClusterId: "area_busan",
    regionLabel: "부산",
    title: "부산 선거 검증 요구 집회",
    startsAt: "2026-07-12T10:00:00.000+09:00",
    lifecycleState: "UPCOMING",
    claimantLabel: "공개 집회 자료",
    normalizedStatement: "공개 자료에 선거 검증 요구 집회 목적이 포함되었습니다."
  }
});
assert.equal(topicIngestAgain.status, 201);
assert.equal((topicIngestAgain.body as { occurrence: { issueId?: string } }).occurrence.issueId, topicIssueId);
const topicHome = await protectedApp.handle({ method: "GET", path: "/home" });
assert.equal(JSON.stringify((topicHome.body as { issueCards: unknown }).issueCards).includes("부정선거 의혹 제기 집회"), true);
assert.equal(JSON.stringify((topicHome.body as { issueCards: unknown }).issueCards).includes("\"title\":\"부정선거\""), false);
const topicGroups = (topicHome.body as { eventTopicGroups: Array<{ id: string; title: string; status: string; occurrenceCount: number }> }).eventTopicGroups;
assert.equal(topicGroups.some((group) => group.title === "부정선거 의혹 제기 집회" && group.status === "approved" && group.occurrenceCount >= 1), true);
const topicGroup = topicGroups.find((group) => group.title === "부정선거 의혹 제기 집회");
if (!topicGroup) throw new Error("event topic group missing");
const topicGroupDetail = await protectedApp.handle({ method: "GET", path: `/event-topics/${topicGroup.id}` });
assert.equal(topicGroupDetail.status, 200);
assert.equal((topicGroupDetail.body as { occurrenceDigests: unknown[] }).occurrenceDigests.length >= 1, true);
const topicIssue = await protectedApp.handle({ method: "GET", path: `/issues/${topicIssueId}` });
assert.equal(topicIssue.status, 200);
assert.equal((topicIssue.body as { nationalSummary: { regionCount: number; targetCount: number } }).nationalSummary.regionCount, 2);
assert.equal((topicIssue.body as { nationalSummary: { regionCount: number; targetCount: number } }).nationalSummary.targetCount, 3);
assert.equal((topicIssue.body as { regionalSignals: Array<{ statusLabels: string[] }> }).regionalSignals.every((signal) => signal.statusLabels.length === 4), true);
assert.equal((topicIssue.body as { topicGrouping: { topicTitle: string; basis: string[]; regions: string[] } }).topicGrouping.topicTitle, "부정선거 의혹 제기 집회");
assert.equal((topicIssue.body as { topicGrouping: { basis: string[]; regions: string[] } }).topicGrouping.basis.some((item) => item.includes("공통 주제어")), true);
assert.equal((topicIssue.body as { topicGrouping: { regions: string[] } }).topicGrouping.regions.length, 2);
assert.equal((topicIssue.body as { crowdEstimates: unknown[] }).crowdEstimates.length, 0);
assert.equal(JSON.stringify(topicIssue.body).includes("공개 일정과 현장 인증 전 초기 추정입니다."), false);
assert.equal(JSON.stringify(topicIssue.body).includes("verificationSignals"), true);
assert.equal(JSON.stringify(topicIssue.body).includes("nationalTimeline"), true);
assert.equal((topicIssue.body as { regionalCrowdEstimates: Array<{ regionLabel: string }> }).regionalCrowdEstimates.length, 0);
assert.equal((topicIssue.body as { nationalTimeline: { summary: { label: string }; moments: unknown[] } }).nationalTimeline.summary.label.length > 0, true);
assert.equal((topicIssue.body as { nationalTimeline: { moments: unknown[] } }).nationalTimeline.moments.length > 0, true);
const topicLaws = await protectedApp.handle({ method: "GET", path: "/laws" });
assert.equal(topicLaws.status, 200);
assert.equal(JSON.stringify(topicLaws.body).includes("공직선거법"), true);
const ingestedLaw = await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/laws",
  headers: internalHeaders,
  body: {
    source: "assembly_bill",
    lawName: "집회 및 시위에 관한 법률",
    billTitle: "집회 및 시위에 관한 법률 일부개정법률안",
    stage: "접수",
    proposedDate: "2026-07-09T00:00:00.000+09:00",
    statusDate: "2026-07-09T00:00:00.000+09:00",
    assemblyBillId: "bill-test-assembly-act",
    assemblyBillNo: "2219001",
    proposer: "김태선의원 등 14인",
    proposalSummary: "평화적으로 진행된 미신고 옥외집회까지 일률적으로 형사처벌하는 범위를 조정하려는 것임.",
    officialUrl: "https://not-an-official-source.example/bill-test-assembly-act",
    keywords: ["집회 및 시위에 관한 법률", "집회시위법", "집회"]
  }
});
assert.equal(ingestedLaw.status, 200);
assert.equal(JSON.stringify(ingestedLaw.body).includes("집회 및 시위에 관한 법률"), true);
assert.equal(JSON.stringify(ingestedLaw.body).includes("not-an-official-source.example"), false);
assert.equal(JSON.stringify(ingestedLaw.body).includes("likms.assembly.go.kr"), true);
const newerIngestedLaw = await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/laws",
  headers: internalHeaders,
  body: {
    source: "assembly_bill",
    lawName: "집회 및 시위에 관한 법률",
    billTitle: "집회 및 시위에 관한 법률 일부개정법률안",
    stage: "접수",
    proposedDate: "2026-07-12T00:00:00.000+09:00",
    statusDate: "2026-07-08T00:00:00.000+09:00",
    assemblyBillId: "bill-test-assembly-act-newer",
    assemblyBillNo: "2219002",
    proposer: "권향엽의원 등 13인",
    proposalSummary: "타인의 기본권을 침해할 위험이 없는 평화적 미신고 집회에 대한 형사처벌 범위를 조정하려는 것임.",
    keywords: ["집회 및 시위에 관한 법률", "집회시위법", "집회"]
  }
});
assert.equal(newerIngestedLaw.status, 200);
const groupedLaws = await protectedApp.handle({ method: "GET", path: "/laws" });
const assemblyActGroup = (groupedLaws.body as { lawGroups: Array<{ id: string; billTitle: string; billCount: number; coreTopics: Array<{ label: string; billCount: number }> }> }).lawGroups.find((group) => group.billTitle === "집회 및 시위에 관한 법률 일부개정법률안");
assert.equal(assemblyActGroup?.billCount, 2);
assert.equal(assemblyActGroup?.coreTopics.some((topic) => topic.label.includes("미신고 집회") && topic.billCount === 2), true);
const groupedLawDetail = await protectedApp.handle({ method: "GET", path: `/law-groups/${assemblyActGroup?.id}` });
assert.equal(groupedLawDetail.status, 200);
assert.equal((groupedLawDetail.body as { bills: Array<{ assemblyBillNo?: string; proposer?: string; proposalSummary?: string }> }).bills.length, 2);
assert.equal(JSON.stringify(groupedLawDetail.body).includes("2219001"), true);
assert.equal(JSON.stringify(groupedLawDetail.body).includes("김태선의원"), true);
assert.equal(protectedApp.store.lawGroupMemberships.filter((membership) => membership.lawGroupId === assemblyActGroup?.id).length, 2);
const groupAuditCount = protectedApp.store.auditLogs.filter((log) => log.targetType === "law_group").length;
await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/laws",
  headers: internalHeaders,
  body: {
    source: "assembly_bill",
    lawName: "집회 및 시위에 관한 법률",
    billTitle: "집회 및 시위에 관한 법률 일부개정법률안",
    stage: "접수",
    proposedDate: "2026-07-12T00:00:00.000+09:00",
    assemblyBillId: "bill-test-assembly-act-newer",
    assemblyBillNo: "2219002",
    proposer: "권향엽의원 등 13인",
    proposalSummary: "타인의 기본권을 침해할 위험이 없는 평화적 미신고 집회에 대한 형사처벌 범위를 조정하려는 것임.",
    keywords: ["집회 및 시위에 관한 법률", "집회시위법", "집회"]
  }
});
assert.equal(protectedApp.store.auditLogs.filter((log) => log.targetType === "law_group").length, groupAuditCount);
const recentProposals = await protectedApp.handle({ method: "GET", path: "/laws?sort=proposed_desc" });
assert.equal(recentProposals.status, 200);
const recentProposalRows = (recentProposals.body as { laws: Array<{ id: string; source: string; proposedDate?: string }> }).laws;
assert.equal(recentProposalRows.every((law) => law.source === "assembly_bill"), true);
const newerLawId = (newerIngestedLaw.body as { laws: Array<{ id: string }> }).laws[0]?.id;
const firstLawId = (ingestedLaw.body as { laws: Array<{ id: string }> }).laws[0]?.id;
const newerProposalIndex = recentProposalRows.findIndex((law) => law.id === newerLawId);
const firstProposalIndex = recentProposalRows.findIndex((law) => law.id === firstLawId);
assert.equal(newerProposalIndex >= 0 && firstProposalIndex >= 0 && newerProposalIndex < firstProposalIndex, true);
const seededPublicRefresh = await protectedApp.handle({
  method: "POST",
  path: "/internal/ingest/public-occurrence",
  headers: internalHeaders,
  body: {
    id: "occ_daegu_0704_0705_public",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    title: "대구 0704(토)~0705(일) 오늘의 집회 공개 일정",
    startsAt: "2026-07-04T00:00:00.000+09:00",
    endsAt: "2026-07-05T23:59:59.000+09:00",
    lifecycleState: "ENDED",
    claimantLabel: "대구경찰청 오늘의 집회시위",
    normalizedStatement: "대구경찰청 게시판에 0704(토)~0705(일) 오늘의 집회 공개 일정 게시물이 등록되었습니다."
  }
});
assert.equal(seededPublicRefresh.status, 200);

function fakeJsonRequest(body: Buffer): Promise<unknown> {
  const request = new EventEmitter() as EventEmitter & {
    method?: string;
    headers?: Record<string, string>;
    destroy?: () => void;
  };
  request.method = "POST";
  request.headers = { "content-length": String(body.length) };
  request.destroy = () => {};
  const result = readJsonBody(request);
  queueMicrotask(() => {
    request.emit("data", body);
    request.emit("end");
  });
  return result;
}

function assertPublicPayloadSafe(body: unknown): void {
  const text = JSON.stringify(body);
  for (const field of [
    '"statement"',
    '"claimIds"',
    '"evidenceIds"',
    '"delayClaimIds"',
    '"serviceStatusClaimIds"',
    '"flowDirectionClaimIds"',
    '"emergencySignalClaimIds"',
    '"targetRefs"',
    '"storageKey"',
    '"publicStorageKey"',
    '"publicPosterKey"',
    '"privateMediaBase64"',
    '"mediaBase64"',
    '"hash"',
    '"geoCell"',
    '"privateLng"',
    '"privateLat"',
    '"foregroundGps"',
    '"captureMode"',
    '"gpsAccuracyM"',
    '"distanceToTargetM"',
    '"deviceAttestationBucket"',
    '"deviceIntegrityProvider"',
    '"deviceIntegrityProofHash"',
    '"deviceIntegrityCheckedAt"',
    '"redactionProofHash"',
    '"redactionCheckedAt"',
    '"reviewTargetClaimId"',
    '"userId"',
    '"tokenHash"',
    '"ciHash"',
    '"diHash"',
    '"subjectHash"',
    '"identityVerificationId"',
    '"phone"',
    '"name"',
    '"birthDate"'
  ]) {
    assert.equal(text.includes(field), false, `public payload leaked ${field}`);
  }
  for (const token of ["transit_occurrence", "crowd_density_signal", "route_segment", "route_checkpoint", "traffic_control", "WEAKLY_OBSERVED"]) {
    assert.equal(text.includes(token), false, `public payload leaked removed target token ${token}`);
  }
}

async function verifiedIdentitySession(app: ReturnType<typeof createApp>): Promise<{ userId: string; token: string }> {
  const start = await app.handle({ method: "POST", path: "/auth/identity/start", body: { purpose: "general" } });
  assert.equal(start.status, 201);
  const identityVerificationId = (start.body as { identityVerificationId: string }).identityVerificationId;
  assert.equal(typeof identityVerificationId, "string");
  const response = await app.handle({
    method: "POST",
    path: "/auth/identity/complete",
    body: { identityVerificationId, testCi: `ci-${randomSuffix()}`, testDi: `di-${randomSuffix()}` }
  });
  assert.equal(response.status, 201);
  const body = response.body as { userId: string; token: string; expiresAt: string; authLevel: string };
  assert.equal(typeof body.userId, "string");
  assert.equal(typeof body.token, "string");
  assert.equal(body.authLevel, "identity_verified");
  assert.equal(new Date(body.expiresAt).getTime() > Date.now(), true);
  return body;
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function liveVideoFields(id: string) {
  return {
    storageKey: `private/live/test/${id}.mp4`,
    hash: `sha256-${id}`,
    durationMs: 8000,
    mediaMimeType: "video/mp4",
    width: 1080,
    height: 1920,
    captureMode: "in_app_camera",
    gpsLng: 126.9783,
    gpsLat: 37.5667
  };
}

function userHeaders(session: { userId: string; token: string }): Record<string, string> {
  return {
    "x-musunil-user-id": session.userId,
    "x-musunil-user-token": session.token
  };
}

function identityCookieHeader(session: { userId: string; token: string }): Record<string, string> {
  return {
    cookie: `musunil_session=${encodeURIComponent(`${session.userId}:${session.token}`)}`
  };
}
