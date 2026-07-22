export * from "./public-sources.ts";

export const sourceProvenances = [
  "government_or_police",
  "media_report",
  "organizer_or_group",
  "verified_citizen_report",
  "material_report",
  "anonymous_or_unverified",
  "musunil_ai_estimate",
  "agency_action_request",
  "rebuttal",
  "rights_violation_report",
  "operator_action"
] as const;

export const evidenceStrengths = [
  "none",
  "single_source",
  "multiple_sources",
  "multiple_proof_of_presence",
  "media_time_location_crosscheck",
  "independent_sources_with_field_evidence"
] as const;

export const riskLevels = ["low", "misleading_possible", "rights_risk", "high_legal_privacy_risk", "must_hold_private"] as const;

export const targetTypes = [
  "issue",
  "occurrence",
  "continuous_presence"
] as const;

export type SourceProvenance = (typeof sourceProvenances)[number];
export type EvidenceStrength = (typeof evidenceStrengths)[number];
export type RiskLevel = (typeof riskLevels)[number];
export type TargetType = (typeof targetTypes)[number];

export type Claim = {
  id: string;
  visibility?: "public" | "held_private";
  targetType: TargetType;
  targetId: string;
  sourceProvenance: SourceProvenance;
  claimantLabel: string;
  statement: string;
  normalizedStatement: string;
  evidenceStrength: EvidenceStrength;
  riskLevel: RiskLevel;
  occurredAt?: Date;
  observedAt?: Date;
  createdAt: Date;
  evidenceIds: string[];
  disputedByClaimIds: string[];
  reviewTargetClaimId?: string;
  fieldVerification?: "field_aligned" | "different_place_possible" | "context_insufficient" | "rights_review_needed";
};

export type Evidence = {
  id: string;
  evidenceType: "live_media" | "material_media" | "official_doc" | "media_link" | "organizer_notice" | "citizen_report" | "sensor" | "audit";
  uploadedAt: Date;
  capturedAt?: Date;
  storageKey?: string;
  publicStorageKey?: string;
  publicPosterKey?: string;
  redactionStatus?: "not_required" | "pending" | "completed" | "held_private";
  redactionCheckedAt?: Date;
  redactionProofHash?: string;
  mediaMimeType?: string;
  byteSize?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  captureMode?: "in_app_camera" | "gallery" | "screen_recording" | "external_link";
  hash?: string;
  geoCell?: string;
  privateLng?: number;
  privateLat?: number;
  publicRadiusM?: number;
  foregroundGps?: boolean;
  gpsAccuracyM?: number;
  distanceToTargetM?: number;
  deviceIntegrityStatus?: "pass" | "fail" | "unknown";
  deviceIntegrityProvider?: "play_integrity" | "app_attest";
  deviceIntegrityCheckedAt?: Date;
  deviceIntegrityProofHash?: string;
  deviceAttestationBucket?: string;
  proofOfPresenceStatus?: "pass" | "fail" | "material_only" | "unknown";
  externalProvider?: "naver_api_hub" | "publisher_rss" | "official_public_source";
  externalId?: string;
  sourceUrl?: string;
  aggregatorUrl?: string;
  publisherLabel?: string;
  sourcePublishedAt?: Date;
  sourceCheckedAt?: Date;
  sourceTitle?: string;
  publicSummary?: string;
  sourceGranularity?: "bulletin" | "individual_schedule";
  newsDirectBillMatch?: boolean;
};

export type LifecycleState =
  | "UPCOMING"
  | "STARTING_SOON"
  | "LIVE"
  | "PAUSED"
  | "MOVING"
  | "ENDING_SOON"
  | "ENDED"
  | "ARCHIVED"
  | "CANCELED"
  | "POSTPONED"
  | "UNKNOWN"
  | "ONGOING_SERIES";

export type Issue = {
  id: string;
  title: string;
  kind: "topic" | "schedule_cluster";
  synthesisBasis?: "explicit" | "evidence_aggregate";
  normalizedTopicKey: string;
  topicTags: string[];
  status: "active" | "quiet" | "archived";
  firstSeenAt: Date;
  lastUpdatedAt: Date;
};

export type IssueSynthesisFacet = {
  coreTopicKey: string;
  label: string;
  evidenceCount: number;
  publisherCount: number;
  claimIds: string[];
  evidenceIds: string[];
};

