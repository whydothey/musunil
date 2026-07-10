import type { PublicOccurrencePayload } from "./daegu.ts";

export type GwangjuAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
};

export function parseGwangjuTodayAssemblyList(html: string): GwangjuAssemblyRow[] {
  const rows: GwangjuAssemblyRow[] = [];
  const rowPattern =
    /<tr>[\s\S]*?<td class="listCenter"[^>]*>[^<]*<\/td>\s*<td class="listLeft"[^>]*>[\s\S]*?<input type="hidden" name="nttId"\s+value="(\d+)" \/>[\s\S]*?<input type="submit"[^>]*value="([^"]+)"[^>]*>[\s\S]*?<\/td>\s*<td class="listCenter"[^>]*>([^<]+)<\/td>\s*<td class="listCenter"[^>]*>(\d{4}-\d{2}-\d{2})<\/td>[\s\S]*?<\/tr>/g;
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

export function toGwangjuPublicOccurrencePayload(row: GwangjuAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const { startsAt, endsAt } = datesFromTitle(row.title, row.postedAt);
  return {
    id: `occ_gwangju_${startsAt.slice(0, 10).replaceAll("-", "_")}${endsAt ? `_${endsAt.slice(8, 10)}` : ""}_public`,
    issueId: "issue_real_public_sources",
    type: "static_assembly",
    areaClusterId: "area_gwangju",
    regionLabel: "광주",
    title: `광주 ${row.title.replace("집회상황", "집회상황 공개 일정")}`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt ?? startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "광주경찰청 오늘의집회시위",
    rawText: `source=광주경찰청 오늘의집회시위; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; attachment=unknown`,
    normalizedStatement: `광주경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function datesFromTitle(title: string, postedAt: string): { startsAt: string; endsAt?: string } {
  const start = title.match(/(\d{1,2})\.(\d{1,2})\./);
  if (!start) return { startsAt: `${postedAt}T00:00:00.000+09:00` };
  const end = title.match(/[~∼]\s*(?:(\d{1,2})\.)?(\d{1,2})\./);
  const year = postedAt.slice(0, 4);
  const startsAt = `${year}-${start[1].padStart(2, "0")}-${start[2].padStart(2, "0")}T00:00:00.000+09:00`;
  const endsAt = end ? `${year}-${(end[1] ?? start[1]).padStart(2, "0")}-${end[2].padStart(2, "0")}T23:59:59.000+09:00` : undefined;
  return { startsAt, endsAt };
}

function sourceUrl(sourceId: string): string {
  return `https://www.gjpolice.go.kr/cop/bbs/selectBoardArticle.do?bbsId=BBSMSTR_000000000031&nttId=${sourceId}&r=gjpolice`;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#40;", "(")
    .replaceAll("&#41;", ")")
    .replaceAll("&nbsp;", " ");
}
