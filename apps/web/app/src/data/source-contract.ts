import type { AppDataset, EventTopicDetailData, IdentityPurpose, IdentitySessionResponse, IdentityStartResponse, IssueDetailData, LawGroupDetailData, OccurrenceDetailData, ServiceReadiness, TransparencyData } from "../contracts";

export interface DataSource {
  mode: "fixture" | "production";
  loadDataset(): Promise<AppDataset>;
  loadReadiness?(): Promise<ServiceReadiness>;
  loadSupplementalDataset?(scope: "reels" | "laws" | "transparency" | "trust"): Promise<Partial<AppDataset>>;
  loadEventTopic(id: string): Promise<EventTopicDetailData>;
  loadIssue(id: string): Promise<IssueDetailData>;
  loadOccurrence(id: string, targetType: "occurrence" | "continuous_presence"): Promise<OccurrenceDetailData>;
  loadLawGroup(id: string, options?: { coreTopicKey?: string; page?: number }): Promise<LawGroupDetailData>;
  loadTransparency?(cursor?: string, action?: string): Promise<TransparencyData>;
  loadIdentitySession(): Promise<IdentitySessionResponse>;
  startIdentity(purpose: IdentityPurpose): Promise<IdentityStartResponse>;
  completeIdentity(identityVerificationId: string): Promise<IdentitySessionResponse>;
  logout(): Promise<void>;
}
