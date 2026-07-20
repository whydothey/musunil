import { createHash } from "node:crypto";

export type NewsRuntime = {
  clientId?: string;
  clientSecret?: string;
  apiUrl: string;
  initialLookbackDays: number;
  maxResultsPerQuery: number;
  maxQueriesPerRun: number;
};

export type NewsLawGroup = {
  id: string;
  lawName: string;
  billTitle: string;
  coreTopics: Array<{ key: string; label: string; representativeKeywords: string[]; billCount: number }>;
  bills: Array<{ assemblyBillNo?: string; proposer?: string }>;
};

export type NewsIngestPayload = {
  provider: "naver_api_hub";
  lawGroupId: string;
  coreTopicKey: string;
  sourceTitle: string;
  sourceUrl: string;
  aggregatorUrl?: string;
  publisherLabel: string;
  publishedAt: string;
  providerItemId: string;
  directBillMatch: boolean;
  sourceId: string;
  sourceCheckedAt: string;
  sourceBatchSize: number;
};

type NaverNewsItem = {
  title?: unknown;
  originallink?: unknown;
  link?: unknown;
  description?: unknown;
  pubDate?: unknown;
};

type NewsQuery = { group: NewsLawGroup; coreTopicKey: string; query: string };

const defaultApiUrl = "https://naverapihub.apigw.ntruss.com/search/v1/news";

export function readNewsRuntime(config: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env): NewsRuntime {
  return {
    clientId: credential(env.MUSUNIL_NAVER_API_HUB_CLIENT_ID) ?? configCredential(config, "public_data_sources.naver_api_hub_client_id"),
    clientSecret: credential(env.MUSUNIL_NAVER_API_HUB_CLIENT_SECRET) ?? configCredential(config, "public_data_sources.naver_api_hub_client_secret"),
    apiUrl: env.MUSUNIL_NAVER_API_HUB_URL ?? configString(config, "public_data_sources.naver_api_hub_url") ?? defaultApiUrl,
    initialLookbackDays: configNumber(config, "public_data_sources.news_initial_lookback_days", 90, 1, 365),
    maxResultsPerQuery: configNumber(config, "public_data_sources.news_max_results_per_query", 20, 1, 100),
    maxQueriesPerRun: configNumber(config, "public_data_sources.news_max_queries_per_run", 100, 1, 100)
  };
}

export function newsOperationalDiagnostics(runtime: NewsRuntime) {
  const endpoint = safeHttpsUrl(runtime.apiUrl);
  const endpointOfficial = endpoint?.hostname === "naverapihub.apigw.ntruss.com" && endpoint.pathname === "/search/v1/news";
  const credentialConfigured = Boolean(runtime.clientId && runtime.clientSecret);
  return {
    mode: "news_metadata_only",
    readyForMetadataCheck: endpointOfficial,
    readyForOperationalIngest: endpointOfficial && credentialConfigured,
    summary: {
      credentialConfigured,
      endpointOfficial,
      lookbackDays: runtime.initialLookbackDays,
      maxResultsPerQuery: runtime.maxResultsPerQuery,
      maxQueriesPerRun: runtime.maxQueriesPerRun,
      requiredActions: [
        ...(!credentialConfigured ? ["NAVER API HUB Client ID/Secret을 비밀 설정에 입력한다."] : []),
        ...(!endpointOfficial ? ["NAVER API HUB 뉴스 검색 공식 HTTPS endpoint를 사용한다."] : [])
      ]
    }
  };
}

export function buildNewsQueries(groups: NewsLawGroup[], maxQueries: number): NewsQuery[] {
  const queries: NewsQuery[] = [];
  for (const group of [...groups].sort((left, right) => left.billTitle.localeCompare(right.billTitle, "ko"))) {
    queries.push({ group, coreTopicKey: "_group", query: `${group.lawName} 개정` });
    for (const topic of [...group.coreTopics].sort((left, right) => right.billCount - left.billCount || left.label.localeCompare(right.label, "ko"))) {
      queries.push({ group, coreTopicKey: topic.key, query: `${group.lawName} ${topic.label}` });
    }
  }
  return queries.slice(0, Math.max(0, maxQueries));
}

