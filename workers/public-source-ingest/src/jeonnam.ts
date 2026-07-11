import type { PublicOccurrencePayload } from "./daegu.ts";

export type JeonnamAssemblyRow = {
  sourceId: string;
  title: string;
  postedAt: string;
  viewCount: number;
};

export function parseJeonnamTodayAssemblyList(html: string): JeonnamAssemblyRow[] {
  const rows: JeonnamAssemblyRow[] = [];
  const rowPattern =
    /<tr>\s*<td>\s*\d+\s*<\/td>\s*<td style="text-align:left">[\s\S]*?bbsBid=(\d+)[^"]*">\s*([\s\S]*?오늘의 주요집회[\s\S]*?)\s*<\/a>[\s\S]*?<td>\s*(\d{4}-\d{2}-\d{2})\s*<\/td>\s*<td>\s*(\d+)\s*<\/td>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      postedAt: match[3],
      viewCount: Number(match[4])
    });
  }
  return rows;
}

export function toJeonnamPublicOccurrencePayload(row: JeonnamAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const startsAt = `${dateFromTitle(row.title, row.postedAt)}T00:00:00.000+09:00`;
  return {
    id: `occ_jeonnam_${startsAt.slice(0, 10).replaceAll("-", "_")}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_jeonnam",
    regionLabel: "전남",
    title: `전남 ${row.title} 공개 일정`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "전남경찰청 오늘의집회/시위",
    rawText: `source=전남경찰청 오늘의집회/시위; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; views=${row.viewCount}`,
    normalizedStatement: `전남경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function dateFromTitle(title: string, postedAt: string): string {
  const match = title.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
  if (!match) return postedAt;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function sourceUrl(sourceId: string): string {
  return `https://www.jnpolice.go.kr/?pid=AP0306&mode=view&bbsId=sub0306&bbsBid=${sourceId}`;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtml(value: string): string {
  return value.replaceAll("&amp;", "&");
}