/** Versioned public explanation of how an evidence-aggregate Issue was formed. */
export type IssueSynthesisSnapshot = {
  issueId: string;
  version: string;
  method: "law_group_evidence_aggregate";
  neutralSummary: string;
  windowStartedAt: Date;
  windowEndedAt: Date;
  generatedAt: Date;
  evidenceCount: number;
  publisherCount: number;
  claimIds: string[];
  evidenceIds: string[];
  facets: IssueSynthesisFacet[];
};

export type LawItem = {
  id: string;
  source: "assembly_bill" | "law_effective";
  lawName: string;
  billTitle?: string;
  stage: string;
  /** The National Assembly's official proposal date, separate from status and ingest dates. */
  proposedDate?: Date;
  statusDate?: Date;
  effectiveDate?: Date;
  assemblyBillId?: string;
  assemblyBillNo?: string;
  lawId?: string;
  proposer?: string;
  proposalSummary?: string;
  lawGroupId?: string;
  /** @deprecated Read-only snapshot compatibility during the law-group rollout. */
  topicKeywords?: string[];
  /** @deprecated Read-only snapshot compatibility during the law-group rollout. */
  primaryLawTopicId?: string;
  summary?: string;
  officialUrl?: string;
  keywords: string[];
};

export type LawCoreTopic = {
  key: string;
  label: string;
  representativeKeywords: string[];
  billCount: number;
};

export type LawGroup = {
  id: string;
  lawName: string;
  billTitle: string;
  billIds: string[];
  coreTopics: LawCoreTopic[];
  classificationVersion: string;
  updatedAt: Date;
};

export type LawGroupMembership = {
  lawItemId: string;
  lawGroupId: string;
  classificationVersion: string;
  coreTopicKey: string;
  coreTopicLabel: string;
  classificationBasis: "official_summary_rule" | "effective_law" | "summary_pending" | "keyword_fallback";
};

export type IssueLawGroupLink = {
  issueId: string;
  lawGroupId: string;
  matchBasis: "law_name" | "group_title" | "core_topic" | "manual";
  confidence: "low" | "medium" | "high";
  status: "candidate" | "approved" | "rejected";
  claimIds: string[];
  reviewedAt?: Date;
  reviewNote?: string;
};

export type NewsIssueCandidate = {
  id: string;
  lawGroupId: string;
  coreTopicKey: string;
  suggestedTitle: string;
  pendingEvidenceIds: string[];
  approvedEvidenceIds: string[];
  rejectedEvidenceIds: string[];
  status: "candidate" | "approved" | "rejected";
  issueId?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewNote?: string;
};

export type PublicNewsArticle = {
  id: string;
  issueId: string;
  lawGroupId: string;
  coreTopicKey: string;
  publisherLabel: string;
  publishedAt: string;
  summary: string;
  sourceUrl: string;
};

export type NewsProviderUsage = {
  provider: "naver_api_hub" | "publisher_rss";
  month: string;
  callCount: number;
  updatedAt: Date;
};

export type AreaCluster = {
  id: string;
  label: string;
  regionLabel: string;
  targetRefs: Array<{ targetType: TargetType; targetId: string }>;
};

export type TargetRelationship = {
  id: string;
  leftTargetType: TargetType;
  leftTargetId: string;
  rightTargetType: TargetType;
  rightTargetId: string;
  relationship:
    | "same_issue"
    | "same_campaign"
    | "same_area"
    | "same_time"
    | "counter_assembly"
    | "related_but_distinct"
    | "presence_near_occurrence"
    | "possibly_duplicate";
  createdAt: Date;
};

export type Occurrence = {
  id: string;
  issueId?: string;
  campaignId?: string;
  type: "static_assembly" | "march" | "policy_site" | "counter_assembly";
  areaClusterId: string;
  regionLabel: string;
  title: string;
  publicVisibility?: "public" | "source_only";
  locationText?: string;
  locationStatus?: LocationResolutionStatus;
  sourcePublicLocation?: PublicLocation;
  publicLocation?: PublicLocation;
  startsAt?: Date;
  endsAt?: Date;
  lifecycleState: LifecycleState;
  declaredParticipantCount?: number;
  claimIds: string[];
  evidenceIds: string[];
};

export type OccurrenceIssueLink = {
  occurrenceId: string;
  issueId: string;
  status: "candidate" | "approved" | "rejected";
  matchBasis: "occurrence_claim" | "occurrence_evidence" | "event_source_match" | "manual";
  confidence: "low" | "medium" | "high";
  supportingClaimIds: string[];
  supportingEvidenceIds: string[];
  createdAt: Date;
  reviewedAt?: Date;
  reviewNote?: string;
};

