import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  calculatePriorityScore,
  evidenceStrengths,
  hasFieldPresenceSignal,
  hasProofOfPresence,
  moderationDecisionFromRightsReports,
  shouldNotify,
  riskLevels,
  sourceProvenances,
  sourceCoverageReport,
  publicAssemblySources,
  targetTypes,
  type AreaCluster,
  type AuditLog,
  type Claim,
  type ContinuousPresence,
  type CrowdEstimate,
  type Evidence,
  type EvidenceReel,
  type EvidenceStrength,
  type IdentityVerificationSession,
  type Issue,
  type IssueSynthesisSnapshot,
  type IssueOverview,
  type IssueLawGroupLink,
  type LawInterestItem,
  type LawItem,
  type LawGroup,
  type LawGroupCard,
  type LawGroupMembership,
  type LifecycleState,
  type LocationResolutionStatus,
  type NotificationOutbox,
  type NewsIssueCandidate,
  type NewsProviderUsage,
  type Occurrence,
  type OccurrenceIssueLink,
  type OccurrenceDigest,
  type PublicAssemblySourceRefresh,
  type ReportReceipt,
  type RiskLevel,
  type SourceProvenance,
  type Subscription,
  type TargetType,
  type TransparencyLog,
  type UserSession,
  type VerifiedUser
} from "../../../packages/schemas/src/index.ts";
import { buildLawGroups } from "./law-topics.ts";
import { blurPublicCoordinate, locationStatusLabel, metersBetween, reconcileLocationFromFieldEvidence, resolveOfficialLocationEstimate, type LocationEvidencePoint } from "./location-resolution.ts";

export type Store = {
  areaClusters: AreaCluster[];
  issues: Issue[];
  issueSynthesisSnapshots: IssueSynthesisSnapshot[];
  lawItems: LawItem[];
  lawGroups: LawGroup[];
  lawGroupMemberships: LawGroupMembership[];
  issueLawGroupLinks: IssueLawGroupLink[];
  newsIssueCandidates: NewsIssueCandidate[];
  newsProviderUsage: NewsProviderUsage[];
  legacyLawTopicAliases: Record<string, string>;
  occurrences: Occurrence[];
  occurrenceIssueLinks: OccurrenceIssueLink[];
  continuousPresences: ContinuousPresence[];
  crowdEstimates: CrowdEstimate[];
  claims: Claim[];
  evidence: Evidence[];
  subscriptions: Subscription[];
  notificationOutbox: NotificationOutbox[];
  auditLogs: AuditLog[];
  transparencyLogs: TransparencyLog[];
  reports: ReportRecord[];
  liveUploads: LiveUploadRecord[];
  verifiedUsers: VerifiedUser[];
  identityVerificationSessions: IdentityVerificationSession[];
  userSessions: UserSession[];
  publicSourceRefreshes: PublicAssemblySourceRefresh[];
};

export type SeedStoreOptions = {
  includeMockData?: boolean;
};

type ReportRecord = {
  id: string;
  userId?: string;
  reportType: "live" | "material" | "on_site_correction" | "rights_violation" | "rebuttal" | "field_verification";
  targetType: TargetType;
  targetId: string;
  claimId: string;
  createdAt: Date;
};

type LiveUploadRecord = {
  storageKey: string;
  userId: string;
  targetType: TargetType;
  targetId: string;
  mediaMimeType: string;
  byteSize: number;
  hash: string;
  uploadedAt: Date;
  privateMediaBase64?: string;
};

export type LiveMediaStorage = {
  put: (object: { storageKey: string; mediaMimeType: string; bytes: Buffer }) => Promise<void>;
  get?: (storageKey: string) => Promise<Buffer>;
  delete?: (storageKey: string) => Promise<void>;
};

const notificationCooldownMs = 30 * 60 * 1000;
const userTokenTtlMs = 30 * 24 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

export type ApiRequest = {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
};

export type ApiResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export type ReadinessReport = {
  ready: boolean;
  checks: Array<{ id: string; ok: boolean; message: string }>;
  summary?: {
    total: number;
    okCount: number;
    failedCount: number;
    failedIds: string[];
    blockingGroups: string[];
  };
  requiredActions?: Array<{ id: string; action: string; verify: string }>;
  gates?: {
    publicRead: { ready: boolean; failedIds: string[] };
    contribution: { ready: boolean; failedIds: string[] };
    operator: { ready: boolean; failedIds: string[] };
  };
};

export type AppOptions = {
  readiness?: () => ReadinessReport | Promise<ReadinessReport>;
  internalApiKey?: string;
  userTokenSecret?: string;
  identity?: IdentityRuntime;
  autoPublishLiveReports?: boolean;
  liveMediaStorage?: LiveMediaStorage;
  liveMediaEncryptionKey?: string;
  requireExternalLiveStorage?: boolean;
  requireReadyForWrites?: boolean;
  allowAnonymousSession?: boolean;
  publicDiscoveryNow?: () => Date;
  retention?: {
    rawClaimStatementDays?: number;
    unverifiedOriginalMediaDays?: number;
    verifiedOriginalMediaDays?: number;
    preciseLocationDays?: number;
    auditLogDays?: number;
  };
};

export type IdentityRuntime = {
  provider: "portone";
  storeId?: string;
  identityChannelKey?: string;
  apiSecret?: string;
  apiBaseUrl?: string;
  sessionCookieDomain?: string;
  testMode?: boolean;
};

export function createApp(store: Store = emptyStore(), options: AppOptions = {}) {
  synchronizeLawGroups(store, false);
  refreshIssueLawGroupLinks(store);
  synchronizeOccurrenceIssueLinks(store);
  reconcileIssueLifecycle(store);
  return {
    store,
    handle: async (request: ApiRequest) => {
      try {
        return await handleRequest(store, request, options);
      } catch (error) {
        if (error instanceof ApiError) return json(error.status, { error: error.code });
        throw error;
      }
    }
  };
}

export function emptyStore(): Store {
  return {
    areaClusters: [],
    issues: [],
    issueSynthesisSnapshots: [],
    lawItems: [],
    lawGroups: [],
    lawGroupMemberships: [],
    issueLawGroupLinks: [],
    newsIssueCandidates: [],
    newsProviderUsage: [],
    legacyLawTopicAliases: {},
    occurrences: [],
    occurrenceIssueLinks: [],
    continuousPresences: [],
    crowdEstimates: [],
    claims: [],
    evidence: [],
    subscriptions: [],
    notificationOutbox: [],
    auditLogs: [],
    transparencyLogs: [],
    reports: [],
    liveUploads: [],
    verifiedUsers: [],
    identityVerificationSessions: [],
    userSessions: [],
    publicSourceRefreshes: []
  };
}

export function createSeedStore(options: SeedStoreOptions = {}): Store {
  const now = new Date("2026-07-07T09:00:00.000Z");
  const store = emptyStore();
  store.areaClusters.push(
    { id: "area_national", label: "전국 집회 신고 통계", regionLabel: "전국", targetRefs: [] },
    { id: "area_seoul", label: "서울 도심 일대", regionLabel: "서울", targetRefs: [] },
    { id: "area_seoul_public", label: "서울 집회·통제정보 공개 자료", regionLabel: "서울", targetRefs: [] },
    { id: "area_busan", label: "부산 서면-해운대 축", regionLabel: "부산", targetRefs: [] },
    { id: "area_incheon", label: "인천 오늘의 집회/시위 공개 자료", regionLabel: "인천", targetRefs: [] },
    { id: "area_daegu", label: "대구 오늘의 집회시위 공개 자료", regionLabel: "대구", targetRefs: [] },
    { id: "area_gangwon", label: "강원 오늘의 주요집회 공개 자료", regionLabel: "강원", targetRefs: [] },
    { id: "area_gyeonggi_south", label: "경기남부 오늘의 주요집회 공개 자료", regionLabel: "경기남부", targetRefs: [] },
    { id: "area_gyeonggi_north", label: "경기북부 오늘의 주요집회 공개 자료", regionLabel: "경기북부", targetRefs: [] },
    { id: "area_gwangju", label: "광주 오늘의집회시위 공개 자료", regionLabel: "광주", targetRefs: [] },
    { id: "area_gyeongbuk", label: "경북 오늘의 집회시위 공개 자료", regionLabel: "경북", targetRefs: [] },
    { id: "area_gyeongnam", label: "경남 오늘의 주요집회 공개 자료", regionLabel: "경남", targetRefs: [] },
    { id: "area_jeju", label: "제주 오늘의집회 공개 자료", regionLabel: "제주", targetRefs: [] },
    { id: "area_chungbuk", label: "충북 오늘의 집회 시위 공개 자료", regionLabel: "충북", targetRefs: [] },
    { id: "area_chungnam", label: "충남 오늘의 주요집회 공개 자료", regionLabel: "충남", targetRefs: [] },
    { id: "area_jeonbuk", label: "전북 집회시위안내 공개 자료", regionLabel: "전북", targetRefs: [] },
    { id: "area_jeonnam", label: "전남 오늘의집회/시위 공개 자료", regionLabel: "전남", targetRefs: [] },
    { id: "area_ulsan", label: "울산 오늘의 집회 공개 자료", regionLabel: "울산", targetRefs: [] },
    { id: "area_sejong", label: "세종 오늘의 집회/시위 공개 자료", regionLabel: "세종", targetRefs: [] },
    { id: "area_daejeon_public", label: "대전 오늘의주요집회 공개 자료", regionLabel: "대전", targetRefs: [] },
    { id: "area_daejeon", label: "대전 정부청사권", regionLabel: "대전", targetRefs: [] }
  );
  store.issues.push(
    {
      id: "issue_public_regional_schedule",
      title: "지역별 집회 공개 일정",
      kind: "schedule_cluster",
      normalizedTopicKey: "topic:regional-public-assembly-schedules",
      topicTags: ["지역별", "오늘의 집회시위", "공개 일정"],
      status: "active",
      firstSeenAt: now,
      lastUpdatedAt: now
    },
    {
      id: "issue_public_daegu_stats",
      title: "대구 집회 신고·개최 현황",
      kind: "schedule_cluster",
      normalizedTopicKey: "topic:daegu-public-assembly-statistics",
      topicTags: ["대구", "신고 통계", "개최 현황"],
      status: "active",
      firstSeenAt: now,
      lastUpdatedAt: now
    },
    {
      id: "issue_public_national_stats",
      title: "전국 집회 신고·개최 통계",
      kind: "schedule_cluster",
      normalizedTopicKey: "topic:national-public-assembly-statistics",
      topicTags: ["전국", "신고 통계", "경찰청 자료"],
      status: "active",
      firstSeenAt: now,
      lastUpdatedAt: now
    },
    {
      id: "issue_1",
      title: "정보통신망법 개정 반대 집회",
      kind: "topic",
      normalizedTopicKey: "ict-network-law-amendment-opposition",
      topicTags: ["정보통신망법 개정", "반대", "집회"],
      status: "active",
      firstSeenAt: now,
      lastUpdatedAt: now
    },
    {
      id: "issue_sample_impeachment_march",
      title: "대통령 탄핵 요구 행진",
      kind: "topic",
      normalizedTopicKey: "presidential-impeachment-demand",
      topicTags: ["대통령 탄핵", "행진", "집회"],
      status: "active",
      firstSeenAt: now,
      lastUpdatedAt: now
    }
  );
  store.lawItems.push(
    {
      id: "law_info_network_amendment",
      source: "assembly_bill",
      lawName: "정보통신망 이용촉진 및 정보보호 등에 관한 법률",
      billTitle: "정보통신망 이용촉진 및 정보보호 등에 관한 법률 일부개정법률안",
      stage: "심사 중",
      statusDate: now,
      assemblyBillId: "preview-info-network-amendment",
      summary: "정보통신망법 개정 논의와 연결될 수 있는 공개 의안 메타데이터입니다.",
      officialUrl: "https://open.assembly.go.kr/",
      keywords: ["정보통신망법", "정통법", "정보통신망 이용촉진 및 정보보호 등에 관한 법률"]
    },
    {
      id: "law_national_assembly_impeachment",
      source: "law_effective",
      lawName: "국회법",
      billTitle: "탄핵소추 절차 관련 법령",
      stage: "현행 법령",
      statusDate: now,
      lawId: "preview-national-assembly-act",
      summary: "대통령 탄핵 요구 이슈와 연결될 수 있는 국회 절차 관련 법령입니다.",
      officialUrl: "https://www.law.go.kr/법령/국회법",
      keywords: ["대통령 탄핵", "탄핵소추", "국회법"]
    },
    {
      id: "law_public_official_election",
      source: "law_effective",
      lawName: "공직선거법",
      billTitle: "선거 검증 요구 관련 법령",
      stage: "현행 법령",
      statusDate: now,
      lawId: "preview-public-official-election-act",
      summary: "선거 검증 요구나 부정선거 의혹 제기 이슈와 연결될 수 있는 선거 관련 법령입니다.",
      officialUrl: "https://www.law.go.kr/법령/공직선거법",
      keywords: ["부정선거", "선거 검증", "선관위", "공직선거법"]
    }
  );
  store.occurrences.push({
    id: "occ_police_national_stats_2023",
    issueId: "issue_public_national_stats",
    type: "policy_site",
    areaClusterId: "area_national",
    regionLabel: "전국",
    title: "경찰청 2011~2023 집회 신고·개최 통계",
    startsAt: new Date("2023-12-31T00:00:00.000Z"),
    lifecycleState: "ARCHIVED",
    claimIds: [],
    evidenceIds: []
  }, {
    id: "occ_daegu_stats_2025",
    issueId: "issue_public_daegu_stats",
    type: "policy_site",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    title: "대구 2020~2025 집회 신고·개최 현황",
    startsAt: new Date("2025-12-31T00:00:00.000Z"),
    lifecycleState: "ARCHIVED",
    claimIds: [],
    evidenceIds: []
  }, {
    id: "occ_daegu_0709_public",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    title: "대구 0709(목) 오늘의 집회 공개 일정",
    publicLocation: { lng: 128.6014, lat: 35.8714, label: "대구 도심권", precision: "area", source: "operator_review" },
    startsAt: new Date("2026-07-08T15:00:00.000Z"),
    lifecycleState: "UPCOMING",
    claimIds: [],
    evidenceIds: []
  }, {
    id: "occ_daegu_0707_public",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    title: "대구 0707(화) 오늘의 집회 공개 일정",
    publicLocation: { lng: 128.6014, lat: 35.8714, label: "대구 도심권", precision: "area", source: "operator_review" },
    startsAt: new Date("2026-07-06T15:00:00.000Z"),
    lifecycleState: "ENDED",
    claimIds: [],
    evidenceIds: []
  }, {
    id: "occ_daegu_0706_public",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    title: "대구 0706(월) 오늘의 집회 공개 일정",
    publicLocation: { lng: 128.6014, lat: 35.8714, label: "대구 도심권", precision: "area", source: "operator_review" },
    startsAt: new Date("2026-07-05T15:00:00.000Z"),
    lifecycleState: "ENDED",
    claimIds: [],
    evidenceIds: []
  }, {
    id: "occ_daegu_0704_0705_public",
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    title: "대구 0704(토)~0705(일) 오늘의 집회 공개 일정",
    publicLocation: { lng: 128.6014, lat: 35.8714, label: "대구 도심권", precision: "area", source: "operator_review" },
    startsAt: new Date("2026-07-03T15:00:00.000Z"),
    endsAt: new Date("2026-07-05T14:59:59.000Z"),
    lifecycleState: "ENDED",
    claimIds: [],
    evidenceIds: []
  }, {
    id: "occ_1",
    issueId: "issue_1",
    type: "static_assembly",
    areaClusterId: "area_seoul",
    regionLabel: "서울",
    title: "서울 인근 집회성 모임",
    publicLocation: { lng: 126.978, lat: 37.5665, label: "서울 도심권", precision: "area", source: "operator_review" },
    startsAt: now,
    lifecycleState: "UNKNOWN",
    claimIds: [],
    evidenceIds: []
  }, {
    id: "occ_sample_busan_march",
    issueId: "issue_sample_impeachment_march",
    type: "march",
    areaClusterId: "area_busan",
    regionLabel: "부산",
    title: "부산 도심 행진 가능성",
    publicLocation: { lng: 129.059, lat: 35.1578, label: "부산 서면 일대", precision: "area", source: "operator_review" },
    startsAt: new Date("2026-07-07T11:30:00.000Z"),
    lifecycleState: "UPCOMING",
    claimIds: [],
    evidenceIds: []
  });
  store.continuousPresences.push({
    id: "presence_1",
    issueId: "issue_1",
    areaClusterId: "area_seoul",
    regionLabel: "서울",
    publicLocation: { lng: 126.965, lat: 37.571, label: "서울 도심 장기 현장", precision: "area", source: "operator_review" },
    presenceType: "continuous_assembly",
    state: "ONGOING",
    claimIds: [],
    evidenceIds: []
  }, {
    id: "presence_sample_daejeon",
    issueId: "issue_1",
    areaClusterId: "area_daejeon",
    regionLabel: "대전",
    publicLocation: { lng: 127.3848, lat: 36.3504, label: "대전 정부청사권", precision: "area", source: "operator_review" },
    presenceType: "relay_protest",
    firstProofOfPresenceAt: new Date("2026-07-06T22:00:00.000Z"),
    lastProofOfPresenceAt: new Date("2026-07-07T08:40:00.000Z"),
    state: "ONGOING",
    claimIds: [],
    evidenceIds: []
  });
  findAreaCluster(store, "area_national")?.targetRefs.push(
    { targetType: "occurrence", targetId: "occ_police_national_stats_2023" }
  );
  findAreaCluster(store, "area_daegu")?.targetRefs.push(
    { targetType: "occurrence", targetId: "occ_daegu_stats_2025" },
    { targetType: "occurrence", targetId: "occ_daegu_0709_public" },
    { targetType: "occurrence", targetId: "occ_daegu_0707_public" },
    { targetType: "occurrence", targetId: "occ_daegu_0706_public" },
    { targetType: "occurrence", targetId: "occ_daegu_0704_0705_public" }
  );
  findAreaCluster(store, "area_seoul")?.targetRefs.push(
    { targetType: "occurrence", targetId: "occ_1" },
    { targetType: "continuous_presence", targetId: "presence_1" }
  );
  findAreaCluster(store, "area_busan")?.targetRefs.push(
    { targetType: "occurrence", targetId: "occ_sample_busan_march" }
  );
  findAreaCluster(store, "area_daejeon")?.targetRefs.push(
    { targetType: "continuous_presence", targetId: "presence_sample_daejeon" }
  );
  store.evidence.push(
    {
      id: "ev_police_national_stats_2023",
      evidenceType: "official_doc",
      uploadedAt: new Date("2025-05-12T00:00:00.000Z"),
      proofOfPresenceStatus: "material_only"
    },
    {
      id: "ev_daegu_stats_2025",
      evidenceType: "official_doc",
      uploadedAt: new Date("2026-05-12T00:00:00.000Z"),
      proofOfPresenceStatus: "material_only"
    },
    {
      id: "ev_daegu_0709_public",
      evidenceType: "official_doc",
      uploadedAt: new Date("2026-07-08T15:00:00.000Z"),
      proofOfPresenceStatus: "material_only"
    },
    {
      id: "ev_daegu_0707_public",
      evidenceType: "official_doc",
      uploadedAt: new Date("2026-07-06T08:00:00.000Z"),
      proofOfPresenceStatus: "material_only"
    },
    {
      id: "ev_daegu_0706_public",
      evidenceType: "official_doc",
      uploadedAt: new Date("2026-07-06T08:00:00.000Z"),
      proofOfPresenceStatus: "material_only"
    },
    {
      id: "ev_daegu_weekend_public",
      evidenceType: "official_doc",
      uploadedAt: new Date("2026-07-03T08:00:00.000Z"),
      proofOfPresenceStatus: "material_only"
    },
    {
      id: "ev_occ_live_1",
      evidenceType: "live_media",
      uploadedAt: now,
      capturedAt: new Date("2026-07-07T08:57:00.000Z"),
      geoCell: "preview-seoul-central",
      privateLng: 126.9783,
      privateLat: 37.5667,
      publicRadiusM: 200,
      foregroundGps: true,
      gpsAccuracyM: 32,
      distanceToTargetM: 90,
      deviceIntegrityStatus: "pass",
      deviceIntegrityProvider: "play_integrity",
      deviceIntegrityCheckedAt: now,
      deviceIntegrityProofHash: "sha256-previewdeviceintegrityocc1",
      proofOfPresenceStatus: "pass",
      storageKey: "private/live/2026/ev_occ_live_1/original.mp4",
      publicStorageKey: "/media/redacted/preview-occ-live-1.webm",
      publicPosterKey: "/media/redacted/preview-occ-live-1-poster.png",
      redactionStatus: "completed",
      redactionCheckedAt: now,
      redactionProofHash: "sha256-previewredactionproofocc1",
      mediaMimeType: "video/mp4",
      durationMs: 8000,
      width: 1080,
      height: 1920,
      captureMode: "in_app_camera",
      hash: "preview-live-occ-1"
    },
    {
      id: "ev_presence_1",
      evidenceType: "live_media",
      uploadedAt: now,
      capturedAt: new Date("2026-07-07T08:52:00.000Z"),
      geoCell: "preview-seoul-presence",
      privateLng: 126.9654,
      privateLat: 37.5712,
      publicRadiusM: 200,
      foregroundGps: true,
      gpsAccuracyM: 45,
      distanceToTargetM: 120,
      deviceIntegrityStatus: "pass",
      deviceIntegrityProvider: "play_integrity",
      deviceIntegrityCheckedAt: now,
      deviceIntegrityProofHash: "sha256-previewdeviceintegritypresence1",
      proofOfPresenceStatus: "pass",
      storageKey: "private/live/2026/ev_presence_1/original.mp4",
      publicStorageKey: "/media/redacted/preview-presence-1.webm",
      publicPosterKey: "/media/redacted/preview-presence-1-poster.png",
      redactionStatus: "completed",
      redactionCheckedAt: now,
      redactionProofHash: "sha256-previewredactionproofpresence1",
      mediaMimeType: "video/mp4",
      durationMs: 7000,
      width: 1080,
      height: 1920,
      captureMode: "in_app_camera",
      hash: "preview-live-presence-1"
    },
    {
      id: "ev_sample_busan_media",
      evidenceType: "media_link",
      uploadedAt: new Date("2026-07-07T08:35:00.000Z"),
      proofOfPresenceStatus: "material_only"
    },
    {
      id: "ev_sample_busan_live",
      evidenceType: "live_media",
      uploadedAt: new Date("2026-07-07T08:50:00.000Z"),
      capturedAt: new Date("2026-07-07T08:48:00.000Z"),
      geoCell: "preview-busan-central",
      privateLng: 129.0592,
      privateLat: 35.1581,
      publicRadiusM: 220,
      foregroundGps: true,
      gpsAccuracyM: 38,
      distanceToTargetM: 140,
      deviceIntegrityStatus: "pass",
      deviceIntegrityProvider: "play_integrity",
      deviceIntegrityCheckedAt: new Date("2026-07-07T08:51:00.000Z"),
      deviceIntegrityProofHash: "sha256-previewdeviceintegritybusan",
      proofOfPresenceStatus: "pass",
      storageKey: "private/live/2026/ev_sample_busan_live/original.mp4",
      publicStorageKey: "/media/redacted/preview-busan-live.webm",
      publicPosterKey: "/media/redacted/preview-busan-live-poster.png",
      redactionStatus: "completed",
      redactionCheckedAt: new Date("2026-07-07T08:51:00.000Z"),
      redactionProofHash: "sha256-previewredactionproofbusan",
      mediaMimeType: "video/mp4",
      durationMs: 9000,
      width: 1080,
      height: 1920,
      captureMode: "in_app_camera",
      hash: "preview-live-busan"
    },
    {
      id: "ev_sample_daejeon_live",
      evidenceType: "live_media",
      uploadedAt: new Date("2026-07-07T08:43:00.000Z"),
      capturedAt: new Date("2026-07-07T08:40:00.000Z"),
      geoCell: "preview-daejeon-government-complex",
      privateLng: 127.3848,
      privateLat: 36.3507,
      publicRadiusM: 220,
      foregroundGps: true,
      gpsAccuracyM: 41,
      distanceToTargetM: 130,
      deviceIntegrityStatus: "pass",
      deviceIntegrityProvider: "play_integrity",
      deviceIntegrityCheckedAt: new Date("2026-07-07T08:44:00.000Z"),
      deviceIntegrityProofHash: "sha256-previewdeviceintegritydaejeon",
      proofOfPresenceStatus: "pass",
      storageKey: "private/live/2026/ev_sample_daejeon_live/original.mp4",
      publicStorageKey: "/media/redacted/preview-daejeon-live.webm",
      publicPosterKey: "/media/redacted/preview-daejeon-live-poster.png",
      redactionStatus: "completed",
      redactionCheckedAt: new Date("2026-07-07T08:44:00.000Z"),
      redactionProofHash: "sha256-previewredactionproofdaejeon",
      mediaMimeType: "video/mp4",
      durationMs: 8000,
      width: 1080,
      height: 1920,
      captureMode: "in_app_camera",
      hash: "preview-live-daejeon"
    }
  );
  store.claims.push(
    {
      id: "claim_police_national_stats_2023",
      targetType: "occurrence",
      targetId: "occ_police_national_stats_2023",
      sourceProvenance: "government_or_police",
      claimantLabel: "경찰청 공공데이터포털",
      statement: "",
      normalizedStatement: "경찰청은 2011년부터 2023년까지의 집회 신고 및 실제 개최 현황 집계 데이터를 공개했습니다.",
      evidenceStrength: "single_source",
      riskLevel: "low",
      createdAt: new Date("2025-05-12T00:00:00.000Z"),
      evidenceIds: ["ev_police_national_stats_2023"],
      disputedByClaimIds: []
    },
    {
      id: "claim_daegu_stats_2025",
      targetType: "occurrence",
      targetId: "occ_daegu_stats_2025",
      sourceProvenance: "government_or_police",
      claimantLabel: "대구경찰청 공공데이터포털",
      statement: "",
      normalizedStatement: "대구경찰청은 2020년부터 2025년까지 경찰서별 집회·시위 신고 건수, 개최 건수, 참석인원 현황을 공개했습니다.",
      evidenceStrength: "single_source",
      riskLevel: "low",
      createdAt: new Date("2026-05-12T00:00:00.000Z"),
      evidenceIds: ["ev_daegu_stats_2025"],
      disputedByClaimIds: []
    },
    {
      id: "claim_daegu_0709_public",
      targetType: "occurrence",
      targetId: "occ_daegu_0709_public",
      sourceProvenance: "government_or_police",
      claimantLabel: "대구경찰청 오늘의 집회시위",
      statement: "",
      normalizedStatement: "대구경찰청 게시판에 0709(목) 오늘의 집회 공개 일정 게시물이 등록되었습니다.",
      evidenceStrength: "single_source",
      riskLevel: "low",
      createdAt: new Date("2026-07-08T15:00:00.000Z"),
      evidenceIds: ["ev_daegu_0709_public"],
      disputedByClaimIds: []
    },
    {
      id: "claim_daegu_0707_public",
      targetType: "occurrence",
      targetId: "occ_daegu_0707_public",
      sourceProvenance: "government_or_police",
      claimantLabel: "대구경찰청 오늘의 집회시위",
      statement: "",
      normalizedStatement: "대구경찰청 게시판에 0707(화) 오늘의 집회 공개 일정 게시물이 등록되었습니다.",
      evidenceStrength: "single_source",
      riskLevel: "low",
      createdAt: new Date("2026-07-06T08:00:00.000Z"),
      evidenceIds: ["ev_daegu_0707_public"],
      disputedByClaimIds: []
    },
    {
      id: "claim_daegu_0706_public",
      targetType: "occurrence",
      targetId: "occ_daegu_0706_public",
      sourceProvenance: "government_or_police",
      claimantLabel: "대구경찰청 오늘의 집회시위",
      statement: "",
      normalizedStatement: "대구경찰청 게시판에 0706(월) 오늘의 집회 공개 일정 게시물이 등록되었습니다.",
      evidenceStrength: "single_source",
      riskLevel: "low",
      createdAt: new Date("2026-07-06T08:00:00.000Z"),
      evidenceIds: ["ev_daegu_0706_public"],
      disputedByClaimIds: []
    },
    {
      id: "claim_daegu_weekend_public",
      targetType: "occurrence",
      targetId: "occ_daegu_0704_0705_public",
      sourceProvenance: "government_or_police",
      claimantLabel: "대구경찰청 오늘의 집회시위",
      statement: "",
      normalizedStatement: "대구경찰청 게시판에 0704(토)~0705(일) 오늘의 집회 공개 일정 게시물이 등록되었습니다.",
      evidenceStrength: "single_source",
      riskLevel: "low",
      createdAt: new Date("2026-07-03T08:00:00.000Z"),
      evidenceIds: ["ev_daegu_weekend_public"],
      disputedByClaimIds: []
    },
    {
      id: "claim_occ_live_1",
      targetType: "occurrence",
      targetId: "occ_1",
      sourceProvenance: "verified_citizen_report",
      claimantLabel: "위치 인증 제보",
      statement: "",
      normalizedStatement: "서울 도심 일대에서 위치 인증 제보가 접수되었습니다.",
      evidenceStrength: "media_time_location_crosscheck",
      riskLevel: "rights_risk",
      createdAt: now,
      evidenceIds: ["ev_occ_live_1"],
      disputedByClaimIds: []
    },
    {
      id: "claim_presence_1",
      targetType: "continuous_presence",
      targetId: "presence_1",
      sourceProvenance: "verified_citizen_report",
      claimantLabel: "위치 인증 제보",
      statement: "",
      normalizedStatement: "장기 현장의 최근 위치 인증 근거가 있습니다.",
      evidenceStrength: "media_time_location_crosscheck",
      riskLevel: "rights_risk",
      createdAt: now,
      evidenceIds: ["ev_presence_1"],
      disputedByClaimIds: []
    },
    {
      id: "claim_sample_busan_march_media",
      targetType: "occurrence",
      targetId: "occ_sample_busan_march",
      sourceProvenance: "media_report",
      claimantLabel: "지역 보도",
      statement: "",
      normalizedStatement: "부산 도심권에서 행진 가능성이 보도되었습니다.",
      evidenceStrength: "single_source",
      riskLevel: "misleading_possible",
      createdAt: new Date("2026-07-07T08:35:00.000Z"),
      evidenceIds: ["ev_sample_busan_media"],
      disputedByClaimIds: []
    },
    {
      id: "claim_sample_busan_march_live",
      targetType: "occurrence",
      targetId: "occ_sample_busan_march",
      sourceProvenance: "verified_citizen_report",
      claimantLabel: "위치 인증 제보",
      statement: "",
      normalizedStatement: "부산 현장에서 위치 인증 근거가 추가되었습니다.",
      evidenceStrength: "media_time_location_crosscheck",
      riskLevel: "rights_risk",
      createdAt: new Date("2026-07-07T08:50:00.000Z"),
      evidenceIds: ["ev_sample_busan_live"],
      disputedByClaimIds: []
    },
    {
      id: "claim_sample_daejeon_presence",
      targetType: "continuous_presence",
      targetId: "presence_sample_daejeon",
      sourceProvenance: "verified_citizen_report",
      claimantLabel: "위치 인증 제보",
      statement: "",
      normalizedStatement: "대전 장기 현장은 최근 위치 인증 시점이 갱신되었습니다.",
      evidenceStrength: "media_time_location_crosscheck",
      riskLevel: "rights_risk",
      createdAt: new Date("2026-07-07T08:43:00.000Z"),
      evidenceIds: ["ev_sample_daejeon_live"],
      disputedByClaimIds: []
    }
  );
  findOccurrence(store, "occ_police_national_stats_2023")?.claimIds.push("claim_police_national_stats_2023");
  findOccurrence(store, "occ_police_national_stats_2023")?.evidenceIds.push("ev_police_national_stats_2023");
  findOccurrence(store, "occ_daegu_stats_2025")?.claimIds.push("claim_daegu_stats_2025");
  findOccurrence(store, "occ_daegu_stats_2025")?.evidenceIds.push("ev_daegu_stats_2025");
  findOccurrence(store, "occ_daegu_0709_public")?.claimIds.push("claim_daegu_0709_public");
  findOccurrence(store, "occ_daegu_0709_public")?.evidenceIds.push("ev_daegu_0709_public");
  findOccurrence(store, "occ_daegu_0707_public")?.claimIds.push("claim_daegu_0707_public");
  findOccurrence(store, "occ_daegu_0707_public")?.evidenceIds.push("ev_daegu_0707_public");
  findOccurrence(store, "occ_daegu_0706_public")?.claimIds.push("claim_daegu_0706_public");
  findOccurrence(store, "occ_daegu_0706_public")?.evidenceIds.push("ev_daegu_0706_public");
  findOccurrence(store, "occ_daegu_0704_0705_public")?.claimIds.push("claim_daegu_weekend_public");
  findOccurrence(store, "occ_daegu_0704_0705_public")?.evidenceIds.push("ev_daegu_weekend_public");
  findOccurrence(store, "occ_1")?.claimIds.push("claim_occ_live_1");
  findOccurrence(store, "occ_1")?.evidenceIds.push("ev_occ_live_1");
  findOccurrence(store, "occ_sample_busan_march")?.claimIds.push("claim_sample_busan_march_media", "claim_sample_busan_march_live");
  findOccurrence(store, "occ_sample_busan_march")?.evidenceIds.push("ev_sample_busan_media", "ev_sample_busan_live");
  store.continuousPresences[0]?.claimIds.push("claim_presence_1");
  store.continuousPresences[0]?.evidenceIds.push("ev_presence_1");
  store.continuousPresences[1]?.claimIds.push("claim_sample_daejeon_presence");
  store.continuousPresences[1]?.evidenceIds.push("ev_sample_daejeon_live");
  store.crowdEstimates.push({
    id: "estimate_issue_1_preview",
    targetType: "issue",
    targetId: "issue_1",
    observedAt: now,
    minCount: 1200,
    maxCount: 2600,
    confidence: "low",
    method: "hybrid",
    evidenceCount: 4,
    independentViewpointCount: 3,
    limitations: ["프리뷰 공개자료 기준", "현장 영상 공개본이 일부 지역에 집중되어 있습니다."]
  });
  return options.includeMockData === false ? stripPreviewData(store) : store;
}

