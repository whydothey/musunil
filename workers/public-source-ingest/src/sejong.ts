import type { PublicOccurrencePayload } from "./daegu.ts";

export type SejongAssemblyRow = {
  sourceId: string;
  title: string;
  department: string;
  postedAt: string;
  viewCount: number;
};

export function parseSejongTodayAssemblyList(html: string): SejongAssemblyRow[] {
  const rows: SejongAssemblyRow[] = [];
  const rowPattern = /<tr css=tr_out>[\s\S]*?<a href=\?[\s\S]*?ku=(\d+)[\s\S]*?mo=v>\s*([\s\S]*?예정 집회[\s\S]*?)<\/a>[\s\S]*?<td class="m-hidden">(?:<font[^>]*>)?([^<]+)(?:<\/font>)?<\/td>\s*<td class="m-hidden">([^<]+)<\/td>\s*<td class="m-table__date">\s*(\d{2}\.\d{2}\.\d{2})\s*<\/td>[\s\S]*?<td class="m-hidden">\s*(\d+)\s*<\/td>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      department: decodeHtml(`${match[3]} ${match[4]}`).replace(/\s+/g, " ").trim(),
      postedAt: `20${match[5].replaceAll(".", "-")}`,
      viewCount: Number(match[6])
    });
  }
  return rows;
}

export function toSejongPublicOccurrencePayload(row: SejongAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const schedule = scheduleFromTitle(row.title, row.postedAt);
  const startsAt = `${schedule.start}T00:00:00.000+09:00`;
  const endsAt = schedule.end ? `${schedule.end}T23:59:59.000+09:00` : undefined;
  return {
    id: `occ_sejong_${schedule.start.replaceAll("-", "_")}${schedule.end ? `_${schedule.end.slice(8, 10)}` : ""}_public`,
    issueId: "issue_real_public_sources",
    type: "static_assembly",
    areaClusterId: "area_sejong",
    regionLabel: "세종",
    title: `세종 ${row.title} 공개 일정`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "세종경찰청 오늘의 집회/시위",
    rawText: `source=세종경찰청 오늘의 집회/시위; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; department=${row.department}; views=${row.viewCount}`,
    normalizedStatement: `세종경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function scheduleFromTitle(title: string, postedAt: string): { start: string; end?: string } {
  const dates = [...title.matchAll(/(\d{1,2})\.\s*(\d{1,2})\./g)];
  const year = postedAt.slice(0, 4);
  if (dates.length === 0 || !dates[0]) return { start: postedAt };
  const start = `${year}-${dates[0][1].padStart(2, "0")}-${dates[0][2].padStart(2, "0")}`;
  const end = dates[1] ? `${year}-${dates[1][1].padStart(2, "0")}-${dates[1][2].padStart(2, "0")}` : undefined;
  return { start, end };
}

function sourceUrl(sourceId: string): string {
  return `https://www.sjpolice.go.kr/site/main.php?mxPn=02_02&bo=sjpol2&ku=${sourceId}&mo=v`;
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
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"");
}
