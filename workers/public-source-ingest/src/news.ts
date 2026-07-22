import { createHash } from "node:crypto";

export type NewsFeed = {
  id: string;
  publisherLabel: string;
  url: string;
};

export type NewsRuntime = {
  feeds: NewsFeed[];
  initialLookbackDays: number;
  maxResultsPerFeed: number;
  maxFeedsPerRun: number;
  minRequestIntervalMs: number;
};

export type NewsLawGroup = {
  id: string;
  lawName: string;
  billTitle: string;
  coreTopics: Array<{ key: string; label: string; representativeKeywords: string[]; billCount: number }>;
  bills: Array<{ assemblyBillNo?: string; proposer?: string }>;
};

export type NewsIngestPayload = {
  provider: "publisher_rss";
  lawGroupId: string;
  coreTopicKey: string;
  sourceTitle: string;
  sourceUrl: string;
  publisherLabel: string;
  publishedAt: string;
  providerItemId: string;
  directBillMatch: boolean;
  sourceId: string;
  sourceCheckedAt: string;
  sourceBatchSize: number;
};

export type NewsOccurrence = {
  id: string;
  title: string;
  regionLabel: string;
  locationLabel?: string;
  startsAt?: string;
  endsAt?: string;
  topicStatus?: string;
};

export type EventTopicEvidencePayload = {
  provider: "publisher_rss";
  occurrenceId: string;
  eventDate: string;
  topicTitle: string;
  topicTags: string[];
  sourceTitle: string;
  sourceUrl: string;
  publisherLabel: string;
  publishedAt: string;
  providerItemId: string;
  sourceId: string;
  sourceCheckedAt: string;
  matchedLocationTerms: string[];
  dateMatched: true;
  locationMatched: true;
  timeMatched: boolean;
  uniqueLocationMatched: boolean;
};

export type ParsedNewsArticle = {
  title: string;
  url: string;
  searchText: string;
  contentText: string;
  publishedAt: Date;
};

const officialFeedHosts = new Set([
  "www.yna.co.kr",
  "www.hani.co.kr",
  "news.sbs.co.kr",
  "www.khan.co.kr",
  "www.chosun.com",
  "rss.ohmynews.com",
  "www.mk.co.kr",
  "www.newsis.com"
]);