export function stripPreviewData(store: Store): Store {
  store.issues = store.issues.filter((item) => !isPreviewSeedId(item.id) && !item.topicTags.includes("mock"));
  store.lawItems = store.lawItems.filter((item) => !isPreviewSeedId(item.id) && !item.assemblyBillId?.startsWith("preview-") && !item.lawId?.startsWith("preview-"));
  store.occurrences = store.occurrences.filter((item) => !isPreviewSeedId(item.id));
  store.continuousPresences = store.continuousPresences.filter((item) => !isPreviewSeedId(item.id));
  store.crowdEstimates = store.crowdEstimates.filter((item) => !isPreviewSeedId(item.id) && targetExists(store, item.targetType, item.targetId));
  store.claims = store.claims.filter((item) => !isPreviewSeedId(item.id) && targetExists(store, item.targetType, item.targetId));
  store.evidence = store.evidence.filter((item) => !isPreviewSeedId(item.id));

  const claimIds = new Set(store.claims.map((item) => item.id));
  const evidenceIds = new Set(store.evidence.map((item) => item.id));
  const issueIds = new Set(store.issues.map((item) => item.id));
  const occurrenceIds = new Set(store.occurrences.map((item) => item.id));
  synchronizeLawGroups(store, false);
  const lawGroupIds = new Set(store.lawGroups.map((item) => item.id));
  store.issueLawGroupLinks = store.issueLawGroupLinks
    .filter((item) => issueIds.has(item.issueId) && lawGroupIds.has(item.lawGroupId))
    .map((item) => ({ ...item, claimIds: item.claimIds.filter((id) => claimIds.has(id)) }));
  store.newsIssueCandidates = store.newsIssueCandidates
    .filter((item) => lawGroupIds.has(item.lawGroupId) && (!item.issueId || issueIds.has(item.issueId)))
    .map((item) => ({
      ...item,
      pendingEvidenceIds: item.pendingEvidenceIds.filter((id) => evidenceIds.has(id)),
      approvedEvidenceIds: item.approvedEvidenceIds.filter((id) => evidenceIds.has(id)),
      rejectedEvidenceIds: item.rejectedEvidenceIds.filter((id) => evidenceIds.has(id))
    }));
  store.issueSynthesisSnapshots = store.issueSynthesisSnapshots.filter((item) => issueIds.has(item.issueId));
  store.occurrenceIssueLinks = store.occurrenceIssueLinks.filter((item) => occurrenceIds.has(item.occurrenceId) && issueIds.has(item.issueId));
  for (const item of store.occurrences) cleanRefs(item, claimIds, evidenceIds);
  for (const item of store.continuousPresences) cleanRefs(item, claimIds, evidenceIds);

  for (const area of store.areaClusters) area.targetRefs = area.targetRefs.filter((ref) => targetExists(store, ref.targetType, ref.targetId));
  store.areaClusters = store.areaClusters.filter((item) => !isPreviewSeedId(item.id) || item.targetRefs.length > 0);
  store.subscriptions = store.subscriptions.filter((item) => targetExists(store, item.targetType, item.targetId));
  store.notificationOutbox = store.notificationOutbox.filter((item) => targetExists(store, item.targetType, item.targetId));
  store.reports = store.reports.filter((item) => targetExists(store, item.targetType, item.targetId) && claimIds.has(item.claimId));
  return store;
}

function cleanRefs(item: { claimIds: string[]; evidenceIds: string[] }, claimIds: Set<string>, evidenceIds: Set<string>): void {
  item.claimIds = item.claimIds.filter((id) => claimIds.has(id));
  item.evidenceIds = item.evidenceIds.filter((id) => evidenceIds.has(id));
}

function isPreviewSeedId(id: string): boolean {
  return (
    id.includes("_mock") ||
    id.includes("_sample") ||
    [
      "area_seoul",
      "area_busan",
      "area_daejeon",
      "issue_1",
      "occ_1",
      "presence_1",
      "ev_occ_live_1",
      "ev_presence_1",
      "claim_occ_live_1",
      "claim_presence_1",
      "law_info_network_amendment",
      "law_national_assembly_impeachment",
      "law_public_official_election"
    ].includes(id)
  );
}

function targetExists(store: Store, targetType: TargetType, targetId: string): boolean {
  if (targetType === "issue") return store.issues.some((item) => item.id === targetId);
  if (targetType === "occurrence") return store.occurrences.some((item) => item.id === targetId);
  if (targetType === "continuous_presence") return store.continuousPresences.some((item) => item.id === targetId);
  return false;
}

async function handleRequest(store: Store, request: ApiRequest, options: AppOptions): Promise<ApiResponse> {
  const url = new URL(request.path, "http://localhost");
  const path = url.pathname;

  if (request.method === "GET" && path === "/health") return json(200, { ok: true });
  if (request.method === "GET" && path === "/ready") {
    const readiness = describeReadiness(await (options.readiness?.() ?? defaultReadiness()));
    return json(readiness.ready ? 200 : 503, readiness);
  }
  if (request.method === "GET" && path === "/readiness") {
    return json(200, describeReadiness(await (options.readiness?.() ?? defaultReadiness())));
  }
  if (options.requireReadyForWrites && request.method !== "GET" && !path.startsWith("/internal/")) {
    const readiness = describeReadiness(await (options.readiness?.() ?? defaultReadiness()));
    if (!readiness.ready) return json(503, { error: "runtime_not_ready", checks: readiness.checks, summary: readiness.summary, requiredActions: readiness.requiredActions });
  }
  if (request.method === "POST" && path === "/session/anonymous") return postAnonymousSession(options);
  if (request.method === "POST" && path === "/auth/identity/start") return postIdentityStart(store, request, options);
  if (request.method === "POST" && path === "/auth/identity/complete") return await postIdentityComplete(store, request, options);
  if (request.method === "GET" && path === "/me") return getMe(store, request, options);
  if (request.method === "POST" && path === "/auth/logout") return postLogout(store, request, options);
  if (request.method === "GET" && path === "/home") {
    const cards = homeCards(store, options.publicDiscoveryNow?.() ?? new Date());
    const issues = issueCards(store, cards);
    return json(200, {
      issueCards: issues,
      cards,
      issueOverviews: issues.map((issue) => toIssueOverview(store, issue, cards)),
      occurrenceDigests: cards.map((card) => toOccurrenceDigest(store, card.targetType as Extract<TargetType, "occurrence" | "continuous_presence">, card.id))
    });
  }
  if (request.method === "GET" && path === "/laws") {
    const sort = url.searchParams.get("sort");
    return getLaws(store, sort === "proposed_desc" ? "proposed_desc" : "interest");
  }
  if (request.method === "GET" && path.startsWith("/law-groups/")) return getLawGroup(store, path.split("/")[2], false, url.searchParams);
  if (request.method === "GET" && path.startsWith("/law-topics/")) return getLawGroup(store, path.split("/")[2], true, url.searchParams);
  if (request.method === "GET" && path.startsWith("/laws/")) return getLaw(store, path.split("/")[2]);
  if (request.method === "GET" && path === "/reels") {
    return getReels(store, url.searchParams.get("seed"), url.searchParams.get("cursor"));
  }
  if (request.method === "GET" && path.startsWith("/targets/") && path.endsWith("/live-claims")) {
    return getTargetLiveClaims(store, path.split("/")[2], path.split("/")[3]);
  }
  if (request.method === "GET" && path.startsWith("/targets/")) return getTargetDetail(store, path.split("/")[2], path.split("/")[3]);
  if (request.method === "GET" && path === "/issues") {
    return json(200, {
      issues: store.issues
        .filter(isPublicTopicIssue)
        .filter((issue) => publicIssueTargetsWithinDiscoveryWindow(store, issue.id, options.publicDiscoveryNow?.() ?? new Date()).length > 0)
        .map(toPublicIssue)
    });
  }
  if (request.method === "GET" && path.startsWith("/issues/")) return getIssue(store, path.split("/")[2], options.publicDiscoveryNow?.() ?? new Date());
  if (request.method === "GET" && path.startsWith("/occurrences/")) return getOccurrence(store, path.split("/")[2]);
  if (request.method === "GET" && path.startsWith("/continuous-presences/")) {
    return getTargetById(store, "continuous_presence", path.split("/")[2], "continuous_presence_not_found");
  }
  if (request.method === "GET" && path === "/area-clusters") return json(200, { areaClusters: store.areaClusters.map(toPublicAreaCluster) });
  if (request.method === "GET" && path === "/public-sources/coverage") return json(200, { coverage: publicSourceCoverage(store) });
  if (request.method === "GET" && path === "/map") return getMap(store, options.publicDiscoveryNow?.() ?? new Date());
  if (request.method === "GET" && path === "/me/reports") {
    return withVerifiedUserScope(store, request, options, url.searchParams.get("userId"), (userId) => getMyReports(store, userId));
  }
  if (request.method === "GET" && path === "/me/subscriptions") {
    return withVerifiedUserScope(store, request, options, url.searchParams.get("userId"), (userId) => getMySubscriptions(store, userId));
  }
  if (request.method === "GET" && path === "/transparency/logs") return json(200, { logs: store.transparencyLogs.map(toPublicTransparencyLog) });
  if (request.method === "GET" && path === "/transparency/monthly") return getTransparencyMonthly(store);
  if (request.method === "POST" && path === "/uploads/live") return await postLiveUpload(store, request, options);
  if (request.method === "POST" && path === "/reports/live") return postLiveReport(store, request, options);
  if (request.method === "POST" && path.startsWith("/claims/") && path.endsWith("/field-verifications")) {
    return postFieldVerification(store, path.split("/")[2], request, options);
  }
  if (request.method === "POST" && path === "/reports/material") return postMaterialReport(store, request, options);
  if (request.method === "POST" && path === "/corrections/on-site") return postOnSiteCorrection(store, request, options);
  if (request.method === "POST" && path === "/reports/rights-violation") return postRightsViolation(store, request, options);
  if (request.method === "POST" && path === "/rebuttals") return postRebuttal(store, request, options);
  if (request.method === "POST" && path === "/subscriptions") return postSubscription(store, request, options);
  if (request.method === "PATCH" && path.startsWith("/subscriptions/")) {
    return patchSubscription(store, path.split("/")[2], request, options);
  }
  if (request.method === "GET" && path === "/admin/privacy-dashboard") return withInternalAuth(request, options, () => getAdminPrivacyDashboard(store, options));
  if (request.method === "GET" && path === "/admin/risk-dashboard") return withInternalAuth(request, options, () => getAdminRiskDashboard(store));
  if (request.method === "GET" && path === "/admin/review-queue") return withInternalAuth(request, options, () => getAdminReviewQueue(store));
  if (request.method === "GET" && path === "/admin/law-group-link-candidates") {
    return withInternalAuth(request, options, () => getAdminLawGroupLinkCandidates(store));
  }
  if (request.method === "GET" && path === "/admin/occurrence-issue-link-candidates") {
    return withInternalAuth(request, options, () => getAdminOccurrenceIssueLinkCandidates(store));
  }
  if (request.method === "GET" && path === "/admin/news-issue-candidates") {
    return withInternalAuth(request, options, () => getAdminNewsIssueCandidates(store));
  }
  if (request.method === "PATCH" && path.startsWith("/admin/news-issue-candidates/")) {
    return withInternalAuth(request, options, () => patchAdminNewsIssueCandidate(store, path.split("/")[3], request.body));
  }
  if (request.method === "PATCH" && path.startsWith("/admin/law-group-links/")) {
    return withInternalAuth(request, options, () => patchAdminLawGroupLink(store, path.split("/")[3], path.split("/")[4], request.body));
  }
  if (request.method === "PATCH" && path.startsWith("/admin/occurrence-issue-links/")) {
    return withInternalAuth(request, options, () => patchAdminOccurrenceIssueLink(store, path.split("/")[3], path.split("/")[4], request.body));
  }
  if (request.method === "PATCH" && path.startsWith("/admin/claims/")) {
    return withInternalAuth(request, options, () => patchAdminClaim(store, path.split("/")[3], request.body));
  }
  if (request.method === "POST" && path === "/internal/ingest/public-source") return withInternalAuth(request, options, () => postInternalIngest(store, request.body));
  if (request.method === "POST" && path === "/internal/ingest/public-occurrence") {
    return withInternalAuth(request, options, () => postInternalIngestPublicOccurrence(store, request.body));
  }
  if (request.method === "POST" && path === "/internal/ingest/public-occurrences/batch") {
    return withInternalAuth(request, options, () => postInternalIngestPublicOccurrenceBatch(store, request.body));
  }
  if (request.method === "POST" && path === "/internal/ingest/laws") {
    return withInternalAuth(request, options, () => postInternalIngestLaws(store, request.body));
  }
  if (request.method === "POST" && path === "/internal/ingest/news") {
    return withInternalAuth(request, options, () => postInternalIngestNews(store, request.body));
  }
  if (request.method === "GET" && path === "/internal/news-ingest-budget") {
    return withInternalAuth(request, options, () => getInternalNewsIngestBudget(store));
  }
  if (request.method === "POST" && path === "/internal/news-ingest-usage") {
    return withInternalAuth(request, options, () => postInternalNewsIngestUsage(store, request.body));
  }
  if (request.method === "PATCH" && path.startsWith("/internal/evidence/") && path.endsWith("/device-integrity")) {
    return withInternalAuth(request, options, () => patchInternalDeviceIntegrity(store, path.split("/")[3], request.body));
  }
  if (request.method === "PATCH" && path.startsWith("/internal/evidence/") && path.endsWith("/redaction")) {
    return withInternalAuth(request, options, () => patchInternalEvidenceRedaction(store, path.split("/")[3], request.body));
  }
  if (request.method === "GET" && path === "/internal/redaction-queue") {
    return withInternalAuth(request, options, () => getInternalRedactionQueue(store, url.searchParams.get("limit"), Boolean(options.liveMediaEncryptionKey)));
  }
  if (request.method === "POST" && path === "/internal/agents/reconcile-lifecycle") return withInternalAuth(request, options, () => postReconcileLifecycle(store, request.body));
  if (request.method === "POST" && path === "/internal/notifications/dispatch") return withInternalAuth(request, options, () => postNotificationDispatch(store));
  if (request.method === "POST" && path === "/internal/privacy/purge-expired") return await withInternalAuth(request, options, () => postPrivacyPurgeExpired(store, options));

  return json(404, { error: "not_found" });
}

function defaultReadiness(): ReadinessReport {
  return {
    ready: false,
    checks: [{ id: "runtime", ok: false, message: "readiness callback is not configured" }]
  };
}

function describeReadiness(report: ReadinessReport): ReadinessReport {
  const failed = report.checks.filter((check) => !check.ok);
  const blockingGroups = unique(failed.map((check) => readinessGroup(check.id)));
  const failedFor = (groups: string[]) => failed.filter((check) => groups.includes(readinessGroup(check.id))).map((check) => check.id);
  const publicReadFailed = failedFor(["database", "public_sources", "runtime_config"]);
  const contributionFailed = failedFor(["database", "redis", "security", "storage", "redaction", "mobile_integrity", "identity", "runtime_config", "operator_profile"]);
  return {
    ...report,
    summary: {
      total: report.checks.length,
      okCount: report.checks.length - failed.length,
      failedCount: failed.length,
      failedIds: failed.map((check) => check.id),
      blockingGroups
    },
    gates: {
      publicRead: { ready: publicReadFailed.length === 0, failedIds: publicReadFailed },
      contribution: { ready: contributionFailed.length === 0, failedIds: contributionFailed },
      operator: { ready: failed.length === 0, failedIds: failed.map((check) => check.id) }
    },
    requiredActions: blockingGroups.map(readinessAction)
  };
}

function readinessGroup(id: string): string {
  if (id === "config" || id === "config_source") return "runtime_config";
  if (id === "postgres" || id.startsWith("postgres.")) return "database";
  if (id === "redis" || id.startsWith("redis.")) return "redis";
  if (id.startsWith("security.")) return "security";
  if (id.startsWith("storage.")) return "storage";
  if (id.startsWith("redaction.")) return "redaction";
  if (id.startsWith("mobile.")) return "mobile_integrity";
  if (id.startsWith("identity.")) return "identity";
  if (id.startsWith("public_data_sources.")) return "public_sources";
  if (id.startsWith("organization.") || id.startsWith("app.") || id.startsWith("web.") || id.startsWith("domestic_operation.")) return "operator_profile";
  if (id.startsWith("payments.")) return "payments";
  return "runtime";
}

function readinessAction(group: string): { id: string; action: string; verify: string } {
  const actions: Record<string, { action: string; verify: string }> = {
    database: {
      action: "Attach Render managed Postgres so DATABASE_URL is available to musunil-api.",
      verify: "GET /ready shows the postgres check as ok."
    },
    redis: {
      action: "Attach Render Key Value/Redis so REDIS_URL is available to musunil-api.",
      verify: "GET /ready shows the redis check as ok."
    },
    runtime_config: {
      action: "Mount the production user-inputs as a Render Secret File and set MUSUNIL_USER_INPUTS_FILE_PATH.",
      verify: "GET /ready shows config_source as ok."
    },
    security: {
      action: "Use Render generated secrets or fill the required security keys in the secret config only.",
      verify: "GET /ready has no failed security.* checks."
    },
    storage: {
      action: "Fill storage provider, bucket, region, and credentials for encrypted LIVE media originals.",
      verify: "pnpm storage:smoke succeeds and GET /ready has no failed storage.* checks."
    },
    redaction: {
      action: "Run the bundled ffmpeg redaction smoke and keep the worker command available in the scheduler image.",
      verify: "pnpm redaction:smoke succeeds and GET /ready has no failed redaction.* checks."
    },
    mobile_integrity: {
      action: "Configure Android Play Integrity or iOS App Attest and the mobile integrity smoke command.",
      verify: "pnpm mobile:integrity-smoke succeeds and GET /ready has no failed mobile.* checks."
    },
    identity: {
      action: "Fill PortOne identity store, channel, and API secret through Render secret configuration.",
      verify: "GET /ready has no failed identity.* checks and /auth/identity/start returns 201."
    },
    public_sources: {
      action: "Fill the National Assembly bill API key or Law.go.kr OC value for official law source ingest.",
      verify: "pnpm sources:laws dry-run returns official items and GET /ready has no failed public_data_sources.* checks."
    },
    operator_profile: {
      action: "Fill public support email and operator/privacy/location manager contact fields.",
      verify: "GET /ready has no failed app.*, organization.*, web.*, or domestic_operation.* checks."
    },
    payments: {
      action: "Keep payments disabled until individual-business and PG values are ready, or fill every PG value before enabling support payments.",
      verify: "GET /ready has no failed payments.* checks."
    }
  };
  const selected = actions[group] ?? {
    action: "Inspect the failed readiness checks and update the production configuration.",
    verify: "GET /ready returns ready=true."
  };
  return { id: group, ...selected };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function withInternalAuth(request: ApiRequest, options: AppOptions, action: () => ApiResponse | Promise<ApiResponse>): ApiResponse | Promise<ApiResponse> {
  if (!options.internalApiKey) return json(503, { error: "internal_api_key_not_configured" });
  if (constantTimeStringEqual(request.headers?.["x-musunil-internal-key"], options.internalApiKey)) return action();
  return json(401, { error: "internal_auth_required" });
}

function withUserScope(request: ApiRequest, options: AppOptions, userId: string | null, action: (userId: string) => ApiResponse): ApiResponse {
  if (!userId) return json(400, { error: "userId_required" });
  if (!verifyUserToken(request.headers?.["x-musunil-user-token"], userId, options.userTokenSecret)) {
    return json(401, { error: "user_scope_required" });
  }
  return action(userId);
}

function withVerifiedUserScope(store: Store, request: ApiRequest, options: AppOptions, userId: string | null, action: (userId: string) => ApiResponse): ApiResponse {
  if (!userId) return json(400, { error: "userId_required" });
  const verified = verifiedUserFromRequest(store, request, options);
  if (!verified || verified.user.id !== userId) return json(401, { error: "identity_required" });
  return action(userId);
}

function postAnonymousSession(options: AppOptions): ApiResponse {
  if (options.allowAnonymousSession === false) return json(404, { error: "not_found" });
  if (!options.userTokenSecret) return json(503, { error: "user_token_secret_not_configured" });
  const userId = `anon_${randomUUID()}`;
  const expiresAt = Date.now() + userTokenTtlMs;
  return json(201, { userId, token: signUserToken(userId, expiresAt, options.userTokenSecret), expiresAt: new Date(expiresAt).toISOString(), authLevel: "anonymous" });
}

function postIdentityStart(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const identity = options.identity;
  if (!identity || identity.provider !== "portone" || !identity.storeId || !identity.identityChannelKey) {
    return json(503, { error: "identity_provider_not_configured" });
  }
  const data = asObject(request.body);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60_000);
  const identityVerificationId = `musunil_identity_${randomUUID()}`;
  const session: IdentityVerificationSession = {
    id: randomUUID(),
    provider: "portone",
    identityVerificationId,
    purpose: readIdentityPurpose(data),
    status: "requested",
    requestedAt: now,
    expiresAt
  };
  store.identityVerificationSessions.push(session);
  return json(201, {
    provider: "portone",
    storeId: identity.storeId,
    channelKey: identity.identityChannelKey,
    identityVerificationId,
    purpose: session.purpose,
    expiresAt: expiresAt.toISOString()
  });
}

async function postIdentityComplete(store: Store, request: ApiRequest, options: AppOptions): Promise<ApiResponse> {
  if (!options.userTokenSecret) return json(503, { error: "user_token_secret_not_configured" });
  const identity = options.identity;
  if (!identity || identity.provider !== "portone") return json(503, { error: "identity_provider_not_configured" });
  const data = asObject(request.body);
  const identityVerificationId = readString(data, "identityVerificationId");
  const session = store.identityVerificationSessions.find((item) => item.identityVerificationId === identityVerificationId);
  if (!session) return json(404, { error: "identity_session_not_found" });
  if (session.expiresAt.getTime() < Date.now()) {
    session.status = "expired";
    return json(410, { error: "identity_session_expired" });
  }

  const verified = await verifyPortoneIdentity(identity, data, identityVerificationId);
  const ciHash = verified.ci ? hmacSubject(verified.ci, options.userTokenSecret) : undefined;
  const diHash = verified.di ? hmacSubject(verified.di, options.userTokenSecret) : undefined;
  const subjectHash = ciHash ?? diHash ?? hmacSubject(`${verified.provider}:${verified.providerVerificationId}`, options.userTokenSecret);
  const now = new Date();
  let user = store.verifiedUsers.find(
    (item) =>
      (ciHash && item.ciHash === ciHash) ||
      (diHash && item.diHash === diHash) ||
      item.subjectHash === subjectHash
  );
  if (!user) {
    user = {
      id: `user_${randomUUID()}`,
      identityProvider: "portone",
      ciHash,
      diHash,
      subjectHash,
      status: "active",
      verifiedAt: now,
      lastSeenAt: now,
      verificationCount: 1
    };
    store.verifiedUsers.push(user);
  } else {
    user.ciHash ??= ciHash;
    user.diHash ??= diHash;
    user.subjectHash = user.subjectHash || subjectHash;
    user.lastSeenAt = now;
    user.verificationCount += 1;
  }
  session.status = "verified";
  session.verifiedAt = now;
  session.userId = user.id;

  const expiresAt = Date.now() + userTokenTtlMs;
  const token = signUserToken(user.id, expiresAt, options.userTokenSecret);
  store.userSessions.push({
    id: randomUUID(),
    userId: user.id,
    authLevel: "identity_verified",
    tokenHash: tokenHash(token),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(expiresAt)
  });
  return json(201, {
    authenticated: true,
    user: toPublicVerifiedUser(user),
    userId: user.id,
    token,
    authLevel: "identity_verified",
    expiresAt: new Date(expiresAt).toISOString()
  }, identityCookieHeaders(user.id, token, new Date(expiresAt), identity.sessionCookieDomain));
}

function getMe(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const verified = verifiedUserFromRequest(store, request, options);
  if (!verified) return json(200, { authenticated: false, status: "identity_required" });
  return json(200, {
    authenticated: true,
    user: toPublicVerifiedUser(verified.user),
    userId: verified.user.id,
    authLevel: "identity_verified",
    expiresAt: verified.session.expiresAt.toISOString()
  });
}

function postLogout(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const verified = verifiedUserFromRequest(store, request, options);
  if (verified) verified.session.revokedAt = new Date();
  return json(200, { status: "logged_out" }, clearIdentityCookieHeaders(options.identity?.sessionCookieDomain));
}

