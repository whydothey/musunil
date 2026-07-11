import type { PublicOccurrencePayload } from "./daegu.ts";

export type JeonbukAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  viewCount: number;
  hasAttachment: boolean;
};

export function parseJeonbukTodayAssemblyList(html: string): JeonbukAssemblyRow[] {
  const rows: JeonbukAssemblyRow[] = [];
  const rowPattern =
    /<tr[^>]*>\s*<td>\s*\d+\s*<\/td>\s*<td class="ta_left">\s*<a href="\/board\/view\.police\?boardId=BBS_0000013(?:&amp;|&)menuCd=DOM_000000202008000000(?:&amp;|&)startPage=1(?:&amp;|&)dataSid=(\d+)" title="([^"]*?(?:예정\s*)?집회[^"]*?)">[\s\S]*?<\/a>[\s\S]*?<\/td>\s*<td>([^<]+)<\/td>\s*<td>(\d{4}-\d{2}-\d{2})<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>(\d+)<\/td>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(match[2]).replace(/\s+/g, " ").trim(),
      author: decodeHtml(match[3]).trim(),
      postedAt: match[4],
      hasAttachment: /첨부|ico_file|img/i.test(match[5]),
      viewCount: Number(match[6])
    });
  }
  return rows;
}

export function toJeonbukPublicOccurrencePayload(row: JeonbukAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const schedule = scheduleFromTitle(row.title, row.postedAt);
  const startsAt = `${schedule.start}T00:00:00.000+09:00`;
  const endsAt = schedule.end ? `${schedule.end}T23:59:59.000+09:00` : undefined;
  return {
    id: `occ_jeonbuk_${schedule.start.replaceAll("-", "_")}${schedule.end ? `_${schedule.end.slice(8, 10)}` : ""}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_jeonbuk",
    regionLabel: "전북",
    title: `전북 ${row.title} 공개 일정`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "전북경찰청 집회시위안내",
    rawText: `source=전북경찰청 집회시위안내; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; author=${row.author}; attachment=${row.hasAttachment ? "yes" : "no"}; views=${row.viewCount}`,
    normalizedStatement: `전북경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function scheduleFromTitle(title: string, postedAt: string): { start: string; end?: string } {
  const year = postedAt.slice(0, 4);
  const range = title.match(/(\d{1,2})\.(\d{1,2})\s*~\s*(?:(\d{1,2})\.)?(\d{1,2})/);
  if (range) {
    const endMonth = range[3] ?? range[1];
    return {
      start: `${year}-${range[1].padStart(2, "0")}-${range[2].padStart(2, "0")}`,
      end: `${year}-${endMonth.padStart(2, "0")}-${range[4].padStart(2, "0")}`
    };
  }
  const single = title.match(/(\d{1,2})\.(\d{1,2})/);
  if (single) return { start: `${year}-${single[1].padStart(2, "0")}-${single[2].padStart(2, "0")}` };
  return { start: postedAt };
}

function sourceUrl(sourceId: string): string {
  return `https://www.jbpolice.go.kr/board/view.police?boardId=BBS_0000013&menuCd=DOM_000000202008000000&startPage=1&dataSid=${sourceId}`;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}

function decodeHtml(value: string): string {
  return value.replaceAll("&amp;", "&");
}
