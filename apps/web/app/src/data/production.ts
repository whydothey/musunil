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
  PublicClaim,
  ServiceReadiness
} from "../contracts";
import type { DataSource } from "./source-contract";

const apiBaseUrl = String(window.MUSUNIL_WEB_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");

async function request<T>(path: string, timeoutMs = 65_000): Promise<T> {
  if (!apiBaseUrl) throw new Error("service_unavailable");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: "include",
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    const body = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(body.error || "service_unavailable");
    return body;
  } finally {
    window.clearTimeout(timeout);
  }
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

export async function getLawGroupDetail(id: string, options?: { coreTopicKey?: string; page?: number }): Promise<LawGroupDetailData> {
  const search = new URLSearchParams({ pageSize: "15" });
  if (options?.coreTopicKey) search.set("coreTopic", options.coreTopicKey);
  if (options?.page) search.set("page", String(options.page));
  return request<LawGroupDetailData>(`/law-groups/${encodeURIComponent(id)}?${search}`);
}

export async function getServiceReadiness(): Promise<ServiceReadiness> {
  return request<ServiceReadiness>("/readiness", 10_000);
}

export const dataSource: DataSource = {
  mode: "production",
  loadReadiness: getServiceReadiness,
  async loadDataset(): Promise<AppDataset> {
    const results = await Promise.allSettled([
      request<{ issueOverviews?: IssueOverview[]; occurrenceDigests?: OccurrenceDigest[] }>("/home"),
      request<MapData>("/map")
    ]);
    const home = results[0].status === "fulfilled" ? results[0].value : {};
    const map = results[1].status === "fulfilled" ? results[1].value : {
      occurrenceDigests: [],
      geojson: {
        pins: { type: "FeatureCollection" as const, features: [] },
        presenceAreas: { type: "FeatureCollection" as const, features: [] }
      }
    };
    if (results.every((result) => result.status === "rejected")) throw new Error("service_unavailable");
    const issues = home.issueOverviews || [];
    const occurrences = (home.occurrenceDigests?.length ? home.occurrenceDigests : map.occurrenceDigests || []).map(sanitizeOfficialScheduleOccurrence);
    const claimsByIssue: Record<string, PublicClaim[]> = {};
    const newsByIssue: AppDataset["newsByIssue"] = {};
    return {
      issues,
      occurrences,
      reels: [],
      laws: [],
      lawGroups: [],
      claimsByIssue,
      newsByIssue,
      synthesisByIssue: {},
      lawGroupsByIssue: {},
      claimsByOccurrence: {},
      map
    };
  },
  async loadSupplementalDataset(scope) {
    if (scope === "reels") {
      const reels = await request<{ reels?: AppDataset["reels"] }>("/reels");
      return { reels: reels.reels || [] };
    }
    const laws = await request<{ lawInterestItems?: LawInterestItem[]; lawGroups?: LawGroupCard[] }>("/laws?sort=interest");
    return { laws: laws.lawInterestItems || [], lawGroups: laws.lawGroups || [] };
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