function constantTimeStringEqual(candidate: string | undefined, expected: string): boolean {
  if (!candidate) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

function signUserToken(userId: string, expiresAt: number, secret: string): string {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

function verifyUserToken(token: string | undefined, userId: string, secret: string | undefined): boolean {
  if (!token || !secret) return false;
  const [tokenUserId, expiresAtText] = token.split(".");
  const expiresAt = Number(expiresAtText);
  if (tokenUserId !== userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return constantTimeStringEqual(token, signUserToken(userId, expiresAt, secret));
}

function verifiedBodyUserId(store: Store, request: ApiRequest, options: AppOptions, data: Record<string, unknown>): string | undefined {
  const userId = readOptionalString(data, "userId");
  if (!userId) return undefined;
  const verified = verifiedUserFromRequest(store, request, options);
  if (!verified || verified.user.id !== userId) {
    throw new ApiError(401, "identity_required");
  }
  return userId;
}

function requireVerifiedBodyUserId(store: Store, request: ApiRequest, options: AppOptions, data: Record<string, unknown>): string {
  const userId = verifiedBodyUserId(store, request, options, data);
  if (!userId) throw new ApiError(401, "identity_required");
  return userId;
}

type VerifiedRequestUser = {
  user: VerifiedUser;
  session: UserSession;
};

function verifiedUserFromRequest(store: Store, request: ApiRequest, options: AppOptions): VerifiedRequestUser | undefined {
  const credentials = verifiedCredentialsFromRequest(request);
  const userId = credentials?.userId;
  const token = credentials?.token;
  if (!userId || !token || !verifyUserToken(token, userId, options.userTokenSecret)) return undefined;
  const session = store.userSessions.find(
    (item) =>
      item.userId === userId &&
      item.authLevel === "identity_verified" &&
      !item.revokedAt &&
      item.expiresAt.getTime() > Date.now() &&
      item.tokenHash === tokenHash(token)
  );
  const user = store.verifiedUsers.find((item) => item.id === userId && item.status === "active");
  if (!session || !user) return undefined;
  const now = new Date();
  session.lastSeenAt = now;
  user.lastSeenAt = now;
  return { user, session };
}

function verifiedCredentialsFromRequest(request: ApiRequest): { userId: string; token: string } | undefined {
  const headerUserId = request.headers?.["x-musunil-user-id"];
  const headerToken = request.headers?.["x-musunil-user-token"];
  if (headerUserId && headerToken) return { userId: headerUserId, token: headerToken };

  const cookieValue = cookieValueFromHeader(request.headers?.cookie, "musunil_session");
  if (!cookieValue) return undefined;
  const separatorIndex = cookieValue.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === cookieValue.length - 1) return undefined;
  return {
    userId: cookieValue.slice(0, separatorIndex),
    token: cookieValue.slice(separatorIndex + 1)
  };
}

function cookieValueFromHeader(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== name || rawValue.length === 0) continue;
    try {
      return decodeURIComponent(rawValue.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function tokenHash(token: string): string {
  return `sha256-${createHash("sha256").update(token).digest("base64url")}`;
}

function hmacSubject(value: string, secret: string): string {
  return `hmac-sha256-${createHmac("sha256", secret).update(value).digest("base64url")}`;
}

function toPublicVerifiedUser(user: VerifiedUser) {
  return {
    id: user.id,
    identityProvider: user.identityProvider,
    status: user.status,
    verifiedAt: user.verifiedAt.toISOString(),
    lastSeenAt: user.lastSeenAt.toISOString()
  };
}

function identityCookieHeaders(userId: string, token: string, expiresAt: Date, domain: string | undefined): Record<string, string> {
  const parts = [
    `musunil_session=${encodeURIComponent(`${userId}:${token}`)}`,
    "Path=/",
    `Expires=${expiresAt.toUTCString()}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ];
  if (domain) parts.splice(2, 0, `Domain=${domain}`);
  return { "set-cookie": parts.join("; ") };
}

function clearIdentityCookieHeaders(domain: string | undefined): Record<string, string> {
  const parts = [
    "musunil_session=",
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax"
  ];
  if (domain) parts.splice(2, 0, `Domain=${domain}`);
  return { "set-cookie": parts.join("; ") };
}

function readIdentityPurpose(data: Record<string, unknown>): IdentityVerificationSession["purpose"] {
  const purpose = data.purpose;
  if (
    purpose === "report" ||
    purpose === "field_verification" ||
    purpose === "rebuttal" ||
    purpose === "rights_report" ||
    purpose === "subscription" ||
    purpose === "general"
  ) {
    return purpose;
  }
  return "general";
}

type PortoneVerifiedIdentity = {
  provider: "portone";
  providerVerificationId: string;
  ci?: string;
  di?: string;
};

async function verifyPortoneIdentity(identity: IdentityRuntime, data: Record<string, unknown>, identityVerificationId: string): Promise<PortoneVerifiedIdentity> {
  if (identity.testMode) {
    const ci = readOptionalString(data, "testCi") ?? readOptionalString(data, "ci");
    const di = readOptionalString(data, "testDi") ?? readOptionalString(data, "di");
    if (!ci && !di) throw new ApiError(400, "identity_result_incomplete");
    return { provider: "portone", providerVerificationId: identityVerificationId, ci, di };
  }
  if (!identity.apiSecret) throw new ApiError(503, "identity_provider_not_configured");
  const apiBaseUrl = identity.apiBaseUrl ?? "https://api.portone.io";
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
    headers: {
      authorization: `PortOne ${identity.apiSecret}`,
      "user-agent": "MusunilIdentityVerifier/0.1"
    },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new ApiError(502, "identity_provider_verify_failed");
  const body = await response.json();
  const status = String(readNested(body, ["identityVerification.status", "status", "verification.status"]) ?? "");
  if (!["VERIFIED", "verified", "SUCCESS", "success"].includes(status)) throw new ApiError(422, "identity_not_verified");
  const ci = readNestedString(body, [
    "identityVerification.verifiedCustomer.ci",
    "identityVerification.customer.ci",
    "verifiedCustomer.ci",
    "customer.ci",
    "ci"
  ]);
  const di = readNestedString(body, [
    "identityVerification.verifiedCustomer.di",
    "identityVerification.customer.di",
    "verifiedCustomer.di",
    "customer.di",
    "di"
  ]);
  if (!ci && !di) throw new ApiError(422, "identity_result_incomplete");
  return { provider: "portone", providerVerificationId: identityVerificationId, ci, di };
}

function readNestedString(value: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const item = readNested(value, [path]);
    if (typeof item === "string" && item.trim().length > 0) return item.trim();
  }
  return undefined;
}

function readNested(value: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const item = path.split(".").reduce<unknown>((current, key) => {
      if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
      return (current as Record<string, unknown>)[key];
    }, value);
    if (item !== undefined && item !== null) return item;
  }
  return undefined;
}

function homeCards(store: Store, now = new Date()) {
  const occurrenceCards = store.occurrences
    .filter((occurrence) => {
      const primaryIssueId = primaryApprovedIssueId(store, occurrence);
      const issue = primaryIssueId ? store.issues.find((item) => item.id === primaryIssueId) : undefined;
      return Boolean(issue && isPublicTopicIssue(issue) && !isSourceOnlyOccurrence(store, occurrence) && isOccurrenceWithinPublicDiscoveryWindow(occurrence, now));
    })
    .map((occurrence) => {
    const claims = publicClaimsForTarget(store, "occurrence", occurrence.id);
    const publicEvidenceIds = new Set(claims.flatMap((claim) => claim.evidenceIds));
    const evidence = store.evidence.filter((item) => publicEvidenceIds.has(item.id));
    const sourceDiversity = new Set(claims.map((claim) => claim.sourceProvenance)).size;
    const primaryIssueId = primaryApprovedIssueId(store, occurrence);
    const approvedIssueIds = approvedIssueIdsForOccurrence(store, occurrence);
    const officialSourcePreviewBoost = primaryIssueId?.startsWith("issue_public_") ? 12 : 0;
    const score = calculatePriorityScore({
      recency: 1,
      updateVelocity: claims.length,
      proofOfPresenceGrowth: evidence.filter((item) => item.proofOfPresenceStatus === "pass").length,
      publicImpact: claims.length > 1 ? 1 : 0,
      publicAssemblyImpact: occurrence.type === "static_assembly" || occurrence.type === "march" ? 2 : 0,
      sourceDiversity,
      claimConflict: claims.filter((claim) => claim.disputedByClaimIds.length > 0).length,
      evidenceStrength: maxEvidenceStrengthScore(claims),
      manipulationSuspicion: 0,
      massReportPenalty: 0,
      singleSourcePenalty: sourceDiversity <= 1 ? 1 : 0
    }) + officialSourcePreviewBoost;

    return {
      id: occurrence.id,
      issueId: primaryIssueId,
      issueIds: approvedIssueIds,
      targetType: "occurrence",
      title: occurrence.title,
      regionLabel: occurrence.regionLabel,
      publicLocation: occurrence.publicLocation,
	      lifecycleState: occurrence.lifecycleState,
	      chips: chipsForClaims(claims),
	      sourceSummary: sourceSummaryForClaims(claims),
	      updatedAt: latestDate([occurrence.startsAt, occurrence.endsAt, ...claims.map((claim) => claim.createdAt)])?.toISOString(),
	      priorityScore: score,
      current: evidence.length ? "확인 중" : "관측 대기",
      peak: "-",
      proof: evidence.length
    };
  });

  const specialCards = store.continuousPresences
    .filter((item) => {
      const issue = item.issueId ? store.issues.find((candidate) => candidate.id === item.issueId) : undefined;
      return Boolean(issue && isPublicTopicIssue(issue) && isContinuousPresenceWithinPublicDiscoveryWindow(item, now));
    })
    .map((item) => ({
      id: item.id,
      issueId: item.issueId,
      issueIds: item.issueId ? [item.issueId] : [],
      targetType: "continuous_presence",
      title: `${item.regionLabel} 장기 현장`,
      regionLabel: item.regionLabel,
      publicLocation: item.publicLocation,
      lifecycleState: "ONGOING_SERIES",
      chips: ["장기 진행 중", "세션 구분 없음"],
      updatedAt: item.lastProofOfPresenceAt?.toISOString(),
      priorityScore: 8,
      current: presenceStateLabel(item.state),
      peak: "-",
      proof: item.evidenceIds.length
    }));

  return [...occurrenceCards, ...specialCards].sort((a, b) => homeCardOrderScore(a) - homeCardOrderScore(b));
}

function toOccurrenceDigest(store: Store, targetType: Extract<TargetType, "occurrence" | "continuous_presence">, id: string): OccurrenceDigest {
  const target = targetRecord(store, targetType, id);
  if (!target) throw new Error("occurrence_digest_target_not_found");
  const claims = publicClaimsForTarget(store, targetType, id);
  const evidence = publicEvidenceForClaims(store, claims);
  const strongestClaim = [...claims].sort((left, right) => evidenceStrengths.indexOf(right.evidenceStrength) - evidenceStrengths.indexOf(left.evidenceStrength))[0];
  const highestRiskClaim = [...claims].sort((left, right) => riskLevels.indexOf(right.riskLevel) - riskLevels.indexOf(left.riskLevel))[0];
  const estimate = store.crowdEstimates
    .filter((item) => item.targetType === targetType && item.targetId === id)
    .filter((item) => crowdEstimateHasPublicBasis(store, item))
    .sort((left, right) => right.observedAt.getTime() - left.observedAt.getTime())[0];
  const occurrence = targetType === "occurrence" ? target as Occurrence : undefined;
  const continuous = targetType === "continuous_presence" ? target as ContinuousPresence : undefined;
  const targetPublicLocation = "publicLocation" in target ? target.publicLocation : undefined;
  const targetLocationStatus = occurrence?.locationStatus ?? targetPublicLocation?.status ?? (targetPublicLocation ? "SOURCE_GEOCODED" : undefined);
  const issueIds = targetType === "occurrence"
    ? approvedIssueIdsForOccurrence(store, target as Occurrence)
    : "issueId" in target && target.issueId ? [target.issueId] : [];
  const issueId = issueIds[0];
  const issue = issueId ? store.issues.find((item) => item.id === issueId) : undefined;
  const updatedAt = latestDate([
    occurrence?.startsAt,
    occurrence?.endsAt,
    continuous?.lastProofOfPresenceAt,
    continuous?.firstProofOfPresenceAt,
    ...claims.map((claim) => claim.createdAt)
  ]);

  return {
    id,
    targetType,
    issueId,
    issueIds,
    primaryIssueId: issueId,
    title: targetTitle(targetType, target),
    regionLabel: targetRegionLabel(store, targetType, target) ?? "지역 확인 중",
    locationLabel: "publicLocation" in target ? target.publicLocation?.label : undefined,
    locationStatus: targetLocationStatus,
    locationStatusLabel: targetLocationStatus ? locationStatusLabel(targetLocationStatus) : undefined,
    locationUncertaintyRadiusM: targetPublicLocation?.uncertaintyRadiusM,
    fieldLocationEvidenceCount: targetPublicLocation?.fieldEvidenceCount ?? 0,
    lifecycleState: targetLifecycle(target) as LifecycleState,
    startsAt: occurrence?.startsAt?.toISOString(),
    endsAt: occurrence?.endsAt?.toISOString(),
    updatedAt: updatedAt?.toISOString(),
    evidenceStrength: strongestClaim?.evidenceStrength ?? "none",
    riskLevel: highestRiskClaim?.riskLevel ?? "low",
    officialClaimCount: claims.filter((claim) => claim.sourceProvenance === "government_or_police").length,
    publicVideoCount: claims.filter((claim) => hasPublicLiveEvidence(store, claim)).length,
    disputeCount: claims.filter(isDisputeSource).length,
    evidenceCount: evidence.length,
    scale: estimate ? { minCount: estimate.minCount, maxCount: estimate.maxCount, confidence: estimate.confidence } : undefined,
    issueTitle: issue?.title,
    keyPoint: strongestClaim?.normalizedStatement,
    officialSources: officialSourcesForEvidence(evidence)
  };
}

function officialSourcesForEvidence(evidence: Evidence[]): NonNullable<OccurrenceDigest["officialSources"]> {
  const sources = new Map<string, NonNullable<OccurrenceDigest["officialSources"]>[number]>();
  for (const item of evidence) {
    if (item.evidenceType !== "official_doc" || item.externalProvider !== "official_public_source" || !item.sourceUrl) continue;
    sources.set(item.sourceUrl, {
      label: item.publisherLabel ?? "경찰 공개자료",
      sourceUrl: item.sourceUrl,
      publishedAt: item.sourcePublishedAt?.toISOString(),
      checkedAt: item.sourceCheckedAt?.toISOString(),
      granularity: item.sourceGranularity ?? "bulletin"
    });
  }
  return [...sources.values()];
}

function toIssueOverview(store: Store, issue: ReturnType<typeof issueCards>[number], cards = homeCards(store)): IssueOverview {
  const relatedCards = cards.filter((card) => card.issueId === issue.id || card.issueIds.includes(issue.id));
  const digests = relatedCards.map((card) => toOccurrenceDigest(store, card.targetType as Extract<TargetType, "occurrence" | "continuous_presence">, card.id));
  const mediaPublisherCount = issue.synthesisBasis === "evidence_aggregate" ? mediaPublishersForIssue(store, issue.id).length : 0;
  const synthesis = store.issueSynthesisSnapshots.find((item) => item.issueId === issue.id);
  return {
    id: issue.id,
    title: issue.title,
    status: issue.status,
    lifecycleState: issue.lifecycleState as LifecycleState,
    regionCount: issue.regionCount,
    occurrenceCount: issue.targetCount,
    officialClaimCount: issue.officialCount,
    publicVideoCount: digests.reduce((count, digest) => count + digest.publicVideoCount, 0),
    disputeCount: issue.disputeCount,
    latestUpdatedAt: issue.updatedAt,
    representativeOccurrenceId: digests[0]?.id,
    latestChange: issue.synthesisBasis === "evidence_aggregate"
      ? synthesis
        ? `${synthesis.neutralSummary} 근거 ${synthesis.evidenceCount}건(발행사 ${synthesis.publisherCount}곳)을 종합했습니다`
        : `언론 보도 근거 ${issue.sourceSummary.media}건(발행사 ${mediaPublisherCount}곳)을 종합했습니다`
      : undefined,
    synthesisSummary: synthesis?.neutralSummary,
    synthesisEvidenceCount: synthesis?.evidenceCount,
    synthesisPublisherCount: synthesis?.publisherCount,
    facets: synthesis?.facets
  };
}

function issueCards(store: Store, cards = homeCards(store)) {
  return store.issues
    .filter(isPublicTopicIssue)
    .map((issue) => {
      const relatedCards = cards.filter((card) => card.issueId === issue.id || card.issueIds.includes(issue.id));
      const relatedTargetKeys = new Set(relatedCards.map((card) => `${card.targetType}:${card.id}`));
      const relatedTargets = issueTargets(store, issue.id).filter(({ targetType, target }) => relatedTargetKeys.has(`${targetType}:${target.id}`));
      const relatedClaims = [
        ...publicClaimsForTarget(store, "issue", issue.id),
        ...relatedTargets.flatMap(({ targetType, target }) => publicClaimsForTarget(store, targetType, target.id))
      ];
      const regions = new Set(relatedTargets.map(({ targetType, target }) => targetRegionLabel(store, targetType, target)).filter(Boolean));
      const currentCount = relatedCards.filter((card) => !["ARCHIVED", "ENDED", "CANCELED", "POSTPONED"].includes(card.lifecycleState)).length;
      const needsCount = relatedCards.filter((card) => card.lifecycleState === "UNKNOWN" || Number(card.proof || 0) === 0).length;
      const updatedAt = latestDate([
        issue.lastUpdatedAt,
        ...relatedCards.map((card) => (card.updatedAt ? new Date(card.updatedAt) : undefined)),
        ...relatedClaims.map((claim) => claim.createdAt)
      ])?.toISOString();
      const sourceSummary = sourceSummaryForClaims(relatedClaims);
      return {
        id: issue.id,
        targetType: "issue",
        title: issue.title,
        synthesisBasis: issue.synthesisBasis,
        status: issue.status,
        topicTags: issue.topicTags,
        updatedAt,
        targetCount: relatedCards.length,
        currentCount,
        regionCount: regions.size,
        officialCount: sourceSummary.official,
        disputeCount: relatedClaims.filter((claim) => claim.disputedByClaimIds.length > 0).length,
        needsVerificationCount: needsCount,
        sourceSummary,
        chips: [
          currentCount ? `${currentCount}건 진행·예정` : issue.synthesisBasis === "evidence_aggregate" ? "근거 종합 주제" : "기록 중심",
          regions.size ? `${regions.size}개 지역` : "지역 확인 중",
          sourceSummary.official ? "공식 자료 있음" : sourceSummary.media > 0 ? `언론 보도 근거 ${sourceSummary.media}건` : "출처 확인 중"
        ],
        lifecycleState: currentCount ? "ONGOING_SERIES" : issue.status === "archived" ? "ARCHIVED" : "UNKNOWN"
      };
    })
    .filter((issue) => issue.targetCount > 0 || issue.officialCount > 0 || issue.sourceSummary.media > 0 || issue.sourceSummary.field > 0)
    .sort((a, b) => {
      const stateRank = (card: { lifecycleState: string }) => (card.lifecycleState === "ARCHIVED" ? 1 : 0);
      return stateRank(a) - stateRank(b) || new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
}

function isPublicSourceBundleIssue(issue: Issue): boolean {
  const text = `${issue.id} ${issue.normalizedTopicKey} ${issue.title} ${issue.topicTags.join(" ")}`;
  return issue.id.startsWith("issue_public_")
    || issue.normalizedTopicKey === "real-public-assembly-sources"
    || /public-assembly-(schedules|statistics)/.test(text)
    || /신고[·\s-]*(공개|개최|통계)|공개\s*(일정|자료)|집회\s*신고\s*통계/.test(text);
}

function isPublicTopicIssue(issue: Issue): boolean {
  return issue.kind === "topic" && issue.status !== "archived" && !isPublicSourceBundleIssue(issue);
}

function isSourceOnlyOccurrence(store: Store, occurrence: Occurrence): boolean {
  if (occurrence.publicVisibility === "source_only") return true;
  if (occurrence.publicVisibility === "public") return false;
  const officialEvidence = occurrence.evidenceIds
    .map((id) => store.evidence.find((item) => item.id === id))
    .filter((item): item is Evidence => Boolean(item?.externalProvider === "official_public_source"));
  return officialEvidence.length > 0 && officialEvidence.every((item) => (item.sourceGranularity ?? "bulletin") === "bulletin");
}

function publicSourceCoverage(store: Store) {
  const registry = sourceCoverageReport(store.publicSourceRefreshes);
  const officialEventOccurrences = store.occurrences.filter((occurrence) => {
    if (isSourceOnlyOccurrence(store, occurrence)) return false;
    return occurrence.evidenceIds.some((id) => {
      const evidence = store.evidence.find((item) => item.id === id);
      return evidence?.externalProvider === "official_public_source" && evidence.sourceGranularity === "individual_schedule";
    });
  });
  const eventRegions = uniqueSorted(officialEventOccurrences.map((occurrence) => occurrence.regionLabel));
  const geocodedEventRegions = uniqueSorted(officialEventOccurrences.filter((occurrence) => Boolean(occurrence.publicLocation)).map((occurrence) => occurrence.regionLabel));
  const upcoming = officialEventOccurrences.filter((occurrence) => !["ENDED", "ARCHIVED", "CANCELED"].includes(occurrence.lifecycleState));
  const boardPostOnlyRegions = registry.regions
    .filter((region) => region.status === "schedule_active" && !eventRegions.includes(region.label))
    .map((region) => region.label);
  const parserEmptySourceIds = store.publicSourceRefreshes
    .filter((refresh) => refresh.status === "empty" && (refresh.resultCount ?? 0) > 0 && (refresh.parsedCount ?? 0) === 0)
    .map((refresh) => refresh.sourceId);
  const confirmedNoEventSourceIds = store.publicSourceRefreshes
    .filter((refresh) => refresh.status === "empty" && (refresh.resultCount ?? 0) === 0)
    .map((refresh) => refresh.sourceId);
  return {
    ...registry,
    /** @deprecated Source-registry reach only. Use eventCoverage for usable event/map coverage. */
    fullScheduleCoverage: registry.fullScheduleCoverage,
    fullScheduleSourceCoverage: registry.fullScheduleCoverage,
    fullEventLevelCoverage: eventRegions.length === registry.totalPoliceRegions,
    coveragePolicy: "source reach, event extraction, and map coverage are reported separately",
    eventCoverage: {
      sourceReachRegions: registry.activeScheduleRegions,
      sourceReachRegionLabels: registry.regions.filter((region) => region.status === "schedule_active").map((region) => region.label),
      eventLevelRegions: eventRegions.length,
      eventLevelRegionLabels: eventRegions,
      geocodedEventRegions: geocodedEventRegions.length,
      geocodedEventRegionLabels: geocodedEventRegions,
      mappedUpcomingCount: upcoming.filter((occurrence) => Boolean(occurrence.publicLocation)).length,
      locationPendingUpcomingCount: upcoming.filter((occurrence) => !occurrence.publicLocation).length,
      boardPostOnlyRegions,
      parserEmptySourceIds: uniqueStrings(parserEmptySourceIds),
      confirmedNoEventSourceIds: uniqueStrings(confirmedNoEventSourceIds)
    }
  };
}

function synchronizeOccurrenceIssueLinks(store: Store): void {
  const issueIds = new Set(store.issues.map((issue) => issue.id));
  const occurrenceIds = new Set(store.occurrences.map((occurrence) => occurrence.id));
  const links = new Map<string, OccurrenceIssueLink>();
  for (const link of store.occurrenceIssueLinks) {
    if (!issueIds.has(link.issueId) || !occurrenceIds.has(link.occurrenceId)) continue;
    links.set(`${link.occurrenceId}:${link.issueId}`, {
      ...link,
      supportingClaimIds: uniqueStrings(link.supportingClaimIds),
      supportingEvidenceIds: uniqueStrings(link.supportingEvidenceIds)
    });
  }
  for (const occurrence of store.occurrences) {
    if (!occurrence.issueId || !issueIds.has(occurrence.issueId)) continue;
    const key = `${occurrence.id}:${occurrence.issueId}`;
    if (!links.has(key)) {
      links.set(key, {
        occurrenceId: occurrence.id,
        issueId: occurrence.issueId,
        status: "approved",
        matchBasis: "manual",
        confidence: "high",
        supportingClaimIds: [...occurrence.claimIds],
        supportingEvidenceIds: [...occurrence.evidenceIds],
        createdAt: occurrence.startsAt ?? new Date(),
        reviewedAt: occurrence.startsAt ?? new Date(),
        reviewNote: "기존 단일 이슈 연결을 승인 링크로 유지"
      });
    }
  }
  store.occurrenceIssueLinks = [...links.values()];
  for (const occurrence of store.occurrences) occurrence.issueId = primaryApprovedIssueId(store, occurrence);
}

function approvedIssueIdsForOccurrence(store: Store, occurrence: Occurrence): string[] {
  const linked = store.occurrenceIssueLinks
    .filter((link) => link.occurrenceId === occurrence.id && link.status === "approved")
    .sort((left, right) => confidenceRank(right.confidence) - confidenceRank(left.confidence) || (right.reviewedAt?.getTime() ?? 0) - (left.reviewedAt?.getTime() ?? 0))
    .map((link) => link.issueId);
  return uniqueStrings([...linked, ...(occurrence.issueId ? [occurrence.issueId] : [])]);
}

function primaryApprovedIssueId(store: Store, occurrence: Occurrence): string | undefined {
  return approvedIssueIdsForOccurrence(store, occurrence)[0];
}

function occurrenceHasApprovedIssue(store: Store, occurrence: Occurrence, issueId: string): boolean {
  return approvedIssueIdsForOccurrence(store, occurrence).includes(issueId);
}

function confidenceRank(value: OccurrenceIssueLink["confidence"]): number {
  return value === "high" ? 3 : value === "medium" ? 2 : 1;
}

function issueTargets(store: Store, issueId: string): Array<{ targetType: TargetType; target: TargetRecord }> {
  return [
    ...store.occurrences.filter((target) => occurrenceHasApprovedIssue(store, target, issueId) && !isSourceOnlyOccurrence(store, target)).map((target) => ({ targetType: "occurrence" as const, target })),
    ...store.continuousPresences.filter((target) => target.issueId === issueId).map((target) => ({ targetType: "continuous_presence" as const, target }))
  ];
}

const koreaUtcOffsetMs = 9 * 60 * 60 * 1000;

export function koreaRecentCalendarCutoff(now = new Date()): Date {
  const koreaNow = new Date(now.getTime() + koreaUtcOffsetMs);
  return new Date(Date.UTC(koreaNow.getUTCFullYear(), koreaNow.getUTCMonth(), koreaNow.getUTCDate() - 6) - koreaUtcOffsetMs);
}

export function isOccurrenceWithinPublicDiscoveryWindow(occurrence: Occurrence, now = new Date()): boolean {
  const lastScheduledAt = occurrence.endsAt ?? occurrence.startsAt;
  if (!lastScheduledAt) return !["ENDED", "ARCHIVED", "CANCELED"].includes(occurrence.lifecycleState);
  if (lastScheduledAt.getTime() >= now.getTime()) return true;
  return lastScheduledAt.getTime() >= koreaRecentCalendarCutoff(now).getTime();
}

function publicIssueTargetsWithinDiscoveryWindow(store: Store, issueId: string, now = new Date()): Array<{ targetType: TargetType; target: TargetRecord }> {
  return issueTargets(store, issueId).filter(({ targetType, target }) => targetType === "occurrence"
    ? isOccurrenceWithinPublicDiscoveryWindow(target as Occurrence, now)
    : isContinuousPresenceWithinPublicDiscoveryWindow(target as ContinuousPresence, now));
}

function isContinuousPresenceWithinPublicDiscoveryWindow(presence: ContinuousPresence, now = new Date()): boolean {
  if (presence.state !== "ENDED" && presence.state !== "ARCHIVED") return true;
  const lastObservedAt = presence.lastProofOfPresenceAt ?? presence.firstProofOfPresenceAt;
  return Boolean(lastObservedAt && lastObservedAt.getTime() >= koreaRecentCalendarCutoff(now).getTime());
}

function homeCardOrderScore(card: { lifecycleState: string; targetType: string; priorityScore: number }) {
  const stateRank: Record<string, number> = {
    LIVE: 0,
    UPCOMING: 0,
    STARTING_SOON: 1,
    ONGOING_SERIES: 1,
    UNKNOWN: 2,
    PAUSED: 3,
    MOVING: 3,
    ENDING_SOON: 3,
    ENDED: 8,
    ARCHIVED: 9,
    CANCELED: 10,
    POSTPONED: 10
  };
  const typeNudge = card.targetType === "occurrence" ? 0 : 8;
  return (stateRank[card.lifecycleState] ?? 5) * 100 + typeNudge - card.priorityScore;
}

function presenceStateLabel(state: ContinuousPresence["state"]): string {
  return {
    ONGOING: "장기 진행 중",
    PAUSED: "일시 중단",
    ENDING_SOON: "종료 임박",
    ENDED: "종료",
    ARCHIVED: "기록"
  }[state];
}

function findOccurrence(store: Store, id: string): Occurrence | undefined {
  return store.occurrences.find((item) => item.id === id);
}

function findAreaCluster(store: Store, id: string): AreaCluster | undefined {
  return store.areaClusters.find((item) => item.id === id);
}

function getIssue(store: Store, id: string | undefined, now = new Date()): ApiResponse {
  const issue = store.issues.find((item) => item.id === id);
  if (!issue || !isPublicTopicIssue(issue)) return json(404, { error: "issue_not_found" });
  const targets = publicIssueTargetsWithinDiscoveryWindow(store, issue.id, now);
  const estimates = crowdEstimatesForIssue(store, issue.id);
  const occurrenceDigests = targets.map(({ targetType, target }) => toOccurrenceDigest(store, targetType as Extract<TargetType, "occurrence" | "continuous_presence">, target.id));
  const cards = homeCards(store, now);
  const summaryCard = issueCards(store, cards).find((item) => item.id === issue.id);
  const relatedLawGroups = approvedIssueLawGroupLinks(store)
    .filter((link) => link.issueId === issue.id)
    .map((link) => store.lawGroups.find((group) => group.id === link.lawGroupId))
    .filter((group): group is LawGroup => Boolean(group))
    .map((group) => toLawGroupCard(store, group));
  return json(200, {
    issue: toPublicIssue(issue),
    issueOverview: summaryCard ? toIssueOverview(store, summaryCard, cards) : undefined,
    nationalSummary: issueNationalSummary(store, issue.id),
    topicGrouping: issueTopicGrouping(store, issue),
    regionalSignals: issueRegionalSignals(store, issue.id),
    nationalTimeline: issueNationalTimeline(store, issue.id),
    crowdEstimates: estimates.map(toPublicCrowdEstimate),
    regionalCrowdEstimates: regionalCrowdEstimatesForIssue(store, issue.id),
    verificationSignals: issueVerificationSignals(store, issue.id),
    claims: publicClaimsForTarget(store, "issue", issue.id).map(toPublicClaim),
    newsArticles: publicNewsArticlesForIssue(store, issue.id),
    relatedLawGroups,
    targets: targets.map(({ targetType, target }) => ({
      targetType,
      item: toPublicTarget(targetType, target, publicClaimsForTarget(store, targetType, target.id))
    })),
    occurrences: store.occurrences
      .filter((occurrence) => occurrenceHasApprovedIssue(store, occurrence, issue.id) && !isSourceOnlyOccurrence(store, occurrence) && isOccurrenceWithinPublicDiscoveryWindow(occurrence, now))
      .map((occurrence) => toPublicOccurrence(occurrence, publicClaimsForTarget(store, "occurrence", occurrence.id))),
    occurrenceDigests
  });
}

function issueTopicGrouping(store: Store, issue: Issue) {
  const targets = issueTargets(store, issue.id);
  const claims = issueClaims(store, issue.id, targets);
  const regions = uniqueSorted(targets.map(({ targetType, target }) => targetRegionLabel(store, targetType, target)).filter((value): value is string => Boolean(value)));
  const days = uniqueSorted(targets.map(({ target }) => targetFirstSeenAt(target) ?? targetUpdatedAt(target)).filter((value): value is Date => value instanceof Date).map((date) => date.toISOString().slice(0, 10)));
  const targetTypes = countLabels(targets.map(({ targetType }) => issueTargetTypeLabel(targetType)));
  const sourceSummary = sourceSummaryForClaims(claims);
  const synthesis = store.issueSynthesisSnapshots.find((item) => item.issueId === issue.id);
  return {
    topicTitle: issue.title,
    synthesisBasis: issue.synthesisBasis ?? "explicit",
    topicTags: issue.topicTags,
    normalizedTopicKey: issue.normalizedTopicKey,
    regions,
    days,
    targetTypes,
    sourceSummary,
    synthesis: synthesis ? {
      version: synthesis.version,
      method: synthesis.method,
      neutralSummary: synthesis.neutralSummary,
      generatedAt: synthesis.generatedAt.toISOString(),
      windowStartedAt: synthesis.windowStartedAt.toISOString(),
      windowEndedAt: synthesis.windowEndedAt.toISOString(),
      evidenceCount: synthesis.evidenceCount,
      publisherCount: synthesis.publisherCount,
      claimIds: synthesis.claimIds,
      evidenceIds: synthesis.evidenceIds,
      facets: synthesis.facets
    } : undefined,
    basis: [
      ...(issue.synthesisBasis === "evidence_aggregate" ? ["공개 Claim·Evidence 여러 건에서 공통 쟁점을 추출해 만든 주제"] : []),
      issue.topicTags.length ? `공통 주제어: ${issue.topicTags.slice(0, 4).join(" · ")}` : "공통 주제어 확인 중",
      targets.length ? `${regions.length || 0}개 권역의 ${targets.length}개 현장을 같은 주제로 탐색` : "개별 현장은 해당 이벤트의 근거가 같은 주제를 가리킬 때만 연결",
      `${claims.length}건의 공개 주장과 ${sourceSummary.official}건의 공식 자료를 함께 확인`,
      "지역·시간이 다르면 별도 현장으로 유지"
    ],
    policy: "이 묶음은 탐색 단위이며 사실 확정이 아닙니다."
  };
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ko-KR"));
}

function countLabels(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function issueTargetTypeLabel(targetType: TargetType): string {
  return (
    {
      issue: "이슈",
      occurrence: "집회 현장",
      continuous_presence: "장기 현장"
    } as const
  )[targetType];
}

function issueNationalSummary(store: Store, issueId: string) {
  const targets = issueTargets(store, issueId);
  const targetClaims = targets.flatMap(({ targetType, target }) => publicClaimsForTarget(store, targetType, target.id));
  const issueClaims = publicClaimsForTarget(store, "issue", issueId);
  const claims = [...issueClaims, ...targetClaims];
  const regions = new Set(targets.map(({ targetType, target }) => targetRegionLabel(store, targetType, target)).filter(Boolean));
  const currentTargetCount = targets.filter(({ target }) => !["ARCHIVED", "ENDED", "CANCELED", "POSTPONED"].includes(targetLifecycle(target))).length;
  const latestEstimate = crowdEstimatesForIssue(store, issueId)[0];
  return {
    regionCount: regions.size,
    targetCount: targets.length,
    currentTargetCount,
    publicClaimCount: claims.length,
    officialClaimCount: claims.filter((claim) => claim.sourceProvenance === "government_or_police").length,
    fieldClaimCount: claims.filter(isFieldSource).length,
    liveClaimCount: claims.filter((claim) => hasPublicLiveEvidence(store, claim)).length,
    needsVerificationCount: targets.filter(({ targetType, target }) => publicClaimsForTarget(store, targetType, target.id).length === 0 || targetLifecycle(target) === "UNKNOWN").length,
    disputeCount: claims.filter(isDisputeSource).length,
    latestUpdatedAt: latestDate([...claims.map((claim) => claim.createdAt), ...targets.map(({ target }) => targetUpdatedAt(target))])?.toISOString(),
    estimateRange: latestEstimate ? { minCount: latestEstimate.minCount, maxCount: latestEstimate.maxCount, confidence: latestEstimate.confidence } : undefined
  };
}

function issueRegionalSignals(store: Store, issueId: string) {
  const byRegion = new Map<string, ReturnType<typeof emptyRegionalSignal>>();
  for (const { targetType, target } of issueTargets(store, issueId)) {
    const region = targetRegionLabel(store, targetType, target) || "지역 확인 중";
    const signal = byRegion.get(region) ?? emptyRegionalSignal(region);
    byRegion.set(region, signal);
    const claims = publicClaimsForTarget(store, targetType, target.id);
    signal.targetCount += 1;
    if (!["ARCHIVED", "ENDED", "CANCELED", "POSTPONED"].includes(targetLifecycle(target))) signal.currentTargetCount += 1;
    signal.publicClaimCount += claims.length;
    signal.officialClaimCount += claims.filter((claim) => claim.sourceProvenance === "government_or_police").length;
    signal.fieldClaimCount += claims.filter(isFieldSource).length;
    signal.liveClaimCount += claims.filter((claim) => hasPublicLiveEvidence(store, claim)).length;
    signal.disputeCount += claims.filter(isDisputeSource).length;
    if (!claims.length || targetLifecycle(target) === "UNKNOWN") signal.needsVerificationCount += 1;
    const updatedAt = latestDate([signal.latestUpdatedAt ? new Date(signal.latestUpdatedAt) : undefined, targetUpdatedAt(target), ...claims.map((claim) => claim.createdAt)]);
    signal.latestUpdatedAt = updatedAt?.toISOString();
  }
  return [...byRegion.values()]
    .map((signal) => ({ ...signal, statusLabels: regionalSignalStatusLabels(signal) }))
    .sort((a, b) => b.currentTargetCount - a.currentTargetCount || b.liveClaimCount - a.liveClaimCount || a.regionLabel.localeCompare(b.regionLabel));
}

function emptyRegionalSignal(regionLabel: string) {
  return {
    regionLabel,
    targetCount: 0,
    currentTargetCount: 0,
    publicClaimCount: 0,
    officialClaimCount: 0,
    fieldClaimCount: 0,
    liveClaimCount: 0,
    needsVerificationCount: 0,
    disputeCount: 0,
    latestUpdatedAt: undefined as string | undefined,
    statusLabels: [] as string[]
  };
}

function regionalSignalStatusLabels(signal: ReturnType<typeof emptyRegionalSignal>): string[] {
  return [
    signal.officialClaimCount ? `공식 ${signal.officialClaimCount}건` : "공식 자료 없음",
    signal.liveClaimCount ? `현장 영상 ${signal.liveClaimCount}건` : signal.fieldClaimCount ? `현장 자료 ${signal.fieldClaimCount}건` : "현장 자료 없음",
    signal.disputeCount ? `이견 ${signal.disputeCount}건` : "이견 없음",
    signal.needsVerificationCount ? `더 확인 필요 ${signal.needsVerificationCount}건` : "확인 신호 충분"
  ];
}

function issueNationalTimeline(store: Store, issueId: string) {
  const moments = issueTargets(store, issueId).flatMap(({ targetType, target }) => {
    const claims = publicClaimsForTarget(store, targetType, target.id);
    const evidence = publicEvidenceForClaims(store, claims);
    const regionLabel = targetRegionLabel(store, targetType, target) || "지역 확인 중";
    const firstAt = earliestDate([targetFirstSeenAt(target), ...claims.map((claim) => claim.createdAt), ...evidence.map((item) => item.capturedAt ?? item.uploadedAt)]);
    return [
      ...(firstAt
        ? [
            {
              id: `first_${targetType}_${target.id}`,
              kind: "region_first_seen",
              regionLabel,
              targetType,
              targetId: target.id,
              at: firstAt.toISOString(),
              title: `${regionLabel} 첫 확인`,
              body: `${targetTitle(targetType, target)} 기준 첫 공개 신호입니다.`
            }
          ]
        : []),
      ...claims.map((claim) => {
        const live = publicEvidenceForClaims(store, [claim]).some(hasPublishableLiveEvidence);
        return {
          id: claim.id,
          kind: live ? "live_claim" : claim.sourceProvenance === "government_or_police" ? "official_claim" : isDisputeSource(claim) ? "dispute_claim" : "claim",
          regionLabel,
          targetType,
          targetId: target.id,
          at: claim.createdAt.toISOString(),
          title: live ? `${regionLabel} 현장 영상` : `${regionLabel} ${claimKindLabel(claim)}`,
          body: claim.normalizedStatement,
          sourceProvenance: claim.sourceProvenance,
          evidenceStrength: claim.evidenceStrength,
          riskLevel: claim.riskLevel
        };
      })
    ];
  });
  const sorted = moments.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return { summary: timelineSummary(sorted), moments: sorted.slice(0, 16) };
}

function timelineSummary(moments: Array<{ kind: string; regionLabel: string; at: string }>) {
  const firstByRegion = new Map<string, Date>();
  for (const moment of moments.filter((item) => item.kind === "live_claim" || item.kind === "official_claim" || item.kind === "region_first_seen")) {
    const at = new Date(moment.at);
    const current = firstByRegion.get(moment.regionLabel);
    if (!current || at < current) firstByRegion.set(moment.regionLabel, at);
  }
  const times = [...firstByRegion.values()].sort((a, b) => a.getTime() - b.getTime());
  if (!times.length) return { pattern: "unknown", label: "시간축 확인 중", summary: "공개 자료가 쌓이면 지역별 첫 확인 시점을 비교합니다." };
  if (times.length === 1) return { pattern: "single_region", label: "단일 권역 확인", summary: `${[...firstByRegion.keys()][0]} 기준 공개 신호가 먼저 확인되었습니다.`, regionCount: 1 };
  const spanMinutes = Math.round((times[times.length - 1].getTime() - times[0].getTime()) / 60000);
  const pattern = spanMinutes <= 180 ? "simultaneous" : "sequential";
  return {
    pattern,
    label: pattern === "simultaneous" ? "동시다발 확인" : "순차 확산 확인",
    summary: `${firstByRegion.size}개 권역의 첫 공개 신호 간격은 약 ${spanMinutes}분입니다.`,
    regionCount: firstByRegion.size,
    spanMinutes
  };
}

function targetFirstSeenAt(target: TargetRecord): Date | undefined {
  if ("firstProofOfPresenceAt" in target) return target.firstProofOfPresenceAt;
  if ("startsAt" in target) return target.startsAt;
  return undefined;
}

function targetTitle(targetType: TargetType, target: TargetRecord): string {
  if ("title" in target && typeof target.title === "string") return target.title;
  if (targetType === "continuous_presence") return `${(target as ContinuousPresence).regionLabel} 장기 현장`;
  return "공개 대상";
}

function isDisputeSource(claim: Claim): boolean {
  return claim.sourceProvenance === "rebuttal" || claim.sourceProvenance === "rights_violation_report" || claim.disputedByClaimIds.length > 0;
}

function isFieldSource(claim: Claim): boolean {
  return claim.sourceProvenance === "verified_citizen_report" || claim.sourceProvenance === "material_report";
}

function claimKindLabel(claim: Claim): string {
  if (claim.sourceProvenance === "government_or_police") return "공식 자료";
  if (claim.sourceProvenance === "media_report") return "보도 자료";
  if (claim.sourceProvenance === "musunil_ai_estimate") return "AI 추정";
  if (isDisputeSource(claim)) return "반론·정정";
  return "공개 주장";
}

function crowdEstimatesForIssue(store: Store, issueId: string): CrowdEstimate[] {
  const targetIds = new Set(issueTargets(store, issueId).map(({ target }) => target.id));
  const derived = derivedCrowdEstimateForIssue(store, issueId);
  const stored = store.crowdEstimates
    .filter((estimate) => (estimate.targetType === "issue" && estimate.targetId === issueId) || targetIds.has(estimate.targetId))
    .filter((estimate) => crowdEstimateHasPublicBasis(store, estimate))
    .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());
  return derived ? [derived, ...stored] : stored;
}

function crowdEstimateHasPublicBasis(store: Store, estimate: CrowdEstimate): boolean {
  const targets =
    estimate.targetType === "issue"
      ? issueTargets(store, estimate.targetId)
      : targetRecord(store, estimate.targetType, estimate.targetId)
        ? [{ targetType: estimate.targetType, target: targetRecord(store, estimate.targetType, estimate.targetId)! }]
        : [];
  const claims = estimate.targetType === "issue" ? issueClaims(store, estimate.targetId, targets) : targets.flatMap(({ targetType, target }) => publicClaimsForTarget(store, targetType, target.id));
  return (
    publicEvidenceForClaims(store, claims).some(hasPublishableLiveEvidence)
  );
}

function derivedCrowdEstimateForIssue(store: Store, issueId: string): CrowdEstimate | undefined {
  const targets = issueTargets(store, issueId);
  const claims = issueClaims(store, issueId, targets);
  return derivedCrowdEstimateForScope(store, `derived_${issueId}_crowd_estimate`, issueId, targets, claims, [
    "자동 갱신 추정이며 참석 인원 확정치가 아닙니다.",
    publicEvidenceForClaims(store, claims).some((item) => item.evidenceType === "live_media")
      ? "현장 영상이 일부 지역에 편중될 수 있습니다."
      : "현장 영상이 부족해 공개 자료 기반으로만 계산했습니다."
  ]);
}

function regionalCrowdEstimatesForIssue(store: Store, issueId: string) {
  const byRegion = new Map<string, Array<{ targetType: TargetType; target: TargetRecord }>>();
  for (const item of issueTargets(store, issueId)) {
    const region = targetRegionLabel(store, item.targetType, item.target) || "지역 확인 중";
    byRegion.set(region, [...(byRegion.get(region) ?? []), item]);
  }
  return [...byRegion.entries()]
    .map(([regionLabel, targets]) => {
      const claims = targets.flatMap(({ targetType, target }) => publicClaimsForTarget(store, targetType, target.id));
      const estimate = derivedCrowdEstimateForScope(store, `derived_${issueId}_${regionLabel}_crowd_estimate`, issueId, targets, claims, [
        `${regionLabel} 권역 기준 자동 갱신 추정입니다.`,
        "지역별 현장 영상 분포에 따라 범위가 달라질 수 있습니다."
      ]);
      return estimate ? { regionLabel, ...toPublicCrowdEstimate(estimate) } : undefined;
    })
    .filter((estimate): estimate is NonNullable<typeof estimate> => Boolean(estimate))
    .sort((a, b) => b.maxCount - a.maxCount || a.regionLabel.localeCompare(b.regionLabel));
}

function derivedCrowdEstimateForScope(
  store: Store,
  id: string,
  issueId: string,
  targets: Array<{ targetType: TargetType; target: TargetRecord }>,
  claims: Claim[],
  limitations: string[]
): CrowdEstimate | undefined {
  if (!targets.length && !claims.length) return undefined;
  const evidence = publicEvidenceForClaims(store, claims);
  const liveEvidence = evidence.filter(hasPublishableLiveEvidence);
  if (!liveEvidence.length) return undefined;
  const currentTargetCount = targets.filter(({ target }) => !["ARCHIVED", "ENDED", "CANCELED", "POSTPONED"].includes(targetLifecycle(target))).length;
  const minCount = Math.max(liveEvidence.length, Math.round(liveEvidence.length * 120));
  const maxCount = Math.max(minCount + 120, Math.round(liveEvidence.length * 420 + currentTargetCount * 180));
  const observedAt = latestDate([...claims.map((claim) => claim.createdAt), ...evidence.map((item) => item.uploadedAt), ...targets.map(({ target }) => targetUpdatedAt(target))]) ?? new Date();
  const independentViewpointCount = new Set(liveEvidence.map((item) => item.geoCell ?? item.id)).size;
  const baseConfidence: CrowdEstimate["confidence"] =
    liveEvidence.length >= 12 && independentViewpointCount >= 4 ? "high" : liveEvidence.length >= 3 && independentViewpointCount >= 2 ? "medium" : "low";
  const qualityWarning =
    repeatedCount(liveEvidence.map((item) => item.hash).filter((value): value is string => typeof value === "string" && value.length > 0)) > 0 ||
    liveEvidence.some((item) => item.foregroundGps !== true || Number(item.gpsAccuracyM || 999) > 80 || item.deviceIntegrityStatus !== "pass");
  return {
    id,
    targetType: "issue",
    targetId: issueId,
    observedAt,
    minCount,
    maxCount,
    confidence: qualityWarning ? lowerCrowdConfidence(baseConfidence) : baseConfidence,
    method: "proof_of_presence_density",
    evidenceCount: evidence.length || claims.length,
    independentViewpointCount,
    limitations
  };
}

function lowerCrowdConfidence(confidence: CrowdEstimate["confidence"]): CrowdEstimate["confidence"] {
  return confidence === "high" ? "medium" : confidence === "medium" ? "low" : "low";
}

function issueClaims(store: Store, issueId: string, targets = issueTargets(store, issueId)): Claim[] {
  return [
    ...publicClaimsForTarget(store, "issue", issueId),
    ...targets.flatMap(({ targetType, target }) => publicClaimsForTarget(store, targetType, target.id))
  ];
}

function publicEvidenceForClaims(store: Store, claims: Claim[]): Evidence[] {
  const ids = new Set(claims.flatMap((claim) => claim.evidenceIds));
  return store.evidence.filter((item) => ids.has(item.id));
}

function issueVerificationSignals(store: Store, issueId: string) {
  const targets = issueTargets(store, issueId);
  const claims = issueClaims(store, issueId, targets);
  const evidence = publicEvidenceForClaims(store, claims);
  const proofEvidence = evidence.filter(
    (item) => hasPublishableLiveEvidence(item) || (item.evidenceType === "sensor" && item.proofOfPresenceStatus === "pass" && hasTrustedDeviceIntegrity(item))
  );
  const liveEvidence = evidence.filter(hasPublishableLiveEvidence);
  const regionalSignals = issueRegionalSignals(store, issueId);
  const duplicateHashes = repeatedCount(liveEvidence.map((item) => item.hash).filter((value): value is string => typeof value === "string" && value.length > 0));
  const duplicateDeviceBuckets = repeatedCount(proofEvidence.map((item) => item.deviceAttestationBucket).filter((value): value is string => typeof value === "string" && value.length > 0));
  const lowAccuracy = liveEvidence.filter((item) => item.foregroundGps !== true || Number(item.gpsAccuracyM || 999) > 80).length;
  const weakDeviceIntegrity = evidence.filter(
    (item) =>
      (item.evidenceType === "live_media" && item.proofOfPresenceStatus === "pass" && !hasPublishableLiveEvidence(item)) ||
      (item.evidenceType === "sensor" && item.proofOfPresenceStatus === "pass" && !hasTrustedDeviceIntegrity(item))
  ).length;
  const userConcentration = issueUserConcentration(store, claims);
  const signals: Array<{ id: string; severity: "low" | "medium" | "high"; label: string; summary: string; count?: number }> = [];
  const officialCount = claims.filter((claim) => claim.sourceProvenance === "government_or_police").length;
  const needsVerification = regionalSignals.reduce((sum, item) => sum + item.needsVerificationCount, 0);
  if (!officialCount) signals.push({ id: "official_absent", severity: "medium", label: "공식 자료 없음", summary: "현재 공개 화면은 현장·자료 Claim 중심입니다.", count: 0 });
  if (needsVerification) signals.push({ id: "needs_verification", severity: "medium", label: "추가 확인 필요", summary: "출처나 현장 자료가 부족한 관련 현장이 있습니다.", count: needsVerification });
  if (duplicateHashes) signals.push({ id: "duplicate_media_hash", severity: "high", label: "중복 영상 해시", summary: "같은 영상 해시가 여러 공개 자료에 반복되었습니다.", count: duplicateHashes });
  if (duplicateDeviceBuckets) signals.push({ id: "device_attestation_cluster", severity: "medium", label: "기기 군집", summary: "같은 기기 인증 묶음의 현장 자료가 반복되었습니다.", count: duplicateDeviceBuckets });
  if (weakDeviceIntegrity) signals.push({ id: "device_integrity", severity: "medium", label: "기기 무결성 확인", summary: "일부 현장 인증은 기기 무결성 상태를 다시 확인해야 합니다.", count: weakDeviceIntegrity });
  if (userConcentration) signals.push({ id: "user_concentration", severity: "medium", label: "사용자 편중", summary: "공개 자료 일부가 같은 제출자에 편중되어 있습니다.", count: userConcentration.maxCount });
  if (lowAccuracy) signals.push({ id: "gps_quality", severity: "medium", label: "GPS 품질 확인", summary: "일부 현장 인증은 위치 정확도 기준을 다시 확인해야 합니다.", count: lowAccuracy });
  const liveTotal = regionalSignals.reduce((sum, item) => sum + item.liveClaimCount, 0);
  const dominant = Math.max(0, ...regionalSignals.map((item) => item.liveClaimCount));
  if (liveTotal >= 4 && dominant / liveTotal > 0.75) signals.push({ id: "regional_concentration", severity: "low", label: "지역 편중", summary: "현장 영상이 특정 권역에 집중되어 있습니다.", count: dominant });
  return signals.length ? signals : [{ id: "no_unusual_signal", severity: "low", label: "특이 신호 없음", summary: "현재 공개 자료 기준으로 즉시 드러나는 반복·품질 신호는 없습니다." }];
}

function repeatedCount(values: string[]): number {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count, 0);
}

function issueUserConcentration(store: Store, claims: Claim[]): { maxCount: number; total: number } | undefined {
  const claimIds = new Set(claims.map((claim) => claim.id));
  const reports = store.reports.filter((report) => report.userId && claimIds.has(report.claimId));
  if (reports.length < 3) return undefined;
  const counts = new Map<string, number>();
  for (const report of reports) counts.set(report.userId as string, (counts.get(report.userId as string) || 0) + 1);
  const maxCount = Math.max(0, ...counts.values());
  return maxCount >= 2 && maxCount / reports.length >= 0.6 ? { maxCount, total: reports.length } : undefined;
}

function getOccurrence(store: Store, id: string | undefined): ApiResponse {
  const occurrence = store.occurrences.find((item) => item.id === id);
  if (!occurrence || isSourceOnlyOccurrence(store, occurrence)) return json(404, { error: "occurrence_not_found" });
  const claims = publicClaimsForTarget(store, "occurrence", occurrence.id);
  const evidenceIds = new Set(claims.flatMap((claim) => claim.evidenceIds));
  return json(200, {
    occurrence: toPublicOccurrence(occurrence, claims),
    occurrenceDigest: toOccurrenceDigest(store, "occurrence", occurrence.id),
    claims: claims.map(toPublicClaim),
    evidenceCount: evidenceIds.size
  });
}

function getTargetDetail(store: Store, targetTypeValue: string | undefined, id: string | undefined): ApiResponse {
  if (!targetTypeValue || !(targetTypes as readonly string[]).includes(targetTypeValue) || !id) return json(404, { error: "target_not_found" });
  const targetType = targetTypeValue as TargetType;
  const target = targetRecord(store, targetType, id);
  if (!target || (targetType === "occurrence" && isSourceOnlyOccurrence(store, target as Occurrence))) return json(404, { error: "target_not_found" });
  const claims = publicClaimsForTarget(store, targetType, id);
  const evidenceIds = new Set(claims.flatMap((claim) => claim.evidenceIds));
  return json(200, {
    target: toPublicTarget(targetType, target, claims),
    claims: claims.map(toPublicClaim),
    evidenceCount: evidenceIds.size
  });
}

function getTargetLiveClaims(store: Store, targetTypeValue: string | undefined, id: string | undefined): ApiResponse {
  if (!targetTypeValue || !(targetTypes as readonly string[]).includes(targetTypeValue) || !id) return json(404, { error: "target_not_found" });
  const targetType = targetTypeValue as TargetType;
  const target = targetRecord(store, targetType, id);
  if (!target || (targetType === "occurrence" && isSourceOnlyOccurrence(store, target as Occurrence))) return json(404, { error: "target_not_found" });
  const liveClaims = targetType === "issue" ? liveClaimsForIssue(store, id) : liveClaimsForTarget(store, targetType, id);
  return json(200, {
    targetType,
    targetId: id,
    liveClaims: liveClaims.map((claim) => toPublicLiveClaim(store, claim))
  });
}

function getReels(store: Store, seedValue: string | null, cursorValue: string | null): ApiResponse {
  const seed = normalizeReelSeed(seedValue);
  const cursor = normalizeReelCursor(cursorValue);
  const eligible = store.claims
    .filter((claim) => isPublicClaim(claim) && claim.targetType !== "issue" && hasPublicLiveEvidence(store, claim))
    .map((claim) => toEvidenceReel(store, claim))
    .filter((reel): reel is EvidenceReel => Boolean(reel));
  const ordered = fairEvidenceReelOrder(eligible, seed);
  const pageSize = 12;
  const reels = ordered.slice(cursor, cursor + pageSize);
  const bucketIds = new Set(eligible.map(reelBucketId));
  const nextCursor = cursor + reels.length < ordered.length ? cursor + reels.length : undefined;
  return json(200, {
    reels,
    seed,
    cursor,
    nextCursor,
    totalEligible: ordered.length,
    eligibleBucketCount: bucketIds.size,
    policy: "issue_occurrence_region_round_robin"
  });
}

function normalizeReelSeed(value: string | null): string {
  const cleaned = String(value ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 96);
  return cleaned || "public-reels";
}

function normalizeReelCursor(value: string | null): number {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100_000) : 0;
}

function fairEvidenceReelOrder(reels: EvidenceReel[], seed: string): EvidenceReel[] {
  const issueGroups = new Map<string, EvidenceReel[]>();
  for (const reel of reels) {
    const issueId = reel.issueId || "unlinked";
    const group = issueGroups.get(issueId) || [];
    group.push(reel);
    issueGroups.set(issueId, group);
  }
  const issueIds = [...issueGroups.keys()].sort((left, right) => stableSeedRank(seed, `issue:${left}`).localeCompare(stableSeedRank(seed, `issue:${right}`)) || left.localeCompare(right));
  const queues = new Map(issueIds.map((issueId) => [issueId, fairIssueReelOrder(issueGroups.get(issueId) || [], seed, issueId)]));
  const ordered: EvidenceReel[] = [];
  let lastIssueId: string | undefined;
  let startIndex = 0;

  while ([...queues.values()].some((queue) => queue.length > 0)) {
    const availableIssueIds = issueIds.filter((issueId) => (queues.get(issueId)?.length || 0) > 0);
    const preferred = availableIssueIds.filter((issueId) => issueId !== lastIssueId);
    const candidates = preferred.length > 0 ? preferred : availableIssueIds;
    const picked = candidates.find((issueId) => {
      const index = issueIds.indexOf(issueId);
      return index >= startIndex;
    }) || candidates[0];
    const queue = queues.get(picked);
    const reel = queue?.shift();
    if (!reel) break;
    ordered.push(reel);
    lastIssueId = picked;
    startIndex = (issueIds.indexOf(picked) + 1) % Math.max(issueIds.length, 1);
  }
  return ordered;
}

function fairIssueReelOrder(reels: EvidenceReel[], seed: string, issueId: string): EvidenceReel[] {
  const buckets = new Map<string, EvidenceReel[]>();
  for (const reel of reels) {
    const bucketId = reelBucketId(reel);
    const bucket = buckets.get(bucketId) || [];
    bucket.push(reel);
    buckets.set(bucketId, bucket);
  }
  const bucketIds = [...buckets.keys()].sort((left, right) => stableSeedRank(seed, `bucket:${left}`).localeCompare(stableSeedRank(seed, `bucket:${right}`)) || left.localeCompare(right));
  for (const bucketId of bucketIds) {
    buckets.get(bucketId)?.sort((left, right) => stableSeedRank(seed, `reel:${left.id}`).localeCompare(stableSeedRank(seed, `reel:${right.id}`)) || left.id.localeCompare(right.id));
  }
  const ordered: EvidenceReel[] = [];
  let startIndex = Number.parseInt(stableSeedRank(seed, `issue-start:${issueId}`).slice(0, 4), 16) % Math.max(bucketIds.length, 1);
  while ([...buckets.values()].some((bucket) => bucket.length > 0)) {
    for (let offset = 0; offset < bucketIds.length; offset += 1) {
      const bucketId = bucketIds[(startIndex + offset) % bucketIds.length];
      const reel = buckets.get(bucketId)?.shift();
      if (reel) ordered.push(reel);
    }
    startIndex = (startIndex + 1) % Math.max(bucketIds.length, 1);
  }
  return ordered;
}

function reelBucketId(reel: EvidenceReel): string {
  return `${reel.issueId || "unlinked"}:${reel.regionLabel}:${reel.occurrenceId}`;
}

function stableSeedRank(seed: string, value: string): string {
  return createHash("sha256").update(`${seed}:${value}`).digest("hex");
}

function getTargetById(store: Store, targetType: TargetType, id: string | undefined, error: string): ApiResponse {
  if (!id) return json(404, { error });
  const item = targetRecord(store, targetType, id);
  if (!item) return json(404, { error });
  const claims = publicClaimsForTarget(store, targetType, id);
  return json(200, {
    item: toPublicTarget(targetType, item, claims),
    occurrenceDigest: targetType === "continuous_presence" ? toOccurrenceDigest(store, targetType, id) : undefined,
    claims: claims.map(toPublicClaim),
    evidenceCount: publicCounts(claims).evidenceCount
  });
}

function getMap(store: Store, now = new Date()): ApiResponse {
  const units = mapOccurrenceUnits(store, now);
  const pins = units
    .filter((unit) => unit.publicLocation)
    .map((unit, index) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [unit.publicLocation!.lng, unit.publicLocation!.lat] },
      properties: {
        id: `pin_${unit.targetType}_${unit.id}`,
        occurrenceUnitId: unit.id,
        targetType: unit.targetType,
        targetId: unit.id,
        issueId: unit.issueId,
        title: unit.title,
        regionLabel: unit.regionLabel,
        lifecycleState: unit.lifecycleState,
        sequence: index + 1,
        locationLabel: unit.publicLocation!.label,
        locationPrecision: unit.publicLocation!.precision,
        locationStatus: unit.locationStatus,
        locationStatusLabel: locationStatusLabel(unit.locationStatus),
        publicRadiusM: unit.publicLocation!.publicRadiusM ?? 300,
        uncertaintyRadiusM: unit.publicLocation!.uncertaintyRadiusM,
        fieldEvidenceCount: unit.publicLocation!.fieldEvidenceCount ?? 0,
        source: unit.locationStatus === "CORRECTED" || unit.locationStatus === "FIELD_CORROBORATED"
          ? "proof_of_presence_location"
          : unit.locationStatus === "LOCATION_DISPUTED"
            ? "location_disputed"
            : "public_source_location"
      }
    }));
  const presenceAreas = units
    .map((unit) => presenceAreaFeatureForUnit(store, unit))
    .filter((feature): feature is NonNullable<typeof feature> => Boolean(feature));
  return json(200, {
    issues: issueCards(store, homeCards(store)).map((issue) => ({
      id: issue.id,
      title: issue.title,
      status: issue.status,
      regionCount: issue.regionCount,
      targetCount: issue.targetCount,
      currentCount: issue.currentCount
    })),
    occurrenceUnits: units.map((unit) => ({
      id: unit.id,
      targetType: unit.targetType,
      issueId: unit.issueId,
      title: unit.title,
      regionLabel: unit.regionLabel,
      lifecycleState: unit.lifecycleState,
      locationStatus: unit.locationStatus,
      locationStatusLabel: locationStatusLabel(unit.locationStatus),
      hasSourcePin: Boolean(unit.publicLocation),
      hasPresenceArea: presenceAreas.some((feature) => feature.properties.occurrenceUnitId === unit.id),
      liveEvidenceCount: publicLiveEvidenceForUnit(store, unit).length,
      updatedAt: unit.updatedAt?.toISOString()
    })),
    occurrenceDigests: units.map((unit) => toOccurrenceDigest(store, unit.targetType, unit.id)),
    geojson: {
      pins: { type: "FeatureCollection", features: pins },
      presenceAreas: { type: "FeatureCollection", features: presenceAreas }
    }
  });
}

type MapOccurrenceUnit = {
  id: string;
  targetType: Extract<TargetType, "occurrence" | "continuous_presence">;
  issueId?: string;
  title: string;
  regionLabel: string;
  lifecycleState: string;
  publicLocation?: NonNullable<Occurrence["publicLocation"]>;
  locationStatus?: LocationResolutionStatus;
  updatedAt?: Date;
};

function mapOccurrenceUnits(store: Store, now = new Date()): MapOccurrenceUnit[] {
  return [
    ...store.occurrences.filter((item) => !isSourceOnlyOccurrence(store, item) && isOccurrenceWithinPublicDiscoveryWindow(item, now)).map((item) => ({
      id: item.id,
      targetType: "occurrence" as const,
      issueId: item.issueId,
      title: item.title,
      regionLabel: item.regionLabel,
      lifecycleState: item.lifecycleState,
      publicLocation: item.publicLocation,
      locationStatus: item.locationStatus ?? item.publicLocation?.status,
      updatedAt: item.startsAt
    })),
    ...store.continuousPresences.filter((item) => isContinuousPresenceWithinPublicDiscoveryWindow(item, now)).map((item) => ({
      id: item.id,
      targetType: "continuous_presence" as const,
      issueId: item.issueId,
      title: `${item.regionLabel} 장기 현장`,
      regionLabel: item.regionLabel,
      lifecycleState: item.state,
      publicLocation: item.publicLocation,
      locationStatus: item.publicLocation?.status ?? (item.publicLocation ? "SOURCE_GEOCODED" : undefined),
      updatedAt: item.lastProofOfPresenceAt ?? item.firstProofOfPresenceAt
    }))
  ];
}

function publicLiveEvidenceForUnit(store: Store, unit: MapOccurrenceUnit): Evidence[] {
  const claims = publicClaimsForTarget(store, unit.targetType, unit.id);
  return publicEvidenceForClaims(store, claims).filter((item) => hasPublishableLiveEvidence(item) && typeof item.privateLng === "number" && typeof item.privateLat === "number");
}

function trustedIndependentLocationEvidence(
  store: Store,
  targetType: Extract<TargetType, "occurrence" | "continuous_presence">,
  targetId: string
): LocationEvidencePoint[] {
  const candidates = publicClaimsForTarget(store, targetType, targetId).flatMap((claim) => {
    const report = store.reports.find((item) => item.claimId === claim.id && item.userId);
    const reportUserId = report?.userId;
    if (!reportUserId) return [];
    return claim.evidenceIds.flatMap((evidenceId) => {
      const evidence = store.evidence.find((item) => item.id === evidenceId);
      const trusted = hasPublishableLiveEvidence(evidence) || (
        evidence?.evidenceType === "sensor" &&
        evidence.proofOfPresenceStatus === "pass" &&
        hasTrustedDeviceIntegrity(evidence)
      );
      const deviceBucket = evidence?.deviceAttestationBucket;
      if (!trusted || evidence.foregroundGps !== true || !deviceBucket) return [];
      if (typeof evidence.privateLng !== "number" || typeof evidence.privateLat !== "number") return [];
      const gpsAccuracyM = evidence.gpsAccuracyM ?? 999;
      if (gpsAccuracyM <= 0 || gpsAccuracyM > 100) return [];
      return [{
        userId: reportUserId,
        deviceBucket,
        point: {
          evidenceId: evidence.id,
          lng: evidence.privateLng,
          lat: evidence.privateLat,
          gpsAccuracyM,
          capturedAt: evidence.capturedAt ?? evidence.uploadedAt
        }
      }];
    });
  }).sort((left, right) => right.point.capturedAt.getTime() - left.point.capturedAt.getTime());

  const userIds = new Set<string>();
  const deviceBuckets = new Set<string>();
  const independent: LocationEvidencePoint[] = [];
  for (const candidate of candidates) {
    if (userIds.has(candidate.userId) || deviceBuckets.has(candidate.deviceBucket)) continue;
    userIds.add(candidate.userId);
    deviceBuckets.add(candidate.deviceBucket);
    independent.push(candidate.point);
  }
  return independent;
}

function reconcileOccurrencePublicLocation(store: Store, targetType: TargetType, targetId: string): void {
  if (targetType !== "occurrence") return;
  const occurrence = store.occurrences.find((item) => item.id === targetId);
  if (!occurrence) return;
  if (!occurrence.sourcePublicLocation && occurrence.publicLocation && occurrence.publicLocation.source !== "field_evidence") {
    occurrence.sourcePublicLocation = {
      ...occurrence.publicLocation,
      status: "SOURCE_GEOCODED",
      fieldEvidenceCount: 0
    };
  }
  const points = trustedIndependentLocationEvidence(store, "occurrence", targetId);
  const previousStatus = occurrence.locationStatus ?? occurrence.publicLocation?.status ?? (occurrence.publicLocation ? "SOURCE_GEOCODED" : "TEXT_ONLY");
  const previousLocation = occurrence.publicLocation;
  const decision = reconcileLocationFromFieldEvidence(
    previousLocation,
    occurrence.sourcePublicLocation,
    points,
    occurrence.locationText ?? occurrence.publicLocation?.label ?? occurrence.regionLabel
  );
  occurrence.locationStatus = decision.status;
  occurrence.publicLocation = decision.location;
  if (previousStatus === decision.status && samePublicCoordinate(previousLocation, decision.location)) return;
  const action: AuditLog["action"] = decision.status === "CORRECTED" ? "correction" : "state_change";
  audit(store, action, "occurrence", occurrence.id, decision.reason);
}

function samePublicCoordinate(left: Occurrence["publicLocation"], right: Occurrence["publicLocation"]): boolean {
  return left?.lng === right?.lng && left?.lat === right?.lat && left?.label === right?.label && left?.fieldEvidenceCount === right?.fieldEvidenceCount;
}

function presenceAreaFeatureForUnit(store: Store, unit: MapOccurrenceUnit) {
  const evidence = publicLiveEvidenceForUnit(store, unit);
  if (!evidence.length) return undefined;
  const points = evidence.map((item) => ({
    lng: item.privateLng as number,
    lat: item.privateLat as number,
    radiusM: Math.max(200, Math.min(300, item.publicRadiusM ?? 200, Math.max(100, item.gpsAccuracyM ?? 100)))
  }));
  const coordinates = presenceAreaCoordinates(points);
  if (!coordinates.length) return undefined;
  const radiusM = Math.max(...points.map((point) => point.radiusM));
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coordinates] },
    properties: {
      id: `presence_area_${unit.targetType}_${unit.id}`,
      occurrenceUnitId: unit.id,
      targetType: unit.targetType,
      targetId: unit.id,
      issueId: unit.issueId,
      title: unit.title,
      regionLabel: unit.regionLabel,
      evidenceCount: evidence.length,
      publicRadiusM: radiusM,
      source: "proof_of_presence_area"
    }
  };
}

function presenceAreaCoordinates(points: Array<{ lng: number; lat: number; radiusM: number }>): number[][] {
  const radiusM = Math.max(200, ...points.map((point) => point.radiusM));
  if (points.length === 1) {
    const blurred = blurLngLat(points[0].lng, points[0].lat, radiusM);
    return circlePolygon(blurred.lng, blurred.lat, radiusM, 40);
  }

  const center = averagePoint(points);
  const projected = points.map((point) => {
    const blurred = blurLngLat(point.lng, point.lat, radiusM);
    return lngLatToMeters(blurred.lng, blurred.lat, center);
  });
  if (projected.length === 2) return capsulePolygon(projected[0], projected[1], radiusM, center);
  const hull = convexHull(projected);
  if (hull.length < 3) return circlePolygon(center.lng, center.lat, radiusM, 40);
  const centroid = hull.reduce((sum, point) => ({ x: sum.x + point.x / hull.length, y: sum.y + point.y / hull.length }), { x: 0, y: 0 });
  const expanded = hull.map((point) => {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    return { x: point.x + (dx / length) * radiusM, y: point.y + (dy / length) * radiusM };
  });
  const closed = [...expanded, expanded[0]].map((point) => metersToLngLat(point, center));
  return closed.map((point) => [roundCoord(point.lng), roundCoord(point.lat)]);
}

function averagePoint(points: Array<{ lng: number; lat: number }>): { lng: number; lat: number } {
  return {
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length
  };
}

function blurLngLat(lng: number, lat: number, radiusM: number): { lng: number; lat: number } {
  const gridM = Math.max(100, Math.min(300, radiusM));
  const latStep = gridM / 110_540;
  const lngStep = gridM / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return {
    lng: roundCoord(Math.round(lng / lngStep) * lngStep),
    lat: roundCoord(Math.round(lat / latStep) * latStep)
  };
}

function circlePolygon(lng: number, lat: number, radiusM: number, steps: number): number[][] {
  const center = { lng, lat };
  const coordinates = Array.from({ length: steps }, (_, index) => {
    const angle = (Math.PI * 2 * index) / steps;
    return metersToLngLat({ x: Math.cos(angle) * radiusM, y: Math.sin(angle) * radiusM }, center);
  });
  coordinates.push(coordinates[0]);
  return coordinates.map((point) => [roundCoord(point.lng), roundCoord(point.lat)]);
}

function capsulePolygon(a: { x: number; y: number }, b: { x: number; y: number }, radiusM: number, origin: { lng: number; lat: number }): number[][] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 12; i += 1) {
    const theta = angle - Math.PI / 2 + (Math.PI * i) / 12;
    points.push({ x: b.x + Math.cos(theta) * radiusM, y: b.y + Math.sin(theta) * radiusM });
  }
  for (let i = 0; i <= 12; i += 1) {
    const theta = angle + Math.PI / 2 + (Math.PI * i) / 12;
    points.push({ x: a.x + Math.cos(theta) * radiusM, y: a.y + Math.sin(theta) * radiusM });
  }
  points.push(points[0]);
  return points.map((point) => {
    const lngLat = metersToLngLat(point, origin);
    return [roundCoord(lngLat.lng), roundCoord(lngLat.lat)];
  });
}

function convexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (origin: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
  const lower: Array<{ x: number; y: number }> = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Array<{ x: number; y: number }> = [];
  for (const point of sorted.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function lngLatToMeters(lng: number, lat: number, origin: { lng: number; lat: number }): { x: number; y: number } {
  const latScale = 110_540;
  const lngScale = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  return { x: (lng - origin.lng) * lngScale, y: (lat - origin.lat) * latScale };
}

function metersToLngLat(point: { x: number; y: number }, origin: { lng: number; lat: number }): { lng: number; lat: number } {
  const latScale = 110_540;
  const lngScale = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  return { lng: origin.lng + point.x / lngScale, lat: origin.lat + point.y / latScale };
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function getLaws(store: Store, sort: "interest" | "proposed_desc" = "interest"): ApiResponse {
  const laws = lawCards(store, sort);
  const lawGroups = lawGroupCards(store, sort);
  return json(200, {
    laws,
    lawInterestItems: laws.map((law) => toLawInterestItem(store, law)),
    lawGroups,
    // One-release compatibility alias for clients that still render topic.label/representativeKeywords.
    lawTopics: lawGroups.map(toLegacyLawTopicCard),
    sort
  });
}

function getLawGroup(store: Store, id: string | undefined, legacyRoute = false, search = new URLSearchParams()): ApiResponse {
  const resolvedId = id ? store.legacyLawTopicAliases[id] ?? id : undefined;
  const group = store.lawGroups.find((item) => item.id === resolvedId);
  if (!group) return json(404, { error: legacyRoute ? "law_topic_not_found" : "law_group_not_found" });
  const requestedTopic = search.get("coreTopic") ?? undefined;
  const pageSize = Math.max(1, Math.min(30, Number(search.get("pageSize") || 15)));
  const page = Math.max(1, Number(search.get("page") || 1));
  const matchingBillIds = requestedTopic
    ? group.billIds.filter((lawId) => store.lawGroupMemberships.some((membership) => membership.lawItemId === lawId && membership.coreTopicKey === requestedTopic))
    : group.billIds;
  const allBills = matchingBillIds
    .map((lawId) => store.lawItems.find((law) => law.id === lawId))
    .filter((law): law is LawItem => Boolean(law))
    .map((law) => toLawInterestItem(store, toPublicLawItem(store, law)))
    .sort((left, right) => new Date(right.proposedDate || right.statusDate || 0).getTime() - new Date(left.proposedDate || left.statusDate || 0).getTime());
  const bills = allBills.slice((page - 1) * pageSize, page * pageSize);
  const links = approvedIssueLawGroupLinks(store).filter((link) => link.lawGroupId === group.id);
  const issueIds = new Set(links.map((link) => link.issueId));
  const cards = homeCards(store);
  const overviewCards = new Map(issueCards(store, cards).map((issue) => [issue.id, issue]));
  const issues = store.issues.filter((issue) => issueIds.has(issue.id)).map((issue) => {
    const overviewCard = overviewCards.get(issue.id);
    const overview: IssueOverview = overviewCard ? toIssueOverview(store, overviewCard, cards) : {
      id: issue.id,
      title: issue.title,
      status: issue.status,
      lifecycleState: issue.status === "archived" ? "ARCHIVED" : "UNKNOWN",
      regionCount: 0,
      occurrenceCount: 0,
      officialClaimCount: 0,
      publicVideoCount: 0,
      disputeCount: 0,
      latestUpdatedAt: issue.lastUpdatedAt.toISOString()
    };
    const newsArticles = publicNewsArticlesForIssue(store, issue.id, group.id);
    return { ...overview, newsCount: newsArticles.length, recentNews: newsArticles.slice(0, 3) };
  });
  const card = toLawGroupCard(store, group);
  return json(200, {
    group: card,
    topic: toLegacyLawTopicCard(card),
    bills,
    pagination: { page, pageSize, total: allBills.length, pageCount: Math.max(1, Math.ceil(allBills.length / pageSize)) },
    selectedCoreTopicKey: requestedTopic,
    issueLinks: links.map(toPublicIssueLawGroupLink),
    issues
  });
}

function toLegacyLawTopicCard(group: LawGroupCard) {
  return {
    ...group,
    label: group.billTitle,
    representativeKeywords: group.coreTopics.slice(0, 3).map((topic) => topic.label)
  };
}

function lawGroupCards(store: Store, sort: "interest" | "proposed_desc"): LawGroupCard[] {
  return store.lawGroups.map((group) => toLawGroupCard(store, group)).sort((left, right) => sort === "proposed_desc"
    ? new Date(right.latestProposedDate || 0).getTime() - new Date(left.latestProposedDate || 0).getTime() || left.billTitle.localeCompare(right.billTitle, "ko")
    : right.interestScore - left.interestScore || new Date(right.latestProposedDate || 0).getTime() - new Date(left.latestProposedDate || 0).getTime());
}

function toLawGroupCard(store: Store, group: LawGroup): LawGroupCard {
  const laws = group.billIds.map((id) => store.lawItems.find((law) => law.id === id)).filter((law): law is LawItem => Boolean(law));
  const links = approvedIssueLawGroupLinks(store).filter((link) => link.lawGroupId === group.id && store.issues.some((issue) => issue.id === link.issueId));
  const issueIds = new Set(links.map((link) => link.issueId));
  const relatedTargets = new Map<string, ReturnType<typeof issueTargets>[number]>();
  for (const issueId of issueIds) {
    for (const related of issueTargets(store, issueId)) relatedTargets.set(`${related.targetType}:${related.target.id}`, related);
  }
  const regions = new Set([...relatedTargets.values()].map(({ target }) => publicTargetRegionLabel(target)).filter(Boolean));
  const claims = publicClaimsForIssueIds(store, issueIds);
  const nonMediaClaims = claims.filter((claim) => claim.sourceProvenance !== "media_report");
  const nonMediaIssueCount = [...issueIds].filter((issueId) => issueTargets(store, issueId).length > 0 || publicClaimsForTarget(store, "issue", issueId).some((claim) => claim.sourceProvenance !== "media_report")).length;
  const stageCounts: Record<string, number> = {};
  for (const law of laws) stageCounts[law.stage] = (stageCounts[law.stage] ?? 0) + 1;
  const latestProposedDate = latestDate(laws.map((law) => law.proposedDate))?.toISOString();
  const relatedIssueActivityScore = relatedTargets.size * 25 + regions.size * 20 + nonMediaClaims.length * 8 + nonMediaIssueCount * 5;
  return {
    id: group.id,
    lawName: group.lawName,
    billTitle: group.billTitle,
    coreTopics: group.coreTopics,
    billCount: laws.length,
    latestProposedDate,
    stageCounts,
    linkedIssueCount: issueIds.size,
    occurrenceCount: relatedTargets.size,
    regionCount: regions.size,
    interestScore: relatedIssueActivityScore,
    relatedIssueActivityScore
  };
}

function getLaw(store: Store, id: string | undefined): ApiResponse {
  const law = store.lawItems.find((item) => item.id === id);
  if (!law) return json(404, { error: "law_not_found" });
  const group = store.lawGroups.find((item) => item.id === law.lawGroupId);
  const links = group ? approvedIssueLawGroupLinks(store).filter((link) => link.lawGroupId === group.id) : [];
  const linkedIssueIds = new Set(links.map((link) => link.issueId));
  const linkedIssues = store.issues.filter((issue) => linkedIssueIds.has(issue.id) && isPublicTopicIssue(issue));
  return json(200, {
    law: toPublicLawItem(store, law),
    lawGroup: group ? toLawGroupCard(store, group) : undefined,
    issueLinks: links.map(toPublicIssueLawGroupLink),
    issues: linkedIssues.map(toPublicIssue),
    relatedTargets: linkedIssues.flatMap((issue) => issueTargets(store, issue.id).map(({ targetType, target }) => ({
      targetType,
      item: toPublicTarget(targetType, target, publicClaimsForTarget(store, targetType, target.id))
    })))
  });
}

function lawCards(store: Store, sort: "interest" | "proposed_desc" = "interest") {
  const laws = store.lawItems.map((law) => toPublicLawItem(store, law));
  // "최근 발의" is deliberately limited to National Assembly bills. Effective laws
  // have promulgation/effective dates, not proposal dates, and must not be mislabeled.
  const visibleLaws = sort === "proposed_desc" ? laws.filter((law) => law.source === "assembly_bill") : laws;
  return visibleLaws.sort((left, right) => {
    if (sort === "proposed_desc") {
      return new Date(right.proposedDate || 0).getTime() - new Date(left.proposedDate || 0).getTime();
    }
    return Number(right.interestScore || 0) - Number(left.interestScore || 0) || new Date(right.lastUpdatedAt || 0).getTime() - new Date(left.lastUpdatedAt || 0).getTime();
  });
}

function toLawInterestItem(store: Store, law: ReturnType<typeof toPublicLawItem>): LawInterestItem {
  const linkedIssueIds = law.lawGroupId
    ? uniqueStrings(approvedIssueLawGroupLinks(store).filter((link) => link.lawGroupId === law.lawGroupId).map((link) => link.issueId))
    : [];
  return {
    id: law.id,
    source: law.source,
    title: law.billTitle || law.lawName,
    stage: law.stage,
    proposedDate: law.proposedDate,
    statusDate: law.statusDate,
    officialUrl: law.officialUrl,
    assemblyBillNo: law.assemblyBillNo,
    proposer: law.proposer,
    proposalSummary: law.proposalSummary,
    lawGroupId: law.lawGroupId,
    linkedIssueCount: law.linkedIssueCount,
    occurrenceCount: law.occurrenceCount,
    regionCount: law.regionCount,
    interestScore: law.interestScore,
    linkedIssueIds,
    coreTopicKey: law.coreTopicKey,
    coreTopicLabel: law.coreTopicLabel
  };
}

function toPublicIssueLawGroupLink(link: IssueLawGroupLink | undefined) {
  if (!link) return undefined;
  return {
    issueId: link.issueId,
    lawGroupId: link.lawGroupId,
    matchBasis: link.matchBasis,
    confidence: link.confidence,
    claimCount: link.claimIds.length
  };
}

function getMyReports(store: Store, userId: string): ApiResponse {
  return json(200, { reports: store.reports.filter((report) => report.userId === userId).map((report) => toPrivateReportReceipt(store, report)) });
}

function toPrivateReportReceipt(store: Store, report: ReportRecord): ReportReceipt {
  const target = targetRecord(store, report.targetType, report.targetId);
  const claim = store.claims.find((item) => item.id === report.claimId);
  const evidence = claim?.evidenceIds
    .map((id) => store.evidence.find((item) => item.id === id))
    .find((item): item is Evidence => Boolean(item));
  const published = claim?.visibility === "public";
  const isLive = report.reportType === "live";
  return {
    reportId: report.id,
    claimId: report.claimId,
    reportType: report.reportType,
    status: published ? "published" : "review",
    targetType: report.targetType,
    targetId: report.targetId,
    targetTitle: publicTargetTitle(target),
    issueTitle: publicTargetIssueTitle(store, report.targetType, target),
    regionLabel: publicTargetRegionLabel(target),
    publicRadiusM: isLive ? evidence?.publicRadiusM ?? 200 : undefined,
    receivedAt: report.createdAt.toISOString(),
    nextStepLabel: published ? "공개 자료로 전환됨" : isLive ? "비식별 검토 중" : "검토 중"
  };
}

function getMySubscriptions(store: Store, userId: string): ApiResponse {
  return json(200, { subscriptions: store.subscriptions.filter((subscription) => subscription.userId === userId) });
}

async function postLiveUpload(store: Store, request: ApiRequest, options: AppOptions): Promise<ApiResponse> {
  const data = asObject(request.body);
  const userId = requireVerifiedBodyUserId(store, request, options, data);
  const targetType = readTargetType(data, "targetType", "occurrence");
  const targetId = readString(data, "targetId");
  const target = targetRecord(store, targetType, targetId);
  if (!target) return json(404, { error: "target_not_found" });
  const mediaMimeType = readOptionalString(data, "mediaMimeType") ?? "video/webm";
  if (!mediaMimeType.startsWith("video/")) return json(422, { error: "live_upload_invalid" });
  const bytes = liveUploadBytes(readString(data, "mediaBase64"));
  const byteSize = bytes.length;
  if (byteSize <= 0 || byteSize > 4 * 1024 * 1024) return json(422, { error: "live_upload_invalid" });
  const hash = `sha256-${createHash("sha256").update(bytes).digest("base64url")}`;
  const storageKey = `private/live/browser/${userId}/${randomUUID()}.${mediaMimeType.includes("mp4") ? "mp4" : "webm"}`;
  const uploadedAt = new Date();
  const upload: LiveUploadRecord = { storageKey, userId, targetType, targetId, mediaMimeType, byteSize, hash, uploadedAt };
  if (options.liveMediaStorage) {
    if (options.requireExternalLiveStorage && !options.liveMediaEncryptionKey) throw new ApiError(503, "live_storage_unavailable");
    try {
      const storageBytes = options.liveMediaEncryptionKey ? encryptLiveMediaBytes(bytes, options.liveMediaEncryptionKey) : bytes;
      await options.liveMediaStorage.put({ storageKey, mediaMimeType: options.liveMediaEncryptionKey ? "application/vnd.musunil.live-media+json" : mediaMimeType, bytes: storageBytes });
    } catch {
      throw new ApiError(503, "live_storage_unavailable");
    }
  } else {
    if (options.requireExternalLiveStorage) throw new ApiError(503, "live_storage_unavailable");
    upload.privateMediaBase64 = bytes.toString("base64");
  }
  store.liveUploads.push(upload);
  audit(store, "hold", targetType, targetId, "live media upload stored privately before redaction");
  return json(201, {
    status: "live_upload_stored_private",
    storageKey,
    uploadedAt: uploadedAt.toISOString(),
    byteSize,
    hash
  });
}

function postLiveReport(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const data = asObject(request.body);
  const userId = requireVerifiedBodyUserId(store, request, options, data);
  const targetType = readTargetType(data, "targetType", "occurrence");
  const targetId = readString(data, "targetId");
  const target = targetRecord(store, targetType, targetId);
  if (!target) return json(404, { error: "target_not_found" });
  const capturedAt = readDate(data, "capturedAt");
  const storageKey = readString(data, "storageKey");
  const hash = readString(data, "hash");
  const upload = store.liveUploads.find((item) => item.storageKey === storageKey);
  if (!upload || upload.userId !== userId || upload.targetType !== targetType || upload.targetId !== targetId || upload.hash !== hash) {
    return json(422, { error: "live_upload_not_found" });
  }
  const durationMs = readNumber(data, "durationMs");
  if (data.captureMode !== "in_app_camera" || !durationMs || durationMs <= 0) return json(422, { error: "proof_of_presence_failed" });
  const gpsLng = readNumber(data, "gpsLng");
  const gpsLat = readNumber(data, "gpsLat");
  if (!isValidSouthKoreaGps(gpsLng, gpsLat)) return json(422, { error: "proof_of_presence_failed" });
  const targetPublicLocation = "publicLocation" in target ? target.publicLocation : undefined;
  const serverDistanceToTargetM = targetPublicLocation
    ? Math.round(metersBetween({ lng: gpsLng, lat: gpsLat as number }, targetPublicLocation))
    : 0;
  const evidence: Evidence = {
    id: randomUUID(),
    evidenceType: "live_media",
    capturedAt,
    uploadedAt: upload.uploadedAt,
    storageKey,
    hash,
    durationMs,
    mediaMimeType: upload.mediaMimeType,
    byteSize: upload.byteSize,
    width: readNumber(data, "width"),
    height: readNumber(data, "height"),
    captureMode: "in_app_camera",
    redactionStatus: "pending",
    publicRadiusM: 200,
    privateLng: gpsLng,
    privateLat: gpsLat,
    foregroundGps: data.foregroundGps === true,
    gpsAccuracyM: readNumber(data, "gpsAccuracyM"),
    distanceToTargetM: serverDistanceToTargetM,
    deviceIntegrityStatus: deviceIntegrityStatusFromPublicInput(data),
    deviceAttestationBucket: deviceAttestationBucket(data)
  };

  const maxDistanceToTargetM = Math.max(200, Math.min(50_000, targetPublicLocation?.uncertaintyRadiusM ?? 200));
  if (!hasProofOfPresence(evidence, { maxUploadMinutes: 5, minDurationMs: 5000, minGpsAccuracyM: 100, maxDistanceToTargetM })) {
    return json(422, { error: "proof_of_presence_failed" });
  }

  evidence.proofOfPresenceStatus = "pass";
  const claim = addClaim(store, {
    visibility: "held_private",
    targetType,
    targetId,
    sourceProvenance: "verified_citizen_report",
    claimantLabel: readOptionalString(data, "claimantLabel") ?? "위치 인증 시민 제보",
    statement: readOptionalString(data, "rawText") ?? "",
    normalizedStatement: "위치 인증 제보가 접수되었습니다.",
    evidenceStrength: "media_time_location_crosscheck",
    riskLevel: "rights_risk",
    evidenceIds: [evidence.id]
  }, { attach: false });

  store.evidence.push(evidence);
  const report = rememberReport(store, userId, "live", targetType, targetId, claim.id);
  audit(store, "hold", targetType, targetId, "live video report held for redaction and review before public visibility");
  return json(202, {
    ...toPrivateReportReceipt(store, report),
    queueStatus: "live_report_queued_for_review",
    claim: toPublicClaim(claim),
    evidenceId: evidence.id
  });
}

function liveUploadBytes(mediaBase64: string): Buffer {
  const normalized = mediaBase64.includes(",") ? mediaBase64.split(",").pop() || "" : mediaBase64;
  const bytes = Buffer.from(normalized, "base64");
  if (!bytes.length || bytes.toString("base64").replace(/=+$/, "") !== normalized.replace(/\s/g, "").replace(/=+$/, "")) throw new ApiError(422, "live_upload_invalid");
  return bytes;
}

export function encryptLiveMediaBytes(bytes: Buffer, secret: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", mediaEncryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.from(JSON.stringify({
    version: "v1",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64")
  }));
}

export function decryptLiveMediaBytes(payload: Buffer, secret: string): Buffer {
  const data = asObject(JSON.parse(payload.toString("utf8")));
  if (data.version !== "v1") throw new Error("Invalid live media encryption payload.");
  const decipher = createDecipheriv("aes-256-gcm", mediaEncryptionKey(secret), Buffer.from(readString(data, "iv"), "base64"));
  decipher.setAuthTag(Buffer.from(readString(data, "tag"), "base64"));
  return Buffer.concat([decipher.update(Buffer.from(readString(data, "ciphertext"), "base64")), decipher.final()]);
}

export function canServePublicRedactedMedia(store: Store, pathname: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const evidence = store.evidence.find((item) =>
    item.evidenceType === "live_media" &&
    item.redactionStatus === "completed" &&
    (item.publicStorageKey === decoded || item.publicPosterKey === decoded)
  );
  if (!evidence) return false;
  return store.claims.some((claim) => isPublicClaim(claim) && claim.evidenceIds.includes(evidence.id));
}

function mediaEncryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function deviceAttestationBucket(data: Record<string, unknown>): string | undefined {
  const value = readOptionalString(data, "deviceAttestation") ?? readOptionalString(data, "deviceAttestationBucket");
  return value ? `device_${createHash("sha256").update(value).digest("hex").slice(0, 16)}` : undefined;
}

function deviceIntegrityStatusFromPublicInput(data: Record<string, unknown>): "fail" | "unknown" {
  return data.deviceIntegrityStatus === "fail" ? "fail" : "unknown";
}

function isValidSouthKoreaGps(lng: number | undefined, lat: number | undefined): lng is number {
  return typeof lng === "number" && typeof lat === "number" && lng >= 124.4 && lng <= 132 && lat >= 32.8 && lat <= 38.7;
}

function postFieldVerification(store: Store, claimId: string | undefined, request: ApiRequest, options: AppOptions): ApiResponse {
  const reviewedClaim = store.claims.find((claim) => claim.id === claimId && isPublicClaim(claim));
  if (!reviewedClaim || !hasPublicLiveEvidence(store, reviewedClaim)) return json(404, { error: "live_claim_not_found" });
  const data = asObject(request.body);
  const userId = requireVerifiedBodyUserId(store, request, options, data);
  const capturedAt = readDate(data, "capturedAt");
  const verdict = readFieldVerification(data);
  const reviewedEvidence = reviewedClaim.evidenceIds
    .map((evidenceId) => store.evidence.find((item) => item.id === evidenceId))
    .find((item) => hasPublishableLiveEvidence(item) && typeof item.privateLng === "number" && typeof item.privateLat === "number");
  const gpsLng = readNumber(data, "gpsLng");
  const gpsLat = readNumber(data, "gpsLat");
  if (!reviewedEvidence || !isValidSouthKoreaGps(gpsLng, gpsLat)) return json(422, { error: "proof_of_presence_failed" });
  const serverDistanceToTargetM = Math.round(metersBetween({ lng: gpsLng, lat: gpsLat as number }, { lng: reviewedEvidence.privateLng as number, lat: reviewedEvidence.privateLat as number }));
  const evidence: Evidence = {
    id: randomUUID(),
    evidenceType: "sensor",
    capturedAt,
    uploadedAt: new Date(),
    privateLng: gpsLng,
    privateLat: gpsLat,
    foregroundGps: data.foregroundGps === true,
    gpsAccuracyM: readNumber(data, "gpsAccuracyM"),
    distanceToTargetM: serverDistanceToTargetM,
    deviceIntegrityStatus: deviceIntegrityStatusFromPublicInput(data),
    deviceAttestationBucket: deviceAttestationBucket(data),
    proofOfPresenceStatus: "unknown"
  };
  if (!hasFieldPresenceSignal(evidence, { maxUploadMinutes: 5, minDurationMs: 5000, minGpsAccuracyM: 100, maxDistanceToTargetM: 200 })) {
    return json(422, { error: "proof_of_presence_failed" });
  }

  evidence.proofOfPresenceStatus = "pass";
  const claim = addClaim(store, {
    visibility: "held_private",
    targetType: reviewedClaim.targetType,
    targetId: reviewedClaim.targetId,
    sourceProvenance: "verified_citizen_report",
    claimantLabel: "현장 인증 판단",
    statement: "",
    normalizedStatement: fieldVerificationStatement(verdict),
    evidenceStrength: "multiple_proof_of_presence",
    riskLevel: verdict === "rights_review_needed" ? "rights_risk" : verdict === "field_aligned" ? "low" : "misleading_possible",
    evidenceIds: [evidence.id],
    reviewTargetClaimId: reviewedClaim.id,
    fieldVerification: verdict
  }, { attach: false });
  store.evidence.push(evidence);
  rememberReport(store, userId, "field_verification", reviewedClaim.targetType, reviewedClaim.targetId, claim.id);
  audit(store, "hold", reviewedClaim.targetType, reviewedClaim.targetId, "field verification held for trusted device integrity before public visibility");
  return json(202, { status: "field_verification_queued_for_device_integrity", evidenceId: evidence.id, claim: toPublicClaim(claim), liveClaim: toPublicLiveClaim(store, reviewedClaim) });
}

function postMaterialReport(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const data = asObject(request.body);
  const userId = requireVerifiedBodyUserId(store, request, options, data);
  const targetType = readTargetType(data, "targetType", "occurrence");
  const targetId = readString(data, "targetId");
  const evidence: Evidence = {
    id: randomUUID(),
    evidenceType: "material_media",
    uploadedAt: new Date(),
    proofOfPresenceStatus: "material_only"
  };
  const claim = addClaim(store, {
    visibility: "held_private",
    targetType,
    targetId,
    sourceProvenance: "material_report",
    claimantLabel: readOptionalString(data, "claimantLabel") ?? "자료 제보",
    statement: readOptionalString(data, "rawText") ?? "",
    normalizedStatement: "자료 제보가 접수되었습니다.",
    evidenceStrength: "single_source",
    riskLevel: "misleading_possible",
    evidenceIds: [evidence.id]
  }, { attach: false });

  store.evidence.push(evidence);
  rememberReport(store, userId, "material", targetType, targetId, claim.id);
  audit(store, "hold", targetType, targetId, "material report held for operator review before public visibility");
  return json(202, { status: "material_report_queued_for_review", claim: toPublicClaim(claim), evidenceId: evidence.id });
}

function postOnSiteCorrection(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const data = asObject(request.body);
  const userId = requireVerifiedBodyUserId(store, request, options, data);
  const targetType = readTargetType(data, "targetType", "occurrence");
  const targetId = readString(data, "targetId");
  const claim = addClaim(store, {
    visibility: "held_private",
    targetType,
    targetId,
    sourceProvenance: "material_report",
    claimantLabel: readOptionalString(data, "claimantLabel") ?? "현장 정정",
    statement: readOptionalString(data, "rawText") ?? "",
    normalizedStatement: readString(data, "normalizedStatement"),
    evidenceStrength: "single_source",
    riskLevel: "misleading_possible",
    evidenceIds: []
  }, { attach: false });

  rememberReport(store, userId, "on_site_correction", targetType, targetId, claim.id);
  audit(store, "hold", targetType, targetId, "on-site correction held for operator review before public visibility");
  return json(202, { status: "on_site_correction_queued_for_review", claim: toPublicClaim(claim) });
}

function postRightsViolation(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const data = asObject(request.body);
  const userId = requireVerifiedBodyUserId(store, request, options, data);
  const targetType = readTargetType(data, "targetType", "occurrence");
  const targetId = readString(data, "targetId");
  const riskLevel = readRiskLevel(data, "riskLevel", "rights_risk");
  const claim = addClaim(store, {
    visibility: "held_private",
    targetType,
    targetId,
    sourceProvenance: "rights_violation_report",
    claimantLabel: readOptionalString(data, "claimantLabel") ?? "권리침해 신고",
    statement: readOptionalString(data, "rawText") ?? "",
    normalizedStatement: "권리침해 신고가 접수되었습니다.",
    evidenceStrength: "single_source",
    riskLevel,
    evidenceIds: []
  }, { attach: false });
  const decision = moderationDecisionFromRightsReports({ count: 1, highestRiskLevel: riskLevel, coordinatedAttackSuspected: false });

  rememberReport(store, userId, "rights_violation", targetType, targetId, claim.id);
  audit(store, "hold", targetType, targetId, "rights report queued without automatic deletion");
  return json(202, { status: "rights_violation_report_queued_for_review", decision, claim: toPublicClaim(claim) });
}

function postRebuttal(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const data = asObject(request.body);
  const userId = requireVerifiedBodyUserId(store, request, options, data);
  const targetType = readTargetType(data, "targetType", "occurrence");
  const targetId = readString(data, "targetId");
  const claim = addClaim(store, {
    visibility: "held_private",
    targetType,
    targetId,
    sourceProvenance: "rebuttal",
    claimantLabel: readOptionalString(data, "claimantLabel") ?? "반론 제출자",
    statement: readOptionalString(data, "rawText") ?? "",
    normalizedStatement: readString(data, "normalizedStatement"),
    evidenceStrength: "single_source",
    riskLevel: "misleading_possible",
    evidenceIds: []
  }, { attach: false });

  rememberReport(store, userId, "rebuttal", targetType, targetId, claim.id);
  audit(store, "hold", targetType, targetId, "rebuttal held for operator review before public visibility");
  return json(202, { status: "rebuttal_queued_for_review", claim: toPublicClaim(claim) });
}

function postSubscription(store: Store, request: ApiRequest, options: AppOptions): ApiResponse {
  const data = asObject(request.body);
  const userId = readString(data, "userId");
  const verified = verifiedUserFromRequest(store, request, options);
  if (!verified || verified.user.id !== userId) return json(401, { error: "identity_required" });
  const subscription: Subscription = {
    id: randomUUID(),
    userId,
    targetType: readTargetType(data, "targetType", "occurrence"),
    targetId: readString(data, "targetId"),
    alertLevel: data.alertLevel === "all" || data.alertLevel === "normal" ? data.alertLevel : "major_only",
    alertTypes: Array.isArray(data.alertTypes) ? data.alertTypes.filter((item): item is string => typeof item === "string") : ["state_changed"]
  };

  store.subscriptions.push(subscription);
  return json(201, { status: "subscription_created", subscription });
}

function patchSubscription(store: Store, id: string | undefined, request: ApiRequest, options: AppOptions): ApiResponse {
  const subscription = store.subscriptions.find((item) => item.id === id);
  if (!subscription) return json(404, { error: "subscription_not_found" });
  const verified = verifiedUserFromRequest(store, request, options);
  if (!verified || verified.user.id !== subscription.userId) return json(401, { error: "identity_required" });
  const data = asObject(request.body);
  if (data.alertLevel === "major_only" || data.alertLevel === "normal" || data.alertLevel === "all") subscription.alertLevel = data.alertLevel;
  if (Array.isArray(data.alertTypes)) subscription.alertTypes = data.alertTypes.filter((item): item is string => typeof item === "string");
  if (typeof data.mutedUntil === "string") subscription.mutedUntil = new Date(data.mutedUntil);
  return json(200, { status: "subscription_updated", subscription });
}

function postInternalIngest(store: Store, body: unknown): ApiResponse {
  const data = asObject(body);
  const targetType = readTargetType(data, "targetType", "issue");
  const targetId = readString(data, "targetId");
  const sourceProvenance = readSourceProvenance(data, "sourceProvenance", "government_or_police");
  const claimantLabel = readOptionalString(data, "claimantLabel") ?? "공공자료 수집";
  const normalizedStatement = readString(data, "normalizedStatement");
  const existingClaim = store.claims.find(
    (claim) =>
      claim.targetType === targetType &&
      claim.targetId === targetId &&
      claim.sourceProvenance === sourceProvenance &&
      claim.claimantLabel === claimantLabel &&
      claim.normalizedStatement === normalizedStatement
  );
  if (existingClaim) {
    const rawText = readOptionalString(data, "rawText");
    if (rawText) existingClaim.statement = rawText;
    recordPublicSourceRefresh(store, data, 1);
    audit(store, "correction", targetType, targetId, "public source refreshed without duplicate Claim");
    return json(200, { status: "public_source_claim_refreshed", claim: toPublicClaim(existingClaim) });
  }
  const claim = addClaim(store, {
    targetType,
    targetId,
    sourceProvenance,
    claimantLabel,
    statement: readOptionalString(data, "rawText") ?? "",
    normalizedStatement,
    evidenceStrength: readEvidenceStrength(data, "evidenceStrength", "single_source"),
    riskLevel: readRiskLevel(data, "riskLevel", "misleading_possible"),
    evidenceIds: []
  });
  recordPublicSourceRefresh(store, data, 1);
  audit(store, "correction", targetType, targetId, "public source ingested as Claim");
  return json(201, { status: "public_source_claim_received", claim: toPublicClaim(claim) });
}

function postInternalIngestPublicOccurrence(store: Store, body: unknown): ApiResponse {
  const data = asObject(body);
  const id = readString(data, "id");
  const areaClusterId = readString(data, "areaClusterId");
  let issueId = readOptionalString(data, "issueId");
  const normalizedStatement = readString(data, "normalizedStatement");
  let occurrence = store.occurrences.find((item) => item.id === id);
  const created = !occurrence;
  const officialSource = officialAssemblySource(readOptionalString(data, "sourceId"));
  const publicVisibility: Occurrence["publicVisibility"] = officialSource
    ? data.sourceGranularity === "individual_schedule" ? "public" : "source_only"
    : occurrence?.publicVisibility ?? "public";
  const incomingLocationText = readOptionalString(data, "publicLocationText");
  const sourceLocation = officialSource
    ? publicVisibility === "public" ? officialPublicLocation(officialSource, data) : undefined
    : undefined;
  const previousLocation = occurrence?.publicLocation;
  const previousLocationStatus = occurrence?.locationStatus;
  const publicLocation = officialSource
    ? initialOfficialLocation(occurrence, sourceLocation)
    : occurrence?.publicLocation;
  const locationStatus: LocationResolutionStatus = publicLocation?.status ?? occurrence?.locationStatus ?? "TEXT_ONLY";
  if (officialSource) ensureOfficialIngestReferences(store, officialSource, data, areaClusterId, issueId);

  if (!store.areaClusters.some((item) => item.id === areaClusterId)) throw new ApiError(404, "area_cluster_not_found");
  const topicIssueId = resolveIssueIdForIngest(store, data);
  const requestedIssue = issueId ? store.issues.find((item) => item.id === issueId) : undefined;
  if (requestedIssue?.kind === "schedule_cluster" || (issueId && isPublicSourceBundleIssueId(issueId))) issueId = topicIssueId;
  if (issueId && !store.issues.some((item) => item.id === issueId)) throw new ApiError(404, "issue_not_found");
  issueId ??= topicIssueId;

  if (!occurrence) {
    occurrence = {
      id,
      issueId,
      type: readOccurrenceType(data, "type", "static_assembly"),
      areaClusterId,
      regionLabel: readString(data, "regionLabel"),
      title: readString(data, "title"),
      publicVisibility,
      locationText: incomingLocationText ?? publicLocation?.label,
      locationStatus,
      sourcePublicLocation: sourceLocation,
      publicLocation,
      startsAt: readOptionalDate(data, "startsAt"),
      endsAt: readOptionalDate(data, "endsAt"),
      lifecycleState: readLifecycleState(data, "lifecycleState", "UNKNOWN"),
      claimIds: [],
      evidenceIds: []
    };
    store.occurrences.push(occurrence);
    const cluster = findAreaCluster(store, areaClusterId);
    if (!cluster?.targetRefs.some((item) => item.targetType === "occurrence" && item.targetId === id)) {
      cluster?.targetRefs.push({ targetType: "occurrence", targetId: id });
    }
  } else {
    const previousVisibility = occurrence.publicVisibility;
    if (occurrence.issueId) {
      const previousIssue = store.issues.find((item) => item.id === occurrence!.issueId);
      if (previousIssue?.kind === "schedule_cluster") {
        const previousIssueId = occurrence.issueId;
        occurrence.issueId = undefined;
        audit(store, "split", "occurrence", id, `장소 일정 묶음 '${previousIssueId}'에서 분리되어 개별 일정으로 유지됩니다.`);
      }
    }
    if (!occurrence.issueId && issueId) {
      occurrence.issueId = issueId;
      audit(store, "merge", "occurrence", id, `공개 일정이 확인된 장소 일정 주제 '${issueId}'에 연결되었습니다.`);
    }
    occurrence.title = readString(data, "title");
    occurrence.regionLabel = readString(data, "regionLabel");
    occurrence.startsAt = readOptionalDate(data, "startsAt") ?? occurrence.startsAt;
    occurrence.endsAt = readOptionalDate(data, "endsAt") ?? occurrence.endsAt;
    occurrence.lifecycleState = readLifecycleState(data, "lifecycleState", occurrence.lifecycleState);
    occurrence.publicVisibility = publicVisibility;
    occurrence.locationText = incomingLocationText ?? occurrence.locationText ?? publicLocation?.label;
    occurrence.locationStatus = locationStatus;
    if (sourceLocation) occurrence.sourcePublicLocation = sourceLocation;
    occurrence.publicLocation = publicLocation;
    if (previousVisibility !== publicVisibility) {
      audit(store, "state_change", "occurrence", id, publicVisibility === "source_only"
        ? "경찰 게시판 문서를 개별 현장이 아닌 출처 근거로 전환해 공개 목록에서 제외했습니다."
        : "개별 일정 근거가 확인되어 현장 이벤트를 공개 상태로 전환했습니다.");
    }
  }
  if (officialSource) auditOfficialLocationChange(store, occurrence, previousLocation, previousLocationStatus);

  const officialMetadata = officialSource ? officialEvidenceMetadata(officialSource, data, id, normalizedStatement) : undefined;
  const existingOfficialEvidence = officialMetadata?.externalId
    ? store.evidence.find((item) => item.externalProvider === "official_public_source" && item.externalId === officialMetadata.externalId)
    : undefined;
  const existingClaim = store.claims.find((claim) =>
    claim.targetType === "occurrence" &&
    claim.targetId === id &&
    (claim.normalizedStatement === normalizedStatement || Boolean(existingOfficialEvidence && claim.evidenceIds.includes(existingOfficialEvidence.id)))
  );
  if (existingClaim) {
    const corrected = existingClaim.normalizedStatement !== normalizedStatement;
    const rawText = readOptionalString(data, "rawText");
    if (rawText) existingClaim.statement = rawText;
    existingClaim.normalizedStatement = normalizedStatement;
    existingClaim.claimantLabel = readOptionalString(data, "claimantLabel") ?? existingClaim.claimantLabel;
    existingClaim.evidenceStrength = readEvidenceStrength(data, "evidenceStrength", existingClaim.evidenceStrength);
    existingClaim.riskLevel = readRiskLevel(data, "riskLevel", existingClaim.riskLevel);
    if (officialSource) {
      const metadata = officialMetadata!;
      for (const evidenceId of existingClaim.evidenceIds) {
        const existingEvidence = store.evidence.find((item) => item.id === evidenceId && item.evidenceType === "official_doc");
        if (existingEvidence) Object.assign(existingEvidence, metadata);
      }
    }
    recordPublicSourceRefresh(store, data, 1);
    audit(store, "correction", "occurrence", id, corrected ? "official public occurrence statement corrected without duplicate Claim" : "public occurrence refreshed without duplicate Claim");
    reconcileOccurrenceLinksFromEvidence(store);
    reconcileOccurrencePublicLocation(store, "occurrence", occurrence.id);
    return json(200, {
      status: "public_occurrence_refreshed",
      occurrence: toPublicOccurrence(occurrence, publicClaimsForTarget(store, "occurrence", occurrence.id)),
      claim: toPublicClaim(existingClaim)
    });
  }

  const evidence: Evidence = {
    id: randomUUID(),
    evidenceType: "official_doc",
    uploadedAt: readOptionalDate(data, "evidenceUploadedAt") ?? new Date(),
    proofOfPresenceStatus: "material_only",
    ...(officialSource ? officialEvidenceMetadata(officialSource, data, id, normalizedStatement) : {})
  };
  store.evidence.push(evidence);
  attachEvidence(store, "occurrence", id, evidence.id);
  const claim = addClaim(store, {
    targetType: "occurrence",
    targetId: id,
    sourceProvenance: readSourceProvenance(data, "sourceProvenance", "government_or_police"),
    claimantLabel: readOptionalString(data, "claimantLabel") ?? "공개 자료",
    statement: readOptionalString(data, "rawText") ?? "",
    normalizedStatement,
    evidenceStrength: readEvidenceStrength(data, "evidenceStrength", "single_source"),
    riskLevel: readRiskLevel(data, "riskLevel", "low"),
    evidenceIds: [evidence.id]
  });
  refreshIssueLawGroupLinks(store);
  reconcileOccurrenceLinksFromEvidence(store);
  reconcileOccurrencePublicLocation(store, "occurrence", occurrence.id);
  recordPublicSourceRefresh(store, data, 1);
  audit(store, created ? "split" : "correction", "occurrence", id, "public occurrence ingested as Claim/Evidence");
  return json(created ? 201 : 200, {
    status: created ? "public_occurrence_created" : "public_occurrence_updated",
    occurrence: toPublicOccurrence(occurrence, publicClaimsForTarget(store, "occurrence", occurrence.id)),
    claim: toPublicClaim(claim)
  });
}

function postInternalIngestPublicOccurrenceBatch(store: Store, body: unknown): ApiResponse {
  const data = asObject(body);
  const sourceId = readString(data, "sourceId");
  const source = officialAssemblySource(sourceId);
  if (!source) throw new ApiError(400, "official_source_invalid");
  const checkedAt = readDate(data, "checkedAt");
  const status = readPublicSourceRunStatus(data.status);
  const parsedCount = Math.max(0, Math.trunc(readNumber(data, "parsedCount") ?? 0));
  const records = Array.isArray(data.records) ? data.records : [];
  if (records.length > 100) throw new ApiError(400, "public_source_batch_too_large");

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const errors: Array<{ id?: string; error: string }> = [];
  for (const record of records) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push({ error: "record_must_be_object" });
      continue;
    }
    const next: Record<string, unknown> = { ...(record as Record<string, unknown>), sourceId, sourceCheckedAt: checkedAt.toISOString(), sourceBatchSize: records.length };
    try {
      const response = postInternalIngestPublicOccurrence(store, next);
      const responseStatus = (response.body as { status?: string }).status;
      if (responseStatus === "public_occurrence_created") created += 1;
      else if (responseStatus === "public_occurrence_refreshed") unchanged += 1;
      else updated += 1;
    } catch (error) {
      errors.push({
        id: typeof next.id === "string" ? next.id : undefined,
        error: error instanceof ApiError ? error.code : "record_ingest_failed"
      });
    }
  }

  const runStatus = status === "failed" || (records.length > 0 && errors.length === records.length)
    ? "failed"
    : errors.length > 0
      ? "partial"
      : records.length > 0
        ? "success"
        : "empty";
  const sourceStatusChanged = recordPublicSourceRun(store, {
    sourceId,
    checkedAt,
    resultCount: records.length - errors.length,
    parsedCount,
    status: runStatus,
    errorCode: errors.length > 0 ? "record_ingest_partial" : readOptionalString(data, "errorCode")
  });
  if (sourceStatusChanged) audit(store, "state_change", "issue", ensurePublicScheduleIssue(store).id, `official source ${sourceId} run status changed to ${runStatus}`);
  return json(errors.length > 0 && errors.length === records.length && records.length > 0 ? 422 : 200, {
    status: "public_occurrence_batch_recorded",
    sourceId,
    runStatus,
    parsedCount,
    received: records.length,
    created,
    updated,
    unchanged,
    errors
  });
}

function officialAssemblySource(sourceId: string | undefined) {
  if (!sourceId) return undefined;
  return publicAssemblySources.find((source) => source.id === sourceId && source.kind === "schedule" && source.status === "active");
}

const officialPublicLocationAllowlist: Record<string, { regionCode: string; lng: number; lat: number; label: string }> = {
  seoul_civic_center_area: { regionCode: "seoul", lng: 126.978, lat: 37.566, label: "서울광장·광화문 일대" },
  seoul_education_office_area: { regionCode: "seoul", lng: 126.969, lat: 37.57, label: "서울시교육청 일대" },
  seoul_oryu_area: { regionCode: "seoul", lng: 126.84, lat: 37.493, label: "오류동 일대" },
  seoul_marronnier_area: { regionCode: "seoul", lng: 127.002, lat: 37.58, label: "대학로·마로니에공원 일대" },
  seoul_station_area: { regionCode: "seoul", lng: 126.971, lat: 37.555, label: "서울역 일대" },
  seoul_national_assembly_area: { regionCode: "seoul", lng: 126.917, lat: 37.528, label: "국회의사당 일대" },
  seoul_seocho_station_area: { regionCode: "seoul", lng: 127.008, lat: 37.491, label: "서초역 일대" },
  seoul_mongchontoseong_area: { regionCode: "seoul", lng: 127.112, lat: 37.517, label: "몽촌토성역 일대" },
  seoul_hongdae_area: { regionCode: "seoul", lng: 126.923, lat: 37.557, label: "홍대입구역 일대" },
  seoul_seokchon_lake_area: { regionCode: "seoul", lng: 127.105, lat: 37.51, label: "석촌호수 일대" },
  seoul_government_complex_area: { regionCode: "seoul", lng: 126.977, lat: 37.577, label: "정부서울청사·경복궁역 일대" },
  seoul_police_hq_area: { regionCode: "seoul", lng: 126.972, lat: 37.564, label: "경찰청 일대" },
  seoul_cheongwadae_area: { regionCode: "seoul", lng: 126.973, lat: 37.584, label: "청와대 인근 일대" },
  seoul_war_memorial_area: { regionCode: "seoul", lng: 126.977, lat: 37.536, label: "전쟁기념관 일대" }
};

function officialPublicLocation(
  source: NonNullable<ReturnType<typeof officialAssemblySource>>,
  data: Record<string, unknown>
): Occurrence["publicLocation"] | undefined {
  const key = readOptionalString(data, "publicLocationKey");
  if (key) {
    const location = officialPublicLocationAllowlist[key];
    if (!location || location.regionCode !== source.regionCode) throw new ApiError(400, "official_source_location_invalid");
    const blurred = blurPublicCoordinate(location.lng, location.lat, 300);
    return {
      ...blurred,
      label: location.label,
      precision: "area",
      source: "public_source",
      status: "SOURCE_GEOCODED",
      publicRadiusM: 300,
      uncertaintyRadiusM: 300,
      fieldEvidenceCount: 0,
      updatedAt: new Date()
    };
  }
  if (data.sourceGranularity !== "individual_schedule") return undefined;
  const locationText = readOptionalString(data, "publicLocationText");
  return locationText ? resolveOfficialLocationEstimate(source.regionCode, locationText) : undefined;
}

function initialOfficialLocation(occurrence: Occurrence | undefined, candidate: Occurrence["publicLocation"]): Occurrence["publicLocation"] {
  if (!occurrence?.publicLocation) return candidate;
  if (occurrence.locationStatus === "FIELD_CORROBORATED" || occurrence.locationStatus === "CORRECTED" || occurrence.locationStatus === "LOCATION_DISPUTED") {
    return occurrence.publicLocation;
  }
  return candidate ?? occurrence.publicLocation;
}

function auditOfficialLocationChange(
  store: Store,
  occurrence: Occurrence,
  previous: Occurrence["publicLocation"],
  previousStatus: LocationResolutionStatus | undefined
): void {
  const next = occurrence.publicLocation;
  if (!previous && next) {
    audit(store, "state_change", "occurrence", occurrence.id, "공개자료 장소명을 행정구역 위치 정보와 연결해 흐린 예상 위치를 생성했습니다.");
    return;
  }
  if (previousStatus !== occurrence.locationStatus) {
    audit(store, "state_change", "occurrence", occurrence.id, `공개 위치 상태가 ${locationStatusLabel(occurrence.locationStatus)}로 변경되었습니다.`);
    return;
  }
  if (previous && next && (previous.lng !== next.lng || previous.lat !== next.lat || previous.label !== next.label)) {
    audit(store, "correction", "occurrence", occurrence.id, "공개자료의 변경된 장소 정보를 반영해 흐린 예상 위치를 갱신했습니다.");
  }
}

function ensureOfficialIngestReferences(
  store: Store,
  source: NonNullable<ReturnType<typeof officialAssemblySource>>,
  data: Record<string, unknown>,
  areaClusterId: string,
  issueId: string | undefined
): void {
  if (readString(data, "regionLabel") !== source.regionLabel) throw new ApiError(400, "official_source_region_mismatch");
  const allowedAreaIds = new Set([`area_${source.regionCode}`, `area_${source.regionCode}_public`]);
  if (!allowedAreaIds.has(areaClusterId)) throw new ApiError(400, "official_source_area_invalid");
  if (!store.areaClusters.some((item) => item.id === areaClusterId)) {
    store.areaClusters.push({
      id: areaClusterId,
      label: `${source.regionLabel} 경찰 공개 집회 일정`,
      regionLabel: source.regionLabel,
      targetRefs: []
    });
    audit(store, "split", "issue", ensurePublicScheduleIssue(store).id, `official source area created for ${source.regionLabel}`);
  }
  if (issueId && isPublicSourceBundleIssueId(issueId)) ensurePublicScheduleIssue(store);
}

function ensurePublicScheduleIssue(store: Store): Issue {
  const id = "issue_public_regional_schedule";
  const existing = store.issues.find((item) => item.id === id);
  if (existing) return existing;
  const now = new Date();
  const issue: Issue = {
    id,
    title: "지역별 경찰 공개 집회 일정",
    kind: "schedule_cluster",
    normalizedTopicKey: "topic:regional-police-public-assembly-schedules",
    topicTags: ["지역별", "경찰 공개자료", "집회 예정 정보"],
    status: "active",
    firstSeenAt: now,
    lastUpdatedAt: now
  };
  store.issues.push(issue);
  audit(store, "split", "issue", id, "official police schedule issue created for public-source ingest");
  return issue;
}

function officialEvidenceMetadata(
  source: NonNullable<ReturnType<typeof officialAssemblySource>>,
  data: Record<string, unknown>,
  occurrenceId: string,
  normalizedStatement: string
): Partial<Evidence> {
  const sourceUrl = safeOfficialAssemblyUrl(source, readOptionalString(data, "sourceUrl"));
  return {
    externalProvider: "official_public_source",
    externalId: `${source.id}:${readOptionalString(data, "sourceItemId") ?? occurrenceId}`,
    sourceUrl,
    publisherLabel: readOptionalString(data, "claimantLabel") ?? `${source.regionLabel}경찰청 공개자료`,
    sourcePublishedAt: readOptionalDate(data, "sourcePublishedAt") ?? readOptionalDate(data, "evidenceUploadedAt"),
    sourceCheckedAt: readOptionalDate(data, "sourceCheckedAt") ?? new Date(),
    sourceTitle: readOptionalString(data, "sourceTitle") ?? readString(data, "title"),
    publicSummary: normalizedStatement,
    sourceGranularity: data.sourceGranularity === "individual_schedule" ? "individual_schedule" : "bulletin"
  };
}

function safeOfficialAssemblyUrl(source: NonNullable<ReturnType<typeof officialAssemblySource>>, candidate: string | undefined): string {
  const fallback = source.pageUrl ?? source.url;
  if (!fallback) throw new ApiError(400, "official_source_url_missing");
  if (!candidate) return fallback;
  try {
    const allowedHost = new URL(fallback).hostname.replace(/^www\./, "");
    const url = new URL(candidate);
    if (url.protocol === "https:" && url.hostname.replace(/^www\./, "") === allowedHost) return url.toString();
  } catch {
    // Fall back to the registry URL.
  }
  return fallback;
}

function readPublicSourceRunStatus(value: unknown): "success" | "empty" | "failed" {
  if (value === "success" || value === "empty" || value === "failed") return value;
  throw new ApiError(400, "public_source_status_invalid");
}

function recordPublicSourceRefresh(store: Store, data: Record<string, unknown>, resultCount: number): void {
  const sourceId = readOptionalString(data, "sourceId");
  if (!sourceId) return;
  const checkedAt = readOptionalDate(data, "sourceCheckedAt") ?? new Date();
  const sourceBatchSize = readNumber(data, "sourceBatchSize");
  const nextResultCount = sourceBatchSize && sourceBatchSize > 0 ? sourceBatchSize : resultCount;
  recordPublicSourceRun(store, { sourceId, checkedAt, resultCount: nextResultCount, parsedCount: nextResultCount, status: nextResultCount > 0 ? "success" : "empty" });
}

function recordPublicSourceRun(store: Store, refresh: PublicAssemblySourceRefresh): boolean {
  const existing = store.publicSourceRefreshes.find((item) => item.sourceId === refresh.sourceId);
  if (refresh.status !== "failed") refresh.lastSuccessfulAt = refresh.checkedAt;
  if (existing) {
    const changed = existing.status !== refresh.status;
    const lastSuccessfulAt = refresh.lastSuccessfulAt ?? existing.lastSuccessfulAt;
    Object.assign(existing, refresh, { lastSuccessfulAt });
    return changed;
  }
  store.publicSourceRefreshes.push(refresh);
  return true;
}

function postInternalIngestLaws(store: Store, body: unknown): ApiResponse {
  const data = asObject(body);
  const records = Array.isArray(data.laws) ? data.laws : [data];
  const upserted: LawItem[] = [];
  for (const record of records) {
    if (!record || typeof record !== "object" || Array.isArray(record)) throw new ApiError(400, "law_record_must_be_object");
    const law = readLawItem(record as Record<string, unknown>);
    const existing = store.lawItems.find((item) => item.id === law.id);
    if (existing) Object.assign(existing, law);
    else store.lawItems.push(law);
    upserted.push(law);
  }
  synchronizeLawGroups(store, true);
  refreshIssueLawGroupLinks(store);
  return json(200, {
    status: "laws_ingested",
    laws: upserted.map((law) => toPublicLawItem(store, law))
  });
}

type IssueTopicInput = {
  title: string;
  topicTags: string[];
};

function resolveIssueIdForIngest(store: Store, data: Record<string, unknown>): string | undefined {
  const explicitTopic = readOptionalString(data, "topicTitle");
  const inferredTopic = explicitTopic ? topicFromTitle(explicitTopic) : topicFromText(`${readOptionalString(data, "title") ?? ""} ${readOptionalString(data, "normalizedStatement") ?? ""}`);
  if (!inferredTopic) return undefined;
  const topicTags = readOptionalStringArray(data, "topicTags");
  return ensureIssue(store, {
    title: inferredTopic.title,
    topicTags: topicTags.length ? topicTags : inferredTopic.topicTags
  }).id;
}

function isPublicSourceBundleIssueId(issueId: string): boolean {
  return issueId.startsWith("issue_public_");
}

function ensureIssue(store: Store, input: IssueTopicInput): Issue {
  const normalizedTopicKey = normalizedTopicKeyFor(input.title);
  const existing = store.issues.find((issue) => issue.normalizedTopicKey === normalizedTopicKey);
  if (existing) return existing;
  const now = new Date();
  const issue: Issue = {
    id: `issue_${createHash("sha1").update(normalizedTopicKey).digest("hex").slice(0, 12)}`,
    title: input.title,
    kind: "topic",
    synthesisBasis: "explicit",
    normalizedTopicKey,
    topicTags: input.topicTags,
    status: "active",
    firstSeenAt: now,
    lastUpdatedAt: now
  };
  store.issues.push(issue);
  audit(store, "split", "issue", issue.id, `검증 가능한 공개 자료의 주제 '${input.title}'가 생성되었습니다.`);
  return issue;
}

function isLegacyLocationScheduleIssue(issue: Issue): boolean {
  return issue.kind === "schedule_cluster" || issue.topicTags.includes("장소별 일정");
}

export function reconcileLegacyLocationScheduleIssues(store: Store): number {
  let changeCount = 0;
  const scheduleIssueIds = new Set<string>();
  for (const issue of store.issues) {
    if (!isLegacyLocationScheduleIssue(issue)) continue;
    scheduleIssueIds.add(issue.id);
    if (issue.kind !== "schedule_cluster") {
      issue.kind = "schedule_cluster";
      audit(store, "state_change", "issue", issue.id, "장소 기반 일정 묶음을 주제와 분리했습니다.");
      changeCount += 1;
    }
    if (issue.status !== "archived") {
      issue.status = "archived";
      issue.lastUpdatedAt = new Date();
      audit(store, "state_change", "issue", issue.id, "장소 기반 일정 묶음을 홈 주제에서 제외하고 기록 상태로 전환했습니다.");
      changeCount += 1;
    }
  }
  for (const occurrence of store.occurrences) {
    if (!occurrence.issueId || !scheduleIssueIds.has(occurrence.issueId)) continue;
    const previousIssueId = occurrence.issueId;
    occurrence.issueId = undefined;
    audit(store, "split", "occurrence", occurrence.id, `장소 일정 묶음 '${previousIssueId}'에서 분리되어 개별 일정으로 유지됩니다.`);
    changeCount += 1;
  }
  return changeCount;
}

function topicFromTitle(rawTitle: string): IssueTopicInput | undefined {
  const text = rawTitle.trim();
  if (!text) return undefined;
  if (/부정선거|선거\s*검증|선관위/.test(text)) return { title: "부정선거 의혹 제기 집회", topicTags: ["부정선거 의혹", "선거 검증", "집회"] };
  if (/정보통신망법|정통법/.test(text)) {
    const stance = /반대|폐지/.test(text) ? "반대" : /찬성|지지/.test(text) ? "찬성" : "관련";
    return { title: `정보통신망법 개정 ${stance} 집회`, topicTags: ["정보통신망법 개정", stance, "집회"] };
  }
  if (/탄핵/.test(text)) return { title: "대통령 탄핵 요구 집회", topicTags: ["대통령 탄핵", "요구", "집회"] };
  return { title: /집회|행진|시위|항의|요구|반대|찬성|의혹|검증/.test(text) ? text : `${text} 관련 집회`, topicTags: [text, "집회"] };
}

function topicFromText(text: string): IssueTopicInput | undefined {
  if (/부정선거|선거\s*검증|선관위/.test(text)) return topicFromTitle("부정선거");
  if (/정보통신망법|정통법/.test(text)) return topicFromTitle(text);
  if (/탄핵/.test(text)) return topicFromTitle("대통령 탄핵");
  return undefined;
}

function normalizedTopicKeyFor(title: string): string {
  return `topic:${title.normalize("NFKC").toLowerCase().replace(/\s+/g, "-")}`;
}

function getAdminReviewQueue(store: Store): ApiResponse {
  return json(200, {
    claims: store.claims
      .filter((claim) => claim.riskLevel !== "low" || claim.sourceProvenance === "rights_violation_report" || claim.sourceProvenance === "rebuttal")
      .map(toPublicClaim),
    transparencyLogs: store.transparencyLogs.slice(-50)
  });
}

function getAdminRiskDashboard(store: Store): ApiResponse {
  const reviewClaims = store.claims.filter((claim) => claim.riskLevel !== "low" || claim.sourceProvenance === "rights_violation_report" || claim.sourceProvenance === "rebuttal");
  const duplicateHashes = duplicateMediaHashes(store);
  const userClusters = reportUserClusters(store);
  const deviceClusters = deviceAttestationClusters(store);
  const lowGpsEvidence = store.evidence.filter((item) => item.evidenceType === "live_media" && (item.foregroundGps !== true || Number(item.gpsAccuracyM || 999) > 80));
  const deviceIntegrityEvidence = store.evidence.filter((item) => (item.evidenceType === "live_media" || item.evidenceType === "sensor") && item.deviceIntegrityStatus !== "pass");
  const pendingRedaction = store.evidence.filter((item) => item.evidenceType === "live_media" && item.redactionStatus !== "completed");
  const issueRisks = store.issues
    .map((issue) => {
      const signals = issueVerificationSignals(store, issue.id).filter((signal) => signal.id !== "no_unusual_signal");
      const claims = issueClaims(store, issue.id);
      const riskScore = signals.reduce((sum, signal) => sum + ({ low: 1, medium: 2, high: 3 }[signal.severity] ?? 0), 0) + claims.filter((claim) => claim.riskLevel !== "low").length;
      return {
        issueId: issue.id,
        title: issue.title,
        riskScore,
        reviewClaimCount: claims.filter((claim) => reviewClaims.some((review) => review.id === claim.id)).length,
        verificationSignals: signals,
        latestUpdatedAt: issue.lastUpdatedAt.toISOString()
      };
    })
    .filter((issue) => issue.riskScore > 0 || issue.verificationSignals.length > 0)
    .sort((a, b) => b.riskScore - a.riskScore || a.title.localeCompare(b.title));
  return json(200, {
    generatedAt: new Date().toISOString(),
    decisionPolicy: "signals_prioritize_review_only",
    summary: {
      reviewQueueCount: reviewClaims.length,
      highRiskClaimCount: reviewClaims.filter((claim) => claim.riskLevel === "high_legal_privacy_risk" || claim.riskLevel === "must_hold_private").length,
      heldPrivateClaimCount: store.claims.filter((claim) => claim.visibility === "held_private").length,
      rightsReportCount: store.claims.filter((claim) => claim.sourceProvenance === "rights_violation_report").length,
      duplicateMediaHashCount: duplicateHashes.reduce((sum, group) => sum + group.count, 0),
      userClusterCount: userClusters.length,
      deviceAttestationClusterCount: deviceClusters.length,
      lowGpsEvidenceCount: lowGpsEvidence.length,
      deviceIntegrityReviewCount: deviceIntegrityEvidence.length,
      pendingRedactionCount: pendingRedaction.length,
      holdAuditCount: store.auditLogs.filter((log) => log.action === "hold").length
    },
    issueRisks,
    evidenceSignals: {
      duplicateMediaHashes: duplicateHashes,
      userClusters,
      deviceAttestationClusters: deviceClusters,
      lowGpsEvidence: lowGpsEvidence.map((item) => ({ evidenceId: item.id, gpsAccuracyM: item.gpsAccuracyM, foregroundGps: item.foregroundGps })),
      deviceIntegrityEvidence: deviceIntegrityEvidence.map((item) => ({
        evidenceId: item.id,
        deviceIntegrityStatus: item.deviceIntegrityStatus ?? "unknown",
        deviceIntegrityProvider: item.deviceIntegrityProvider,
        deviceIntegrityCheckedAt: item.deviceIntegrityCheckedAt?.toISOString()
      })),
      pendingRedaction: pendingRedaction.map((item) => ({ evidenceId: item.id, uploadedAt: item.uploadedAt.toISOString() }))
    },
    recentAudit: store.auditLogs.slice(-20).map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }))
  });
}

function duplicateMediaHashes(store: Store) {
  const groups = new Map<string, Evidence[]>();
  for (const evidence of store.evidence) {
    if (evidence.evidenceType === "live_media" && evidence.hash) groups.set(evidence.hash, [...(groups.get(evidence.hash) ?? []), evidence]);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([hash, items]) => ({ hash, count: items.length, evidenceIds: items.map((item) => item.id) }));
}

function reportUserClusters(store: Store) {
  const groups = new Map<string, ReportRecord[]>();
  for (const report of store.reports) {
    if (!report.userId) continue;
    groups.set(report.userId, [...(groups.get(report.userId) ?? []), report]);
  }
  return [...groups.entries()]
    .filter(([, reports]) => reports.length >= 2)
    .map(([userId, reports]) => ({
      userBucket: `user_${createHash("sha256").update(userId).digest("hex").slice(0, 12)}`,
      reportCount: reports.length,
      claimIds: reports.map((report) => report.claimId),
      targetRefs: reports.map((report) => ({ targetType: report.targetType, targetId: report.targetId }))
    }));
}

function deviceAttestationClusters(store: Store) {
  const groups = new Map<string, Evidence[]>();
  for (const evidence of store.evidence) {
    if (evidence.deviceAttestationBucket) groups.set(evidence.deviceAttestationBucket, [...(groups.get(evidence.deviceAttestationBucket) ?? []), evidence]);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([deviceBucket, items]) => ({ deviceBucket, count: items.length, evidenceIds: items.map((item) => item.id) }));
}

function getAdminPrivacyDashboard(store: Store, options: AppOptions): ApiResponse {
  const preview = privacyPurgePreview(store, options);
  const liveEvidence = store.evidence.filter((item) => item.evidenceType === "live_media");
  const pendingRedaction = liveEvidence.filter((item) => item.redactionStatus !== "completed");
  const preciseLocation = store.evidence.filter(hasPreciseLocationFields);
  const originalMedia = liveEvidence.filter((item) => item.storageKey);
  return json(200, {
    generatedAt: new Date().toISOString(),
    policy: "private_originals_precise_location_never_public",
    retentionDays: preview.retentionDays,
    summary: {
      heldPrivateClaimCount: store.claims.filter((claim) => claim.visibility === "held_private").length,
      rightsReviewClaimCount: store.claims.filter((claim) => claim.riskLevel === "rights_risk" || claim.sourceProvenance === "rights_violation_report").length,
      pendingRedactionCount: pendingRedaction.length,
      originalMediaStoredCount: originalMedia.length,
      preciseLocationStoredCount: preciseLocation.length,
      privateUploadBufferCount: store.liveUploads.filter((upload) => upload.privateMediaBase64).length
    },
    purgePreview: preview.eligibleCounts,
    pendingRedaction: pendingRedaction.map((item) => ({ evidenceId: item.id, uploadedAt: item.uploadedAt.toISOString(), redactionStatus: item.redactionStatus ?? "pending" })),
    preciseLocationEvidence: preciseLocation.map((item) => ({
      evidenceId: item.id,
      uploadedAt: item.uploadedAt.toISOString(),
      hasGeoCell: Boolean(item.geoCell),
      hasPrivateCoordinate: item.privateLng !== undefined || item.privateLat !== undefined,
      hasGpsAccuracy: item.gpsAccuracyM !== undefined,
      hasDistanceToTarget: item.distanceToTargetM !== undefined
    })),
    rightsQueue: store.claims
      .filter((claim) => claim.visibility === "held_private" || claim.riskLevel === "rights_risk" || claim.sourceProvenance === "rights_violation_report")
      .map(toPublicClaim)
  });
}

function getInternalRedactionQueue(store: Store, rawLimit: string | null, encrypted: boolean): ApiResponse {
  const requestedLimit = Number(rawLimit ?? 1);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 10) : 1;
  const jobs = store.evidence
    .filter((item) =>
      item.evidenceType === "live_media" &&
      item.redactionStatus !== "completed" &&
      item.proofOfPresenceStatus === "pass" &&
      Boolean(item.storageKey) &&
      Boolean(item.hash) &&
      Boolean(item.mediaMimeType)
    )
    .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime())
    .slice(0, limit)
    .map((item) => ({
      evidenceId: item.id,
      storageKey: item.storageKey,
      mediaMimeType: item.mediaMimeType,
      expectedHash: item.hash,
      encrypted,
      uploadedAt: item.uploadedAt.toISOString()
    }));
  return json(200, { jobs });
}

function patchInternalDeviceIntegrity(store: Store, id: string | undefined, body: unknown): ApiResponse {
  const evidence = store.evidence.find((item) => item.id === id && (item.evidenceType === "live_media" || item.evidenceType === "sensor"));
  if (!evidence) return json(404, { error: "evidence_not_found" });
  const data = asObject(body);
  const status = data.deviceIntegrityStatus;
  if (status !== "pass" && status !== "fail" && status !== "unknown") throw new ApiError(400, "device_integrity_status_invalid");
  const provider = readOptionalString(data, "provider");
  if (provider !== "play_integrity" && provider !== "app_attest") throw new ApiError(400, "device_integrity_provider_invalid");
  const proofHash = deviceIntegrityProofHash(data);
  evidence.deviceIntegrityStatus = status;
  evidence.deviceIntegrityProvider = provider;
  evidence.deviceIntegrityCheckedAt = new Date();
  evidence.deviceIntegrityProofHash = proofHash;
  audit(store, status === "pass" ? "correction" : "hold", "evidence", evidence.id, "device integrity result recorded by trusted verifier");
  for (const claim of store.claims.filter((item) => item.evidenceIds.includes(evidence.id))) {
    reconcileOccurrencePublicLocation(store, claim.targetType, claim.targetId);
  }
  return json(200, {
    status: "device_integrity_recorded",
    evidence: {
      id: evidence.id,
      evidenceType: evidence.evidenceType,
      deviceIntegrityStatus: evidence.deviceIntegrityStatus,
      deviceIntegrityProvider: evidence.deviceIntegrityProvider,
      deviceIntegrityCheckedAt: evidence.deviceIntegrityCheckedAt.toISOString(),
      deviceIntegrityProofHash: evidence.deviceIntegrityProofHash
    }
  });
}

function deviceIntegrityProofHash(data: Record<string, unknown>): string {
  const token = readOptionalString(data, "attestationToken");
  if (token) return `sha256-${createHash("sha256").update(token).digest("base64url")}`;
  const hash = readOptionalString(data, "attestationHash");
  if (hash && /^sha256-[A-Za-z0-9_-]{16,}$/.test(hash)) return hash;
  throw new ApiError(400, "device_integrity_proof_required");
}

function patchInternalEvidenceRedaction(store: Store, id: string | undefined, body: unknown): ApiResponse {
  const evidence = store.evidence.find((item) => item.id === id && item.evidenceType === "live_media");
  if (!evidence) return json(404, { error: "evidence_not_found" });
  const data = asObject(body);
  const redactedClipUrl = publicRedactedClipUrl(readOptionalString(data, "redactedClipUrl"));
  if (!redactedClipUrl) throw new ApiError(400, "redactedClipUrl_invalid");
  const redactedPosterUrl = publicRedactedPosterUrl(readOptionalString(data, "redactedPosterUrl"));
  if (!redactedPosterUrl) throw new ApiError(400, "redactedPosterUrl_invalid");
  const proofHash = redactionProofHash(data);
  evidence.publicStorageKey = redactedClipUrl;
  evidence.publicPosterKey = redactedPosterUrl;
  evidence.redactionStatus = "completed";
  evidence.redactionCheckedAt = new Date();
  evidence.redactionProofHash = proofHash;
  audit(store, "mask", "evidence", evidence.id, "redacted public media recorded by trusted worker");
  for (const claim of store.claims.filter((item) => item.evidenceIds.includes(evidence.id))) {
    reconcileOccurrencePublicLocation(store, claim.targetType, claim.targetId);
  }
  return json(200, {
    status: "redaction_recorded",
    evidence: {
      id: evidence.id,
      evidenceType: evidence.evidenceType,
      redactionStatus: evidence.redactionStatus,
      redactionCheckedAt: evidence.redactionCheckedAt.toISOString(),
      redactionProofHash: evidence.redactionProofHash,
      publicMediaUrl: publicRedactedClipUrl(evidence.publicStorageKey),
      publicPosterUrl: publicRedactedPosterUrl(evidence.publicPosterKey)
    }
  });
}

function redactionProofHash(data: Record<string, unknown>): string {
  const proof = readOptionalString(data, "redactionProofToken");
  if (proof) return `sha256-${createHash("sha256").update(proof).digest("base64url")}`;
  const hash = readOptionalString(data, "redactionProofHash");
  if (hash && /^sha256-[A-Za-z0-9_-]{16,}$/.test(hash)) return hash;
  throw new ApiError(400, "redaction_proof_required");
}

function patchAdminClaim(store: Store, id: string | undefined, body: unknown): ApiResponse {
  const claim = store.claims.find((item) => item.id === id);
  if (!claim) return json(404, { error: "claim_not_found" });
  const data = asObject(body);
  claim.riskLevel = readRiskLevel(data, "riskLevel", claim.riskLevel);
  const visibility = readClaimVisibility(data, "visibility");
  const normalizedStatement = readOptionalString(data, "normalizedStatement");
  if (normalizedStatement) claim.normalizedStatement = normalizedStatement;
  const redactedClipUrl = readOptionalString(data, "redactedClipUrl");
  if (redactedClipUrl) throw new ApiError(400, "redaction_worker_required");
  const liveEvidence = claim.evidenceIds
    .map((evidenceId) => store.evidence.find((item) => item.id === evidenceId))
    .filter((evidence): evidence is Evidence => evidence?.evidenceType === "live_media");
  if (visibility === "public" && liveEvidence.some((evidence) => !hasCompletedRedaction(evidence))) {
    throw new ApiError(400, "live_redaction_required");
  }
  if (visibility === "public" && liveEvidence.some((evidence) => !hasTrustedDeviceIntegrity(evidence))) {
    throw new ApiError(400, "device_integrity_required");
  }
  const fieldVerificationEvidence = claim.fieldVerification
    ? claim.evidenceIds
        .map((evidenceId) => store.evidence.find((item) => item.id === evidenceId))
        .filter((evidence): evidence is Evidence => evidence?.evidenceType === "sensor")
    : [];
  if (visibility === "public" && claim.fieldVerification && (!fieldVerificationEvidence.length || fieldVerificationEvidence.some((evidence) => !hasTrustedDeviceIntegrity(evidence)))) {
    throw new ApiError(400, "device_integrity_required");
  }
  if (visibility) setClaimVisibility(store, claim, visibility);
  reconcileOccurrencePublicLocation(store, claim.targetType, claim.targetId);
  audit(store, "correction", "claim", claim.id, readOptionalString(data, "publicReason") ?? "admin reviewed Claim");
  return json(200, { status: "claim_reviewed", claim: toPublicClaim(claim) });
}

function postReconcileLifecycle(store: Store, body: unknown): ApiResponse {
  const data = asObject(body);
  const id = readString(data, "targetId");
  const occurrence = store.occurrences.find((item) => item.id === id);
  if (!occurrence) return json(404, { error: "occurrence_not_found" });
  const proofCount = occurrence.evidenceIds
    .map((evidenceId) => store.evidence.find((item) => item.id === evidenceId))
    .filter((item) => item?.proofOfPresenceStatus === "pass").length;

  if (proofCount > 0 && occurrence.lifecycleState === "UNKNOWN") {
    occurrence.lifecycleState = "LIVE";
    audit(store, "state_change", "occurrence", occurrence.id, "proof-of-presence evidence moved UNKNOWN to LIVE");
    queueNotifications(store, "state_changed", "occurrence", occurrence.id, "상태 변화", `${occurrence.title}이 진행 중으로 전환됐습니다.`);
  }
  return json(200, { status: "reconciled", lifecycleState: occurrence.lifecycleState, proofCount });
}

function postNotificationDispatch(store: Store): ApiResponse {
  const now = new Date();
  const due = store.notificationOutbox.filter((item) => item.status === "pending" && item.scheduledFor <= now);
  for (const notification of due) {
    notification.status = "sent";
    notification.sentAt = now;
    audit(store, "notification", notification.targetType, notification.targetId, "notification outbox marked sent by local dispatcher");
  }
  // ponytail: external push providers are wired later; local dispatch still closes due outbox items so cron is idempotent.
  return json(200, {
    status: "local_dispatch_completed",
    dispatchedCount: due.length,
    pendingCount: store.notificationOutbox.filter((item) => item.status === "pending").length,
    notifications: due
  });
}

async function postPrivacyPurgeExpired(store: Store, options: AppOptions): Promise<ApiResponse> {
  const preview = privacyPurgePreview(store, options);
  const cutoffs = privacyCutoffs(options);
  let statementsCleared = 0;
  let evidenceCleared = 0;
  let originalMediaCleared = 0;
  let liveUploadBuffersCleared = 0;
  const originalMediaToDelete = store.evidence.filter((evidence) => {
    const mediaBefore = evidence.redactionStatus === "completed" ? cutoffs.verifiedMediaBefore : cutoffs.unverifiedMediaBefore;
    return evidence.evidenceType === "live_media" && Boolean(evidence.storageKey) && evidence.uploadedAt.getTime() < mediaBefore;
  });

  if (options.liveMediaStorage?.delete) {
    try {
      await Promise.all(originalMediaToDelete.map((evidence) => options.liveMediaStorage!.delete!(evidence.storageKey!)));
    } catch {
      throw new ApiError(503, "privacy_purge_storage_unavailable");
    }
  }

  for (const claim of store.claims) {
    if (claim.statement && claim.createdAt.getTime() < cutoffs.rawBefore) {
      claim.statement = "";
      statementsCleared += 1;
    }
  }
  for (const evidence of store.evidence) {
    if (evidence.uploadedAt.getTime() < cutoffs.preciseBefore) {
      if (hasPreciseLocationFields(evidence)) evidenceCleared += 1;
      evidence.geoCell = undefined;
      evidence.privateLng = undefined;
      evidence.privateLat = undefined;
      evidence.gpsAccuracyM = undefined;
      evidence.distanceToTargetM = undefined;
    }
    if (originalMediaToDelete.includes(evidence)) {
      evidence.storageKey = undefined;
      evidence.hash = undefined;
      originalMediaCleared += 1;
    }
  }
  for (const upload of store.liveUploads) {
    if (upload.privateMediaBase64 && upload.uploadedAt.getTime() < cutoffs.unverifiedMediaBefore) {
      upload.privateMediaBase64 = undefined;
      liveUploadBuffersCleared += 1;
    }
  }

  const auditBeforeCount = store.auditLogs.length;
  store.auditLogs = store.auditLogs.filter((log) => log.createdAt.getTime() >= cutoffs.auditBefore);
  return json(200, {
    status: "privacy_purge_completed",
    previewBeforePurge: preview.eligibleCounts,
    statementsCleared,
    evidenceCleared,
    originalMediaCleared,
    liveUploadBuffersCleared,
    auditLogsDeleted: auditBeforeCount - store.auditLogs.length
  });
}

function privacyPurgePreview(store: Store, options: AppOptions) {
  const cutoffs = privacyCutoffs(options);
  return {
    retentionDays: cutoffs.retentionDays,
    eligibleCounts: {
      rawStatements: store.claims.filter((claim) => claim.statement && claim.createdAt.getTime() < cutoffs.rawBefore).length,
      preciseLocationFields: store.evidence.filter((evidence) => hasPreciseLocationFields(evidence) && evidence.uploadedAt.getTime() < cutoffs.preciseBefore).length,
      originalMedia: store.evidence.filter((evidence) => {
        const mediaBefore = evidence.redactionStatus === "completed" ? cutoffs.verifiedMediaBefore : cutoffs.unverifiedMediaBefore;
        return evidence.evidenceType === "live_media" && Boolean(evidence.storageKey) && evidence.uploadedAt.getTime() < mediaBefore;
      }).length,
      liveUploadBuffers: store.liveUploads.filter((upload) => upload.privateMediaBase64 && upload.uploadedAt.getTime() < cutoffs.unverifiedMediaBefore).length,
      auditLogs: store.auditLogs.filter((log) => log.createdAt.getTime() < cutoffs.auditBefore).length
    }
  };
}

function privacyCutoffs(options: AppOptions) {
  const now = Date.now();
  const retentionDays = {
    rawClaimStatementDays: options.retention?.rawClaimStatementDays ?? 30,
    unverifiedOriginalMediaDays: options.retention?.unverifiedOriginalMediaDays ?? 30,
    verifiedOriginalMediaDays: options.retention?.verifiedOriginalMediaDays ?? 180,
    preciseLocationDays: options.retention?.preciseLocationDays ?? 30,
    auditLogDays: options.retention?.auditLogDays ?? 3650
  };
  return {
    retentionDays,
    rawBefore: now - retentionDays.rawClaimStatementDays * dayMs,
    unverifiedMediaBefore: now - retentionDays.unverifiedOriginalMediaDays * dayMs,
    verifiedMediaBefore: now - retentionDays.verifiedOriginalMediaDays * dayMs,
    preciseBefore: now - retentionDays.preciseLocationDays * dayMs,
    auditBefore: now - retentionDays.auditLogDays * dayMs
  };
}

function hasPreciseLocationFields(evidence: Evidence): boolean {
  return Boolean(evidence.geoCell) || evidence.privateLng !== undefined || evidence.privateLat !== undefined || evidence.gpsAccuracyM !== undefined || evidence.distanceToTargetM !== undefined;
}

function getTransparencyMonthly(store: Store): ApiResponse {
  const counts: Record<string, number> = {};
  for (const log of store.auditLogs) counts[log.action] = (counts[log.action] ?? 0) + 1;
  return json(200, { month: new Date().toISOString().slice(0, 7), counts });
}

function toPublicLawItem(store: Store, law: LawItem) {
  const lastUpdatedAt = latestDate([
    law.proposedDate,
    law.statusDate,
    law.effectiveDate
  ]);
  const membership = store.lawGroupMemberships.find((item) => item.lawItemId === law.id);
  const approvedLinks = law.lawGroupId ? approvedIssueLawGroupLinks(store).filter((link) => link.lawGroupId === law.lawGroupId) : [];
  const linkedIssueIds = uniqueStrings(approvedLinks.map((link) => link.issueId));
  const linkedTargets = new Map<string, ReturnType<typeof issueTargets>[number]>();
  for (const issueId of linkedIssueIds) for (const target of issueTargets(store, issueId)) linkedTargets.set(`${target.targetType}:${target.target.id}`, target);
  const linkedRegions = new Set([...linkedTargets.values()].map(({ target }) => publicTargetRegionLabel(target)).filter(Boolean));
  const relatedIssueActivityScore = linkedIssueIds.length * 10 + linkedTargets.size * 25 + linkedRegions.size * 20;
  return {
    id: law.id,
    source: law.source,
    lawName: law.lawName,
    billTitle: law.billTitle,
    stage: law.stage,
    proposedDate: law.proposedDate?.toISOString(),
    statusDate: law.statusDate?.toISOString(),
    effectiveDate: law.effectiveDate?.toISOString(),
    assemblyBillId: law.assemblyBillId,
    assemblyBillNo: law.assemblyBillNo,
    lawId: law.lawId,
    proposer: law.proposer,
    proposalSummary: cleanOfficialProposalSummary(law.proposalSummary),
    lawGroupId: law.lawGroupId,
    summary: law.summary,
    officialUrl: law.officialUrl,
    keywords: law.keywords,
    linkedIssueCount: linkedIssueIds.length,
    relatedTargetCount: linkedTargets.size,
    occurrenceCount: linkedTargets.size,
    regionCount: linkedRegions.size,
    recentClaimCount: 0,
    scheduleProximityScore: lawScheduleProximityScore(law),
    interestScore: relatedIssueActivityScore,
    relatedIssueActivityScore,
    coreTopicKey: membership?.coreTopicKey,
    coreTopicLabel: membership?.coreTopicLabel,
    lastUpdatedAt: lastUpdatedAt?.toISOString()
  };
}

function cleanOfficialProposalSummary(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/^\s*(제안이유\s*및\s*주요내용|제안이유|주요내용)\s*[:：-]?\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lawScheduleProximityScore(law: LawItem): number {
  const date = law.effectiveDate ?? law.statusDate ?? law.proposedDate;
  if (!date) return 0;
  const days = Math.abs(Date.now() - date.getTime()) / dayMs;
  if (days <= 7) return 30;
  if (days <= 30) return 18;
  if (days <= 90) return 8;
  return 1;
}

function publicClaimsForIssueIds(store: Store, issueIds: Set<string>): Claim[] {
  const claims = new Map<string, Claim>();
  for (const issueId of issueIds) {
    for (const claim of publicClaimsForTarget(store, "issue", issueId)) claims.set(claim.id, claim);
    for (const { targetType, target } of issueTargets(store, issueId)) {
      for (const claim of publicClaimsForTarget(store, targetType, target.id)) claims.set(claim.id, claim);
    }
  }
  return [...claims.values()];
}

function approvedIssueLawGroupLinks(store: Store): IssueLawGroupLink[] {
  return store.issueLawGroupLinks.filter((link) => link.status === "approved");
}

function refreshIssueLawGroupLinks(store: Store): void {
  const next = new Map<string, IssueLawGroupLink>();
  const validClaimIds = new Set(store.claims.filter(isPublicClaim).map((claim) => claim.id));
  for (const link of store.issueLawGroupLinks) {
    if (!store.issues.some((issue) => issue.id === link.issueId) || !store.lawGroups.some((group) => group.id === link.lawGroupId)) continue;
    next.set(`${link.issueId}:${link.lawGroupId}`, { ...link, claimIds: uniqueStrings(link.claimIds.filter((id) => validClaimIds.has(id))) });
  }

  for (const group of store.lawGroups) {
    for (const issue of store.issues) {
      const match = matchLawGroupToIssue(store, group, issue);
      if (!match) continue;
      const key = `${issue.id}:${group.id}`;
      const existing = next.get(key);
      next.set(key, {
        issueId: issue.id,
        lawGroupId: group.id,
        matchBasis: existing?.matchBasis === "manual" ? "manual" : match.matchBasis,
        confidence: higherConfidence(existing?.confidence, match.confidence),
        status: existing?.status ?? "candidate",
        reviewedAt: existing?.reviewedAt,
        reviewNote: existing?.reviewNote,
        claimIds: uniqueStrings([...(existing?.claimIds ?? []), ...match.claimIds.filter((id) => validClaimIds.has(id))])
      });
    }
  }
  store.issueLawGroupLinks = [...next.values()];
}

function synchronizeLawGroups(store: Store, recordChanges: boolean): void {
  store.lawGroups ??= [];
  store.lawGroupMemberships ??= [];
  store.issueLawGroupLinks ??= [];
  store.legacyLawTopicAliases ??= {};
  const previousGroups = new Map(store.lawGroups.map((group) => [group.id, group]));
  const previousMemberships = new Map(store.lawGroupMemberships.map((membership) => [membership.lawItemId, membership]));
  const next = buildLawGroups(store.lawItems);

  for (const law of store.lawItems) {
    const assignment = next.assignments.get(law.id);
    law.lawGroupId = assignment?.groupId;
    delete law.primaryLawTopicId;
    delete law.topicKeywords;
  }
  store.lawGroups = next.groups;
  store.lawGroupMemberships = next.memberships;
  if (!recordChanges) return;

  for (const group of next.groups) {
    const previous = previousGroups.get(group.id);
    if (!previous) audit(store, "state_change", "law_group", group.id, `동일 공식 법안명 '${group.billTitle}' 그룹이 생성되었습니다.`);
    else if (JSON.stringify(previous.coreTopics) !== JSON.stringify(group.coreTopics)) {
      audit(store, "correction", "law_group", group.id, `소속 의안의 공식 제안요약을 반영해 '${group.billTitle}' 그룹 핵심 논점이 갱신되었습니다.`);
    }
  }
  for (const membership of next.memberships) {
    const previous = previousMemberships.get(membership.lawItemId);
    if (!previous || previous.lawGroupId === membership.lawGroupId) continue;
    audit(store, "split", "law_group", previous.lawGroupId, "공식 법안명 변경으로 의안이 기존 그룹에서 분리되었습니다.");
    audit(store, "merge", "law_group", membership.lawGroupId, "정규화된 공식 법안명이 일치하여 의안이 이 그룹에 편입되었습니다.");
  }
  for (const previous of previousGroups.values()) {
    if (!next.groups.some((group) => group.id === previous.id)) {
      audit(store, "merge", "law_group", previous.id, "소속 의안이 다른 동일 법안명 그룹으로 이동해 기존 그룹이 병합되었습니다.");
    }
  }
}

function matchLawGroupToIssue(
  store: Store,
  group: LawGroup,
  issue: Issue
): { matchBasis: IssueLawGroupLink["matchBasis"]; confidence: IssueLawGroupLink["confidence"]; claimIds: string[] } | undefined {
  const directText = normalizeSearchText(`${issue.title} ${issue.topicTags.join(" ")}`);
  const claims = publicClaimsForIssueIds(store, new Set([issue.id]));
  const claimMatches = (term: string) => claims.filter((claim) => normalizeSearchText(claim.normalizedStatement).includes(term)).map((claim) => claim.id);
  for (const { term, matchBasis } of lawGroupSearchTerms(group)) {
    const normalizedTerm = normalizeSearchText(term);
    if (normalizedTerm.length < 2) continue;
    if (directText.includes(normalizedTerm)) return { matchBasis, confidence: "high", claimIds: claimMatches(normalizedTerm) };
    const claimIds = claimMatches(normalizedTerm);
    if (claimIds.length > 0) return { matchBasis, confidence: "medium", claimIds };
  }
  return undefined;
}

function lawGroupSearchTerms(group: LawGroup): Array<{ term: string; matchBasis: IssueLawGroupLink["matchBasis"] }> {
  return [
    ...group.coreTopics.flatMap((topic) => [topic.label, ...topic.representativeKeywords]).map((term) => ({ term, matchBasis: "core_topic" as const })),
    { term: group.billTitle, matchBasis: "group_title" as const },
    { term: group.lawName, matchBasis: "law_name" as const }
  ];
}

function higherConfidence(left: IssueLawGroupLink["confidence"] | undefined, right: IssueLawGroupLink["confidence"]): IssueLawGroupLink["confidence"] {
  const rank = { low: 0, medium: 1, high: 2 };
  return left && rank[left] > rank[right] ? left : right;
}

function getAdminLawGroupLinkCandidates(store: Store): ApiResponse {
  return json(200, {
    candidates: store.issueLawGroupLinks
      .filter((link) => link.status === "candidate")
      .map((link) => ({
        link,
        group: store.lawGroups.find((group) => group.id === link.lawGroupId),
        issue: store.issues.find((issue) => issue.id === link.issueId)
      }))
      .filter((item) => item.group && item.issue)
  });
}

function patchAdminLawGroupLink(store: Store, issueId: string | undefined, lawGroupId: string | undefined, body: unknown): ApiResponse {
  const link = store.issueLawGroupLinks.find((item) => item.issueId === issueId && item.lawGroupId === lawGroupId);
  if (!link) return json(404, { error: "law_group_link_candidate_not_found" });
  const data = asObject(body);
  const status = readString(data, "status");
  if (status !== "approved" && status !== "rejected") throw new ApiError(400, "law_group_link_status_invalid");
  link.status = status;
  link.reviewedAt = new Date();
  link.reviewNote = readOptionalString(data, "reviewNote");
  audit(store, "state_change", "law_group", link.lawGroupId, `이슈 '${link.issueId}' 그룹 연결 후보가 ${status === "approved" ? "승인" : "거절"}되었습니다.`);
  return json(200, { link });
}

function getAdminOccurrenceIssueLinkCandidates(store: Store): ApiResponse {
  return json(200, {
    candidates: store.occurrenceIssueLinks
      .filter((link) => link.status === "candidate")
      .map((link) => ({
        link,
        occurrence: store.occurrences.find((occurrence) => occurrence.id === link.occurrenceId),
        issue: store.issues.find((issue) => issue.id === link.issueId),
        claims: link.supportingClaimIds.map((id) => store.claims.find((claim) => claim.id === id)).filter((claim): claim is Claim => Boolean(claim)).map(toPublicClaim)
      }))
      .filter((item) => item.occurrence && item.issue)
  });
}

function patchAdminOccurrenceIssueLink(store: Store, occurrenceId: string | undefined, issueId: string | undefined, body: unknown): ApiResponse {
  const link = store.occurrenceIssueLinks.find((item) => item.occurrenceId === occurrenceId && item.issueId === issueId);
  if (!link) return json(404, { error: "occurrence_issue_link_candidate_not_found" });
  const data = asObject(body);
  const status = readString(data, "status");
  if (status !== "approved" && status !== "rejected") throw new ApiError(400, "occurrence_issue_link_status_invalid");
  link.status = status;
  link.reviewedAt = new Date();
  link.reviewNote = readOptionalString(data, "reviewNote");
  const occurrence = store.occurrences.find((item) => item.id === link.occurrenceId);
  if (occurrence) occurrence.issueId = primaryApprovedIssueId(store, occurrence);
  audit(store, status === "approved" ? "merge" : "hold", "occurrence", link.occurrenceId, `주제 '${link.issueId}' 이벤트 연결 후보가 ${status === "approved" ? "승인" : "거절"}되었습니다.`);
  return json(200, { link });
}

const newsMonthlyCallLimit = 20_000;
const activeNewsProvider = "publisher_rss" as const;

function getInternalNewsIngestBudget(store: Store): ApiResponse {
  const month = new Date().toISOString().slice(0, 7);
  const usage = store.newsProviderUsage.find((item) => item.provider === activeNewsProvider && item.month === month);
  const callCount = usage?.callCount ?? 0;
  return json(200, { provider: activeNewsProvider, month, callCount, limit: newsMonthlyCallLimit, remaining: Math.max(0, newsMonthlyCallLimit - callCount) });
}

function postInternalNewsIngestUsage(store: Store, body: unknown): ApiResponse {
  const data = asObject(body);
  if (readString(data, "provider") !== activeNewsProvider) throw new ApiError(400, "news_provider_invalid");
  const month = readString(data, "month");
  if (!/^\d{4}-\d{2}$/.test(month) || month !== new Date().toISOString().slice(0, 7)) throw new ApiError(422, "news_usage_month_invalid");
  const callCount = readNumber(data, "callCount");
  if (!callCount || !Number.isInteger(callCount) || callCount < 1 || callCount > 100) throw new ApiError(422, "news_usage_call_count_invalid");
  let usage = store.newsProviderUsage.find((item) => item.provider === activeNewsProvider && item.month === month);
  if (!usage) {
    usage = { provider: activeNewsProvider, month, callCount: 0, updatedAt: new Date() };
    store.newsProviderUsage.push(usage);
  }
  usage.callCount = Math.min(newsMonthlyCallLimit, usage.callCount + callCount);
  usage.updatedAt = new Date();
  return getInternalNewsIngestBudget(store);
}

function postInternalIngestNews(store: Store, body: unknown): ApiResponse {
  const data = asObject(body);
  if (readString(data, "provider") !== activeNewsProvider) throw new ApiError(400, "news_provider_invalid");
  const lawGroupId = readString(data, "lawGroupId");
  const group = store.lawGroups.find((item) => item.id === lawGroupId);
  if (!group) throw new ApiError(404, "law_group_not_found");
  const coreTopicKey = readOptionalString(data, "coreTopicKey") ?? "_group";
  const coreTopic = group.coreTopics.find((item) => item.key === coreTopicKey);
  if (coreTopicKey !== "_group" && !coreTopic) throw new ApiError(422, "news_core_topic_invalid");

  const sourceUrl = safeExternalNewsUrl(readString(data, "sourceUrl"))!;
  const aggregatorUrl = safeExternalNewsUrl(readOptionalString(data, "aggregatorUrl"), true);
  const sourcePublishedAt = readDate(data, "publishedAt");
  if (sourcePublishedAt.getTime() > Date.now() + dayMs) throw new ApiError(422, "news_published_at_invalid");
  const sourceTitle = readString(data, "sourceTitle").replace(/\s+/g, " ").trim().slice(0, 300);
  const publisherLabel = newsPublisherLabel(readOptionalString(data, "publisherLabel"), sourceUrl);
  const externalId = (readOptionalString(data, "providerItemId") ?? createHash("sha256").update(sourceUrl).digest("hex")).slice(0, 160);
  let evidence = store.evidence.find((item) => item.externalProvider === activeNewsProvider && item.externalId === externalId);
  const created = !evidence;
  if (!evidence) {
    evidence = {
      id: `evidence_news_${createHash("sha1").update(`${activeNewsProvider}:${externalId}`).digest("hex").slice(0, 16)}`,
      evidenceType: "media_link",
      uploadedAt: new Date(),
      redactionStatus: "not_required",
      proofOfPresenceStatus: "material_only",
      externalProvider: activeNewsProvider,
      externalId,
      sourceUrl,
      aggregatorUrl,
      publisherLabel,
      sourcePublishedAt,
      sourceTitle,
      publicSummary: coreTopic
        ? `${group.lawName}의 '${coreTopic.label}' 쟁점과 관련된 언론 보도입니다.`
        : `${group.billTitle} 개정 논의와 관련된 언론 보도입니다.`,
      newsDirectBillMatch: data.directBillMatch === true
    };
    store.evidence.push(evidence);
  } else {
    evidence.aggregatorUrl = aggregatorUrl ?? evidence.aggregatorUrl;
    evidence.publisherLabel = publisherLabel;
    evidence.sourcePublishedAt = sourcePublishedAt;
    evidence.sourceTitle = sourceTitle;
    evidence.newsDirectBillMatch ||= data.directBillMatch === true;
  }

  const candidateId = `news_candidate_${createHash("sha1").update(`${lawGroupId}:${coreTopicKey}`).digest("hex").slice(0, 16)}`;
  let candidate = store.newsIssueCandidates.find((item) => item.id === candidateId);
  if (!candidate) {
    const now = new Date();
    candidate = {
      id: candidateId,
      lawGroupId,
      coreTopicKey,
      suggestedTitle: coreTopic ? `${group.lawName} ${coreTopic.label} 논의` : `${group.lawName} 개정 논의`,
      pendingEvidenceIds: [],
      approvedEvidenceIds: [],
      rejectedEvidenceIds: [],
      status: "candidate",
      createdAt: now,
      updatedAt: now
    };
    store.newsIssueCandidates.push(candidate);
    audit(store, "hold", "news_candidate", candidate.id, `법안 그룹 '${group.billTitle}'의 뉴스 이슈 후보가 비공개로 생성되었습니다.`);
  }
  const alreadyReviewed = candidate.approvedEvidenceIds.includes(evidence.id) || candidate.rejectedEvidenceIds.includes(evidence.id);
  if (!alreadyReviewed && !candidate.pendingEvidenceIds.includes(evidence.id)) {
    candidate.pendingEvidenceIds.push(evidence.id);
    candidate.status = "candidate";
    candidate.updatedAt = new Date();
    audit(store, "hold", "evidence", evidence.id, "언론 보도 링크를 법안 이슈 후보에 추가하고 검토 전 비공개로 보류했습니다.");
  }
  recordPublicSourceRefresh(store, data, 1);
  reconcileEvidenceSynthesizedTopics(store);
  return json(created ? 201 : 200, {
    status: created ? "news_evidence_received" : "news_evidence_refreshed",
    candidate: toAdminNewsCandidate(store, candidate)
  });
}

const evidenceSynthesisLookbackMs = 30 * dayMs;

export function reconcileEvidenceSynthesizedTopics(store: Store, now = new Date()): number {
  let changeCount = 0;
  for (const group of store.lawGroups) {
    const candidates = store.newsIssueCandidates.filter((candidate) => candidate.lawGroupId === group.id);
    if (candidates.length === 0) continue;
    const rejectedIds = new Set(candidates.flatMap((candidate) => candidate.rejectedEvidenceIds));
    const evidenceById = new Map<string, { evidence: Evidence; candidate: NewsIssueCandidate }>();
    for (const candidate of candidates) {
      for (const evidenceId of [...candidate.pendingEvidenceIds, ...candidate.approvedEvidenceIds]) {
        if (rejectedIds.has(evidenceId) || evidenceById.has(evidenceId)) continue;
        const evidence = store.evidence.find((item) => item.id === evidenceId && item.evidenceType === "media_link");
        if (!evidence?.publisherLabel || !evidence.sourcePublishedAt || !evidence.sourceUrl) continue;
        if (now.getTime() - evidence.sourcePublishedAt.getTime() > evidenceSynthesisLookbackMs) continue;
        evidenceById.set(evidenceId, { evidence, candidate });
      }
    }
    const entries = [...evidenceById.values()];
    const publisherCount = new Set(entries.map(({ evidence }) => evidence.publisherLabel)).size;
    if (entries.length < 2) continue;

    const candidateEvidenceCounts = candidates.map((candidate) => ({
      candidate,
      count: entries.filter((entry) => entry.candidate.id === candidate.id).length
    })).filter((item) => item.count > 0).sort((left, right) => right.count - left.count);
    const title = `${group.lawName} 관련 주요 쟁점`;
    const topicLabels = candidateEvidenceCounts
      .map(({ candidate }) => group.coreTopics.find((topic) => topic.key === candidate.coreTopicKey)?.label)
      .filter((label): label is string => Boolean(label));
    const topicTags = uniqueStrings([group.lawName, ...topicLabels, ...candidateEvidenceCounts.flatMap(({ candidate }) => {
      const topic = group.coreTopics.find((item) => item.key === candidate.coreTopicKey);
      return topic?.representativeKeywords ?? [];
    })]).slice(0, 10);
    const linkedSynthesizedIssueId = store.issueLawGroupLinks.find((link) => link.lawGroupId === group.id && link.status === "approved"
      && store.issues.some((issue) => issue.id === link.issueId && issue.synthesisBasis === "evidence_aggregate"))?.issueId;
    const existingIssue = store.issues.find((issue) => issue.id === linkedSynthesizedIssueId)
      ?? store.issues.find((issue) => issue.kind === "topic" && issue.title === title);
    const issue = existingIssue ?? ensureIssue(store, {
      title,
      topicTags
    });
    if (issue.synthesisBasis !== "evidence_aggregate") {
      issue.synthesisBasis = "evidence_aggregate";
      audit(store, "state_change", "issue", issue.id, `언론 보도 근거 ${entries.length}건(발행사 ${publisherCount}곳)을 종합하는 주제로 전환했습니다.`);
      changeCount += 1;
    }
    const mergedTopicTags = uniqueStrings([...issue.topicTags, ...topicTags]).slice(0, 10);
    if (mergedTopicTags.join("|") !== issue.topicTags.join("|")) {
      issue.topicTags = mergedTopicTags;
      audit(store, "correction", "issue", issue.id, "새 공개 근거에서 확인된 공통 쟁점어를 주제에 추가했습니다.");
      changeCount += 1;
    }
    issue.status = "active";
    issue.firstSeenAt = earliestDate([issue.firstSeenAt, ...entries.map(({ evidence }) => evidence.sourcePublishedAt)]) ?? issue.firstSeenAt;
    issue.lastUpdatedAt = latestDate([issue.lastUpdatedAt, ...entries.map(({ evidence }) => evidence.sourcePublishedAt)]) ?? issue.lastUpdatedAt;

    const claimIds: string[] = [];
    for (const { evidence, candidate } of entries) {
      let claim = store.claims.find((item) => item.targetType === "issue" && item.targetId === issue.id && item.evidenceIds.includes(evidence.id));
      if (!claim) {
        const coreTopic = group.coreTopics.find((topic) => topic.key === candidate.coreTopicKey);
        claim = addClaim(store, {
          visibility: "public",
          targetType: "issue",
          targetId: issue.id,
          sourceProvenance: "media_report",
          claimantLabel: evidence.publisherLabel!,
          statement: evidence.sourceTitle ?? "",
          normalizedStatement: coreTopic
            ? `${group.lawName}의 '${coreTopic.label}' 쟁점을 다룬 언론 보도입니다.`
            : `${group.lawName} 관련 쟁점을 다룬 언론 보도입니다.`,
          evidenceStrength: "single_source",
          riskLevel: "misleading_possible",
          evidenceIds: [evidence.id]
        });
        claim.occurredAt = evidence.sourcePublishedAt;
        audit(store, "correction", "claim", claim.id, "다중 출처 주제 합성에 사용된 언론 근거를 출처별 Claim으로 공개했습니다.");
        changeCount += 1;
      }
      claimIds.push(claim.id);
    }

    changeCount += upsertIssueSynthesisSnapshot(store, issue, group, entries, claimIds, now);

    for (const candidate of candidates) {
      const approvedNow = candidate.pendingEvidenceIds.filter((id) => evidenceById.has(id));
      if (approvedNow.length === 0) continue;
      candidate.pendingEvidenceIds = candidate.pendingEvidenceIds.filter((id) => !evidenceById.has(id));
      candidate.approvedEvidenceIds = uniqueStrings([...candidate.approvedEvidenceIds, ...approvedNow]);
      candidate.issueId = issue.id;
      candidate.status = "approved";
      candidate.reviewedAt = now;
      candidate.updatedAt = now;
      candidate.reviewNote = `언론 보도 근거 ${entries.length}건(발행사 ${publisherCount}곳)의 공통 법안 쟁점으로 자동 종합`;
      audit(store, "state_change", "news_candidate", candidate.id, `같은 법안 그룹의 언론 보도 근거 ${entries.length}건을 주제 근거에 포함했습니다.`);
      changeCount += 1;
    }

    let link = store.issueLawGroupLinks.find((item) => item.issueId === issue.id && item.lawGroupId === group.id);
    if (!link) {
      link = {
        issueId: issue.id,
        lawGroupId: group.id,
        matchBasis: "law_name",
        confidence: "high",
        status: "approved",
        claimIds: [],
        reviewedAt: now,
        reviewNote: `언론 보도 근거 ${entries.length}건(발행사 ${publisherCount}곳)의 공통 법안 쟁점`
      };
      store.issueLawGroupLinks.push(link);
      changeCount += 1;
    }
    const nextClaimIds = uniqueStrings([...link.claimIds, ...claimIds]);
    if (link.status !== "approved" || nextClaimIds.length !== link.claimIds.length) {
      link.status = "approved";
      link.confidence = "high";
      link.reviewedAt = now;
      link.reviewNote = `언론 보도 근거 ${entries.length}건(발행사 ${publisherCount}곳)의 공통 법안 쟁점`;
      link.claimIds = nextClaimIds;
      audit(store, "state_change", "law_group", group.id, `근거 종합 주제 '${issue.id}'를 법안 그룹에 연결했습니다.`);
      changeCount += 1;
    }
  }
  changeCount += reconcileOccurrenceLinksFromEvidence(store);
  changeCount += reconcileIssueLifecycle(store, now);
  return changeCount;
}

function upsertIssueSynthesisSnapshot(
  store: Store,
  issue: Issue,
  group: LawGroup,
  entries: Array<{ evidence: Evidence; candidate: NewsIssueCandidate }>,
  claimIds: string[],
  now: Date
): number {
  const facets = [...new Set(entries.map((entry) => entry.candidate.coreTopicKey))]
    .filter((key) => key !== "_group")
    .map((coreTopicKey) => {
      const topic = group.coreTopics.find((item) => item.key === coreTopicKey);
      const matching = entries.filter((entry) => entry.candidate.coreTopicKey === coreTopicKey);
      const evidenceIds = matching.map((entry) => entry.evidence.id);
      const matchingClaimIds = store.claims
        .filter((claim) => claim.targetType === "issue" && claim.targetId === issue.id && claim.evidenceIds.some((id) => evidenceIds.includes(id)))
        .map((claim) => claim.id);
      return {
        coreTopicKey,
        label: topic?.label ?? "세부 논점 확인 중",
        evidenceCount: evidenceIds.length,
        publisherCount: new Set(matching.map((entry) => entry.evidence.publisherLabel)).size,
        claimIds: uniqueStrings(matchingClaimIds),
        evidenceIds: uniqueStrings(evidenceIds)
      };
    })
    .sort((left, right) => right.evidenceCount - left.evidenceCount || right.publisherCount - left.publisherCount || left.label.localeCompare(right.label, "ko"));
  const evidenceIds = uniqueStrings(entries.map((entry) => entry.evidence.id));
  const publishers = uniqueStrings(entries.map((entry) => entry.evidence.publisherLabel).filter((value): value is string => Boolean(value)));
  const windowStartedAt = earliestDate(entries.map((entry) => entry.evidence.sourcePublishedAt)) ?? now;
  const windowEndedAt = latestDate(entries.map((entry) => entry.evidence.sourcePublishedAt)) ?? now;
  const neutralSummary = facets.length
    ? `${group.lawName} 관련 보도에서 ${facets.slice(0, 3).map((facet) => facet.label).join("·")} 논점이 함께 확인됩니다.`
    : `${group.lawName} 관련 공개 보도들을 종합해 확인 중인 주제입니다.`;
  const snapshot: IssueSynthesisSnapshot = {
    issueId: issue.id,
    version: "law-group-evidence-v1",
    method: "law_group_evidence_aggregate",
    neutralSummary,
    windowStartedAt,
    windowEndedAt,
    generatedAt: now,
    evidenceCount: evidenceIds.length,
    publisherCount: publishers.length,
    claimIds: uniqueStrings(claimIds),
    evidenceIds,
    facets
  };
  const previousIndex = store.issueSynthesisSnapshots.findIndex((item) => item.issueId === issue.id);
  const previous = previousIndex >= 0 ? store.issueSynthesisSnapshots[previousIndex] : undefined;
  const comparable = (item: IssueSynthesisSnapshot | undefined) => item ? JSON.stringify({
    version: item.version,
    neutralSummary: item.neutralSummary,
    evidenceCount: item.evidenceCount,
    publisherCount: item.publisherCount,
    claimIds: item.claimIds,
    evidenceIds: item.evidenceIds,
    facets: item.facets
  }) : "";
  if (comparable(previous) === comparable(snapshot)) return 0;
  if (previousIndex >= 0) store.issueSynthesisSnapshots[previousIndex] = snapshot;
  else store.issueSynthesisSnapshots.push(snapshot);
  audit(store, previous ? "correction" : "state_change", "issue", issue.id, previous
    ? "새 공개 근거를 반영해 주제 합성 요약과 세부 논점을 갱신했습니다."
    : "공개 근거와 출처를 추적할 수 있는 주제 합성 스냅샷을 생성했습니다.");
  return 1;
}

function reconcileIssueLifecycle(store: Store, now = new Date()): number {
  let changed = 0;
  for (const issue of store.issues.filter((item) => item.kind === "topic" && item.synthesisBasis === "evidence_aggregate")) {
    const snapshot = store.issueSynthesisSnapshots.find((item) => item.issueId === issue.id);
    const lastEvidenceAt = snapshot?.windowEndedAt ?? issue.lastUpdatedAt;
    const ageDays = Math.max(0, (now.getTime() - lastEvidenceAt.getTime()) / dayMs);
    const hasCurrentTarget = issueTargets(store, issue.id).some(({ targetType, target }) => targetType === "occurrence"
      ? isOccurrenceWithinPublicDiscoveryWindow(target as Occurrence, now) && !["ENDED", "ARCHIVED", "CANCELED"].includes((target as Occurrence).lifecycleState)
      : !["ENDED", "ARCHIVED"].includes((target as ContinuousPresence).state));
    const nextStatus: Issue["status"] = ageDays >= 90 && !hasCurrentTarget ? "archived" : ageDays >= 30 ? "quiet" : "active";
    if (nextStatus === issue.status) continue;
    issue.status = nextStatus;
    audit(store, "state_change", "issue", issue.id, nextStatus === "quiet"
      ? "30일간 새 공개 근거가 없어 정체 상태로 전환했습니다."
      : nextStatus === "archived"
        ? "90일간 새 공개 근거와 진행 현장이 없어 보관 상태로 전환했습니다."
        : "새 공개 근거 또는 진행 현장이 확인되어 활성 상태로 전환했습니다.");
    changed += 1;
  }
  return changed;
}

function reconcileOccurrenceLinksFromEvidence(store: Store): number {
  let linkedCount = 0;
  const synthesizedIssues = store.issues.filter((issue) => issue.kind === "topic" && issue.synthesisBasis === "evidence_aggregate" && issue.status !== "archived");
  for (const occurrence of store.occurrences) {
    if (isSourceOnlyOccurrence(store, occurrence)) continue;
    const claims = publicClaimsForTarget(store, "occurrence", occurrence.id);
    const evidence = publicEvidenceForClaims(store, claims);
    const corpus = normalizeSearchText([
      ...claims.map((claim) => claim.normalizedStatement),
      ...evidence.flatMap((item) => [item.publicSummary, item.sourceTitle])
    ].filter(Boolean).join(" "));
    if (!corpus) continue;
    const matches = synthesizedIssues.filter((issue) => {
      const link = store.issueLawGroupLinks.find((item) => item.issueId === issue.id && item.status === "approved");
      const group = link ? store.lawGroups.find((item) => item.id === link.lawGroupId) : undefined;
      if (!group) return false;
      const lawMatched = lawNameAliases(group.lawName).some((alias) => corpus.includes(normalizeSearchText(alias)));
      const topicMatched = group.coreTopics.some((topic) => [topic.label, ...topic.representativeKeywords]
        .some((term) => term.length >= 3 && corpus.includes(normalizeSearchText(term))));
      const purposeMatched = /반대|찬성|지지|요구|촉구|규탄|폐지|개정|의혹|검증|보장/.test(corpus);
      return topicMatched || (lawMatched && purposeMatched);
    });
    if (matches.length === 0) continue;
    const supportingClaimIds = claims.map((claim) => claim.id);
    const supportingEvidenceIds = evidence.map((item) => item.id);
    for (const matchedIssue of matches) {
      const existing = store.occurrenceIssueLinks.find((link) => link.occurrenceId === occurrence.id && link.issueId === matchedIssue.id);
      const uniqueMatch = matches.length === 1;
      if (existing) {
        existing.supportingClaimIds = uniqueStrings([...existing.supportingClaimIds, ...supportingClaimIds]);
        existing.supportingEvidenceIds = uniqueStrings([...existing.supportingEvidenceIds, ...supportingEvidenceIds]);
        continue;
      }
      store.occurrenceIssueLinks.push({
        occurrenceId: occurrence.id,
        issueId: matchedIssue.id,
        status: uniqueMatch ? "approved" : "candidate",
        matchBasis: evidence.length ? "occurrence_evidence" : "occurrence_claim",
        confidence: uniqueMatch ? "high" : "medium",
        supportingClaimIds,
        supportingEvidenceIds,
        createdAt: new Date(),
        reviewedAt: uniqueMatch ? new Date() : undefined,
        reviewNote: uniqueMatch ? "이벤트 자체 공개 근거가 하나의 근거 종합 주제와 일치" : "복수 주제 후보로 운영 검토 필요"
      });
      audit(store, uniqueMatch ? "merge" : "hold", "occurrence", occurrence.id, uniqueMatch
        ? `이벤트 자체의 공개 Claim·Evidence가 근거 종합 주제 '${matchedIssue.id}'와 일치해 승인 연결했습니다.`
        : `이벤트가 복수 주제 후보와 일치해 '${matchedIssue.id}' 연결을 비공개 후보로 보류했습니다.`);
      linkedCount += 1;
    }
    occurrence.issueId = primaryApprovedIssueId(store, occurrence);
  }
  return linkedCount;
}

function lawNameAliases(lawName: string): string[] {
  if (lawName === "공직선거법") return [lawName, "선거법"];
  if (lawName === "집회 및 시위에 관한 법률") return [lawName, "집시법", "집회시위법"];
  return [lawName];
}

function getAdminNewsIssueCandidates(store: Store): ApiResponse {
  return json(200, {
    candidates: store.newsIssueCandidates
      .filter((candidate) => candidate.pendingEvidenceIds.length > 0)
      .map((candidate) => toAdminNewsCandidate(store, candidate))
  });
}

function patchAdminNewsIssueCandidate(store: Store, id: string | undefined, body: unknown): ApiResponse {
  const candidate = store.newsIssueCandidates.find((item) => item.id === id);
  if (!candidate) return json(404, { error: "news_issue_candidate_not_found" });
  const data = asObject(body);
  const status = readString(data, "status");
  if (status !== "approved" && status !== "rejected") throw new ApiError(400, "news_issue_candidate_status_invalid");
  const requestedIds = readStringArray(data, "evidenceIds");
  const selectedIds = requestedIds.length > 0
    ? candidate.pendingEvidenceIds.filter((evidenceId) => requestedIds.includes(evidenceId))
    : [...candidate.pendingEvidenceIds];
  if (selectedIds.length === 0) throw new ApiError(422, "news_issue_candidate_evidence_required");
  const selectedEvidence = selectedIds
    .map((evidenceId) => store.evidence.find((item) => item.id === evidenceId && item.evidenceType === "media_link"))
    .filter((item): item is Evidence => Boolean(item));
  if (selectedEvidence.length !== selectedIds.length) throw new ApiError(422, "news_issue_candidate_evidence_invalid");

  const now = new Date();
  candidate.pendingEvidenceIds = candidate.pendingEvidenceIds.filter((evidenceId) => !selectedIds.includes(evidenceId));
  candidate.status = status;
  candidate.reviewedAt = now;
  candidate.updatedAt = now;
  candidate.reviewNote = readOptionalString(data, "reviewNote");
  if (status === "rejected") {
    candidate.rejectedEvidenceIds = uniqueStrings([...candidate.rejectedEvidenceIds, ...selectedIds]);
    audit(store, "hold", "news_candidate", candidate.id, "뉴스 이슈 후보의 선택된 보도 링크가 공개 연결에서 제외되었습니다.");
    return json(200, { candidate: toAdminNewsCandidate(store, candidate) });
  }

  const group = store.lawGroups.find((item) => item.id === candidate.lawGroupId);
  if (!group) throw new ApiError(404, "law_group_not_found");
  const coreTopic = group.coreTopics.find((item) => item.key === candidate.coreTopicKey);
  const normalizedTopicKey = normalizedTopicKeyFor(`law-news-${group.id}-${candidate.coreTopicKey}`);
  let issue = candidate.issueId ? store.issues.find((item) => item.id === candidate.issueId) : undefined;
  issue ??= store.issues.find((item) => item.normalizedTopicKey === normalizedTopicKey);
  if (!issue) {
    issue = {
      id: `issue_${createHash("sha1").update(normalizedTopicKey).digest("hex").slice(0, 12)}`,
      title: candidate.suggestedTitle,
      kind: "topic",
      synthesisBasis: "evidence_aggregate",
      normalizedTopicKey,
      topicTags: uniqueStrings([group.lawName, coreTopic?.label ?? group.billTitle, ...(coreTopic?.representativeKeywords ?? [])]).slice(0, 8),
      status: selectedEvidence.some((item) => item.sourcePublishedAt && now.getTime() - item.sourcePublishedAt.getTime() <= 30 * dayMs) ? "active" : "quiet",
      firstSeenAt: earliestDate(selectedEvidence.map((item) => item.sourcePublishedAt)) ?? now,
      lastUpdatedAt: latestDate(selectedEvidence.map((item) => item.sourcePublishedAt)) ?? now
    };
    store.issues.push(issue);
    audit(store, "split", "issue", issue.id, `검토 승인된 언론 보도를 '${group.billTitle}'의 주요 이슈로 분리했습니다.`);
  }
  candidate.issueId = issue.id;

  const claimIds: string[] = [];
  const approvedPublicSummary = coreTopic
    ? `${group.lawName}의 '${coreTopic.label}' 쟁점과 관련된 언론 보도입니다.`
    : `${group.billTitle} 개정 논의와 관련된 언론 보도입니다.`;
  for (const evidence of selectedEvidence) {
    let claim = store.claims.find((item) => item.targetType === "issue" && item.targetId === issue!.id && item.evidenceIds.includes(evidence.id));
    if (!claim) {
      claim = addClaim(store, {
        visibility: "public",
        targetType: "issue",
        targetId: issue.id,
        sourceProvenance: "media_report",
        claimantLabel: evidence.publisherLabel ?? "언론 보도",
        statement: evidence.sourceTitle ?? "",
        normalizedStatement: approvedPublicSummary,
        evidenceStrength: "single_source",
        riskLevel: "misleading_possible",
        evidenceIds: [evidence.id]
      });
      claim.occurredAt = evidence.sourcePublishedAt;
      audit(store, "correction", "claim", claim.id, "검토 승인된 언론 보도를 출처가 분리된 Claim으로 공개했습니다.");
    }
    claimIds.push(claim.id);
  }
  candidate.approvedEvidenceIds = uniqueStrings([...candidate.approvedEvidenceIds, ...selectedIds]);
  issue.lastUpdatedAt = latestDate([issue.lastUpdatedAt, ...selectedEvidence.map((item) => item.sourcePublishedAt)]) ?? now;

  let link = store.issueLawGroupLinks.find((item) => item.issueId === issue!.id && item.lawGroupId === group.id);
  if (!link) {
    link = {
      issueId: issue.id,
      lawGroupId: group.id,
      matchBasis: coreTopic ? "core_topic" : "group_title",
      confidence: "high",
      status: "approved",
      claimIds: [],
      reviewedAt: now,
      reviewNote: candidate.reviewNote
    };
    store.issueLawGroupLinks.push(link);
  }
  link.status = "approved";
  link.reviewedAt = now;
  link.reviewNote = candidate.reviewNote;
  link.claimIds = uniqueStrings([...link.claimIds, ...claimIds]);
  audit(store, "state_change", "law_group", group.id, `검토 승인된 뉴스 이슈 '${issue.id}'가 법안 그룹에 연결되었습니다.`);
  return json(200, {
    candidate: toAdminNewsCandidate(store, candidate),
    issue: toPublicIssue(issue),
    newsArticles: publicNewsArticlesForIssue(store, issue.id, group.id)
  });
}

function toAdminNewsCandidate(store: Store, candidate: NewsIssueCandidate) {
  const group = store.lawGroups.find((item) => item.id === candidate.lawGroupId);
  const topic = group?.coreTopics.find((item) => item.key === candidate.coreTopicKey);
  const pendingArticles = candidate.pendingEvidenceIds
    .map((evidenceId) => store.evidence.find((item) => item.id === evidenceId))
    .filter((item): item is Evidence => Boolean(item))
    .map((evidence) => ({
      id: evidence.id,
      sourceTitle: evidence.sourceTitle,
      publisherLabel: evidence.publisherLabel,
      sourceUrl: evidence.sourceUrl,
      aggregatorUrl: evidence.aggregatorUrl,
      publishedAt: evidence.sourcePublishedAt?.toISOString(),
      publicSummary: evidence.publicSummary,
      directBillMatch: evidence.newsDirectBillMatch === true
    }));
  const publisherCount = new Set(pendingArticles.map((item) => item.publisherLabel).filter(Boolean)).size;
  return {
    ...candidate,
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString(),
    reviewedAt: candidate.reviewedAt?.toISOString(),
    group: group ? { id: group.id, lawName: group.lawName, billTitle: group.billTitle } : undefined,
    coreTopic: topic,
    pendingArticles,
    eligibility: {
      eligibleForReview: publisherCount >= 2 || pendingArticles.some((item) => item.directBillMatch),
      publisherCount,
      directBillMatch: pendingArticles.some((item) => item.directBillMatch)
    }
  };
}

function publicNewsArticlesForIssue(store: Store, issueId: string, lawGroupId?: string) {
  const candidates = store.newsIssueCandidates.filter((candidate) => candidate.issueId === issueId && (!lawGroupId || candidate.lawGroupId === lawGroupId));
  return candidates.flatMap((candidate) => candidate.approvedEvidenceIds.map((evidenceId) => {
    const evidence = store.evidence.find((item) => item.id === evidenceId);
    const claim = evidence && store.claims.find((item) => isPublicClaim(item) && item.targetType === "issue" && item.targetId === issueId && item.evidenceIds.includes(evidence.id));
    const sourceUrl = evidence?.sourceUrl ?? evidence?.aggregatorUrl;
    if (!evidence || !claim || !sourceUrl || !evidence.sourcePublishedAt || !evidence.publisherLabel) return undefined;
    return {
      id: evidence.id,
      issueId,
      lawGroupId: candidate.lawGroupId,
      coreTopicKey: candidate.coreTopicKey,
      publisherLabel: evidence.publisherLabel,
      publishedAt: evidence.sourcePublishedAt.toISOString(),
      summary: claim.normalizedStatement,
      sourceUrl
    };
  })).filter(Boolean).sort((left, right) => new Date(right!.publishedAt).getTime() - new Date(left!.publishedAt).getTime());
}

function mediaPublishersForIssue(store: Store, issueId: string): string[] {
  const evidenceIds = new Set(publicClaimsForTarget(store, "issue", issueId)
    .filter((claim) => claim.sourceProvenance === "media_report")
    .flatMap((claim) => claim.evidenceIds));
  return uniqueStrings(store.evidence
    .filter((evidence) => evidenceIds.has(evidence.id) && evidence.publisherLabel)
    .map((evidence) => evidence.publisherLabel!));
}

function safeExternalNewsUrl(value: string | undefined, optional = false): string | undefined {
  if (!value) {
    if (optional) return undefined;
    throw new ApiError(400, "news_source_url_required");
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password || isPrivateHostname(url.hostname)) throw new Error("unsafe");
    url.hash = "";
    return url.toString();
  } catch {
    throw new ApiError(422, "news_source_url_invalid");
  }
}

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized.endsWith(".local") || normalized === "127.0.0.1" || normalized === "::1" || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(normalized);
}

function newsPublisherLabel(candidate: string | undefined, sourceUrl: string): string {
  const normalized = candidate?.replace(/\s+/g, " ").trim().slice(0, 80);
  if (normalized) return normalized;
  return new URL(sourceUrl).hostname.replace(/^www\./, "");
}

function readStringArray(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.filter((item): item is string => typeof item === "string" && item.length > 0)).slice(0, 100);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function readLawItem(data: Record<string, unknown>): LawItem {
  const source = readLawSource(data);
  const lawName = readString(data, "lawName");
  const billTitle = readOptionalString(data, "billTitle");
  return {
    id: readOptionalString(data, "id") ?? lawIdForInput(source, data, lawName, billTitle),
    source,
    lawName,
    billTitle,
    stage: readString(data, "stage"),
    proposedDate: readOptionalDate(data, "proposedDate"),
    statusDate: readOptionalDate(data, "statusDate"),
    effectiveDate: readOptionalDate(data, "effectiveDate"),
    assemblyBillId: readOptionalString(data, "assemblyBillId"),
    assemblyBillNo: readOptionalString(data, "assemblyBillNo"),
    lawId: readOptionalString(data, "lawId"),
    proposer: readOptionalString(data, "proposer"),
    proposalSummary: readOptionalString(data, "proposalSummary"),
    lawGroupId: readOptionalString(data, "lawGroupId"),
    // Accepted only to hydrate one-release legacy snapshots; synchronizeLawGroups removes them.
    topicKeywords: readOptionalStringArray(data, "topicKeywords"),
    primaryLawTopicId: readOptionalString(data, "primaryLawTopicId"),
    summary: readOptionalString(data, "summary"),
    officialUrl: readOfficialLawUrl(source, data),
    keywords: readLawKeywords(data, lawName, billTitle)
  };
}

function readOfficialLawUrl(source: LawItem["source"], data: Record<string, unknown>): string | undefined {
  const candidate = readOptionalString(data, "officialUrl");
  if (candidate && isOfficialLawUrl(source, candidate)) return candidate;
  const assemblyBillId = readOptionalString(data, "assemblyBillId");
  if (source === "assembly_bill" && assemblyBillId) {
    return `https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(assemblyBillId)}`;
  }
  const lawId = readOptionalString(data, "lawId");
  if (source === "law_effective" && lawId) {
    return `https://www.law.go.kr/법령/${encodeURIComponent(lawId)}`;
  }
  return undefined;
}

function isOfficialLawUrl(source: LawItem["source"], value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return source === "assembly_bill"
      ? url.hostname === "assembly.go.kr" || url.hostname.endsWith(".assembly.go.kr")
      : url.hostname === "law.go.kr" || url.hostname.endsWith(".law.go.kr");
  } catch {
    return false;
  }
}

function lawIdForInput(source: LawItem["source"], data: Record<string, unknown>, lawName: string, billTitle: string | undefined): string {
  const basis = [source, readOptionalString(data, "assemblyBillId"), readOptionalString(data, "lawId"), lawName, billTitle].filter(Boolean).join("|");
  return `law_${createHash("sha1").update(basis).digest("hex").slice(0, 16)}`;
}

function readLawSource(data: Record<string, unknown>): LawItem["source"] {
  const value = data.source;
  if (value === "assembly_bill" || value === "law_effective") return value;
  throw new ApiError(400, "source_invalid");
}

function readLawKeywords(data: Record<string, unknown>, lawName: string, billTitle: string | undefined): string[] {
  const keywords = new Set([lawName, ...(billTitle ? [billTitle] : [])]);
  const value = data.keywords;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim().length > 0) keywords.add(item.trim());
    }
  }
  return [...keywords].slice(0, 12);
}

