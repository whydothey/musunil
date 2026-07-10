import type { PublicOccurrencePayload } from "./daegu.ts";

export type GangwonAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  hasAttachment: boolean;
  sourcePath: string;
};

export function parseGangwonTodayAssemblyList(html: string): GangwonAssemblyRow[] {
  const rows: GangwonAssemblyRow[] = [];
  const rowPattern =
    /<tr>\s*<td class="p_c">[^<]*<\/td>[\s\S]*?<td><a href='([^']*boardNo=(\d+)[^']*)'\s*>([\s\S]*?)<\/a>[\s\S]*?<\/td>\s*<td class="p_c">([\s\S]*?)<\/td>[\s\S]*?<td class="p_c">([^<]+)<\/td>\s*<td class="p_c">(\d{4}-\d{2}-\d{2})<\/td>[\s\S]*?<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourcePath: decodeHtml(match[1]).trim(),
      sourceId: match[2],
      title: decodeHtml(stripTags(match[3])).trim(),
      hasAttachment: /disk\.jpg|alt=/.test(match[4]),
      author: decodeHtml(match[5]).trim(),
      postedAt: match[6]
    });
  }
  return rows;
}

export function toGangwonPublicOccurrencePayload(row: GangwonAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const date = dateFromTitle(row.title, row.postedAt);
  const startsAt = `${date}T00:00:00.000+09:00`;
  return {
    id: `occ_gangwon_${date.replaceAll("-", "_")}_public`,
    issueId: "issue_real_public_sources",
    type: "static_assembly",
    areaClusterId: "area_gangwon",
    regionLabel: "강원",
    title: `강원 ${row.title.replace("오늘의 주요집회", "오늘의 주요집회 공개 일정")}`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "강원경찰청 오늘의 주요집회",
    rawText: `source=강원경찰청 오늘의 주요집회; sourceId=${row.sourceId}; url=${sourceUrl(row.sourcePath)}; postedAt=${row.postedAt}; attachment=${row.hasAttachment ? "yes" : "no"}`,
    normalizedStatement: `강원경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function dateFromTitle(title: string, postedAt: string): string {
  const match = title.match(/'?(\d{2})\.(\d{1,2})\.(\d{1,2})\./);
  if (!match) return postedAt;
  return `20${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function sourceUrl(path: string): string {
  return path.startsWith("http") ? path : `https://www.gwpolice.go.kr${path.startsWith("/") ? "" : "/"}${path}`;
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
    .replaceAll("&#39;", "'")
    .replaceAll("&#40;", "(")
    .replaceAll("&#41;", ")")
    .replaceAll("&nbsp;", " ");
}