export type ContinuousPresence = {
  id: string;
  issueId?: string;
  campaignId?: string;
  areaClusterId: string;
  regionLabel: string;
  publicLocation?: PublicLocation;
  presenceType: "sit_in" | "encampment" | "relay_protest" | "continuous_assembly";
  firstProofOfPresenceAt?: Date;
  lastProofOfPresenceAt?: Date;
  state: "ONGOING" | "PAUSED" | "ENDING_SOON" | "ENDED" | "ARCHIVED";
  claimIds: string[];
  evidenceIds: string[];
};

export type PublicLocation = {
  lng: number;
  lat: number;
  label: string;
  precision: "venue" | "area" | "region";
  source: "public_source" | "operator_review" | "field_evidence";
  status?: Exclude<LocationResolutionStatus, "TEXT_ONLY">;
  publicRadiusM?: number;
  uncertaintyRadiusM?: number;
  fieldEvidenceCount?: number;
  updatedAt?: Date;
};

export type LocationResolutionStatus = "TEXT_ONLY" | "SOURCE_GEOCODED" | "FIELD_CORROBORATED" | "CORRECTED" | "LOCATION_DISPUTED";

// Public UI contracts deliberately expose only derived, display-safe fields.
// They never include raw report text, precise reporter coordinates, or private media paths.
export type IssueOverview = {
  id: string;
  title: string;
  status: Issue["status"];
  lifecycleState: LifecycleState;
  regionCount: number;
  occurrenceCount: number;
  officialClaimCount: number;
  publicVideoCount: number;
  disputeCount: number;
  latestUpdatedAt?: string;
  representativeOccurrenceId?: string;
  latestChange?: string;
  synthesisSummary?: string;
  synthesisEvidenceCount?: number;
  synthesisPublisherCount?: number;
  facets?: IssueSynthesisFacet[];
};

export type OccurrenceDigest = {
  id: string;
  targetType: "occurrence" | "continuous_presence";
  issueId?: string;
  issueIds?: string[];
  primaryIssueId?: string;
  title: string;
  regionLabel: string;
  locationLabel?: string;
  locationStatus?: LocationResolutionStatus;
  locationStatusLabel?: string;
  locationUncertaintyRadiusM?: number;
  fieldLocationEvidenceCount?: number;
  lifecycleState: LifecycleState;
  startsAt?: string;
  endsAt?: string;
  updatedAt?: string;
  evidenceStrength: EvidenceStrength;
  riskLevel: RiskLevel;
  officialClaimCount: number;
  publicVideoCount: number;
  disputeCount: number;
  evidenceCount: number;
  /** Number written in an official schedule. This is not an observed crowd estimate. */
  declaredParticipantCount?: number;
  scale?: { minCount: number; maxCount: number; confidence: CrowdEstimate["confidence"] };
  issueTitle?: string;
  topicStatus?: "linked" | "candidate" | "source_not_disclosed" | "unlinked";
  topicStatusLabel?: string;
  topicCandidate?: {
    issueId: string;
    title: string;
    confidence: OccurrenceIssueLink["confidence"];
    sourceCount: number;
    evidenceCount: number;
    statusLabel: string;
  };
  topicCandidateCount?: number;
  keyPoint?: string;
  officialSources?: Array<{
    label: string;
    sourceUrl: string;
    publishedAt?: string;
    checkedAt?: string;
    granularity: "bulletin" | "individual_schedule";
  }>;
};

export type EventTopicGroup = {
  id: string;
  title: string;
  status: "approved" | "candidate";
  statusLabel: string;
  occurrenceCount: number;
  currentCount: number;
  upcomingCount: number;
  regionCount: number;
  sourceCount: number;
  evidenceCount: number;
  representativeOccurrenceId: string;
  startsAt?: string;
};

export type EvidenceReel = {
  id: string;
  claimId: string;
  occurrenceId: string;
  targetType: "occurrence" | "continuous_presence";
  issueId?: string;
  occurrenceTitle: string;
  issueTitle?: string;
  regionLabel: string;
  capturedAt?: string;
  durationMs?: number;
  publicRadiusM: number;
  sourceProvenance: SourceProvenance;
  evidenceStrength: EvidenceStrength;
  riskLevel: RiskLevel;
  media: { redactedClipUrl: string; redactedPosterUrl?: string };
  summary: string;
  hasDispute: boolean;
  fieldVerification: { aligned: number; disputed: number; statusLabel: string };
  occurrenceDigest: OccurrenceDigest;
};