function addClaim(
  store: Store,
  input: Omit<Claim, "id" | "createdAt" | "occurredAt" | "observedAt" | "disputedByClaimIds">,
  options: { attach?: boolean } = {}
): Claim {
  assertTargetExists(store, input.targetType, input.targetId);
  const claim: Claim = {
    id: randomUUID(),
    createdAt: new Date(),
    disputedByClaimIds: [],
    ...input
  };
  store.claims.push(claim);
  if (options.attach !== false) attachClaim(store, input.targetType, input.targetId, claim.id);
  return claim;
}

function attachClaim(store: Store, targetType: TargetType, targetId: string, claimId: string): void {
  const target = targetRecord(store, targetType, targetId);
  if (!target) return;
  if ("claimIds" in target && !target.claimIds.includes(claimId)) target.claimIds.push(claimId);
}

function attachEvidence(store: Store, targetType: TargetType, targetId: string, evidenceId: string): void {
  const target = targetRecord(store, targetType, targetId);
  if (target && "evidenceIds" in target && !target.evidenceIds.includes(evidenceId)) target.evidenceIds.push(evidenceId);
}

function setClaimVisibility(store: Store, claim: Claim, visibility: NonNullable<Claim["visibility"]>): void {
  claim.visibility = visibility;
  if (visibility === "public") {
    attachClaim(store, claim.targetType, claim.targetId, claim.id);
    for (const evidenceId of claim.evidenceIds) attachEvidence(store, claim.targetType, claim.targetId, evidenceId);
    if (claim.reviewTargetClaimId && claim.fieldVerification && claim.fieldVerification !== "field_aligned") {
      const reviewed = store.claims.find((item) => item.id === claim.reviewTargetClaimId);
      if (reviewed && !reviewed.disputedByClaimIds.includes(claim.id)) reviewed.disputedByClaimIds.push(claim.id);
    }
    return;
  }

  for (const reviewed of store.claims) reviewed.disputedByClaimIds = reviewed.disputedByClaimIds.filter((id) => id !== claim.id);

  const target = targetRecord(store, claim.targetType, claim.targetId);
  if (!target) return;
  if ("claimIds" in target) target.claimIds = target.claimIds.filter((id) => id !== claim.id);
  if ("evidenceIds" in target) target.evidenceIds = target.evidenceIds.filter((id) => !claim.evidenceIds.includes(id));
}

