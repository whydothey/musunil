import { parseDaeguTodayAssemblyList, toPublicOccurrencePayload } from "./daegu.ts";
import { parseGangwonTodayAssemblyList, toGangwonPublicOccurrencePayload } from "./gangwon.ts";
import { parseBusanTodayAssemblyList, toBusanPublicOccurrencePayload } from "./busan.ts";
import { parseGyeonggiSouthTodayAssemblyList, toGyeonggiSouthPublicOccurrencePayload } from "./gyeonggi-south.ts";
import { parseGwangjuTodayAssemblyList, toGwangjuPublicOccurrencePayload } from "./gwangju.ts";
import { parseIncheonTodayAssemblyList, toIncheonPublicOccurrencePayload } from "./incheon.ts";
import { parseGyeongbukTodayAssemblyList, toGyeongbukPublicOccurrencePayload } from "./gyeongbuk.ts";
import { parseGyeongnamTodayAssemblyList, toGyeongnamPublicOccurrencePayload } from "./gyeongnam.ts";
import { parseJejuTodayAssemblyList, toJejuPublicOccurrencePayload } from "./jeju.ts";
import { parseChungbukTodayAssemblyList, toChungbukPublicOccurrencePayload } from "./chungbuk.ts";
import { parseChungnamTodayAssemblyList, toChungnamPublicOccurrencePayload } from "./chungnam.ts";
import { parseJeonbukTodayAssemblyList, toJeonbukPublicOccurrencePayload } from "./jeonbuk.ts";
import { parseJeonnamTodayAssemblyList, toJeonnamPublicOccurrencePayload } from "./jeonnam.ts";
import { parseDaejeonTodayAssemblyList, toDaejeonPublicOccurrencePayload } from "./daejeon.ts";
import { parseUlsanTodayAssemblyList, toUlsanPublicOccurrencePayload } from "./ulsan.ts";
import { parseSeoulAssemblyControlList, parseSeoulAssemblyEvents, toSeoulIndividualOccurrencePayload, toSeoulPublicOccurrencePayload } from "./seoul.ts";
import { parseSejongTodayAssemblyList, toSejongPublicOccurrencePayload } from "./sejong.ts";
import { parseGyeonggiNorthTodayAssemblyList, toGyeonggiNorthPublicOccurrencePayload } from "./gyeonggi-north.ts";
import { fetchLawPayloads, lawOperationalDiagnostics, readLawRuntime } from "./laws.ts";
import { fetchNewsPayloads, newsOperationalDiagnostics, readNewsRuntime, type NewsLawGroup } from "./news.ts";
import { ingestablePublicAssemblySources, sourceCoverageReport, sourceOperationalDiagnostics, type PublicAssemblySource } from "./sources.ts";
import { resolve } from "node:path";
import { loadUserInputs } from "../../../packages/config/src/index.ts";

const shouldPost = process.argv.includes("--post");
const coverage = sourceCoverageReport();

if (process.argv.includes("--coverage")) {
  console.log(JSON.stringify({ mode: "coverage", coverage }, null, 2));
  if (process.argv.includes("--require-full-schedule-coverage") && !coverage.fullScheduleCoverage) process.exit(1);
  process.exit(0);
}

if (process.argv.includes("--diagnose")) {
  const diagnostics = sourceOperationalDiagnostics();
  console.log(JSON.stringify({ mode: "diagnose", diagnostics }, null, 2));
  if (process.argv.includes("--require-operational-readiness") && !diagnostics.readyForScheduledIngest) process.exit(1);
  process.exit(0);
}

if (process.argv.includes("--laws-diagnose")) {
  const runtime = readRuntime({ requireInternalApiKey: false });
  const diagnostics = lawOperationalDiagnostics(readLawRuntime(runtime.config));
  console.log(JSON.stringify({ mode: "laws_diagnose", diagnostics }, null, 2));
  if (process.argv.includes("--require-law-metadata") && !diagnostics.readyForMetadataCheck) process.exit(1);
  if (process.argv.includes("--require-law-credentials") && !diagnostics.readyForOperationalIngest) process.exit(1);
  process.exit(0);
}

if (process.argv.includes("--news-diagnose")) {
  const runtime = readRuntime({ requireInternalApiKey: false });
  const diagnostics = newsOperationalDiagnostics(readNewsRuntime(runtime.config));
  console.log(JSON.stringify({ mode: "news_diagnose", diagnostics }, null, 2));
  if (process.argv.includes("--require-news-metadata") && !diagnostics.readyForMetadataCheck) process.exit(1);
  if (process.argv.includes("--require-news-credentials") && !diagnostics.readyForOperationalIngest) process.exit(1);
  process.exit(0);
}