const defaultFeeds: NewsFeed[] = [
  { id: "newsis_society", publisherLabel: "뉴시스", url: "https://www.newsis.com/RSS/society.xml" },
  { id: "yonhap_latest", publisherLabel: "연합뉴스", url: "https://www.yna.co.kr/rss/news.xml" },
  { id: "hani_all", publisherLabel: "한겨레", url: "https://www.hani.co.kr/rss/" },
  { id: "sbs_politics", publisherLabel: "SBS", url: "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01" },
  { id: "khan_all", publisherLabel: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml" },
  { id: "chosun_all", publisherLabel: "조선일보", url: "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml" },
  { id: "ohmynews_all", publisherLabel: "오마이뉴스", url: "https://rss.ohmynews.com/rss/ohmynews.xml" }
];

const edailyArchiveFeed: NewsFeed = {
  id: "edaily_official_search",
  publisherLabel: "이데일리",
  url: "https://www.edaily.co.kr/search/news/?keyword=%EC%A7%91%ED%9A%8C"
};

export function readNewsRuntime(config: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env): NewsRuntime {
  return {
    feeds: readConfiguredFeeds(config, env),
    initialLookbackDays: configNumber(config, "public_data_sources.news_initial_lookback_days", 30, 1, 90),
    maxResultsPerFeed: configNumber(config, "public_data_sources.news_max_results_per_feed", 100, 1, 250),
    maxFeedsPerRun: configNumber(config, "public_data_sources.news_max_feeds_per_run", defaultFeeds.length, 3, defaultFeeds.length),
    minRequestIntervalMs: configNumber(config, "public_data_sources.news_min_request_interval_ms", 500, 0, 60_000)
  };
}

export function newsOperationalDiagnostics(runtime: NewsRuntime) {
  const invalidFeeds = runtime.feeds.filter((feed) => !isOfficialFeed(feed));
  const publisherCount = new Set(runtime.feeds.map((feed) => feed.publisherLabel)).size;
  const ready = runtime.feeds.length >= 3 && publisherCount >= 3 && invalidFeeds.length === 0;
  return {
    mode: "news_keyless_publisher_rss",
    readyForMetadataCheck: ready,
    readyForOperationalIngest: ready,
    summary: {
      feedCount: runtime.feeds.length,
      publisherCount,
      invalidFeedIds: invalidFeeds.map((feed) => feed.id),
      lookbackDays: runtime.initialLookbackDays,
      maxResultsPerFeed: runtime.maxResultsPerFeed,
      maxFeedsPerRun: runtime.maxFeedsPerRun,
      minRequestIntervalMs: runtime.minRequestIntervalMs,
      requiredActions: [
        ...(runtime.feeds.length < 3 || publisherCount < 3 ? ["서로 다른 국내 언론사 공식 RSS를 3개 이상 유지한다."] : []),
        ...(invalidFeeds.length > 0 ? ["허용된 언론사 공식 HTTPS RSS 주소만 사용한다."] : [])
      ]
    }
  };
}

export async function fetchNewsPayloads(
  runtime: NewsRuntime,
  groups: NewsLawGroup[],
  remainingMonthlyCalls: number,
  occurrences: NewsOccurrence[] = []
): Promise<{ payloads: NewsIngestPayload[]; eventTopicPayloads: EventTopicEvidencePayload[]; callCount: number; queryCount: number; failures: Array<{ query: string; status: number }> }> {
  const feeds = runtime.feeds.slice(0, Math.min(runtime.maxFeedsPerRun, remainingMonthlyCalls));
  const checkedAt = new Date();
  const cutoff = checkedAt.getTime() - runtime.initialLookbackDays * 24 * 60 * 60 * 1000;
  const bestByGroupAndUrl = new Map<string, NewsIngestPayload>();
  const bestEventTopicByOccurrenceAndUrl = new Map<string, EventTopicEvidencePayload>();
  const failures: Array<{ query: string; status: number }> = [];
  let callCount = 0;
  let lastRequestAt = 0;
  const collectArticle = (article: ParsedNewsArticle, feed: NewsFeed) => {
    if (article.publishedAt.getTime() < cutoff) return;
    for (const group of groups) {
      if (!matchesLaw(article.searchText, group)) continue;
      const coreTopicKey = bestCoreTopicKey(article.searchText, group);
      const payload: NewsIngestPayload = {
        provider: "publisher_rss",
        lawGroupId: group.id,
        coreTopicKey,
        sourceTitle: article.title,
        sourceUrl: article.url,
        publisherLabel: feed.publisherLabel,
        publishedAt: article.publishedAt.toISOString(),
        providerItemId: createHash("sha256").update(article.url).digest("hex"),
        directBillMatch: matchesBill(article.searchText, group),
        sourceId: `news_rss_${feed.id}`,
        sourceCheckedAt: checkedAt.toISOString(),
        sourceBatchSize: 0
      };
      const key = `${group.id}:${article.url}`;
      const existing = bestByGroupAndUrl.get(key);
      if (!existing || (existing.coreTopicKey === "_group" && payload.coreTopicKey !== "_group")) bestByGroupAndUrl.set(key, payload);
    }
    for (const payload of eventTopicPayloadsForArticle(article, feed, occurrences, checkedAt)) {
      bestEventTopicByOccurrenceAndUrl.set(`${payload.occurrenceId}:${payload.sourceUrl}`, payload);
    }
  };

  for (const feed of feeds) {
    const waitMs = Math.max(0, lastRequestAt + runtime.minRequestIntervalMs - Date.now());
    if (waitMs > 0) await delay(waitMs);
    callCount += 1;
    let response: Response;
    try {
      response = await fetch(feed.url, {
        headers: {
          accept: "application/rss+xml, application/xml, text/xml;q=0.9",
          "user-agent": "MusunilNewsSourceWorker/0.3 (public RSS metadata ingest)"
        },
        signal: AbortSignal.timeout(20_000)
      });
      lastRequestAt = Date.now();
    } catch {
      lastRequestAt = Date.now();
      failures.push({ query: feed.id, status: 0 });
      continue;
    }
    if (!response.ok) {
      failures.push({ query: feed.id, status: response.status });
      continue;
    }

    let articles: ParsedNewsArticle[];
    try {
      articles = parsePublisherRss(await response.text()).slice(0, runtime.maxResultsPerFeed);
    } catch {
      failures.push({ query: feed.id, status: 502 });
      continue;
    }

    for (const article of articles) collectArticle(article, feed);
  }

  if (occurrences.length > 0 && callCount < remainingMonthlyCalls) {
    const archive = await fetchEdailyEventArchive(runtime, remainingMonthlyCalls - callCount);
    callCount += archive.callCount;
    failures.push(...archive.failures);
    for (const article of archive.articles) collectArticle(article, edailyArchiveFeed);
  }

  const payloads = [...bestByGroupAndUrl.values()].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  const eventTopicPayloads = [...bestEventTopicByOccurrenceAndUrl.values()].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  for (const payload of payloads) payload.sourceBatchSize = payloads.length;
  return { payloads, eventTopicPayloads, callCount, queryCount: callCount, failures };
}

export function parsePublisherRss(xml: string): ParsedNewsArticle[] {
  const entries = [
    ...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)
  ];
  return entries.map((match) => {
    const entry = match[1] ?? "";
    const title = cleanNewsText(readXmlTag(entry, "title"));
    const description = cleanLongNewsText(readXmlTag(entry, "description") || readXmlTag(entry, "summary") || readXmlTag(entry, "content"));
    const rawLink = readXmlTag(entry, "link") || entry.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1] || "";
    const url = safeHttpsUrl(decodeXmlText(rawLink))?.toString() ?? "";
    const rawDate = readXmlTag(entry, "pubDate") || readXmlTag(entry, "date") || readXmlTag(entry, "published") || readXmlTag(entry, "updated");
    const publishedAt = new Date(decodeXmlText(rawDate));
    if (!title || !url || Number.isNaN(publishedAt.getTime())) return undefined;
    const contentText = `${title}. ${description}`.replace(/\s+/g, " ").trim();
    return { title, url, searchText: normalize(contentText), contentText, publishedAt };
  }).filter((item): item is ParsedNewsArticle => Boolean(item));
}