function audit(store: Store, action: AuditLog["action"], targetType: AuditLog["targetType"], targetId: string, reason: string): void {
  store.auditLogs.push({
    id: randomUUID(),
    action,
    targetType,
    targetId,
    createdAt: new Date(),
    reason
  });
  store.transparencyLogs.push({
    id: randomUUID(),
    action,
    targetType,
    targetId,
    createdAt: new Date(),
    publicReason: reason
  });
}

function toPublicTransparencyLog(log: TransparencyLog) {
  return {
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    createdAt: log.createdAt.toISOString(),
    publicReason: sanitizePublicReason(log.publicReason)
  };
}

function sanitizePublicReason(reason: string): string {
  const fallback = "검토 기록이 등록되었습니다.";
  const normalized = reason.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  if (containsPrivatePublicReasonToken(normalized)) return fallback;
  return normalized.slice(0, 180);
}

function containsPrivatePublicReasonToken(value: string): boolean {
  return [
    /private\/live\//i,
    /storageKey/i,
    /publicStorageKey/i,
    /publicPosterKey/i,
    /rawText/i,
    /userId/i,
    /tokenHash/i,
    /ciHash/i,
    /diHash/i,
    /subjectHash/i,
    /identityVerificationId/i,
    /gps/i,
    /geoCell/i,
    /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  ].some((pattern) => pattern.test(value));
}