if (process.argv.includes("--laws")) {
  const runtime = readRuntime({ requireInternalApiKey: shouldPost });
  const lawRuntime = readLawRuntime(runtime.config);
  if (!lawRuntime.assemblyBillApiKey && !lawRuntime.lawApiOc) {
    console.log(JSON.stringify({ mode: "laws_disabled", reason: "law_source_credentials_missing" }, null, 2));
    process.exit(0);
  }
  const payloads = await fetchLawPayloads(lawRuntime);
  if (payloads.length === 0) {
    console.error(JSON.stringify({ error: "law_source_parse_empty" }, null, 2));
    process.exit(1);
  }
  if (!shouldPost) {
    console.log(JSON.stringify({ mode: "laws_dry_run", count: payloads.length, payloads }, null, 2));
    process.exit(0);
  }
  const response = await fetch(`${runtime.apiBaseUrl}/internal/ingest/laws`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-musunil-internal-key": runtime.internalApiKey
    },
    body: JSON.stringify({ laws: payloads })
  });
  const body = await readResponseBody(response);
  console.log(JSON.stringify({ mode: "laws_post", status: response.status, ok: response.ok, body }, null, 2));
  if (!response.ok) process.exit(1);
  process.exit(0);
}

if (process.argv.includes("--news")) {
  const runtime = readRuntime({ requireInternalApiKey: shouldPost });
  const newsRuntime = readNewsRuntime(runtime.config);
  const lawsResponse = await fetch(`${runtime.apiBaseUrl}/laws`, { headers: { accept: "application/json" } });
  const lawsBody = await readResponseBody(lawsResponse) as { lawGroups?: NewsLawGroup[]; lawInterestItems?: Array<{ lawGroupId?: string; assemblyBillNo?: string; proposer?: string }> };
  if (!lawsResponse.ok) throw new Error(`news_law_groups_fetch_failed:${lawsResponse.status}`);
  const groups = (lawsBody.lawGroups ?? []).map((group) => ({
    ...group,
    bills: (lawsBody.lawInterestItems ?? []).filter((law) => law.lawGroupId === group.id).map((law) => ({ assemblyBillNo: law.assemblyBillNo, proposer: law.proposer }))
  }));
  if (groups.length === 0) {
    console.log(JSON.stringify({ mode: "news_skipped", reason: "law_groups_empty" }, null, 2));
    process.exit(0);
  }
  let budget: { month?: string; remaining?: number } = { month: new Date().toISOString().slice(0, 7), remaining: 20_000 };
  if (shouldPost) {
    const budgetResponse = await fetch(`${runtime.apiBaseUrl}/internal/news-ingest-budget`, {
      headers: { "x-musunil-internal-key": runtime.internalApiKey, accept: "application/json" }
    });
    budget = await readResponseBody(budgetResponse) as { month?: string; remaining?: number };
    if (!budgetResponse.ok || typeof budget.remaining !== "number" || !budget.month) throw new Error(`news_budget_fetch_failed:${budgetResponse.status}`);
  }
  if (typeof budget.remaining !== "number" || !budget.month) throw new Error("news_budget_invalid");
  const budgetMonth = budget.month;
  const remainingCalls = budget.remaining;
  if (remainingCalls <= 0) {
    console.log(JSON.stringify({ mode: "news_budget_exhausted", month: budgetMonth }, null, 2));
    process.exit(0);
  }
  const result = await fetchNewsPayloads(newsRuntime, groups, remainingCalls);
  if (!shouldPost) {
    console.log(JSON.stringify({ mode: "news_dry_run", groupCount: groups.length, queryCount: result.queryCount, callCount: result.callCount, failures: result.failures, count: result.payloads.length, payloads: result.payloads }, null, 2));
    process.exit(0);
  }
  if (result.callCount > 0) {
    const usageResponse = await fetch(`${runtime.apiBaseUrl}/internal/news-ingest-usage`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-musunil-internal-key": runtime.internalApiKey },
      body: JSON.stringify({ provider: "publisher_rss", month: budgetMonth, callCount: result.callCount })
    });
    if (!usageResponse.ok) throw new Error(`news_usage_post_failed:${usageResponse.status}`);
  }
  const results = [];
  for (const payload of result.payloads) {
    const response = await fetch(`${runtime.apiBaseUrl}/internal/ingest/news`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-musunil-internal-key": runtime.internalApiKey },
      body: JSON.stringify(payload)
    });
    results.push({ providerItemId: payload.providerItemId, status: response.status, ok: response.ok, body: await readResponseBody(response) });
  }
  console.log(JSON.stringify({ mode: "news_post", queryCount: result.queryCount, callCount: result.callCount, failures: result.failures, count: results.length, results }, null, 2));
  if (result.failures.length > 0 || results.some((item) => !item.ok)) process.exit(1);
  process.exit(0);
}