async function fetchEdailyEventArchive(
  runtime: NewsRuntime,
  remainingCalls: number
): Promise<{ articles: ParsedNewsArticle[]; callCount: number; failures: Array<{ query: string; status: number }> }> {
  const failures: Array<{ query: string; status: number }> = [];
  const articles: ParsedNewsArticle[] = [];
  let callCount = 0;
  let lastRequestAt = 0;
  const request = async (url: string, query: string): Promise<string | undefined> => {
    if (callCount >= remainingCalls) return undefined;
    const waitMs = Math.max(0, lastRequestAt + runtime.minRequestIntervalMs - Date.now());
    if (waitMs > 0) await delay(waitMs);
    callCount += 1;
    try {
      const response = await fetch(url, {
        headers: { accept: "application/xml,text/xml,text/html;q=0.9", "user-agent": "MusunilNewsSourceWorker/0.4 (official publisher sitemap event metadata ingest)" },
        signal: AbortSignal.timeout(20_000)
      });
      lastRequestAt = Date.now();
      if (!response.ok || new URL(response.url).hostname !== "www.edaily.co.kr") {
        failures.push({ query, status: response.status });
        return undefined;
      }
      return await response.text();
    } catch {
      lastRequestAt = Date.now();
      failures.push({ query, status: 0 });
      return undefined;
    }
  };

  const bestByUrl = new Map<string, ParsedNewsArticle>();
  for (const keyword of ["집회", "시위", "행진"]) {
    const url = `https://www.edaily.co.kr/search/news/?keyword=${encodeURIComponent(keyword)}`;
    const html = await request(url, `edaily_search_${keyword}`);
    if (!html) continue;
    for (const article of parseEdailySearchResults(html).slice(0, runtime.maxResultsPerFeed)) bestByUrl.set(article.url, article);
  }
  articles.push(...bestByUrl.values());
  return { articles, callCount, failures };
}

