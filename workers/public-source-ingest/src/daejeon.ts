import type { PublicOccurrencePayload } from "./daegu.ts";

export type DaejeonAssemblyRow = {
  sourceId: string;
  title: string;
  postedAt: string;
};

export function parseDaejeonTodayAssemblyList(html: string): DaejeonAssemblyRow[] {
  const section = html.match(/\[알림\]오늘의주요집회[\s\S]*?<tbody class="text-align--left">([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const rows: DaejeonAssemblyRow[] = [];
  const rowPattern = /<tr>[\s\S]*?bo=notify3(?:&amp;|&)ku=(\d+)[^"]*">([\s\S]*?주요[\s\S]*?집회[\s\S]*?)<\/a>[\s\S]*?<td>\s*(\d{4}-\d{2}-\d{2})\s*<\/td>/g;
  for (const match of section.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      postedAt: match[3]
    });
  }
  return rows;
}

export function toDaejeonPublicOccurrencePayload(row: DaejeonAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const schedule = scheduleFromTitle(row.title, row.postedAt);
  const startsAt = `${schedule.start}T00:00:00.000+09:00`;
  const endsAt = schedule.end ? `${schedule.end}T23:59:59.000+09:00` : undefined;
  return {
    id: `occ_daejeon_${schedule.start.replaceAll("-", "_")}${schedule.end ? `_${schedule.end.slice(8, 10)}` : ""}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daejeon_public",
    regionLabel: "대전",
    title: `대전 ${row.title} 공개 일정`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "대전경찰청 오늘의주요집회",
    rawText: `source=대전경찰청 오늘의주요집회; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; sourceList=official-search`,
    normalizedStatement: `대전경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function scheduleFromTitle(title: string, postedAt: string): { start: string; end?: string } {
  const range = title.match(/(\d{2})(\d{2})(\d{2})\s*~\s*(\d{2})/);
  if (range) {
    const year = `20${range[1]}`;
    return { start: `${year}-${range[2]}-${range[3]}`, end: `${year}-${range[2]}-${range[4]}` };
  }
  const single = title.match(/(\d{2})(\d{2})(\d{2})/);
  if (single) return { start: `20${single[1]}-${single[2]}-${single[3]}` };
  return { start: postedAt };
}

function sourceUrl(sourceId: string): string {
  return `https://www.djpolice.go.kr/main.htm?mxRc=x7_9&bo=notify3&ku=${sourceId}`;
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