type AssemblySourceRun = {
  source: PublicAssemblySource;
  checkedAt: string;
  status: "success" | "empty" | "failed";
  parsedCount: number;
  payloads: Array<ReturnType<typeof parseSource>[number] & {
    sourceId: string;
    sourceCheckedAt: string;
    sourceBatchSize: number;
  }>;
  errorCode?: string;
};

const sourceRuns: AssemblySourceRun[] = [];
for (const source of ingestablePublicAssemblySources()) {
  const checkedAt = new Date().toISOString();
  try {
    const html = await fetchSourceHtml(source);
    const parsedPayloads = parseSource(source, html).slice(0, 25);
    if (parsedPayloads.length === 0) throw new Error("source_parse_empty");
    const eligiblePayloads = parsedPayloads.filter((payload) => isWithinOperationalWindow(payload));
    const payloads = eligiblePayloads.map((payload) => ({
      ...payload,
      ...officialSourceMetadata(payload),
      sourceId: source.id,
      sourceCheckedAt: checkedAt,
      sourceBatchSize: eligiblePayloads.length
    }));
    sourceRuns.push({
      source,
      checkedAt,
      status: payloads.length > 0 ? "success" : "empty",
      parsedCount: parsedPayloads.length,
      payloads
    });
  } catch (error) {
    sourceRuns.push({
      source,
      checkedAt,
      status: "failed",
      parsedCount: 0,
      payloads: [],
      errorCode: publicSourceErrorCode(error)
    });
  }
}
const payloads = sourceRuns.flatMap((item) => item.payloads);
const failures = sourceRuns.filter((run) => run.status === "failed");