function rememberReport(store: Store, userId: string | undefined, reportType: ReportRecord["reportType"], targetType: TargetType, targetId: string, claimId: string): ReportRecord {
  const report = {
    id: randomUUID(),
    userId,
    reportType,
    targetType,
    targetId,
    claimId,
    createdAt: new Date()
  };
  store.reports.push(report);
  return report;
}

function queueNotifications(store: Store, notificationType: NotificationOutbox["notificationType"], targetType: TargetType, targetId: string, title: string, body: string): void {
  if (!shouldNotify(notificationType)) return;
  const now = new Date();
  for (const subscription of store.subscriptions.filter((item) => item.targetType === targetType && item.targetId === targetId)) {
    if (!allowsNotificationForSubscription(subscription, notificationType, now)) continue;
    const dedupeKey = `${subscription.userId}:${targetType}:${targetId}:${notificationType}`;
    if (hasRecentNotification(store, dedupeKey, now)) continue;
    store.notificationOutbox.push({
      id: randomUUID(),
      userId: subscription.userId,
      targetType,
      targetId,
      notificationType,
      dedupeKey,
      title,
      body,
      uncertaintyLabel: "evidence_aligned",
      scheduledFor: now,
      status: "pending"
    });
  }
}

function allowsNotificationForSubscription(
  subscription: Subscription,
  notificationType: NotificationOutbox["notificationType"],
  now: Date
): boolean {
  if (subscription.mutedUntil && subscription.mutedUntil > now) return false;
  if (subscription.alertTypes.length > 0 && !subscription.alertTypes.includes(notificationType)) return false;
  if (subscription.alertLevel === "all") return true;
  if (subscription.alertLevel === "normal") return notificationType !== "correction_reflected" && notificationType !== "rebuttal_added";
  return notificationType === "state_changed";
}

