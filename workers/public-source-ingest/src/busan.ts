import type { PublicOccurrencePayload } from "./daegu.ts";

export type BusanAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  hasAttachment: boolean;
};

export function parseBusanTodayAssemblyList(html: string): BusanAssemblyRow[] {
  const rows: BusanAssemblyRow[] = [];
  const rowPattern =
    /<tr>\s*<td class="o1_td_bt[^"]*">[^<]*<\/td>\s*<td class="o1_td_bt tdalign">\s*<a href="#" onclick="javascript:linkPage\(1,'view','(\d+)'\);return false;">([\s\S]*?)<\/a>\s*<\/td>\s*<td class="o1_td_bt">([^<]+)<\/td>\s*<td class="o1_td_bt">(\d{4}-\d{2}-\d{2})<\/td>\s*<td class="o1_td_bt">[\s\S]*?<\/td>\s*<td class="o1_td_bt">([\s\S]*?)<\/td>\s*<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      author: decodeHtml(match[3]).trim(),
      postedAt: match[4],
      hasAttachment: /img|첨부|file/i.test(match[5])
    });
  }
  return rows;
}

export function toBusanPublicOccurrencePayload(row: BusanAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const { startsAt, endsAt } = datesFromTitle(row.title, row.postedAt);
  return {
    id: `occ_busan_${startsAt.slice(0, 10).replaceAll("-", "_")}${endsAt ? `_${endsAt.slice(8, 10)}` : ""}_public`,
    issueId: "issue_real_public_sources",
    type: "static_assembly",
    areaClusterId: "area_busan",
    regionLabel: "부산",
    title: `부산 ${row.title.replace("주요집회", "주요집회 공개 일정")}`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "부산경찰청 오늘의 집회/시위",
    rawText: `source=부산경찰청 오늘의 집회/시위; sourceId=${row.sourceId}; url=https://www.bspolice.go.kr/view.do?no=72&seq=1&view=list; postedAt=${row.postedAt}; attachment=${row.hasAttachment ? "yes" : "no"}`,
    normalizedStatement: `부산경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function datesFromTitle(title: string, postedAt: string): { startsAt: string; endsAt?: string } {
  const start = title.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})\./);
  if (!start) return { startsAt: `${postedAt}T00:00:00.000+09:00` };
  const year = start[1];
  const month = start[2].padStart(2, "0");
  const day = start[3].padStart(2, "0");
  const end = title.match(/~\s*(?:(\d{1,2})\.)?(\d{1,2})\./);
  const startsAt = `${year}-${month}-${day}T00:00:00.000+09:00`;
  const endsAt = end ? `${year}-${(end[1] ?? start[2]).padStart(2, "0")}-${end[2].padStart(2, "0")}T23:59:59.000+09:00` : undefined;
  return { startsAt, endsAt };
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
