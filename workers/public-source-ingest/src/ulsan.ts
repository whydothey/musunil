import type { PublicOccurrencePayload } from "./daegu.ts";

export type UlsanAssemblyRow = {
  sourceId: string;
  title: string;
  scheduleDate: string;
  hasAttachment: boolean;
};

export function parseUlsanTodayAssemblyList(html: string, now = new Date()): UlsanAssemblyRow[] {
  const rows: UlsanAssemblyRow[] = [];
  let inferredYear = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric" }).format(now));
  const rowPattern = /<tr>\s*<td class="b-num">\s*\d+\s*<\/td>[\s\S]*?<td class="b-subject">\s*<a href="#" onclick="goArticle\('(\d+)'\s*,\s*'0'\);">\s*([\s\S]*?집회표[\s\S]*?)<\/a>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    const title = decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim();
    const scheduleDate = dateFromTitle(title, inferredYear);
    if (!scheduleDate) continue;
    inferredYear = Number(scheduleDate.slice(0, 4));
    rows.push({
      sourceId: match[1],
      title,
      scheduleDate,
      hasAttachment: /hwp\.gif|파일이미지|<img/i.test(match[3])
    });
  }
  return rows;
}

export function toUlsanPublicOccurrencePayload(row: UlsanAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const startsAt = `${row.scheduleDate}T00:00:00.000+09:00`;
  return {
    id: `occ_ulsan_${row.scheduleDate.replaceAll("-", "_")}_public`,
    issueId: "issue_real_public_sources",
    type: "static_assembly",
    areaClusterId: "area_ulsan",
    regionLabel: "울산",
    title: `울산 ${row.title.replace("집회표", "집회표 공개 일정")}`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "울산경찰청 오늘의 집회",
    rawText: `source=울산경찰청 오늘의 집회; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; dateSource=title; attachment=${row.hasAttachment ? "yes" : "no"}`,
    normalizedStatement: `울산경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: startsAt
  };
}

function dateFromTitle(title: string, defaultYear: number): string | undefined {
  const explicitYear = title.match(/^\s*(\d{2})\.(\d{1,2})\.(\d{1,2})\./);
  if (explicitYear) return `${2000 + Number(explicitYear[1])}-${explicitYear[2].padStart(2, "0")}-${explicitYear[3].padStart(2, "0")}`;
  const monthDay = title.match(/^\s*(\d{1,2})\.(\d{1,2})\./);
  if (!monthDay) return undefined;
  return `${defaultYear}-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`;
}

function sourceUrl(sourceId: string): string {
  return `https://www.uspolice.go.kr/m/board.jsp?tab=bo20141217142954&wmode=read&ridx=${sourceId}`;
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