function hasRecentNotification(store: Store, dedupeKey: string, now: Date): boolean {
  return store.notificationOutbox.some((item) => {
    if (item.dedupeKey !== dedupeKey) return false;
    if (item.status === "pending") return true;
    const sentOrScheduledAt = item.sentAt ?? item.scheduledFor;
    return now.getTime() - sentOrScheduledAt.getTime() < notificationCooldownMs;
  });
}

function assertTargetExists(store: Store, targetType: TargetType, targetId: string): void {
  if (!targetRecord(store, targetType, targetId)) throw new ApiError(404, "target_not_found");
}

type TargetRecord =
  | Issue
  | Occurrence
  | ContinuousPresence;

function targetRecord(store: Store, targetType: TargetType, targetId: string): TargetRecord | undefined {
  if (targetType === "issue") return store.issues.find((item) => item.id === targetId);
  if (targetType === "occurrence") return store.occurrences.find((item) => item.id === targetId);
  if (targetType === "continuous_presence") return store.continuousPresences.find((item) => item.id === targetId);
  return undefined;
}

function publicTargetTitle(target: TargetRecord | undefined): string {
  if (!target) return "연결 현장 확인 중";
  const record = target as { title?: string; label?: string; routeLabel?: string; id: string };
  return record.title || record.label || record.routeLabel || record.id;
}