export function parseEdailySearchResults(html: string): ParsedNewsArticle[] {
  return [...html.matchAll(/<div\b[^>]*class=["'][^"']*newsbox_04[^"']*["'][^>]*>([\s\S]*?)<div\b[^>]*class=["'][^"']*author_category[^"']*["'][^>]*>([\s\S]*?)(\d{4}\.\d{2}\.\d{2})/gi)].map((match) => {
    const card = match[1] ?? "";
    const href = card.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ?? "";
    const listItems = [...card.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((item) => cleanLongNewsText(item[1]));
    const title = listItems[0] || cleanLongNewsText(card.match(/<a\b[^>]*title=["']([^"']+)["']/i)?.[1] ?? "");
    const description = listItems[1] ?? "";
    let url = "";
    try {
      url = new URL(decodeXmlText(href), "https://www.edaily.co.kr").toString();
    } catch {
      return undefined;
    }
    const publishedAt = new Date(`${match[3].replaceAll(".", "-")}T00:00:00.000+09:00`);
    if (!title || !description || new URL(url).hostname !== "www.edaily.co.kr" || Number.isNaN(publishedAt.getTime())) return undefined;
    const contentText = `${title}. ${description}`.replace(/\s+/g, " ").trim();
    return { title, url, publishedAt, contentText, searchText: normalize(contentText) };
  }).filter((item): item is ParsedNewsArticle => Boolean(item));
}

function cleanLongNewsText(value: string): string {
  return decodeXmlText(value)
    .replace(/<br\s*\/?\s*>/gi, ". ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12_000);
}

export function cleanNewsText(value: unknown): string {
  if (typeof value !== "string") return "";
  return decodeXmlText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export function eventTopicPayloadsForArticle(
  article: ParsedNewsArticle,
  feed: NewsFeed,
  occurrences: NewsOccurrence[],
  checkedAt = new Date()
): EventTopicEvidencePayload[] {
  if (!/(?:집회|시위|행진|문화제|국민대회|피켓)/u.test(article.contentText)) return [];
  const rawSegments = article.contentText.split(/(?<=[.!?。])\s+/u).map((item) => item.trim()).filter(Boolean);
  const segments = rawSegments.map((item, index) => index > 0 ? `${rawSegments[index - 1]} ${item}` : item);
  const candidates = occurrences.filter((occurrence) => {
    if (!occurrence.startsAt || occurrence.topicStatus === "linked") return false;
    const startsAt = new Date(occurrence.startsAt);
    if (Number.isNaN(startsAt.getTime())) return false;
    const leadMs = startsAt.getTime() - article.publishedAt.getTime();
    return leadMs >= -2 * dayMs && leadMs <= 7 * dayMs;
  });
  const payloads: EventTopicEvidencePayload[] = [];
  for (const occurrence of candidates) {
    const startsAt = new Date(occurrence.startsAt!);
    const eventDate = koreaDate(startsAt);
    const terms = eventLocationTerms(occurrence);
    if (terms.length === 0) continue;
    const segment = segments.find((item) => terms.some((term) => normalize(item).includes(normalize(term))));
    if (!segment || !/(?:집회|시위|행진|문화제|국민대회|피켓)/u.test(segment)) continue;
    const topicTitle = extractPurposeTopic(segment);
    if (!topicTitle) continue;
    const timeMatched = segmentTimes(segment).some((minutes) => Math.abs(minutes - koreaMinutes(startsAt)) <= 90);
    const dateMatched = mentionsEventDate(segment, eventDate) || (koreaDate(article.publishedAt) === eventDate && timeMatched);
    if (!dateMatched) continue;
    const sameLocationAndDate = candidates.filter((candidate) => candidate.startsAt && koreaDate(new Date(candidate.startsAt)) === eventDate
      && eventLocationTerms(candidate).some((term) => terms.some((current) => normalize(current).includes(normalize(term)) || normalize(term).includes(normalize(current)))));
    const uniqueLocationMatched = sameLocationAndDate.length === 1;
    if (!timeMatched && !uniqueLocationMatched) continue;
    const matchedLocationTerms = terms.filter((term) => normalize(segment).includes(normalize(term))).slice(0, 3);
    payloads.push({
      provider: "publisher_rss",
      occurrenceId: occurrence.id,
      eventDate,
      topicTitle,
      topicTags: purposeTopicTags(topicTitle),
      sourceTitle: article.title,
      sourceUrl: article.url,
      publisherLabel: feed.publisherLabel,
      publishedAt: article.publishedAt.toISOString(),
      providerItemId: createHash("sha256").update(article.url).digest("hex"),
      sourceId: `news_rss_${feed.id}`,
      sourceCheckedAt: checkedAt.toISOString(),
      matchedLocationTerms,
      dateMatched: true,
      locationMatched: true,
      timeMatched,
      uniqueLocationMatched
    });
  }
  return payloads;
}

const dayMs = 24 * 60 * 60 * 1000;
const purposeMarker = "요구|촉구|규탄|반대|찬성|지지|철회|폐지|보장|정상화|재선거|탄핵|처벌|사퇴|진상\\s*규명|개선|보호";
const purposeActionMarker = "요구|촉구|규탄|반대|찬성|지지|철회|폐지|보장|처벌|사퇴|개선|보호";

function extractPurposeTopic(segment: string): string | undefined {
  const quoted = segment.match(new RegExp(`[‘“\"']([^’”\"']{3,60}(?:${purposeMarker})[^’”\"']*)[’”\"']`, "u"))?.[1];
  if (quoted) return normalizePurposePhrase(quoted);
  const direct = segment.match(new RegExp(`([가-힣A-Za-z0-9·]+(?:\\s+[가-힣A-Za-z0-9·]+){0,3}?)(?:을|를)?\\s*(${purposeActionMarker})(?:하는|한|하겠다고|을|를)?`, "u"));
  if (!direct) return undefined;
  const object = (direct[1].split(/(?:에서|에는|에게|측은|단체는|단체가)/u).at(-1)?.trim() ?? "").replace(/[을를]$/u, "");
  const marker = direct[2].replace(/\s+/g, " ");
  return normalizePurposePhrase(`${object} ${marker}`);
}

function normalizePurposePhrase(value: string): string | undefined {
  const phrase = value.normalize("NFKC")
    .replace(/[“”‘’\"']/g, "")
    .replace(/^\d{1,2}일\s+/u, "")
    .replace(/^[가-힣A-Za-z0-9·\s]{1,35}(?:들이|측은|측이|단체는|단체가)\s+/u, "")
    .replace(/^(?:열린|예정된|개최된)\s+/u, "")
    .replace(/(?:비상대책위원회|대책위원회|추진위원회|준비위원회)\s*$/u, "")
    .replace(/남녀공학\s*전환/gu, "남녀공학 전환")
    .replace(/\s*투쟁\s*/gu, " ")
    .replace(/(?:집회|시위|행진|문화제|국민대회|피켓|투쟁)\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  if (phrase.length < 3 || phrase.length > 60 || !new RegExp(`(?:${purposeMarker})`, "u").test(phrase)) return undefined;
  return `${phrase} 관련 집회`;
}

function purposeTopicTags(title: string): string[] {
  return [...new Set(title.replace(/\s*관련 집회$/u, "").split(/\s+/).filter((term) => term.length >= 2).concat("집회"))].slice(0, 6);
}

function eventLocationTerms(occurrence: NewsOccurrence): string[] {
  const text = `${occurrence.locationLabel ?? ""} ${occurrence.title}`
    .replace(/(?:집회|일정|일대|부근|인근|앞|건너편|이면도로|개\s*차로)/g, " ")
    .replace(/[()·,]/g, " ");
  const suffixTerms = [...text.matchAll(/[가-힣A-Za-z0-9]+(?:입구역|광장|공원|당사|경찰청|도청|시청|구청|교육청|선거관리위원회|교회|시장|현장|사거리|오거리|법원|박물관|기념관|아파트|역)/gu)].map((match) => match[0]);
  const tokens = text.split(/\s+/).filter((term) => term.length >= 3 && !/^(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|종로구|서초구|마포구|송파구)$/u.test(term));
  return [...new Set([...suffixTerms, ...tokens])].sort((left, right) => right.length - left.length).slice(0, 6);
}

function mentionsEventDate(segment: string, eventDate: string): boolean {
  const [, month, day] = eventDate.split("-");
  return new RegExp(`(?:${Number(month)}월\\s*)?${Number(day)}일`, "u").test(segment);
}

function segmentTimes(segment: string): number[] {
  const values: number[] = [];
  for (const match of segment.matchAll(/(?:(오전|오후)\s*)?(\d{1,2})(?::(\d{2}))?\s*시?/gu)) {
    if (!match[0].includes(":") && !match[0].includes("시")) continue;
    let hour = Number(match[2]);
    const minute = Number(match[3] ?? 0);
    if (match[1] === "오후" && hour < 12) hour += 12;
    if (match[1] === "오전" && hour === 12) hour = 0;
    if (hour <= 23 && minute <= 59) values.push(hour * 60 + minute);
  }
  return values;
}

function koreaDate(value: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function koreaMinutes(value: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value ?? 0);
}

function readXmlTag(entry: string, tag: string): string {
  const match = entry.match(new RegExp(`<(?:(?:[a-z0-9_-]+):)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[a-z0-9_-]+):)?${tag}>`, "i"));
  return match?.[1] ?? "";
}

function decodeXmlText(value: string): string {
  return value
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/i, "$1")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(quot|amp|lt|gt|apos|nbsp);/gi, (entity) => ({ "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&apos;": "'", "&nbsp;": " " }[entity.toLowerCase()] ?? " "))
    .trim();
}

function matchesLaw(searchText: string, group: NewsLawGroup): boolean {
  return lawAliases(group.lawName).some((alias) => {
    const normalizedText = normalize(searchText);
    const normalizedAlias = normalize(alias);
    if (normalizedAlias === "국회법") {
      return normalizedText.replaceAll("국회법제사법위원회", "").replaceAll("국회법제사법위", "").includes(normalizedAlias);
    }
    return normalizedText.includes(normalizedAlias);
  });
}

function bestCoreTopicKey(searchText: string, group: NewsLawGroup): string {
  const ranked = group.coreTopics.map((topic) => ({ topic, score: topicTerms(topic).filter((term) => searchText.includes(normalize(term))).length }))
    .sort((left, right) => right.score - left.score || right.topic.billCount - left.topic.billCount);
  return ranked[0]?.score ? ranked[0].topic.key : "_group";
}

function topicTerms(topic: NewsLawGroup["coreTopics"][number]): string[] {
  return [topic.label, ...topic.representativeKeywords];
}

function matchesBill(searchText: string, group: NewsLawGroup): boolean {
  return group.bills.some((bill) => {
    if (bill.assemblyBillNo && searchText.includes(normalize(bill.assemblyBillNo))) return true;
    const proposer = bill.proposer?.match(/[가-힣]{2,4}/)?.[0];
    return Boolean(proposer && searchText.includes(normalize(proposer)) && matchesLaw(searchText, group));
  });
}

function lawAliases(lawName: string): string[] {
  const aliases = [lawName];
  if (lawName === "공직선거법") aliases.push("선거법");
  if (lawName === "집회 및 시위에 관한 법률") aliases.push("집시법", "집회시위법");
  return aliases;
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
}

function safeHttpsUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return undefined;
    url.hash = "";
    return url;
  } catch {
    return undefined;
  }
}

function readConfiguredFeeds(config: Record<string, unknown>, env: NodeJS.ProcessEnv): NewsFeed[] {
  const envValue = env.MUSUNIL_NEWS_RSS_FEEDS_JSON;
  let candidate: unknown = configValue(config, "public_data_sources.news_rss_feeds");
  if (envValue) {
    try {
      candidate = JSON.parse(envValue);
    } catch {
      candidate = undefined;
    }
  }
  if (!Array.isArray(candidate)) return defaultFeeds;
  const feeds = candidate.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
    const row = item as Record<string, unknown>;
    const feed = {
      id: typeof row.id === "string" ? row.id.trim() : "",
      publisherLabel: typeof row.publisher_label === "string" ? row.publisher_label.trim() : "",
      url: typeof row.url === "string" ? row.url.trim() : ""
    };
    return isOfficialFeed(feed) ? feed : undefined;
  }).filter((feed): feed is NewsFeed => Boolean(feed));
  return feeds.length >= 3 ? feeds : defaultFeeds;
}

function isOfficialFeed(feed: NewsFeed): boolean {
  const url = safeHttpsUrl(feed.url);
  return Boolean(feed.id && feed.publisherLabel && url && officialFeedHosts.has(url.hostname));
}

function configValue(config: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" && !Array.isArray(current) ? (current as Record<string, unknown>)[key] : undefined, config);
}

function configNumber(config: Record<string, unknown>, path: string, fallback: number, min: number, max: number): number {
  const value = configValue(config, path);
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
