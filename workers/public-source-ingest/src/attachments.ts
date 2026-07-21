import { createHash } from "node:crypto";
import type { PublicOccurrencePayload } from "./daegu.ts";
import type { PublicAssemblySource } from "./sources.ts";

const maxAttachmentBytes = 8 * 1024 * 1024;
const attachmentTimeoutMs = 15_000;

export type AttachmentFormat = "pdf" | "hwp" | "hwpx" | "xls" | "xlsx" | "csv" | "txt";

export type OfficialAttachment = {
  url: string;
  fileName: string;
  format?: AttachmentFormat;
  contentType?: string;
};

export type ExtractedAssemblyEvent = {
  rowNumber: number;
  date: string;
  startTime: string;
  endTime?: string;
  safeLocationLabel: string;
  participantCount?: number;
};

type AttachmentBulletin = PublicOccurrencePayload & {
  sourceItemId: string;
  sourceUrl: string;
};

export async function fetchAttachmentEventPayloads(
  source: PublicAssemblySource,
  bulletin: AttachmentBulletin,
  now = new Date()
): Promise<PublicOccurrencePayload[]> {
  if (!bulletin.sourceUrl || !hasAttachmentMarker(bulletin.rawText)) return [];
  const detailHtml = await fetchOfficialText(bulletin.sourceUrl, source);
  const links = discoverOfficialAttachmentLinks(detailHtml, bulletin.sourceUrl, source);
  const payloads: PublicOccurrencePayload[] = [];
  let failures = 0;

  for (const [attachmentIndex, link] of links.entries()) {
    try {
      const downloaded = await downloadOfficialAttachment(link, source);
      const text = await extractAttachmentText(downloaded.bytes, downloaded.attachment.format);
      const events = parseAssemblyAttachmentEvents(text, {
        defaultDate: bulletin.startsAt.slice(0, 10),
        regionLabel: source.regionLabel
      });
      for (const event of events) {
        payloads.push(toAttachmentEventPayload(source, bulletin, downloaded.attachment, event, attachmentIndex, now));
      }
    } catch {
      failures += 1;
    }
  }
  if (payloads.length === 0 && failures > 0) throw new Error("attachment_parse_failed");
  return dedupePayloads(payloads);
}

export function discoverOfficialAttachmentLinks(
  html: string,
  detailUrl: string,
  source: Pick<PublicAssemblySource, "url" | "pageUrl">
): OfficialAttachment[] {
  const results: OfficialAttachment[] = [];
  const anchorPattern = /<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const attributes = `${match[1]} ${match[3]}`;
    const href = decodeHtml(match[2]).trim();
    const label = stripTags(decodeHtml(match[4])).trim();
    const candidateText = `${href} ${attributes} ${label}`;
    if (!looksLikeAttachment(candidateText)) continue;
    let url: URL;
    try {
      url = new URL(href, detailUrl);
    } catch {
      continue;
    }
    if (!isAllowedOfficialUrl(url, source, detailUrl)) continue;
    const fileName = attachmentFileName(url, label, attributes);
    const format = detectAttachmentFormat(fileName);
    if (!format && !/(?:filedown|download|atchfile|file_down|fileDown)/i.test(url.pathname + url.search)) continue;
    if (!results.some((item) => item.url === url.href)) results.push({ url: url.href, fileName, format });
    if (results.length >= 3) break;
  }
  return results;
}

