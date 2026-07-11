import type { PublicOccurrencePayload } from "./daegu.ts";

export type JejuAssemblyRow = {
  sourceId: string;
  title: string;
  category: string;
  author: string;
  postedAt: string;
};

export function parseJejuTodayAssemblyList(html: string): JejuAssemblyRow[] {
  const rows: JejuAssemblyRow[] = [];
  const rowPattern =
    /<tr>\s*<td class="no">\s*\d+\s*<\/td>\s*<td class="category">\s*([^<]+?)\s*<\/td>\s*<td class="title">[\s\S]*?<input type="hidden" name="seq" value="(\d+)"\/>[\s\S]*?<button[^>]*>\s*([^<]*오늘의 집회[^<]*)\s*<\/button>[\s\S]*?<td class="writer">\s*([^<]+?)\s*<\/td>\s*<td class="wdate">(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.<\/td>[\s\S]*?<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      category: decodeHtml(match[1]).trim(),
      sourceId: match[2],
      title: decodeHtml(match[3]).replace(/\s+/g, " ").trim(),
      author: decodeHtml(match[4]).trim(),
      postedAt: `${match[5]}-${match[6]}-${match[7]}`
    });
  }
  return rows;
}

export function toJejuPublicOccurrencePayload(row: JejuAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const startsAt = `${dateFromTitle(row.title, row.postedAt)}T00:00:00.000+09:00`;
  return {
    id: `occ_jeju_${startsAt.slice(0, 10).replaceAll("-", "_")}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_jeju",
    regionLabel: "제주",
    title: `제주 ${row.title.replace("오늘의 집회", "오늘의 집회 공개 일정")}`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "제주경찰청 오늘의집회",
    rawText: `source=제주경찰청 오늘의집회; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; category=${row.category}; postedAt=${row.postedAt}`,
    normalizedStatement: `제주경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function dateFromTitle(title: string, postedAt: string): string {
  const match = title.match(/\((\d{2})\.(\d{2})\.(\d{2})\)/);
  if (!match) return postedAt;
  return `20${match[1]}-${match[2]}-${match[3]}`;
}

function sourceUrl(sourceId: string): string {
  return `https://www.jjpolice.go.kr/jjpolice/notice/assembly.htm?act=view&seq=${sourceId}`;
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