export async function fetchNewsPayloads(
  runtime: NewsRuntime,
  groups: NewsLawGroup[],
  remainingMonthlyCalls: number
): Promise<{ payloads: NewsIngestPayload[]; callCount: number; queryCount: number; failures: Array<{ query: string; status: number }> }> {
  if (!runtime.clientId || !runtime.clientSecret) return { payloads: [], callCount: 0, queryCount: 0, failures: [] };
  const queries = buildNewsQueries(groups, Math.min(runtime.maxQueriesPerRun, remainingMonthlyCalls));
  const checkedAt = new Date();
  const cutoff = checkedAt.getTime() - runtime.initialLookbackDays * 24 * 60 * 60 * 1000;
  const bestByGroupAndUrl = new Map<string, NewsIngestPayload>();
  let callCount = 0;
  const failures: Array<{ query: string; status: number }> = [];

  for (const item of queries) {
    const url = new URL(runtime.apiUrl);
    url.searchParams.set("query", item.query);
    url.searchParams.set("display", String(runtime.maxResultsPerQuery));
    url.searchParams.set("start", "1");
    url.searchParams.set("sort", "date");
    url.searchParams.set("format", "json");
    callCount += 1;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": runtime.clientId,
          "X-NCP-APIGW-API-KEY": runtime.clientSecret,
          accept: "application/json",
          "user-agent": "MusunilNewsSourceWorker/0.1"
        },
        signal: AbortSignal.timeout(10_000)
      });
    } catch {
      failures.push({ query: item.query, status: 0 });
      continue;
    }
    if (!response.ok) {
      failures.push({ query: item.query, status: response.status });
      continue;
    }
    let parsed;
    try {
      parsed = parseNaverNewsResponse(await response.json());
    } catch {
      failures.push({ query: item.query, status: 502 });
      continue;
    }
    for (const article of parsed) {
      if (article.publishedAt.getTime() < cutoff || !matchesLaw(article.searchText, item.group)) continue;
      const matchedTopicKey = item.coreTopicKey === "_group" ? bestCoreTopicKey(article.searchText, item.group) : item.coreTopicKey;
      const topic = item.group.coreTopics.find((candidate) => candidate.key === matchedTopicKey);
      if (topic && !matchesCoreTopic(article.searchText, topic)) continue;
      const sourceUrl = safeHttpsUrl(article.originalUrl)?.toString() ?? safeHttpsUrl(article.link)?.toString();
      if (!sourceUrl) continue;
      const aggregatorUrl = safeHttpsUrl(article.link)?.toString();
      const payload: NewsIngestPayload = {
        provider: "naver_api_hub",
        lawGroupId: item.group.id,
        coreTopicKey: matchedTopicKey,
        sourceTitle: article.title,
        sourceUrl,
        aggregatorUrl: aggregatorUrl && aggregatorUrl !== sourceUrl ? aggregatorUrl : undefined,
        publisherLabel: new URL(sourceUrl).hostname.replace(/^www\./, ""),
        publishedAt: article.publishedAt.toISOString(),
        providerItemId: createHash("sha256").update(article.link || sourceUrl).digest("hex"),
        directBillMatch: matchesBill(article.searchText, item.group),
        sourceId: "news_naver_api_hub",
        sourceCheckedAt: checkedAt.toISOString(),
        sourceBatchSize: 0
      };
      const key = `${item.group.id}:${sourceUrl}`;
      const existing = bestByGroupAndUrl.get(key);
      if (!existing || (existing.coreTopicKey === "_group" && payload.coreTopicKey !== "_group")) bestByGroupAndUrl.set(key, payload);
    }
  }

  const payloads = [...bestByGroupAndUrl.values()].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  for (const payload of payloads) payload.sourceBatchSize = payloads.length;
  return { payloads, callCount, queryCount: queries.length, failures };
}

export function parseNaverNewsResponse(value: unknown): Array<{
  title: string;
  originalUrl?: string;
  link: string;
  searchText: string;
  publishedAt: Date;
}> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const row = item && typeof item === "object" && !Array.isArray(item) ? item as NaverNewsItem : {};
    const title = cleanNewsText(row.title);
    const description = cleanNewsText(row.description);
    const link = typeof row.link === "string" ? row.link : "";
    const originalUrl = typeof row.originallink === "string" ? row.originallink : undefined;
    const publishedAt = new Date(typeof row.pubDate === "string" ? row.pubDate : "");
    if (!title || !link || Number.isNaN(publishedAt.getTime())) return undefined;
    return { title, originalUrl, link, searchText: normalize(`${title} ${description}`), publishedAt };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function cleanNewsText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(quot|amp|lt|gt|apos|nbsp);/gi, (entity) => ({ "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&apos;": "'", "&nbsp;": " " }[entity.toLowerCase()] ?? " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function matchesLaw(searchText: string, group: NewsLawGroup): boolean {
  return lawAliases(group.lawName).some((alias) => searchText.includes(normalize(alias)));
}

function bestCoreTopicKey(searchText: string, group: NewsLawGroup): string {
  const ranked = group.coreTopics.map((topic) => ({ topic, score: topicTerms(topic).filter((term) => searchText.includes(normalize(term))).length }))
    .sort((left, right) => right.score - left.score || right.topic.billCount - left.topic.billCount);
  return ranked[0]?.score ? ranked[0].topic.key : "_group";
}

function matchesCoreTopic(searchText: string, topic: NewsLawGroup["coreTopics"][number]): boolean {
  return topicTerms(topic).some((term) => normalize(term).length >= 2 && searchText.includes(normalize(term)));
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

function credential(value: string | undefined): string | undefined {
  return value && !value.startsWith("CHANGE_ME") ? value : undefined;
}

function configCredential(config: Record<string, unknown>, path: string): string | undefined {
  return credential(configString(config, path));
}

function configString(config: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" && !Array.isArray(current) ? (current as Record<string, unknown>)[key] : undefined, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function configNumber(config: Record<string, unknown>, path: string, fallback: number, min: number, max: number): number {
  const value = path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" && !Array.isArray(current) ? (current as Record<string, unknown>)[key] : undefined, config);
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
}
