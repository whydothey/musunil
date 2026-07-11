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
import { parseSeoulAssemblyControlList, toSeoulPublicOccurrencePayload } from "./seoul.ts";
import { parseSejongTodayAssemblyList, toSejongPublicOccurrencePayload } from "./sejong.ts";
import { parseGyeonggiNorthTodayAssemblyList, toGyeonggiNorthPublicOccurrencePayload } from "./gyeonggi-north.ts";
import { fetchLawPayloads, lawOperationalDiagnostics, readLawRuntime } from "./laws.ts";
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

const sourcePayloads = [];
for (const source of ingestablePublicAssemblySources()) {
  const html = await fetchSourceHtml(source);
  const payloads = parseSource(source, html).slice(0, 10);
  sourcePayloads.push({ source, payloads });
}
const payloads = sourcePayloads.flatMap((item) => item.payloads);

if (sourcePayloads.length === 0 || sourcePayloads.some((item) => item.payloads.length === 0)) {
  console.error(JSON.stringify({ error: "public_source_parse_empty", sources: sourcePayloads.map((item) => ({ id: item.source.id, count: item.payloads.length })) }, null, 2));
  process.exit(1);
}

if (!shouldPost) {
  console.log(JSON.stringify({ mode: "dry_run", coverage, count: payloads.length, payloads }, null, 2));
} else {
  const runtime = readRuntime();
  const results = [];
  for (const payload of payloads) {
    const response = await fetch(`${runtime.apiBaseUrl}/internal/ingest/public-occurrence`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-musunil-internal-key": runtime.internalApiKey
      },
      body: JSON.stringify(payload)
    });
    results.push({ id: payload.id, status: response.status, ok: response.ok, body: await readResponseBody(response) });
  }
  console.log(JSON.stringify({ mode: "post", coverage, results }, null, 2));
  if (results.some((result) => !result.ok)) process.exit(1);
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
  if (source.parser === "seoul_assembly_control") return parseSeoulAssemblyControlList(html).map((row) => toSeoulPublicOccurrencePayload(row));
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
