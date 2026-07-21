import type { AppDataset, IssueDetailData, LawGroupDetailData, OccurrenceDetailData, ServiceReadiness } from "../contracts";

export interface DataSource {
  mode: "fixture" | "production";
  loadDataset(): Promise<AppDataset>;
  loadReadiness?(): Promise<ServiceReadiness>;
  loadSupplementalDataset?(scope: "reels" | "laws"): Promise<Partial<Pick<AppDataset, "reels" | "laws" | "lawGroups">>>;
  loadIssue(id: string): Promise<IssueDetailData>;
  loadOccurrence(id: string, targetType: "occurrence" | "continuous_presence"): Promise<OccurrenceDetailData>;
  loadLawGroup(id: string, options?: { coreTopicKey?: string; page?: number }): Promise<LawGroupDetailData>;
}
