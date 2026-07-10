import type { PublicOccurrencePayload } from "./daegu.ts";

export type ChungbukAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  viewCount: number;
};

export function parseChungbukTodayAssemblyList(html: string): ChungbukAssemblyRow[] {
  const rows: ChungbukAssemblyRow[] = [];
  const rowPattern =
    /<tr>\s*<td>\s*\d+\s*<\/td>\s*<td class="sub_line">\s*<a href='\/main_sub\/sub\.php\?id=(\d+)(?:&|&amp;)folder_idx=2(?:&|&amp;)folder_page_idx=18'>([\s\S]*?오늘의 주요 집회[\s\S]*?)<\/a>[\s\S]*?<\/td>\s*<td>\s*([^<]+?)\s*<\/td>\s*<td>\s*(\d{4}\.\d{2}\.\d{2})\s*<\/td>\s*<td>\s*(\d+)\s*<\/td>\s*<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(stripTags(match[2])).replace(/\s+/g, " ").trim(),
      author: decodeHtml(match[3]).trim(),
      postedAt: match[4].replaceAll(".", "-"),
      viewCount: Number(match[5])
    });
  }
  return rows;
}

export function toChungbukPublicOccurrencePayload(row: ChungbukAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const startsAt = `${dateFromTitle(row.title, row.postedAt)}T00:00:00.000+09:00`;
  return {
    id: `occ_chungbuk_${startsAt.slice(0, 10).replaceAll("-", "_")}_public`,
    issueId: "issue_real_public_sources",
    type: "static_assembly",
    areaClusterId: "area_chungbuk",
    regionLabel: "충북",
    title: `충북 ${row.title.replace("오늘의 주요 집회", "오늘의 주요 집회 공개 일정")}`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "충북경찰청 오늘의 집회 시위",
    rawText: `source=충북경찰청 오늘의 집회 시위; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; views=${row.viewCount}`,
    normalizedStatement: `충북경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function dateFromTitle(title: string, postedAt: string): string {
  const match = title.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
  if (!match) return postedAt;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function sourceUrl(sourceId: string): string {
  return `https://www.cbpolice.go.kr/main_sub/sub.php?id=${sourceId}&folder_idx=2&folder_page_idx=18`;
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
    .replaceAll("&#41;", ")");
}
