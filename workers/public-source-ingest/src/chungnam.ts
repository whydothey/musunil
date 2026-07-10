import type { PublicOccurrencePayload } from "./daegu.ts";

export type ChungnamAssemblyRow = {
  sourceId: string;
  title: string;
  department: string;
  postedAt: string;
  viewCount: number;
  hasAttachment: boolean;
};

export function parseChungnamTodayAssemblyList(html: string): ChungnamAssemblyRow[] {
  const rows: ChungnamAssemblyRow[] = [];
  const rowPattern =
    /<tr css=tr_out>[\s\S]*?ku=(\d+)[\s\S]*?<div>\s*([\s\S]*?주요집회[\s\S]*?)\s*<\/div>[\s\S]*?<td width=120>([^<]+)<\/td>\s*<td width=80\s+class=small>\s*(\d{2}\.\d{2}\.\d{2})\s*<\/td>\s*<td width=50>([\s\S]*?)<\/td>\s*<td class=small>\s*(\d+)\s*<\/td>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      department: decodeHtml(match[3]).trim(),
      postedAt: `20${match[4].replaceAll(".", "-")}`,
      hasAttachment: /icon_|alt=|hwp|pdf|file/i.test(match[5]),
      viewCount: Number(match[6])
    });
  }
  return rows;
}

export function toChungnamPublicOccurrencePayload(row: ChungnamAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const schedule = scheduleFromTitle(row.title, row.postedAt);
  const startsAt = `${schedule.start}T00:00:00.000+09:00`;
  const endsAt = schedule.end ? `${schedule.end}T23:59:59.000+09:00` : undefined;
  return {
    id: `occ_chungnam_${schedule.start.replaceAll("-", "_")}${schedule.end ? `_${schedule.end.slice(8, 10)}` : ""}_public`,
    issueId: "issue_real_public_sources",
    type: "static_assembly",
    areaClusterId: "area_chungnam",
    regionLabel: "충남",
    title: `충남 ${row.title} 공개 일정`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "충남경찰청 오늘의 주요집회",
    rawText: `source=충남경찰청 오늘의 주요집회; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; department=${row.department}; attachment=${row.hasAttachment ? "yes" : "no"}; views=${row.viewCount}`,
    normalizedStatement: `충남경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function scheduleFromTitle(title: string, postedAt: string): { start: string; end?: string } {
  const compactRange = title.match(/'?(\d{2})\.(\d{1,2})\.(\d{1,2})\.\)?\s*~\s*(\d{1,2})\./);
  if (compactRange) {
    const year = `20${compactRange[1]}`;
    return {
      start: `${year}-${compactRange[2].padStart(2, "0")}-${compactRange[3].padStart(2, "0")}`,
      end: `${year}-${compactRange[2].padStart(2, "0")}-${compactRange[4].padStart(2, "0")}`
    };
  }
  const compact = title.match(/'?(\d{2})\.(\d{1,2})\.(\d{1,2})\./);
  if (compact) return { start: `20${compact[1]}-${compact[2].padStart(2, "0")}-${compact[3].padStart(2, "0")}` };
  return { start: postedAt };
}

function sourceUrl(sourceId: string): string {
  return `https://www.cnpolice.go.kr/2014/main.php?mxPn=3_1_1&bo=cnpol2&ku=${sourceId}&mo=v`;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtml(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&#40;", "(").replaceAll("&#41;", ")");
}
