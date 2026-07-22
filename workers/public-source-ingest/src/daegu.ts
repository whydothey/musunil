export type DaeguAssemblyRow = {
  sourceId: string;
  title: string;
  author: string;
  postedAt: string;
  hasAttachment: boolean;
};

export type PublicOccurrencePayload = {
  id: string;
  issueId?: string;
  topicTitle?: string;
  topicTags?: string[];
  type: "static_assembly";
  areaClusterId: string;
  regionLabel: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  lifecycleState: "UPCOMING" | "ENDED";
  sourceProvenance: "government_or_police";
  claimantLabel: string;
  rawText: string;
  normalizedStatement: string;
  evidenceStrength: "single_source";
  riskLevel: "low";
  evidenceUploadedAt: string;
  sourceItemId?: string;
  sourceUrl?: string;
  sourcePublishedAt?: string;
  sourceTitle?: string;
  sourceGranularity?: "bulletin" | "individual_schedule";
  publicLocationKey?: string;
  publicLocationText?: string;
  parserVersion?: string;
};

export function parseDaeguTodayAssemblyList(html: string): DaeguAssemblyRow[] {
  const rows: DaeguAssemblyRow[] = [];
  const rowPattern = /<tr>[\s\S]*?num=(\d+)[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<td class="hidden-xs hidden-sm">([^<]+)<\/td>[\s\S]*?<td class="hidden-xs hidden-sm">(\d{4}-\d{2}-\d{2})<\/td>[\s\S]*?<td class="hidden-xs hidden-sm">[\s\S]*?<\/td>[\s\S]*?<td class="hidden-xs hidden-sm">([\s\S]*?)<\/td>[\s\S]*?<\/tr>/g;
  for (const match of html.matchAll(rowPattern)) {
    rows.push({
      sourceId: match[1],
      title: decodeHtml(match[2]).trim(),
      author: decodeHtml(match[3]).trim(),
      postedAt: match[4],
      hasAttachment: /file_icon/.test(match[5])
    });
  }
  return rows;
}

export function toPublicOccurrencePayload(row: DaeguAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const datePart = row.title.match(/(\d{4})(?:\([^)]*\))?(?:~(\d{4})(?:\([^)]*\))?)?/);
  const year = row.postedAt.slice(0, 4);
  const startMonthDay = datePart?.[1] ?? row.postedAt.slice(5).replace("-", "");
  const endMonthDay = datePart?.[2];
  const startsAt = toKoreaDateTime(year, startMonthDay);
  const endsAt = endMonthDay ? toKoreaDateTime(year, endMonthDay, "23:59:59.000") : undefined;
  const lifecycleReference = new Date(endsAt ?? startsAt);
  const lifecycleState = lifecycleReference.getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED";
  const normalizedTitle = `대구 ${row.title.replace(" 오늘의 집회", " 오늘의 집회 공개 일정")}`;
  return {
    id: `occ_daegu_${slugDate(row.title)}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_daegu",
    regionLabel: "대구",
    title: normalizedTitle,
    startsAt,
    endsAt,
    lifecycleState,
    sourceProvenance: "government_or_police",
    claimantLabel: "대구경찰청 오늘의 집회시위",
    rawText: `source=대구경찰청 오늘의 집회시위; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; postedAt=${row.postedAt}; attachment=${row.hasAttachment ? "yes" : "no"}`,
    normalizedStatement: `대구경찰청 게시판에 ${row.title} 공개 일정 게시물이 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: `${row.postedAt}T00:00:00.000+09:00`
  };
}

function sourceUrl(sourceId: string): string {
  return `https://www.dgpolice.go.kr/dgpo/bbs/view.do?bbsId=d495f174&menuNo=104050000&num=${sourceId}`;
}

function toKoreaDateTime(year: string, monthDay: string, time = "00:00:00.000"): string {
  return `${year}-${monthDay.slice(0, 2)}-${monthDay.slice(2, 4)}T${time}+09:00`;
}

function slugDate(title: string): string {
  const dates = [...title.matchAll(/\d{4}/g)].map((match) => match[0]);
  return dates.length > 0 ? dates.join("_") : "unknown";
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}