export async function downloadOfficialAttachment(
  descriptor: OfficialAttachment,
  source: Pick<PublicAssemblySource, "url" | "pageUrl">
): Promise<{ attachment: OfficialAttachment & { format: AttachmentFormat }; bytes: Uint8Array }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), attachmentTimeoutMs);
  try {
    const response = await fetch(descriptor.url, {
      headers: { "user-agent": "MusunilPublicSourceWorker/0.2", referer: descriptor.url },
      redirect: "follow",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`attachment_fetch_failed:${response.status}`);
    if (!isAllowedOfficialUrl(new URL(response.url), source, descriptor.url)) throw new Error("attachment_redirect_not_official");
    const announcedLength = Number(response.headers.get("content-length") ?? "0");
    if (announcedLength > maxAttachmentBytes) throw new Error("attachment_too_large");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maxAttachmentBytes) throw new Error("attachment_size_invalid");
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    const dispositionName = fileNameFromDisposition(response.headers.get("content-disposition"));
    const fileName = dispositionName ?? descriptor.fileName;
    const format = descriptor.format ?? detectAttachmentFormat(fileName) ?? detectMagicFormat(bytes, contentType);
    if (!format) throw new Error("attachment_format_unsupported");
    return { attachment: { ...descriptor, fileName, contentType, format }, bytes };
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractAttachmentText(bytes: Uint8Array, format: AttachmentFormat | undefined): Promise<string> {
  if (!format) throw new Error("attachment_format_unsupported");
  if (format === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (format === "hwp") {
    const { toMarkdown } = await import("@ohah/hwpjs");
    const result = toMarkdown(Buffer.from(bytes), { image: "blob", useHtml: false });
    return result.markdown;
  }
  if (format === "hwpx") {
    const { default: AdmZip } = await import("adm-zip");
    const zip = new AdmZip(Buffer.from(bytes));
    return zip.getEntries()
      .filter((entry) => /^Contents\/section\d+\.xml$/i.test(entry.entryName))
      .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }))
      .map((entry) => xmlToText(entry.getData().toString("utf8")))
      .join("\n");
  }
  if (format === "xls" || format === "xlsx") {
    const XLSX = await import("@e965/xlsx");
    const workbook = XLSX.read(Buffer.from(bytes), { type: "buffer", dense: true });
    return workbook.SheetNames.slice(0, 3).map((sheetName) => {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, blankrows: false, defval: "" });
      return rows.slice(0, 500).map((row) => row.slice(0, 30).map((cell) => String(cell).trim()).join("\t")).join("\n");
    }).join("\n");
  }
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("euc-kr").decode(bytes);
}

