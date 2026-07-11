import type { PublicOccurrencePayload } from "./daegu.ts";

export type GyeongbukAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  hasAttachment: boolean;
};

export function parseGyeongbukTodayAssemblyList(html: string): GyeongbukAssemblyRow[] {
  const rows: GyeongbukAssemblyRow[] = [];
  const rowPattern =
    /<tr>\s*<td class="listnum">\s*[^<]+<\/td>\s*<td class="t_left">\s*<a href='[^']*wr_id=(\d+)'>([^<]*오늘의 주요집회[^<]*)<\/a>\s*([\s\S]*?)<\/td>\s*<td class="hidden-xs hidden-sm">\s*([^<]+)\s*<\/td>\s*<td class="hidden-xs hidden-sm">(\d{4}-\d{2}-\d{2})<\/td>[\s\S]*?<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(match[2]).replace(/\s+/g, " ").trim(),
      hasAttachment: /icon_file|alt=['"]file/i.test(match[3]),
      author: decodeHtml(match[4]).trim(),
      postedAt: match[5]
    });
  }
  return rows;
}

export function toGyeongbukPublicOccurrencePayload(row: GyeongbukAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const { startsAt, endsAt } = datesFromTitle(row.title, row.postedAt);
  return {
    id: `occ_gyeongbuk_${startsAt.slice(0, 10).replaceAll("-", "_")}${endsAt ? `_${endsAt.slice(8, 10)}` : ""}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_gyeongbuk",
    regionLabel: "경북",
    title: `경북 ${row.title.replace("오늘의 주요집회", "오늘의 주요집회 공개 일정")}`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "경북경찰청 오늘의 집회시위",
    rawText: `source=경북경찰청 오늘의 집회시위; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; attachment=${row.hasAttachment ? "yes" : "no"}`,
    normalizedStatement: `경북경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function datesFromTitle(title: string, postedAt: string): { startsAt: string; endsAt?: string } {
  const start = title.match(/(\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (!start) return { startsAt: `${postedAt}T00:00:00.000+09:00` };
  const year = `20${start[1]}`;
  const month = start[2].padStart(2, "0");
  const day = start[3].padStart(2, "0");
  const end = title.match(/~\s*(?:(\d{1,2})월\s*)?(\d{1,2})일/);
  const startsAt = `${year}-${month}-${day}T00:00:00.000+09:00`;
  const endsAt = end ? `${year}-${(end[1] ?? start[2]).padStart(2, "0")}-${end[2].padStart(2, "0")}T23:59:59.000+09:00` : undefined;
  return { startsAt, endsAt };
}

function sourceUrl(sourceId: string): string {
  return `https://www.gbpolice.go.kr/bbs/view.do?bbsId=8&sid=gbpolice&pageNum=1&wr_id=${sourceId}`;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#40;", "(")
    .replaceAll("&#41;", ")");
}
