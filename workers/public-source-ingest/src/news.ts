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

type ParsedNewsArticle = {
  title: string;
  url: string;
  searchText: string;
  publishedAt: Date;
};

const officialFeedHosts = new Set([
  "www.yna.co.kr",
  "www.hani.co.kr",
  "news.sbs.co.kr",
  "www.khan.co.kr",
  "www.chosun.com",
  "rss.ohmynews.com",
  "www.mk.co.kr"
]);

const defaultFeeds: NewsFeed[] = [
  { id: "yonhap_latest", publisherLabel: "연합뉴스", url: "https://www.yna.co.kr/rss/news.xml" },
  { id: "hani_all", publisherLabel: "한겨레", url: "https://www.hani.co.kr/rss/" },
  { id: "sbs_politics", publisherLabel: "SBS", url: "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01" },
  { id: "khan_all", publisherLabel: "경향신문", url: "https://www.khan.co.kr/rss/rssdata/total_news.xml" },
  { id: "chosun_all", publisherLabel: "조선일보", url: "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml" },
  { id: "ohmynews_all", publisherLabel: "오마이뉴스", url: "https://rss.ohmynews.com/rss/ohmynews.xml" },
  { id: "mk_politics", publisherLabel: "매일경제", url: "https://www.mk.co.kr/rss/30000001/" }
];

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
  remainingMonthlyCalls: number
): Promise<{ payloads: NewsIngestPayload[]; callCount: number; queryCount: number; failures: Array<{ query: string; status: number }> }> {
  const feeds = runtime.feeds.slice(0, Math.min(runtime.maxFeedsPerRun, remainingMonthlyCalls));
  const checkedAt = new Date();
  const cutoff = checkedAt.getTime() - runtime.initialLookbackDays * 24 * 60 * 60 * 1000;
  const bestByGroupAndUrl = new Map<string, NewsIngestPayload>();
  const failures: Array<{ query: string; status: number }> = [];
  let callCount = 0;
  let lastRequestAt = 0;

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

    for (const article of articles) {
      if (article.publishedAt.getTime() < cutoff) continue;
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
    }
  }

  const payloads = [...bestByGroupAndUrl.values()].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  for (const payload of payloads) payload.sourceBatchSize = payloads.length;
  return { payloads, callCount, queryCount: feeds.length, failures };
}

export function parsePublisherRss(xml: string): ParsedNewsArticle[] {
  const entries = [
    ...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)
  ];
  return entries.map((match) => {
    const entry = match[1] ?? "";
    const title = cleanNewsText(readXmlTag(entry, "title"));
    const description = cleanNewsText(readXmlTag(entry, "description") || readXmlTag(entry, "summary") || readXmlTag(entry, "content"));
    const rawLink = readXmlTag(entry, "link") || entry.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1] || "";
    const url = safeHttpsUrl(decodeXmlText(rawLink))?.toString() ?? "";
    const rawDate = readXmlTag(entry, "pubDate") || readXmlTag(entry, "date") || readXmlTag(entry, "published") || readXmlTag(entry, "updated");
    const publishedAt = new Date(decodeXmlText(rawDate));
    if (!title || !url || Number.isNaN(publishedAt.getTime())) return undefined;
    return { title, url, searchText: normalize(`${title} ${description}`), publishedAt };
  }).filter((item): item is ParsedNewsArticle => Boolean(item));
}

export function cleanNewsText(value: unknown): string {
  if (typeof value !== "string") return "";
  return decodeXmlText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
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