export function parseAssemblyAttachmentEvents(
  rawText: string,
  context: { defaultDate: string; regionLabel: string }
): ExtractedAssemblyEvent[] {
  const lines = rawText
    .replaceAll("\r", "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \u00a0]+/g, " ").trim())
    .filter(Boolean);
  const documentDateMatch = lines.join(" ").match(/(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
  const documentDate = documentDateMatch
    ? normalizeDate(documentDateMatch[1], documentDateMatch[2], documentDateMatch[3], context.defaultDate)
    : context.defaultDate;
  const candidates: Array<{ rowNumber: number; date?: string; startTime: string; endTime?: string; content: string[]; participantCount?: number }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const dated = line.match(/^(?:(20\d{2})\.\s*)?(\d{1,2})\.\s*(\d{1,2})\.(?:\([^)]*\))?\s+(\d{1,2}:\d{2})(?:\s*[~∼\-]\s*(\d{1,2}:\d{2}))?\s*(.*)$/);
    if (dated) {
      const content = [dated[6]].filter(Boolean);
      let cursor = index + 1;
      while (cursor < lines.length && !isEventStart(lines, cursor)) content.push(lines[cursor++]);
      candidates.push({
        rowNumber: candidates.length + 1,
        date: normalizeDate(dated[1], dated[2], dated[3], context.defaultDate),
        startTime: normalizeTime(dated[4]),
        endTime: dated[5] ? normalizeTime(dated[5]) : undefined,
        content,
        participantCount: participantCount(content.join(" "))
      });
      index = cursor - 1;
      continue;
    }

    const numbered = line.match(/^(\d+)\s+(\d[\d,]*)명\s*,?\s*(\d{1,2}:\d{2})\s*[~∼\-]\s*(\d{1,2}:\d{2})\s*(.*)$/);
    const separateNumber = line.match(/^\d+$/) && lines[index + 1]?.match(/^(\d[\d,]*)명\s*,?\s*(\d{1,2}:\d{2})\s*[~∼\-]\s*(\d{1,2}:\d{2})\s*(.*)$/);
    if (numbered || separateNumber) {
      const rowNumber = numbered ? Number(numbered[1]) : Number(line);
      const participant = numbered ? numbered[2] : separateNumber?.[1] ?? "";
      const startTime = numbered ? numbered[3] : separateNumber?.[2] ?? "";
      const endTime = numbered ? numbered[4] : separateNumber?.[3] ?? "";
      const remainder = numbered ? numbered[5] : separateNumber?.[4] ?? "";
      let cursor = index + (numbered ? 1 : 2);
      const content = [remainder].filter(Boolean);
      while (cursor < lines.length && !isEventStart(lines, cursor)) content.push(lines[cursor++]);
      candidates.push({
        rowNumber,
        date: documentDate,
        startTime: normalizeTime(startTime),
        endTime: normalizeTime(endTime),
        content,
        participantCount: Number(participant.replaceAll(",", ""))
      });
      index = cursor - 1;
      continue;
    }

    const tableRow = line.match(/^\|?\s*(\d{1,2}:\d{2})\s*[~∼\-]\s*(\d{1,2}:\d{2})\s*\|\s*([^|]+?)(?:\s*\||$)/);
    if (tableRow) {
      candidates.push({
        rowNumber: candidates.length + 1,
        date: documentDate,
        startTime: normalizeTime(tableRow[1]),
        endTime: normalizeTime(tableRow[2]),
        content: [tableRow[3]],
        participantCount: participantCount(line)
      });
    }
  }

  const events = candidates.flatMap((candidate) => {
    if (/(?:현재\s*)?집회\s*일시.*집회\s*장소/i.test(candidate.content.join(" "))) return [];
    const safeLocationLabel = safeLocation(candidate.content.join(" "), context.regionLabel);
    if (!safeLocationLabel || !candidate.startTime) return [];
    return [{
      rowNumber: candidate.rowNumber,
      date: candidate.date ?? context.defaultDate,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      safeLocationLabel,
      participantCount: candidate.participantCount
    }];
  });
  return dedupeEvents(events);
}

export function toAttachmentEventPayload(
  source: PublicAssemblySource,
  bulletin: AttachmentBulletin,
  attachment: OfficialAttachment & { format: AttachmentFormat },
  event: ExtractedAssemblyEvent,
  attachmentIndex: number,
  now = new Date()
): PublicOccurrencePayload {
  const startsAt = `${event.date}T${event.startTime}:00.000+09:00`;
  const endsAt = event.endTime ? `${event.date}T${event.endTime}:00.000+09:00` : undefined;
  const reference = new Date(endsAt ?? startsAt);
  const sourceItemId = `${bulletin.sourceItemId}:attachment:${attachmentIndex + 1}:event:${event.rowNumber}`;
  const stableId = createHash("sha256").update(`${source.id}:${sourceItemId}:${event.safeLocationLabel}:${startsAt}`).digest("hex").slice(0, 20);
  return {
    id: `occ_${source.regionCode}_${stableId}`,
    type: "static_assembly",
    areaClusterId: `area_${source.regionCode}`,
    regionLabel: source.regionLabel,
    title: `${event.safeLocationLabel} 집회 일정`,
    startsAt,
    endsAt,
    lifecycleState: reference.getTime() >= now.getTime() ? "UPCOMING" : "ENDED",
    sourceProvenance: "government_or_police",
    claimantLabel: bulletin.claimantLabel,
    rawText: [
      `source=${bulletin.claimantLabel}`,
      `sourceId=${sourceItemId}`,
      `attachmentFormat=${attachment.format}`,
      `attachmentUrl=${attachment.url}`,
      `date=${event.date}`,
      `startTime=${event.startTime}`,
      event.endTime ? `endTime=${event.endTime}` : "",
      `location=${event.safeLocationLabel}`,
      event.participantCount ? `participantCount=${event.participantCount}` : ""
    ].filter(Boolean).join("; "),
    normalizedStatement: `${bulletin.claimantLabel} 공개 첨부자료에는 ${event.date} ${event.startTime}부터 ${event.safeLocationLabel}에서 집회 일정이 안내되어 있습니다.`,
    evidenceStrength: "single_source",
    riskLevel: "low",
    evidenceUploadedAt: bulletin.evidenceUploadedAt,
    sourceItemId,
    sourceUrl: attachment.url,
    sourcePublishedAt: bulletin.sourcePublishedAt ?? bulletin.evidenceUploadedAt,
    sourceTitle: bulletin.sourceTitle ?? bulletin.title,
    sourceGranularity: "individual_schedule",
    parserVersion: "3"
  };
}

function isEventStart(lines: string[], index: number): boolean {
  const line = lines[index] ?? "";
  return /^(?:(?:20\d{2})\.\s*)?\d{1,2}\.\s*\d{1,2}\.(?:\([^)]*\))?\s+\d{1,2}:\d{2}/.test(line) ||
    /^\d+\s+\d[\d,]*명\s*,?\s*\d{1,2}:\d{2}\s*[~∼\-]/.test(line) ||
    (/^\d+$/.test(line) && /^\d[\d,]*명\s*,?\s*\d{1,2}:\d{2}\s*[~∼\-]/.test(lines[index + 1] ?? "")) ||
    /^\|?\s*\d{1,2}:\d{2}\s*[~∼\-]\s*\d{1,2}:\d{2}\s*\|/.test(line);
}