export type LawInterestItem = {
  id: string;
  source: LawItem["source"];
  title: string;
  stage: string;
  proposedDate?: string;
  statusDate?: string;
  officialUrl?: string;
  assemblyBillNo?: string;
  proposer?: string;
  proposalSummary?: string;
  lawGroupId?: string;
  linkedIssueCount: number;
  occurrenceCount: number;
  regionCount: number;
  interestScore: number;
  linkedIssueIds?: string[];
  coreTopicKey?: string;
  coreTopicLabel?: string;
};

export type LawGroupCard = {
  id: string;
  lawName: string;
  billTitle: string;
  coreTopics: LawCoreTopic[];
  billCount: number;
  latestProposedDate?: string;
  stageCounts: Record<string, number>;
  linkedIssueCount: number;
  occurrenceCount: number;
  regionCount: number;
  interestScore: number;
  relatedIssueActivityScore?: number;
};

export type ReportCandidate = {
  targetType: "occurrence" | "continuous_presence";
  targetId: string;
  issueId?: string;
  issueTitle?: string;
  occurrenceTitle: string;
  regionLabel: string;
  distanceM: number;
  distanceLabel: string;
  statusTone: "live" | "schedule" | "pending" | "archive";
  verificationCount: number;
  riskLevel: RiskLevel;
  evidenceStrength: EvidenceStrength;
};

/** A private, authenticated receipt for a submitted report. This is never a public feed model. */
export type ReportReceipt = {
  reportId: string;
  claimId: string;
  reportType: "live" | "material" | "on_site_correction" | "rights_violation" | "rebuttal" | "field_verification";
  status: "review" | "published";
  targetType: TargetType;
  targetId: string;
  targetTitle: string;
  issueTitle: string;
  regionLabel: string;
  publicRadiusM?: number;
  receivedAt: string;
  nextStepLabel: string;
};

export type CrowdEstimate = {
  id: string;
  targetType: "issue" | "occurrence" | "continuous_presence";
  targetId: string;
  observedAt: Date;
  minCount: number;
  maxCount: number;
  confidence: "low" | "medium" | "high";
  method: "proof_of_presence_density" | "source_claim" | "hybrid";
  evidenceCount: number;
  independentViewpointCount: number;
  limitations: string[];
};

export type Subscription = {
  id: string;
  userId: string;
  targetType: TargetType;
  targetId: string;
  alertLevel: "major_only" | "normal" | "all";
  alertTypes: string[];
  mutedUntil?: Date;
};

export type VerifiedUser = {
  id: string;
  identityProvider: "portone";
  ciHash?: string;
  diHash?: string;
  subjectHash: string;
  status: "active" | "blocked";
  verifiedAt: Date;
  lastSeenAt: Date;
  verificationCount: number;
};

export type IdentityVerificationSession = {
  id: string;
  provider: "portone";
  identityVerificationId: string;
  purpose: "report" | "field_verification" | "rebuttal" | "rights_report" | "subscription" | "general";
  status: "requested" | "verified" | "expired" | "failed";
  requestedAt: Date;
  expiresAt: Date;
  verifiedAt?: Date;
  userId?: string;
};

export type UserSession = {
  id: string;
  userId: string;
  authLevel: "identity_verified";
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
};

export type NotificationOutbox = {
  id: string;
  userId: string;
  targetType: TargetType;
  targetId: string;
  notificationType: ChangeSignal;
  dedupeKey: string;
  title: string;
  body: string;
  uncertaintyLabel: "claimed" | "reported" | "evidence_aligned" | "disputed";
  scheduledFor: Date;
  sentAt?: Date;
  status: "pending" | "sent" | "failed" | "canceled";
};

export type AuditLog = {
  id: string;
  action: "mask" | "hold" | "delete" | "correction" | "rebuttal" | "merge" | "split" | "state_change" | "notification";
  targetType: TargetType | "claim" | "evidence" | "law_topic" | "law_group" | "news_candidate";
  targetId: string;
  createdAt: Date;
  reason: string;
};

export type TransparencyLog = {
  id: string;
  action: AuditLog["action"] | "agency_request" | "rights_report" | "restore";
  targetType: TargetType | "claim" | "evidence" | "law_topic" | "law_group" | "news_candidate";
  targetId: string;
  createdAt: Date;
  publicReason: string;
};

