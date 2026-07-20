import type {
  AppDataset,
  IssueDetailData,
  IssueOverview,
  LawInterestItem,
  LawGroupCard,
  LawGroupDetailData,
  MapData,
  OccurrenceDetailData,
  OccurrenceDigest,
  PublicClaim
} from "../contracts";
import type { DataSource } from "./source-contract";

const apiBaseUrl = String(window.MUSUNIL_WEB_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");

async function request<T>(path: string): Promise<T> {
  if (!apiBaseUrl) throw new Error("service_unavailable");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    headers: { accept: "application/json" }
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "service_unavailable");
  return body;
}

export async function getIssueDetail(id: string): Promise<IssueDetailData> {
  return request<IssueDetailData>(`/issues/${encodeURIComponent(id)}`);
}

export async function getOccurrenceDetail(id: string): Promise<OccurrenceDetailData> {
  return request<OccurrenceDetailData>(`/occurrences/${encodeURIComponent(id)}`);
}

export async function getContinuousPresenceDetail(id: string): Promise<OccurrenceDetailData> {
  const body = await request<{ occurrenceDigest: OccurrenceDigest; claims: PublicClaim[]; evidenceCount: number }>(`/continuous-presences/${encodeURIComponent(id)}`);
  return { occurrenceDigest: body.occurrenceDigest, claims: body.claims, evidenceCount: body.evidenceCount };
}

export async function getLawGroupDetail(id: string): Promise<LawGroupDetailData> {
  return request<LawGroupDetailData>(`/law-groups/${encodeURIComponent(id)}`);
}

export const dataSource: DataSource = {
  mode: "production",
  async loadDataset(): Promise<AppDataset> {
    const results = await Promise.allSettled([
      request<{ issueOverviews?: IssueOverview[]; occurrenceDigests?: OccurrenceDigest[] }>("/home"),
      request<{ reels?: AppDataset["reels"] }>("/reels"),
      request<{ lawInterestItems?: LawInterestItem[]; lawGroups?: LawGroupCard[] }>("/laws?sort=interest"),
      request<MapData>("/map")
    ]);
    const home = results[0].status === "fulfilled" ? results[0].value : {};
    const reels = results[1].status === "fulfilled" ? results[1].value : {};
    const laws = results[2].status === "fulfilled" ? results[2].value : {};
    const map = results[3].status === "fulfilled" ? results[3].value : {
      occurrenceDigests: [],
      geojson: {
        pins: { type: "FeatureCollection" as const, features: [] },
        presenceAreas: { type: "FeatureCollection" as const, features: [] }
      }
    };
    if (results.every((result) => result.status === "rejected")) throw new Error("service_unavailable");
    const issues = home.issueOverviews || [];
    const occurrences = home.occurrenceDigests || map.occurrenceDigests || [];
    const claimsByIssue: Record<string, PublicClaim[]> = {};
    return {
      issues,
      occurrences,
      reels: reels.reels || [],
      laws: laws.lawInterestItems || [],
      lawGroups: laws.lawGroups || [],
      claimsByIssue,
      claimsByOccurrence: {},
      map
    };
  },
  loadIssue: getIssueDetail,
  loadOccurrence(id, targetType) {
    return targetType === "continuous_presence" ? getContinuousPresenceDetail(id) : getOccurrenceDetail(id);
  },
  loadLawGroup: getLawGroupDetail
};

export default dataSource;
