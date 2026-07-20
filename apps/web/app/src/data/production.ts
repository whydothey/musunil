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
  const detail = await request<OccurrenceDetailData>(`/occurrences/${encodeURIComponent(id)}`);
  if (!detail.occurrenceDigest.officialSources?.length) return detail;
  return {
    ...detail,
    occurrenceDigest: sanitizeOfficialScheduleOccurrence(detail.occurrenceDigest),
    claims: detail.claims.map((claim) => ({ ...claim, normalizedStatement: trimBoardRowLeak(claim.normalizedStatement) }))
  };
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
    const occurrences = (home.occurrenceDigests || map.occurrenceDigests || []).map(sanitizeOfficialScheduleOccurrence);
    const claimsByIssue: Record<string, PublicClaim[]> = {};
    const newsByIssue: AppDataset["newsByIssue"] = {};
    return {
      issues,
      occurrences,
      reels: reels.reels || [],
      laws: laws.lawInterestItems || [],
      lawGroups: laws.lawGroups || [],
      claimsByIssue,
      newsByIssue,
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

function sanitizeOfficialScheduleOccurrence(occurrence: OccurrenceDigest): OccurrenceDigest {
  if (!occurrence.officialSources?.length) return occurrence;
  return {
    ...occurrence,
    title: trimBoardRowLeak(occurrence.title),
    keyPoint: occurrence.keyPoint ? trimBoardRowLeak(occurrence.keyPoint) : occurrence.keyPoint
  };
}

function trimBoardRowLeak(value: string): string {
  const marker = value.search(/\s+정보상황계\s+\d{4}-\d{2}-\d{2}\b/);
  if (marker < 0) return value;
  const prefix = value.slice(0, marker).trim();
  if (value.includes("게시물이 등록되었습니다")) return `${prefix} 공개 일정 게시물이 등록되었습니다.`;
  if (value.includes("공개 일정")) return `${prefix} 공개 일정`;
  return prefix;
}

export default dataSource;