function safeLocation(value: string, regionLabel: string): string | undefined {
  let location = value
    .replace(/--\s*\d+\s*of\s*\d+/gi, " ")
    .replace(/\([^)]*(?:km|개\s*차로)[^)]*\)/gi, " ")
    .split(/(?:→|⇒|➡|행진로\s*[:：]?)/)[0]
    .replace(/\d[\d,]*\s*명/g, " ")
    .replace(/(?:상행|하행)?\s*\d+\s*개\s*차로[\s\S]*$/g, " ")
    .replace(/공사현\s+장/g, "공사현장")
    .replace(/건\s+설현장/g, "건설현장")
    .replace(/(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)?\s*(?:중\s*부|동\s*부|서\s*부|남\s*부|북\s*부|수\s*성|달\s*서|성\s*주|김\s*천|경\s*주|의\s*성|포\s*항|구\s*미|안\s*동|영\s*주|영\s*천|상\s*주|문\s*경|칠\s*곡)\s*$/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,·\-\s]+|[,·\-\s]+$/g, "")
    .trim();
  if (!location) return undefined;
  if (!location.includes(regionLabel) && !/(?:시|군|구|동|읍|면|리|로|길|R|앞|교|공원|광장|청|현장|아파트)/.test(location)) return undefined;
  if (location.length > 70) location = location.slice(0, 70).replace(/\s+\S*$/, "");
  if (location.length < 2) return undefined;
  return /(?:앞|일대|부근|인근|광장|공원|현장|아파트|교|R)$/.test(location) ? location : `${location} 일대`;
}

