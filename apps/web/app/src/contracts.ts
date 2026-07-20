export type LifecycleState =
  | "LIVE"
  | "UPCOMING"
  | "STARTING_SOON"
  | "ONGOING_SERIES"
  | "PAUSED"
  | "ENDED"
  | "ARCHIVED"
  | "CANCELED"
  | "POSTPONED"
  | "UNKNOWN";

export type EvidenceStrength =
  | "none"
  | "single_source"
  | "multiple_sources"
  | "multiple_proof_of_presence"
  | "media_time_location_crosscheck"
  | "independent_sources_with_field_evidence";
export type RiskLevel = "low" | "misleading_possible" | "rights_risk" | "high_legal_privacy_risk" | "must_hold_private";

export interface IssueOverview {
  id: string;
  title: string;
  status: "active" | "quiet" | "archived";
  lifecycleState: LifecycleState;
  regionCount: number;
  occurrenceCount: number;
  officialClaimCount: number;
  publicVideoCount: number;
  disputeCount: number;
  latestUpdatedAt?: string;
  representativeOccurrenceId?: string;
  latestChange?: string;
}

export interface OccurrenceDigest {
  id: string;
  targetType: "occurrence" | "continuous_presence";
  issueId?: string;
  title: string;
  regionLabel: string;
  locationLabel?: string;
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
  scale?: { minCount: number; maxCount: number; confidence: "low" | "medium" | "high" };
  issueTitle?: string;
  keyPoint?: string;
}

export interface PublicClaim {
  id: string;
  normalizedStatement: string;
  sourceProvenance: string;
  evidenceStrength: EvidenceStrength;
  riskLevel: RiskLevel;
  createdAt?: string;
  disputedByClaimIds?: string[];
}

export interface EvidenceReel {
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
  sourceProvenance: string;
  evidenceStrength: EvidenceStrength;
  riskLevel: RiskLevel;
  media: { redactedClipUrl: string; redactedPosterUrl?: string };
  summary: string;
  hasDispute: boolean;
  fieldVerification: { aligned: number; disputed: number; statusLabel: string };
  occurrenceDigest: OccurrenceDigest;
}

export interface LawInterestItem {
  id: string;
  source: "assembly_bill" | "law_effective";
  title: string;
  stage: string;
  proposedDate?: string;
  statusDate?: string;
  officialUrl?: string;
  assemblyBillNo?: string;
  proposer?: string;
  proposalSummary?: string;
  topicKeywords?: string[];
  primaryLawTopicId?: string;
  linkedIssueCount: number;
  occurrenceCount: number;
  regionCount: number;
  interestScore: number;
  linkedIssueIds?: string[];
}

export interface LawTopicCard {
  id: string;
  lawName: string;
  label: string;
  representativeKeywords: string[];
  billCount: number;
  latestProposedDate?: string;
  stageCounts: Record<string, number>;
  linkedIssueCount: number;
  occurrenceCount: number;
  regionCount: number;
  interestScore: number;
}

export interface LawTopicDetailData {
  topic: LawTopicCard;
  bills: LawInterestItem[];
}

export interface ReportCandidate {
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
}

export interface IssueDetailData {
  issueOverview?: IssueOverview;
  occurrenceDigests: OccurrenceDigest[];
  claims: PublicClaim[];
}

export interface OccurrenceDetailData {
  occurrenceDigest: OccurrenceDigest;
  claims: PublicClaim[];
  evidenceCount: number;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point" | "Polygon"; coordinates: unknown };
    properties: Record<string, string | number | boolean | undefined>;
  }>;
}

export interface MapData {
  occurrenceDigests: OccurrenceDigest[];
  geojson: {
    pins: GeoJsonFeatureCollection;
    presenceAreas: GeoJsonFeatureCollection;
  };
}

export interface AppDataset {
  issues: IssueOverview[];
  occurrences: OccurrenceDigest[];
  reels: EvidenceReel[];
  laws: LawInterestItem[];
  lawTopics: LawTopicCard[];
  claimsByIssue: Record<string, PublicClaim[]>;
  claimsByOccurrence: Record<string, PublicClaim[]>;
  map: MapData;
}

export interface IssuePresentation {
  latestChange?: string;
}

export interface OccurrencePresentation {
  issueTitle?: string;
  keyPoint?: string;
}