function publicTargetRegionLabel(target: TargetRecord | undefined): string {
  if (!target) return "지역 확인 중";
  const record = target as { regionLabel?: string; label?: string };
  return record.regionLabel || record.label || "지역 확인 중";
}

function publicTargetIssueTitle(store: Store, targetType: TargetType, target: TargetRecord | undefined): string {
  if (!target) return "연결 이슈 확인 중";
  if (targetType === "issue") return (target as Issue).title;
  const issueId = (target as { issueId?: string }).issueId;
  return store.issues.find((issue) => issue.id === issueId)?.title || "연결 이슈 확인 중";
}

function toPublicIssue(issue: Issue) {
  return {
    id: issue.id,
    title: issue.title,
    synthesisBasis: issue.synthesisBasis ?? "explicit",
    topicTags: issue.topicTags,
    status: issue.status,
    firstSeenAt: issue.firstSeenAt.toISOString(),
    lastUpdatedAt: issue.lastUpdatedAt.toISOString()
  };
}

function toPublicAreaCluster(cluster: AreaCluster) {
  return {
    id: cluster.id,
    label: cluster.label,
    regionLabel: cluster.regionLabel,
    targetCount: cluster.targetRefs.length
  };
}

function toPublicOccurrence(occurrence: Occurrence, claims?: Claim[]) {
  const counts = claims ? publicCounts(claims) : { claimCount: occurrence.claimIds.length, evidenceCount: occurrence.evidenceIds.length };
  return {
    id: occurrence.id,
    issueId: occurrence.issueId,
    type: occurrence.type,
    regionLabel: occurrence.regionLabel,
    title: occurrence.title,
    locationText: occurrence.locationText,
    locationStatus: occurrence.locationStatus ?? occurrence.publicLocation?.status ?? "TEXT_ONLY",
    locationStatusLabel: locationStatusLabel(occurrence.locationStatus ?? occurrence.publicLocation?.status),
    publicLocation: occurrence.publicLocation,
    lifecycleState: occurrence.lifecycleState,
    startsAt: occurrence.startsAt?.toISOString(),
    endsAt: occurrence.endsAt?.toISOString(),
    claimCount: counts.claimCount,
    evidenceCount: counts.evidenceCount
  };
}

function toPublicCrowdEstimate(estimate: CrowdEstimate) {
  const claim = {
    id: `claim_${estimate.id}`,
    sourceProvenance: "musunil_ai_estimate" as const,
    claimantLabel: "무슨일 자동 규모 추정",
    normalizedStatement: `${estimate.minCount}~${estimate.maxCount}명 범위의 자동 규모 추정 Claim입니다.`,
    evidenceStrength: crowdEstimateEvidenceStrength(estimate.method),
    riskLevel: "misleading_possible" as const
  };
  return {
    id: estimate.id,
    targetType: estimate.targetType,
    targetId: estimate.targetId,
    observedAt: estimate.observedAt.toISOString(),
    minCount: estimate.minCount,
    maxCount: estimate.maxCount,
    confidence: estimate.confidence,
    method: estimate.method,
    evidenceCount: estimate.evidenceCount,
    independentViewpointCount: estimate.independentViewpointCount,
    claim,
    generated: estimate.id.startsWith("derived_"),
    limitations: estimate.limitations
  };
}

function crowdEstimateEvidenceStrength(method: CrowdEstimate["method"]): EvidenceStrength {
  if (method === "hybrid") return "independent_sources_with_field_evidence";
  if (method === "proof_of_presence_density") return "multiple_proof_of_presence";
  return "single_source";
}

function targetRegionLabel(store: Store, targetType: TargetType, target: TargetRecord): string | undefined {
  if ("regionLabel" in target && typeof target.regionLabel === "string") return target.regionLabel;
  if ("areaClusterId" in target && typeof target.areaClusterId === "string") return store.areaClusters.find((cluster) => cluster.id === target.areaClusterId)?.regionLabel;
  return undefined;
}

function targetLifecycle(target: TargetRecord): string {
  if ("lifecycleState" in target) return target.lifecycleState;
  if ("state" in target) return target.state;
  return "UNKNOWN";
}

function targetUpdatedAt(target: TargetRecord): Date | undefined {
  if ("startsAt" in target) return target.startsAt;
  if ("lastProofOfPresenceAt" in target) return target.lastProofOfPresenceAt;
  return undefined;
}

function toPublicTarget(targetType: TargetType, target: TargetRecord, claims: Claim[]) {
  const counts = publicCounts(claims);
  if (targetType === "issue") return toPublicIssue(target as Issue);
  if (targetType === "occurrence") return toPublicOccurrence(target as Occurrence, claims);
  if (targetType === "continuous_presence") {
    const item = target as ContinuousPresence;
    return {
      id: item.id,
      issueId: item.issueId,
      campaignId: item.campaignId,
      areaClusterId: item.areaClusterId,
      regionLabel: item.regionLabel,
      publicLocation: item.publicLocation,
      presenceType: item.presenceType,
      firstProofOfPresenceAt: item.firstProofOfPresenceAt?.toISOString(),
      lastProofOfPresenceAt: item.lastProofOfPresenceAt?.toISOString(),
      state: item.state,
      ...counts
    };
  }
  return toPublicIssue(target as Issue);
}

function liveClaimsForTarget(store: Store, targetType: TargetType, targetId: string): Claim[] {
  return sortLiveClaims(store, publicClaimsForTarget(store, targetType, targetId).filter((claim) => hasPublicLiveEvidence(store, claim)));
}

function liveClaimsForIssue(store: Store, issueId: string): Claim[] {
  const targetKeys = new Set([
    `issue:${issueId}`,
    ...issueTargets(store, issueId).map(({ targetType, target }) => `${targetType}:${target.id}`)
  ]);
  return sortLiveClaims(
    store,
    store.claims.filter((claim) => isPublicClaim(claim) && targetKeys.has(`${claim.targetType}:${claim.targetId}`) && hasPublicLiveEvidence(store, claim))
  );
}

function sortLiveClaims(store: Store, claims: Claim[]): Claim[] {
  return [...claims].sort((a, b) => liveClaimObservedAt(store, b).getTime() - liveClaimObservedAt(store, a).getTime());
}

function liveClaimObservedAt(store: Store, claim: Claim): Date {
  const evidence = claim.evidenceIds
    .map((id) => store.evidence.find((item) => item.id === id))
    .find((item) => item?.evidenceType === "live_media");
  return evidence?.capturedAt ?? evidence?.uploadedAt ?? claim.createdAt;
}

function hasPublicLiveEvidence(store: Store, claim: Claim): boolean {
  return claim.evidenceIds
    .map((id) => store.evidence.find((evidence) => evidence.id === id))
    .some(hasPublishableLiveEvidence);
}

type CompletedRedactionEvidence = Evidence & {
  evidenceType: "live_media";
  proofOfPresenceStatus: "pass";
  redactionStatus: "completed";
  redactionProofHash: string;
  publicStorageKey: string;
  publicPosterKey: string;
};

type TrustedDeviceEvidence = Evidence & {
  deviceIntegrityStatus: "pass";
  deviceIntegrityProvider: NonNullable<Evidence["deviceIntegrityProvider"]>;
  deviceIntegrityProofHash: string;
};

type PublishableLiveEvidence = CompletedRedactionEvidence & TrustedDeviceEvidence;

function hasCompletedRedaction(evidence: Evidence | undefined): evidence is CompletedRedactionEvidence {
  return (
    evidence?.evidenceType === "live_media" &&
    evidence.proofOfPresenceStatus === "pass" &&
    evidence.redactionStatus === "completed" &&
    Boolean(evidence.redactionProofHash) &&
    Boolean(publicRedactedClipUrl(evidence.publicStorageKey)) &&
    Boolean(publicRedactedPosterUrl(evidence.publicPosterKey))
  );
}

function hasTrustedDeviceIntegrity(evidence: Evidence | undefined): evidence is TrustedDeviceEvidence {
  return evidence?.deviceIntegrityStatus === "pass" && Boolean(evidence.deviceIntegrityProvider) && Boolean(evidence.deviceIntegrityProofHash);
}

function hasPublishableLiveEvidence(evidence: Evidence | undefined): evidence is PublishableLiveEvidence {
  return hasCompletedRedaction(evidence) && hasTrustedDeviceIntegrity(evidence);
}

function toPublicLiveClaim(store: Store, claim: Claim) {
  const evidence = claim.evidenceIds
    .map((id) => store.evidence.find((item) => item.id === id))
    .find(hasPublishableLiveEvidence);
  const target = targetRecord(store, claim.targetType, claim.targetId);
  return {
    targetType: claim.targetType,
    targetId: claim.targetId,
    targetTitle: target ? targetTitle(claim.targetType, target) : "공개 대상",
    regionLabel: target ? targetRegionLabel(store, claim.targetType, target) : undefined,
    claim: toPublicClaim(claim),
    capturedAt: evidence?.capturedAt?.toISOString(),
    uploadedAt: evidence?.uploadedAt.toISOString(),
    durationMs: evidence?.durationMs,
    publicRadiusM: evidence?.publicRadiusM,
    proofOfPresenceStatus: evidence?.proofOfPresenceStatus ?? "unknown",
    redactionStatus: evidence?.redactionStatus ?? "pending",
    media: {
      redactedClipUrl: publicRedactedClipUrl(evidence?.publicStorageKey),
      redactedPosterUrl: publicRedactedPosterUrl(evidence?.publicPosterKey)
    },
    fieldVerification: fieldVerificationSummary(store, claim.id)
  };
}

function toEvidenceReel(store: Store, claim: Claim): EvidenceReel | undefined {
  if (claim.targetType === "issue") return undefined;
  const target = targetRecord(store, claim.targetType, claim.targetId);
  if (!target) return undefined;
  const publicLiveClaim = toPublicLiveClaim(store, claim);
  const clipUrl = publicLiveClaim.media.redactedClipUrl;
  if (!clipUrl) return undefined;
  const issueId = (target as Occurrence | ContinuousPresence).issueId;
  const issue = issueId ? store.issues.find((item) => item.id === issueId) : undefined;
  const fieldVerification = fieldVerificationSummary(store, claim.id);
  return {
    id: `reel_${claim.id}`,
    claimId: claim.id,
    occurrenceId: target.id,
    targetType: claim.targetType,
    issueId,
    occurrenceTitle: targetTitle(claim.targetType, target),
    issueTitle: issue?.title,
    regionLabel: targetRegionLabel(store, claim.targetType, target) || "지역 확인 중",
    capturedAt: publicLiveClaim.capturedAt,
    durationMs: publicLiveClaim.durationMs,
    publicRadiusM: publicLiveClaim.publicRadiusM ?? 200,
    sourceProvenance: claim.sourceProvenance,
    evidenceStrength: claim.evidenceStrength,
    riskLevel: claim.riskLevel,
    media: {
      redactedClipUrl: clipUrl,
      redactedPosterUrl: publicLiveClaim.media.redactedPosterUrl
    },
    summary: toPublicClaim(claim).normalizedStatement,
    hasDispute: fieldVerification.disputed > 0 || claim.disputedByClaimIds.length > 0,
    fieldVerification,
    occurrenceDigest: toOccurrenceDigest(store, claim.targetType, target.id)
  };
}

function publicRedactedClipUrl(publicStorageKey: string | undefined): string | undefined {
  return publicRedactedMediaUrl(publicStorageKey, ["webm", "mp4"]);
}

function publicRedactedPosterUrl(publicStorageKey: string | undefined): string | undefined {
  return publicRedactedMediaUrl(publicStorageKey, ["webp", "jpg", "jpeg", "png"]);
}

function publicRedactedMediaUrl(publicStorageKey: string | undefined, allowedExtensions: string[]): string | undefined {
  if (!publicStorageKey || /[\u0000-\u001f\\]/.test(publicStorageKey)) return undefined;
  if (publicStorageKey.startsWith("/")) {
    if (publicStorageKey.includes("?") || publicStorageKey.includes("#")) return undefined;
    const path = safeDecodedPath(publicStorageKey);
    return isSafeRedactedMediaPath(path, allowedExtensions) ? path : undefined;
  }
  try {
    const url = new URL(publicStorageKey);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      isAllowedRedactedMediaHost(url.hostname)
    ) {
      const path = safeDecodedPath(url.pathname);
      if (isSafeRedactedMediaPath(path, allowedExtensions)) return `${url.origin}${path}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function safeDecodedPath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return "";
  }
}

function isSafeRedactedMediaPath(path: string, allowedExtensions: string[]): boolean {
  if (!path.startsWith("/media/redacted/")) return false;
  if (path.includes("..") || path.includes("//") || path.toLowerCase().includes("/private/")) return false;
  const extension = path.split(".").pop()?.toLowerCase();
  return Boolean(extension && allowedExtensions.includes(extension));
}

function isAllowedRedactedMediaHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "musunil.com" || host.endsWith(".musunil.com");
}

function fieldVerificationSummary(store: Store, claimId: string) {
  const reviews = store.claims.filter((claim) => isPublicClaim(claim) && claim.reviewTargetClaimId === claimId);
  const aligned = reviews.filter((claim) => claim.fieldVerification === "field_aligned").length;
  const disputed = reviews.filter((claim) => claim.fieldVerification === "different_place_possible" || claim.fieldVerification === "context_insufficient").length;
  return {
    aligned,
    disputed,
    statusLabel: disputed > 0 ? "현장 이견 있음" : aligned > 0 ? "현장 일치 확인" : "현장 판단 대기"
  };
}

function publicCounts(claims: Claim[]) {
  return {
    claimCount: claims.length,
    evidenceCount: new Set(claims.flatMap((claim) => claim.evidenceIds)).size
  };
}

function toPublicClaim(claim: Claim) {
  return {
    id: claim.id,
    visibility: claim.visibility ?? "public",
    targetType: claim.targetType,
    targetId: claim.targetId,
    sourceProvenance: claim.sourceProvenance,
    claimantLabel: claim.claimantLabel,
    normalizedStatement: claim.normalizedStatement,
    evidenceStrength: claim.evidenceStrength,
    riskLevel: claim.riskLevel,
    createdAt: claim.createdAt.toISOString(),
    evidenceCount: claim.evidenceIds.length,
    disputedCount: claim.disputedByClaimIds.length
  };
}

function isPublicClaim(claim: Claim): boolean {
  return claim.visibility !== "held_private";
}

function publicClaimsForTarget(store: Store, targetType: TargetType, targetId: string): Claim[] {
  return store.claims.filter((claim) => isPublicClaim(claim) && claim.targetType === targetType && claim.targetId === targetId);
}

function chipsForClaims(claims: Claim[]): string[] {
  const chips = new Set<string>();
  if (claims.some((claim) => claim.sourceProvenance === "government_or_police")) chips.add("공식 발표 있음");
  if (claims.some((claim) => claim.sourceProvenance === "media_report")) chips.add("언론 보도 있음");
  if (claims.some((claim) => claim.sourceProvenance === "verified_citizen_report")) chips.add("위치 인증 제보 있음");
  if (new Set(claims.map((claim) => claim.sourceProvenance)).size > 1) chips.add("여러 주장 있음");
  return [...chips].slice(0, 3);
}

function sourceSummaryForClaims(claims: Claim[]) {
  return {
    official: claims.filter((claim) => claim.sourceProvenance === "government_or_police").length,
    media: claims.filter((claim) => claim.sourceProvenance === "media_report").length,
    field: claims.filter((claim) => claim.sourceProvenance === "verified_citizen_report" || claim.sourceProvenance === "material_report").length,
    estimate: claims.filter((claim) => claim.sourceProvenance === "musunil_ai_estimate").length
  };
}

function maxEvidenceStrengthScore(claims: Claim[]): number {
  return Math.max(0, ...claims.map((claim) => evidenceStrengths.indexOf(claim.evidenceStrength)));
}

function latestDate(dates: Array<Date | undefined>): Date | undefined {
  const timestamps = dates.filter((date): date is Date => date instanceof Date).map((date) => date.getTime());
  if (timestamps.length === 0) return undefined;
  return new Date(Math.max(...timestamps));
}

function earliestDate(dates: Array<Date | undefined>): Date | undefined {
  const timestamps = dates.filter((date): date is Date => date instanceof Date).map((date) => date.getTime());
  if (timestamps.length === 0) return undefined;
  return new Date(Math.min(...timestamps));
}

function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "body_must_be_object");
  return body as Record<string, unknown>;
}

function readString(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== "string" || value.length === 0) throw new ApiError(400, `${key}_required`);
  return value;
}

function readOptionalString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readOptionalStringArray(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 5);
}

function readClaimVisibility(data: Record<string, unknown>, key: string): NonNullable<Claim["visibility"]> | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  if (value === "public" || value === "held_private") return value;
  throw new ApiError(400, `${key}_invalid`);
}

function readNumber(data: Record<string, unknown>, key: string): number | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || Number.isNaN(value)) throw new ApiError(400, `${key}_must_be_number`);
  return value;
}

function readDate(data: Record<string, unknown>, key: string, fallback?: Date): Date {
  const value = data[key];
  if (value === undefined) {
    if (fallback) return fallback;
    throw new ApiError(400, `${key}_required`);
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${key}_must_be_date`);
  return date;
}

function readOptionalDate(data: Record<string, unknown>, key: string): Date | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${key}_must_be_date`);
  return date;
}

function readOccurrenceType(data: Record<string, unknown>, key: string, fallback: Occurrence["type"]): Occurrence["type"] {
  const value = data[key] ?? fallback;
  const allowed: ReadonlyArray<Occurrence["type"]> = ["static_assembly", "march", "policy_site", "counter_assembly"];
  if (typeof value === "string" && allowed.includes(value as Occurrence["type"])) return value as Occurrence["type"];
  throw new ApiError(400, `${key}_invalid`);
}

function readLifecycleState(data: Record<string, unknown>, key: string, fallback: LifecycleState): LifecycleState {
  const value = data[key] ?? fallback;
  const allowed: readonly LifecycleState[] = [
    "UPCOMING",
    "STARTING_SOON",
    "LIVE",
    "PAUSED",
    "MOVING",
    "ENDING_SOON",
    "ENDED",
    "ARCHIVED",
    "CANCELED",
    "POSTPONED",
    "UNKNOWN",
    "ONGOING_SERIES"
  ];
  if (typeof value === "string" && allowed.includes(value as LifecycleState)) return value as LifecycleState;
  throw new ApiError(400, `${key}_invalid`);
}

function readTargetType(data: Record<string, unknown>, key: string, fallback: TargetType): TargetType {
  const value = data[key] ?? fallback;
  if (typeof value === "string" && (targetTypes as readonly string[]).includes(value)) return value as TargetType;
  throw new ApiError(400, `${key}_invalid`);
}

function readRiskLevel(data: Record<string, unknown>, key: string, fallback: RiskLevel): RiskLevel {
  const value = data[key] ?? fallback;
  if (typeof value === "string" && (riskLevels as readonly string[]).includes(value)) return value as RiskLevel;
  throw new ApiError(400, `${key}_invalid`);
}

function readEvidenceStrength(data: Record<string, unknown>, key: string, fallback: EvidenceStrength): EvidenceStrength {
  const value = data[key] ?? fallback;
  if (typeof value === "string" && (evidenceStrengths as readonly string[]).includes(value)) return value as EvidenceStrength;
  throw new ApiError(400, `${key}_invalid`);
}

function readSourceProvenance(data: Record<string, unknown>, key: string, fallback: SourceProvenance): SourceProvenance {
  const value = data[key] ?? fallback;
  if (typeof value === "string" && (sourceProvenances as readonly string[]).includes(value)) return value as SourceProvenance;
  throw new ApiError(400, `${key}_invalid`);
}

function readFieldVerification(data: Record<string, unknown>): NonNullable<Claim["fieldVerification"]> {
  const value = data.fieldVerification;
  if (value === "field_aligned" || value === "different_place_possible" || value === "context_insufficient" || value === "rights_review_needed") return value;
  throw new ApiError(400, "fieldVerification_invalid");
}

function fieldVerificationStatement(value: NonNullable<Claim["fieldVerification"]>): string {
  return (
    {
      field_aligned: "현장 인증 사용자가 영상이 현장과 일치한다고 판단했습니다.",
      different_place_possible: "현장 인증 사용자가 다른 현장 가능성을 제기했습니다.",
      context_insufficient: "현장 인증 사용자가 시간·맥락 부족을 제기했습니다.",
      rights_review_needed: "현장 인증 사용자가 권리 검토 필요성을 제기했습니다."
    } as const
  )[value];
}

function json(status: number, body: unknown, headers?: Record<string, string>): ApiResponse {
  return { status, body, headers };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
