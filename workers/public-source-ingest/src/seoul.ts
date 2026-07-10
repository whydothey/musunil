import type { PublicOccurrencePayload } from "./daegu.ts";

export type SeoulAssemblyRow = {
  sourceId: string;
  title: string;
  updatedAt: string;
  readCount: number;
};

type SeoulListResponse = {
  result?: Array<{
    mgrSeq?: string;
    assemTitle?: string;
    lastMdfyDat?: string;
    readCount?: string | number;
  }>;
};

export function parseSeoulAssemblyControlList(json: string): SeoulAssemblyRow[] {
  const data = JSON.parse(json) as SeoulListResponse;
  return (data.result ?? [])
    .filter((row) => row.mgrSeq && row.assemTitle && row.lastMdfyDat)
    .map((row) => ({
      sourceId: row.mgrSeq as string,
      title: (row.assemTitle as string).replace(/\s+/g, " ").trim(),
      updatedAt: formatUpdatedAt(row.lastMdfyDat as string),
      readCount: Number(row.readCount ?? 0)
    }));
}

export function toSeoulPublicOccurrencePayload(row: SeoulAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const startsAt = `${dateFromTitle(row.title, row.updatedAt)}T00:00:00.000+09:00`;
  return {
    id: `occ_seoul_${startsAt.slice(0, 10).replaceAll("-", "_")}_public`,
    issueId: "issue_real_public_sources",
    type: "static_assembly",
    areaClusterId: "area_seoul_public",
    regionLabel: "서울",
    title: `서울 ${row.title} 공개 자료`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "서울경찰청 교통정보센터 집회·통제정보",
    rawText: `source=서울경찰청 교통정보센터 집회·통제정보; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; updatedAt=${row.updatedAt}; views=${row.readCount}`,
    normalizedStatement: `서울경찰청 교통정보센터에 ${row.title} 공개 자료가 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: row.updatedAt
  };
}

function dateFromTitle(title: string, updatedAt: string): string {
  const match = title.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (!match) return updatedAt.slice(0, 10);
  return `${updatedAt.slice(0, 4)}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function formatUpdatedAt(value: string): string {
  const compact = value.padEnd(14, "0");
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:${compact.slice(12, 14)}.000+09:00`;
}

function sourceUrl(sourceId: string): string {
  return `https://www.spatic.go.kr/spatic/assem/getInfoView.do?mgrSeq=${sourceId}`;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}
