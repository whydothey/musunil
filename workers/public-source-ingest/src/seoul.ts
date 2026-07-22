import type { PublicOccurrencePayload } from "./daegu.ts";

export type SeoulAssemblyRow = {
  sourceId: string;
  title: string;
  updatedAt: string;
  readCount: number;
  content: string;
};

export type SeoulAssemblyEventRow = {
  rowNumber: number;
  timeLabel: string;
  safeLocationLabel: string;
  rawLocationText: string;
  publicLocationKey?: string;
};

type SeoulListResponse = {
  result?: Array<{
    mgrSeq?: string;
    assemTitle?: string;
    lastMdfyDat?: string;
    readCount?: string | number;
    assemConts?: string;
  }>;
};

export function parseSeoulAssemblyControlList(json: string): SeoulAssemblyRow[] {
  const data = JSON.parse(json) as SeoulListResponse;
  return (data.result ?? [])
    .filter((row) => row.mgrSeq && row.assemTitle && row.lastMdfyDat)
    .map((row) => ({
      sourceId: row.mgrSeq as string,
      title: (row.assemTitle as string).replace(/\s+/g, " ").trim(),
      updatedAt: formatUpdatedAt(row.lastMdfyDat as string),
      readCount: Number(row.readCount ?? 0),
      content: typeof row.assemConts === "string" ? row.assemConts : ""
    }));
}

export function toSeoulPublicOccurrencePayload(row: SeoulAssemblyRow, now = new Date()): PublicOccurrencePayload {
  const startsAt = `${dateFromTitle(row.title, row.updatedAt)}T00:00:00.000+09:00`;
  return {
    id: `occ_seoul_${startsAt.slice(0, 10).replaceAll("-", "_")}_public`,
    issueId: "issue_public_regional_schedule",
    type: "static_assembly",
    areaClusterId: "area_seoul_public",
    regionLabel: "서울",
    title: `서울 ${row.title} 공개 자료`,
    startsAt,
    lifecycleState: new Date(startsAt).getTime() >= startOfKoreaDay(now).getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "서울경찰청 교통정보센터 집회·통제정보",
    rawText: `source=서울경찰청 교통정보센터 집회·통제정보; sourceId=${row.sourceId}; url=${sourceUrl(row.sourceId)}; updatedAt=${row.updatedAt}; views=${row.readCount}`,
    normalizedStatement: `서울경찰청 교통정보센터에 ${row.title} 공개 자료가 등록되었습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: row.updatedAt,
    sourceItemId: row.sourceId,
    sourceUrl: sourceUrl(row.sourceId),
    sourcePublishedAt: row.updatedAt,
    sourceTitle: row.title,
    sourceGranularity: "bulletin",
    parserVersion: "2"
  };
}

export function parseSeoulAssemblyEvents(row: SeoulAssemblyRow): SeoulAssemblyEventRow[] {
  if (!/행사\s*및\s*집회/.test(row.title) || !row.content) return [];
  const events: SeoulAssemblyEventRow[] = [];
  for (const match of row.content.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => htmlText(cell[1]));
    if (cells.length < 3 || !/^\d+$/.test(cells[0]) || !/\d{1,2}:\d{2}\s*[~～-]\s*\d{1,2}:\d{2}/.test(cells[1])) continue;
    const safeLocationLabel = safeLocation(cells[2]);
    if (!safeLocationLabel) continue;
    events.push({
      rowNumber: Number(cells[0]),
      timeLabel: cells[1].replace(/\s+/g, ""),
      safeLocationLabel: `${safeLocationLabel} 일대`,
      rawLocationText: cells[2],
      publicLocationKey: locationKey(safeLocationLabel)
    });
  }
  return events;
}

export function toSeoulIndividualOccurrencePayload(
  bulletin: SeoulAssemblyRow,
  event: SeoulAssemblyEventRow,
  now = new Date()
): PublicOccurrencePayload {
  const date = dateFromTitle(bulletin.title, bulletin.updatedAt);
  const [startTime, endTime] = event.timeLabel.split(/[~～-]/);
  const startsAt = `${date}T${startTime}:00.000+09:00`;
  const endsAt = `${date}T${endTime}:00.000+09:00`;
  const sourceItemId = `${bulletin.sourceId}:event:${event.rowNumber}`;
  return {
    id: `occ_seoul_${date.replaceAll("-", "_")}_${bulletin.sourceId}_${event.rowNumber}`,
    type: "static_assembly",
    areaClusterId: "area_seoul_public",
    regionLabel: "서울",
    title: `${event.safeLocationLabel} 집회 일정`,
    startsAt,
    endsAt,
    lifecycleState: new Date(endsAt).getTime() >= now.getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: "서울경찰청 교통정보센터 집회·통제정보",
    rawText: `source=서울경찰청 교통정보센터 집회·통제정보; sourceId=${sourceItemId}; url=${sourceUrl(bulletin.sourceId)}; eventTime=${event.timeLabel}; originalLocation=${event.rawLocationText}`,
    normalizedStatement: `서울경찰청 공개 일정에 ${date} ${event.timeLabel} ${event.safeLocationLabel} 집회 일정이 포함되어 있습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: bulletin.updatedAt,
    sourceItemId,
    sourceUrl: sourceUrl(bulletin.sourceId),
    sourcePublishedAt: bulletin.updatedAt,
    sourceTitle: bulletin.title,
    sourceGranularity: "individual_schedule",
    publicLocationKey: event.publicLocationKey,
    publicLocationText: event.safeLocationLabel,
    parserVersion: "2"
  };
}

