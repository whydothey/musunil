import type { PublicOccurrencePayload } from "./daegu.ts";

export type GyeonggiSouthAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  hasAttachment: boolean;
};

export function parseGyeonggiSouthTodayAssemblyList(html: string): GyeonggiSouthAssemblyRow[] {
  const rows: GyeonggiSouthAssemblyRow[] = [];
  const rowPattern =
    /<tr class="notice_line">\s*<td>[^<]*<\/td>\s*<td class="sub_line">\s*<a href="javascript:bbsView\('(\d+)'\);">\s*([\s\S]*?)\s*<\/a>\s*<\/td>\s*<td>([^<]+)<\/td>\s*<td>(\d{4}-\d{2}-\d{2})<\/td>\s*<td>[^<]*<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      author: decodeHtml(match[3]).trim(),
      postedAt: match[4],
      hasAttachment: /첨부|add_file|img/i.test(match[5])
    });
  }
  return rows;
}

export function toGyeonggiSouthPublicOccurrencePayload(row: GyeonggiSouthAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const { startsAt, endsAt } = datesFromTitle(row.title, row.postedAt);
  return {
    id: `occ_gyeonggi_south_${startsAt.slice(0, 10).replaceAll("-", "_")}${endsAt ? `_${endsAt.slice(8, 10)}` : ""}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_gyeonggi_south",
    regionLabel: "경기남부",
    title: `경기남부 ${row.title.replace("주요 집회", "주요 집회 공개 일정")}`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "경기남부경찰청 오늘의 주요집회",
    rawText: `source=경기남부경찰청 오늘의 주요집회; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; attachment=${row.hasAttachment ? "yes" : "no"}`,
    normalizedStatement: `경기남부경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function datesFromTitle(title: string, postedAt: string): { startsAt: string; endsAt?: string } {
  const start = title.match(/(\d{1,2})\.(\d{1,2})\.?/);
  if (!start) return { startsAt: `${postedAt}T00:00:00.000+09:00` };
  const year = postedAt.slice(0, 4);
  const month = start[1].padStart(2, "0");
  const day = start[2].padStart(2, "0");
  const end = title.match(/~\s*(?:(\d{1,2})\.)?(\d{1,2})\.?/);
  const startsAt = `${year}-${month}-${day}T00:00:00.000+09:00`;
  const endsAt = end ? `${year}-${(end[1] ?? start[1]).padStart(2, "0")}-${end[2].padStart(2, "0")}T23:59:59.000+09:00` : undefined;
  return { startsAt, endsAt };
}

function sourceUrl(sourceId: string): string {
  return `https://www.ggpolice.go.kr/main/bbsview.do?bbsId=FD2&contentSeq=${sourceId}`;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#40;", "(")
    .replaceAll("&#41;", ")")
    .replaceAll("&nbsp;", " ");
}
