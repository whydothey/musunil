import type { PublicOccurrencePayload } from "./daegu.ts";

export type GyeonggiNorthAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  hasAttachment: boolean;
};

export function parseGyeonggiNorthTodayAssemblyList(html: string): GyeonggiNorthAssemblyRow[] {
  const rows: GyeonggiNorthAssemblyRow[] = [];
  const rowPattern = /<tr>[\s\S]*?<td>\s*\d+\s*[\s\S]*?<\/td>\s*<td class="sub_line">[\s\S]*?fn_inqire_notice\('(\d+)','Assembly_main'\)[\s\S]*?>([\s\S]*?(?:예정|주요) 집회[\s\S]*?)<\/a>[\s\S]*?<\/td>\s*<td>\s*([^<]+?)\s*<\/td>\s*<td>\s*(\d{4}-\d{2}-\d{2})\s*<\/td>\s*<td>\s*([\s\S]*?)<\/td>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      author: decodeHtml(match[3]).trim(),
      postedAt: match[4],
      hasAttachment: /add_file|첨부파일|<img/i.test(match[5])
    });
  }
  return rows;
}

export function toGyeonggiNorthPublicOccurrencePayload(row: GyeonggiNorthAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const schedule = scheduleFromTitle(row.title, row.postedAt);
  const startsAt = `${schedule.start}T00:00:00.000+09:00`;
  const endsAt = schedule.end ? `${schedule.end}T23:59:59.000+09:00` : undefined;
  return {
    id: `occ_gyeonggi_north_${schedule.start.replaceAll("-", "_")}${schedule.end ? `_${schedule.end.slice(8, 10)}` : ""}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_gyeonggi_north",
    regionLabel: "경기북부",
    title: `경기북부 ${row.title} 공개 일정`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "경기북부경찰청 오늘의 주요집회",
    rawText: `source=경기북부경찰청 오늘의 주요집회; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; author=${row.author}; attachment=${row.hasAttachment ? "yes" : "no"}`,
    normalizedStatement: `경기북부경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function scheduleFromTitle(title: string, postedAt: string): { start: string; end?: string } {
  const year = postedAt.slice(0, 4);
  const startMatch = title.match(/(\d{1,2})\.\s*(\d{1,2})\./);
  if (!startMatch) return { start: postedAt };
  const startMonth = startMatch[1].padStart(2, "0");
  const startDay = startMatch[2].padStart(2, "0");
  const rangeMatch = title.match(/~\s*(?:(\d{1,2})\.)?\s*(\d{1,2})\./);
  const endMonth = rangeMatch ? (rangeMatch[1] ?? startMatch[1]).padStart(2, "0") : undefined;
  const endDay = rangeMatch?.[2]?.padStart(2, "0");
  return {
    start: `${year}-${startMonth}-${startDay}`,
    end: endMonth && endDay ? `${year}-${endMonth}-${endDay}` : undefined
  };
}

function sourceUrl(sourceId: string): string {
  return `https://www.ggbpolice.go.kr/main/cop/bbs/selectBoardArticle.do?bbsId=Assembly_main&nttId=${sourceId}`;
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
