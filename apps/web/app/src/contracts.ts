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
  synthesisSummary?: string;
  synthesisEvidenceCount?: number;
  synthesisPublisherCount?: number;
  facets?: IssueSynthesisFacet[];
}

export interface IssueSynthesisFacet {
  coreTopicKey: string;
  label: string;
  evidenceCount: number;
  publisherCount: number;
  claimIds: string[];
  evidenceIds: string[];
}

export interface IssueSynthesis {
  version: string;
  method: "law_group_evidence_aggregate";
  neutralSummary: string;
  generatedAt: string;
  windowStartedAt: string;
  windowEndedAt: string;
  evidenceCount: number;
  publisherCount: number;
  claimIds: string[];
  evidenceIds: string[];
  facets: IssueSynthesisFacet[];
}

export interface OccurrenceDigest {
  id: string;
  targetType: "occurrence" | "continuous_presence";
  issueId?: string;
  issueIds?: string[];
  primaryIssueId?: string;
  title: string;
  regionLabel: string;
  locationLabel?: string;
  locationStatus?: "TEXT_ONLY" | "SOURCE_GEOCODED" | "FIELD_CORROBORATED" | "CORRECTED" | "LOCATION_DISPUTED";
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
  scale?: { minCount: number; maxCount: number; confidence: "low" | "medium" | "high" };
  issueTitle?: string;
  topicStatus?: "linked" | "candidate" | "source_not_disclosed" | "unlinked";
  topicStatusLabel?: string;
  topicCandidate?: {
    issueId: string;
    title: string;
    confidence: "low" | "medium" | "high";
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
  lawGroupId?: string;
  linkedIssueCount: number;
  occurrenceCount: number;
  regionCount: number;
  interestScore: number;
  linkedIssueIds?: string[];
  coreTopicKey?: string;
  coreTopicLabel?: string;
}

export interface LawCoreTopic {
  key: string;
  label: string;
  representativeKeywords: string[];
  billCount: number;
}

export interface LawGroupCard {
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
}

export interface NewsArticle {
  id: string;
  issueId: string;
  lawGroupId: string;
  coreTopicKey: string;
  publisherLabel: string;
  publishedAt: string;
  summary: string;
  sourceUrl: string;
}

export interface LawGroupIssueOverview extends IssueOverview {
  newsCount: number;
  recentNews: NewsArticle[];
}

export interface LawGroupDetailData {
  group: LawGroupCard;
  bills: LawInterestItem[];
  issues?: LawGroupIssueOverview[];
  pagination?: { page: number; pageSize: number; total: number; pageCount: number };
  selectedCoreTopicKey?: string;
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
  newsArticles?: NewsArticle[];
  topicGrouping?: {
    synthesisBasis: "explicit" | "evidence_aggregate";
    policy: string;
    basis: string[];
    synthesis?: IssueSynthesis;
  };
  relatedLawGroups?: LawGroupCard[];
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
  lawGroups: LawGroupCard[];
  claimsByIssue: Record<string, PublicClaim[]>;
  newsByIssue: Record<string, NewsArticle[]>;
  synthesisByIssue: Record<string, IssueSynthesis | undefined>;
  lawGroupsByIssue: Record<string, LawGroupCard[]>;
  claimsByOccurrence: Record<string, PublicClaim[]>;
  map: MapData;
}

export interface ServiceReadiness {
  gates?: {
    publicRead: { ready: boolean; failedIds: string[] };
    contribution: { ready: boolean; failedIds: string[] };
    operator: { ready: boolean; failedIds: string[] };
  };
}

export interface IssuePresentation {
  latestChange?: string;
}

export interface OccurrencePresentation {
  issueTitle?: string;
  keyPoint?: string;
}