function normalizeDate(year: string | undefined, month: string, day: string, fallback: string): string {
  const resolvedYear = year ?? fallback.slice(0, 4);
  return `${resolvedYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeTime(value: string): string {
  const [hour, minute] = value.split(":");
  return `${hour.padStart(2, "0")}:${minute}`;
}

function participantCount(value: string): number | undefined {
  const match = value.match(/(\d[\d,]*)\s*명/);
  return match ? Number(match[1].replaceAll(",", "")) : undefined;
}

function hasAttachmentMarker(rawText: string): boolean {
  return /(?:^|;\s*)attachment=yes(?:;|$)/i.test(rawText);
}

async function fetchOfficialText(url: string, source: Pick<PublicAssemblySource, "url" | "pageUrl" | "encoding">): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), attachmentTimeoutMs);
  try {
    const response = await fetch(url, { headers: { "user-agent": "MusunilPublicSourceWorker/0.2" }, signal: controller.signal });
    if (!response.ok) throw new Error(`attachment_detail_fetch_failed:${response.status}`);
    if (!isAllowedOfficialUrl(new URL(response.url), source, url)) throw new Error("attachment_detail_redirect_not_official");
    const buffer = await response.arrayBuffer();
    return source.encoding ? new TextDecoder(source.encoding).decode(buffer) : new TextDecoder("utf-8").decode(buffer);
  } finally {
    clearTimeout(timeout);
  }
}

function isAllowedOfficialUrl(url: URL, source: Pick<PublicAssemblySource, "url" | "pageUrl">, fallbackUrl: string): boolean {
  if (url.protocol !== "https:") return false;
  const hosts = [source.url, source.pageUrl, fallbackUrl].flatMap((item) => {
    if (!item) return [];
    try { return [new URL(item).hostname]; } catch { return []; }
  });
  return hosts.some((host) => officialDomain(host) === officialDomain(url.hostname));
}

function officialDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split(".");
  if (parts.length >= 3 && parts.at(-2) === "go" && parts.at(-1) === "kr") return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

function looksLikeAttachment(value: string): boolean {
  return /(?:\.pdf|\.hwp|\.hwpx|\.xls|\.xlsx|\.csv|\.txt)(?:[?&#\s"']|$)|(?:첨부|다운로드|filedown|download|atchfile|file_down)/i.test(value);
}

function attachmentFileName(url: URL, label: string, attributes: string): string {
  const named = `${label} ${attributes}`.match(/([^/\\?"']+\.(?:pdf|hwp|hwpx|xls|xlsx|csv|txt))/i)?.[1];
  if (named) return named.trim();
  const pathName = decodeURIComponent(url.pathname.split("/").pop() ?? "attachment");
  return detectAttachmentFormat(pathName) ? pathName : "attachment";
}

function detectAttachmentFormat(fileName: string): AttachmentFormat | undefined {
  const match = fileName.toLowerCase().match(/\.(pdf|hwp|hwpx|xls|xlsx|csv|txt)(?:$|[?#])/);
  return match?.[1] as AttachmentFormat | undefined;
}

function detectMagicFormat(bytes: Uint8Array, contentType?: string): AttachmentFormat | undefined {
  const head = Buffer.from(bytes.slice(0, 16));
  if (head.toString("ascii", 0, 5) === "%PDF-") return "pdf";
  if (head.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return contentType?.includes("excel") ? "xls" : "hwp";
  if (head.toString("ascii", 0, 2) === "PK") return contentType?.includes("sheet") || contentType?.includes("excel") ? "xlsx" : "hwpx";
  if (contentType?.includes("pdf")) return "pdf";
  if (contentType?.includes("csv")) return "csv";
  if (contentType?.startsWith("text/")) return "txt";
  return undefined;
}

function fileNameFromDisposition(value: string | null): string | undefined {
  if (!value) return undefined;
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try { return decodeURIComponent(utf8.replace(/^"|"$/g, "")); } catch { return utf8; }
  }
  return value.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1]?.trim();
}

function xmlToText(xml: string): string {
  return decodeHtml(xml
    .replace(/<[^>]*?(?:tab|cellBreak)[^>]*?>/gi, "\t")
    .replace(/<\/[^>]*?(?:p|tr|tc|section)>/gi, "\n")
    .replace(/<[^>]+>/g, ""));
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function dedupeEvents(events: ExtractedAssemblyEvent[]): ExtractedAssemblyEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.date}|${event.startTime}|${event.safeLocationLabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupePayloads(payloads: PublicOccurrencePayload[]): PublicOccurrencePayload[] {
  const seen = new Set<string>();
  return payloads.filter((payload) => {
    if (seen.has(payload.id)) return false;
    seen.add(payload.id);
    return true;
  });
}
