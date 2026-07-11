import type { PublicOccurrencePayload } from "./daegu.ts";

export type IncheonAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
};

export function parseIncheonTodayAssemblyList(html: string): IncheonAssemblyRow[] {
  const rows: IncheonAssemblyRow[] = [];
  const rowPattern =
    /<tr>\s*<td>\d+<\/td>\s*<td class="sub_line">\s*<a href="view\.php\?&bbs_code=ic015&bd_num=(\d+)">([^<]*오늘의 주요 집회[^<]*)<\/a>\s*<\/td>\s*<td>[\s\S]*?>([^<]+)<\/span><\/td>\s*<td>(\d{4}-\d{2}-\d{2})<\/td>[\s\S]*?<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(match[2]).replace(/\s+/g, " ").trim(),
      author: decodeHtml(match[3]).trim(),
      postedAt: match[4]
    });
  }
  return rows;
}

export function toIncheonPublicOccurrencePayload(row: IncheonAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const startsAt = `${dateFromTitle(row.title, row.postedAt)}T00:00:00.000+09:00`;
  return {
    id: `occ_incheon_${startsAt.slice(0, 10).replaceAll("-", "_")}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_incheon",
    regionLabel: "인천",
    title: `인천 ${row.title.replace("오늘의 주요 집회", "오늘의 주요 집회 공개 일정")}`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "인천경찰청 오늘의 집회/시위",
    rawText: `source=인천경찰청 오늘의 집회/시위; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; attachment=unknown`,
    normalizedStatement: `인천경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function dateFromTitle(title: string, postedAt: string): string {
  const match = title.match(/(\d{1,2})\.(\d{1,2})\./);
  if (!match) return postedAt;
  return `${postedAt.slice(0, 4)}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function sourceUrl(sourceId: string): string {
  return `https://www.icpolice.go.kr/board/rg4_board/view.php?&bbs_code=ic015&bd_num=${sourceId}`;
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