function dateFromTitle(title: string, updatedAt: string): string {
  const match = title.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (!match) return updatedAt.slice(0, 10);
  return `${updatedAt.slice(0, 4)}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
}

function formatUpdatedAt(value: string): string {
  const compact = value.padEnd(14, "0");
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:${compact.slice(12, 14)}.000+09:00`;
}

function sourceUrl(sourceId: string): string {
  return `https://www.spatic.go.kr/spatic/assem/getInfoView.do?mgrSeq=${sourceId}`;
}

function htmlText(value: string): string {
  return value
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#160;", " ")
    .replaceAll("&sim;", "~")
    .replaceAll("&rarr;", "→")
    .replaceAll("&harr;", "↔")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function safeLocation(value: string): string | undefined {
  const firstAnchor = value
    .replace(/^\|\s*/, "")
    .split(/(?:\s+[~～]\s+|\s*(?:⇄|↔|→|←|※|행진\s*:|에서\s+출발)\s*)/u, 1)[0]
    .replace(/\(\s*(?:인도|차도|내|內)\s*\)/g, "")
    .replace(/\([^)]*(?:개차로|보조도로)[^)]*\)/g, "")
    .replace(/(\d+)\s*出/g, "$1번 출구")
    .replace(/\s+/g, " ")
    .trim();
  if (!firstAnchor || firstAnchor.length > 60) return undefined;
  return firstAnchor.replace(/\s*(?:앞|내|內)$/u, "").trim();
}

function locationKey(label: string): string | undefined {
  if (/서울광장|광화문|세종대로|동화면세점|대한문/.test(label)) return "seoul_civic_center_area";
  if (/서울시교육청/.test(label)) return "seoul_education_office_area";
  if (/오류동|평강제일교회/.test(label)) return "seoul_oryu_area";
  if (/마로니에공원/.test(label)) return "seoul_marronnier_area";
  if (/서울역/.test(label)) return "seoul_station_area";
  if (/의사당역|국회의사당/.test(label)) return "seoul_national_assembly_area";
  if (/서초역/.test(label)) return "seoul_seocho_station_area";
  if (/몽촌토성역/.test(label)) return "seoul_mongchontoseong_area";
  if (/홍대입구역/.test(label)) return "seoul_hongdae_area";
  if (/석촌호수/.test(label)) return "seoul_seokchon_lake_area";
  if (/정부서울청사|경복궁역/.test(label)) return "seoul_government_complex_area";
  if (/경찰청 본청/.test(label)) return "seoul_police_hq_area";
  if (/청와대|효자파출소/.test(label)) return "seoul_cheongwadae_area";
  if (/전쟁기념관/.test(label)) return "seoul_war_memorial_area";
  return undefined;
}

function startOfKoreaDay(date: Date): Date {
  const koreaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${koreaDate}T00:00:00.000+09:00`);
}
