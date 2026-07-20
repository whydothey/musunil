import type { AppDataset, IssueDetailData, LawGroupDetailData, OccurrenceDetailData } from "../contracts";

export interface DataSource {
  mode: "fixture" | "production";
  loadDataset(): Promise<AppDataset>;
  loadIssue(id: string): Promise<IssueDetailData>;
  loadOccurrence(id: string, targetType: "occurrence" | "continuous_presence"): Promise<OccurrenceDetailData>;
  loadLawGroup(id: string): Promise<LawGroupDetailData>;
}
