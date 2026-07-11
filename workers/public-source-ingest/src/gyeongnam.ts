import type { PublicOccurrencePayload } from "./daegu.ts";

export type GyeongnamAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  viewCount: number;
};

type GyeongnamListResponse = {
  list?: Array<{
    CPDS_SUBJECT?: string;
    CPDS_WDATE?: string;
    CPDS_NAME?: string;
    IPDS_IDX?: string;
    IPDS_COUNTS?: number;
  }>;
};

export function parseGyeongnamTodayAssemblyList(json: string): GyeongnamAssemblyRow[] {
  const data = JSON.parse(json) as GyeongnamListResponse;
  return (data.list ?? [])
    .filter((row) => row.IPDS_IDX && row.CPDS_SUBJECT?.includes("주요집회") && row.CPDS_WDATE)
    .map((row) => ({
      sourceId: row.IPDS_IDX as string,
      title: (row.CPDS_SUBJECT as string).replace(/\s+/g, " ").trim(),
      author: row.CPDS_NAME ?? "",
      postedAt: (row.CPDS_WDATE as string).slice(0, 10),
      viewCount: row.IPDS_COUNTS ?? 0
    }));
}

export function toGyeongnamPublicOccurrencePayload(row: GyeongnamAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const startsAt = dateFromTitle(row.title, row.postedAt);
  return {
    id: `occ_gyeongnam_${startsAt.slice(0, 10).replaceAll("-", "_")}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_gyeongnam",
    regionLabel: "경남",
    title: `경남 ${row.title.replace("주요집회", "주요집회 공개 일정")}`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "경남경찰청 오늘의 주요집회",
    rawText: `source=경남경찰청 오늘의 주요집회; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; views=${row.viewCount}`,
    normalizedStatement: `경남경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function dateFromTitle(title: string, postedAt: string): string {
  const match = title.match(/\((\d{1,2})\.\s*(\d{1,2})\.\)/);
  const year = postedAt.slice(0, 4);
  if (!match) return `${postedAt}T00:00:00.000+09:00`;
  return `${year}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}T00:00:00.000+09:00`;
}

function sourceUrl(sourceId: string): string {
  return `https://www.gnpolice.go.kr/gnpolice/page.do?MENU_ID=NF05&Mode=view&IPDS_IDX=${sourceId}`;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}