if (!shouldPost) {
  console.log(JSON.stringify({
    mode: "dry_run",
    coverage,
    count: payloads.length,
    runs: sourceRuns.map((run) => ({ sourceId: run.source.id, status: run.status, parsedCount: run.parsedCount, resultCount: run.payloads.length, errorCode: run.errorCode })),
    payloads
  }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
} else {
  const runtime = readRuntime();
  const results = [];
  for (const run of sourceRuns) {
    const response = await fetch(`${runtime.apiBaseUrl}/internal/ingest/public-occurrences/batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-musunil-internal-key": runtime.internalApiKey
      },
      body: JSON.stringify({
        sourceId: run.source.id,
        checkedAt: run.checkedAt,
        status: run.status,
        parsedCount: run.parsedCount,
        errorCode: run.errorCode,
        records: run.payloads
      })
    });
    results.push({ sourceId: run.source.id, status: response.status, ok: response.ok, body: await readResponseBody(response) });
  }
  console.log(JSON.stringify({ mode: "post", coverage, results }, null, 2));
  if (failures.length > 0 || results.some((result) => !result.ok)) process.exit(1);
}

function isWithinOperationalWindow(payload: ReturnType<typeof parseSource>[number], now = new Date()): boolean {
  const reference = new Date(payload.endsAt ?? payload.startsAt);
  if (!Number.isFinite(reference.getTime())) return false;
  return reference.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1_000;
}

function officialSourceMetadata(payload: ReturnType<typeof parseSource>[number]) {
  const fields = Object.fromEntries(payload.rawText.split(";").map((part) => {
    const separator = part.indexOf("=");
    return separator > 0 ? [part.slice(0, separator).trim(), part.slice(separator + 1).trim()] : [part.trim(), ""];
  }));
  return {
    sourceItemId: payload.sourceItemId ?? fields.sourceId,
    sourceUrl: payload.sourceUrl ?? fields.url,
    sourcePublishedAt: payload.sourcePublishedAt ?? payload.evidenceUploadedAt,
    sourceTitle: payload.sourceTitle ?? payload.title,
    sourceGranularity: payload.sourceGranularity ?? ("bulletin" as const),
    parserVersion: payload.parserVersion ?? "1"
  };
}

function publicSourceErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : "public_source_failed";
  if (message.includes("source_fetch_failed")) return message.replace(/[^a-z0-9_:.-]/gi, "_").slice(0, 80);
  if (message.includes("source_parse_empty")) return "source_parse_empty";
  if (message.includes("abort")) return "source_fetch_timeout";
  return "source_fetch_or_parse_failed";
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function parseSource(source: PublicAssemblySource, html: string) {
  if (source.parser === "seoul_assembly_control") {
    return parseSeoulAssemblyControlList(html)
      .filter((row) => /행사\s*및\s*집회/.test(row.title))
      .flatMap((row) => [
        toSeoulPublicOccurrencePayload(row),
        ...parseSeoulAssemblyEvents(row).map((event) => toSeoulIndividualOccurrencePayload(row, event))
      ]);
  }
  if (source.parser === "sejong_today_assembly") return parseSejongTodayAssemblyList(html).map((row) => toSejongPublicOccurrencePayload(row));
  if (source.parser === "daegu_today_assembly") return parseDaeguTodayAssemblyList(html).map((row) => toPublicOccurrencePayload(row));
  if (source.parser === "gangwon_today_assembly") return parseGangwonTodayAssemblyList(html).map((row) => toGangwonPublicOccurrencePayload(row));
  if (source.parser === "busan_today_assembly") return parseBusanTodayAssemblyList(html).map((row) => toBusanPublicOccurrencePayload(row));
  if (source.parser === "gyeonggi_south_today_assembly") return parseGyeonggiSouthTodayAssemblyList(html).map((row) => toGyeonggiSouthPublicOccurrencePayload(row));
  if (source.parser === "gyeonggi_north_today_assembly") return parseGyeonggiNorthTodayAssemblyList(html).map((row) => toGyeonggiNorthPublicOccurrencePayload(row));
  if (source.parser === "gwangju_today_assembly") return parseGwangjuTodayAssemblyList(html).map((row) => toGwangjuPublicOccurrencePayload(row));
  if (source.parser === "incheon_today_assembly") return parseIncheonTodayAssemblyList(html).map((row) => toIncheonPublicOccurrencePayload(row));
  if (source.parser === "gyeongbuk_today_assembly") return parseGyeongbukTodayAssemblyList(html).map((row) => toGyeongbukPublicOccurrencePayload(row));
  if (source.parser === "gyeongnam_today_assembly") return parseGyeongnamTodayAssemblyList(html).map((row) => toGyeongnamPublicOccurrencePayload(row));
  if (source.parser === "jeju_today_assembly") return parseJejuTodayAssemblyList(html).map((row) => toJejuPublicOccurrencePayload(row));
  if (source.parser === "chungbuk_today_assembly") return parseChungbukTodayAssemblyList(html).map((row) => toChungbukPublicOccurrencePayload(row));
  if (source.parser === "chungnam_today_assembly") return parseChungnamTodayAssemblyList(html).map((row) => toChungnamPublicOccurrencePayload(row));
  if (source.parser === "jeonbuk_today_assembly") return parseJeonbukTodayAssemblyList(html).map((row) => toJeonbukPublicOccurrencePayload(row));
  if (source.parser === "jeonnam_today_assembly") return parseJeonnamTodayAssemblyList(html).map((row) => toJeonnamPublicOccurrencePayload(row));
  if (source.parser === "daejeon_today_assembly") return parseDaejeonTodayAssemblyList(html).map((row) => toDaejeonPublicOccurrencePayload(row));
  if (source.parser === "ulsan_today_assembly") return parseUlsanTodayAssemblyList(html).map((row) => toUlsanPublicOccurrencePayload(row));
  return [];
}

async function fetchSourceHtml(source: PublicAssemblySource): Promise<string> {
  if (!source.url) throw new Error(`source_url_missing:${source.id}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(source.url, {
      method: source.method ?? "GET",
      headers: {
        // ponytail: Daejeon returns truncated HTML to custom UA; keep the exception source-local.
        "user-agent": source.id === "daejeon_today_assembly" ? "curl/8.7.1 MusunilPublicSourceWorker/0.1" : "MusunilPublicSourceWorker/0.1",
        ...(source.body ? { "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "x-requested-with": "XMLHttpRequest" } : {}),
        ...(source.pageUrl ? { referer: source.pageUrl } : {})
      },
      body: source.body,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`source_fetch_failed:${response.status}`);
    }
    if (source.encoding) return new TextDecoder(source.encoding).decode(await response.arrayBuffer());
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function readRuntime(options: { requireInternalApiKey?: boolean } = {}) {
  const cwd = resolve(import.meta.dirname, "../../..");
  let config;
  try {
    config = loadUserInputs({ cwd }).config;
  } catch {
    config = {};
  }

  const apiBaseUrl = process.env.MUSUNIL_API_BASE_URL ?? apiUrlFromHostport(process.env.MUSUNIL_API_HOSTPORT) ?? readConfigString(config, "api.internal_base_url") ?? "http://localhost:4000";
  const internalApiKey = process.env.MUSUNIL_INTERNAL_API_KEY ?? readConfigString(config, "security.internal_api_key");
  if (options.requireInternalApiKey !== false && (!internalApiKey || internalApiKey.startsWith("CHANGE_ME"))) {
    throw new Error("Set security.internal_api_key in the user-inputs YAML or MUSUNIL_INTERNAL_API_KEY before --post.");
  }
  return { apiBaseUrl: apiBaseUrl.replace(/\/$/, ""), internalApiKey: internalApiKey ?? "", config };
}

function apiUrlFromHostport(hostport: string | undefined): string | undefined {
  return hostport ? `http://${hostport}` : undefined;
}

function readConfigString(config: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
