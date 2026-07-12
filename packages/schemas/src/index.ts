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
  normalizedTopicKey: string;
  topicTags: string[];
  status: "active" | "quiet" | "archived";
  firstSeenAt: Date;
  lastUpdatedAt: Date;
};

export type LawItem = {
  id: string;
  source: "assembly_bill" | "law_effective";
  lawName: string;
  billTitle?: string;
  stage: string;
  statusDate?: Date;
  effectiveDate?: Date;
  assemblyBillId?: string;
  lawId?: string;
  summary?: string;
  officialUrl?: string;
  keywords: string[];
};

export type IssueLawLink = {
  issueId: string;
  lawItemId: string;
  matchBasis: "law_name" | "keyword" | "bill_title" | "manual";
  confidence: "low" | "medium" | "high";
  claimIds: string[];
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
  publicLocation?: PublicLocation;
  startsAt?: Date;
  endsAt?: Date;
  lifecycleState: LifecycleState;
  claimIds: string[];
  evidenceIds: string[];
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
  precision: "venue" | "area";
  source: "public_source" | "operator_review";
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
  targetType: TargetType | "claim" | "evidence";
  targetId: string;
  createdAt: Date;
  reason: string;
};

export type TransparencyLog = {
  id: string;
  action: AuditLog["action"] | "agency_request" | "rights_report" | "restore";
  targetType: TargetType | "claim" | "evidence";
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