export type ProofOfPresencePolicy = {
  maxUploadMinutes: number;
  minDurationMs: number;
  minGpsAccuracyM: number;
  maxDistanceToTargetM: number;
};

export function hasProofOfPresence(evidence: Evidence, policy: ProofOfPresencePolicy): boolean {
  if (evidence.evidenceType !== "live_media") return false;
  if (evidence.captureMode !== "in_app_camera") return false;
  if ((evidence.durationMs ?? 0) < policy.minDurationMs) return false;
  return hasLocalPresenceSignal(evidence, policy);
}

export function hasFieldPresenceSignal(evidence: Evidence, policy: ProofOfPresencePolicy): boolean {
  if (evidence.evidenceType !== "sensor") return false;
  return hasLocalPresenceSignal(evidence, policy);
}

function hasLocalPresenceSignal(evidence: Evidence, policy: ProofOfPresencePolicy): boolean {
  if (!evidence.capturedAt) return false;
  if (!evidence.foregroundGps) return false;
  if (evidence.deviceIntegrityStatus === "fail") return false;
  if ((evidence.gpsAccuracyM ?? Infinity) > policy.minGpsAccuracyM) return false;
  if ((evidence.distanceToTargetM ?? Infinity) > policy.maxDistanceToTargetM) return false;

  const uploadDelayMs = evidence.uploadedAt.getTime() - evidence.capturedAt.getTime();
  return uploadDelayMs >= 0 && uploadDelayMs <= policy.maxUploadMinutes * 60_000;
}

export type CandidateTarget = {
  targetType: TargetType;
  issueId?: string;
  areaClusterId?: string;
  startsAt?: Date;
  endsAt?: Date;
  relationHint?: "counter_assembly" | "same_area" | "presence_near_occurrence" | "possibly_duplicate";
};

export function canAutoMergeCandidate(left: CandidateTarget, right: CandidateTarget): boolean {
  if (left.targetType !== right.targetType) return false;
  if (left.relationHint === "counter_assembly" || right.relationHint === "counter_assembly") return false;
  if (left.issueId && right.issueId && left.issueId !== right.issueId) return false;
  if (left.areaClusterId && right.areaClusterId && left.areaClusterId !== right.areaClusterId) return false;
  if (!timeOverlaps(left, right)) return false;
  return left.relationHint === "possibly_duplicate" || right.relationHint === "possibly_duplicate";
}

function timeOverlaps(left: CandidateTarget, right: CandidateTarget): boolean {
  if (!left.startsAt || !right.startsAt) return true;
  const leftEnd = left.endsAt ?? left.startsAt;
  const rightEnd = right.endsAt ?? right.startsAt;
  return left.startsAt <= rightEnd && right.startsAt <= leftEnd;
}

export type PriorityScoreInput = {
  recency: number;
  updateVelocity: number;
  proofOfPresenceGrowth: number;
  publicImpact: number;
  publicAssemblyImpact: number;
  sourceDiversity: number;
  claimConflict: number;
  evidenceStrength: number;
  manipulationSuspicion: number;
  massReportPenalty: number;
  singleSourcePenalty: number;
};

export function calculatePriorityScore(input: PriorityScoreInput): number {
  return (
    input.recency +
    input.updateVelocity +
    input.proofOfPresenceGrowth +
    input.publicImpact +
    input.publicAssemblyImpact +
    input.sourceDiversity +
    input.claimConflict +
    input.evidenceStrength -
    input.manipulationSuspicion -
    input.massReportPenalty -
    input.singleSourcePenalty
  );
}

export type ChangeSignal =
  | "claim_collected"
  | "raw_report_volume_increased"
  | "report_count_increased"
  | "donation_increased"
  | "single_source_claim"
  | "state_changed"
  | "rebuttal_added"
  | "correction_reflected";

export function shouldNotify(signal: ChangeSignal): boolean {
  return [
    "state_changed",
    "rebuttal_added",
    "correction_reflected"
  ].includes(signal);
}

export type RightsReportSummary = {
  count: number;
  highestRiskLevel: RiskLevel;
  coordinatedAttackSuspected: boolean;
};

export function moderationDecisionFromRightsReports(summary: RightsReportSummary): "keep_with_review" | "mask_or_hold_for_review" {
  if (summary.highestRiskLevel === "must_hold_private" || summary.highestRiskLevel === "high_legal_privacy_risk") {
    return "mask_or_hold_for_review";
  }
  return "keep_with_review";
}
