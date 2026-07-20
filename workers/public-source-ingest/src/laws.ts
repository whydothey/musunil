import { createHash } from "node:crypto";

export type LawPayload = {
  id?: string;
  source: "assembly_bill" | "law_effective";
  lawName: string;
  billTitle?: string;
  stage: string;
  proposedDate?: string;
  statusDate?: string;
  effectiveDate?: string;
  assemblyBillId?: string;
  lawId?: string;
  summary?: string;
  officialUrl?: string;
  keywords: string[];
};

export type LawRuntime = {
  assemblyBillApiKey?: string;
  assemblyBillApiUrl: string;
  assemblyBillEra: string;
  lawApiOc?: string;
  lawApiBaseUrl: string;
  keywords: string[];
};

export type LawOperationalDiagnostics = {
  mode: "metadata_only";
  readyForMetadataCheck: boolean;
  readyForOperationalIngest: boolean;
  summary: {
    keywordCount: number;
    credentialConfigured: boolean;
    assemblyBillCredentialConfigured: boolean;
    lawGoKrCredentialConfigured: boolean;
    officialEndpointCount: number;
    requiredActions: string[];
  };
  providers: Array<{
    id: "assembly_bill" | "law_effective";
    label: string;
    officialUrl: string;
    endpointHost: string;
    credentialStatus: "configured" | "missing";
    endpointStatus: "official" | "custom_or_unverified" | "invalid";
    queryMode: string;
  }>;
  keywords: string[];
};

const defaultAssemblyBillApiUrl = "https://open.assembly.go.kr/portal/openapi/ALLBILLV2";
const defaultAssemblyBillEra = "제22대";
const defaultLawApiBaseUrl = "https://www.law.go.kr/DRF/lawSearch.do";
const defaultKeywords = [
  "집회 및 시위에 관한 법률",
  "정보통신망법",
  "공직선거법",
  "국회법",
  "탄핵",
  "선거 검증"
];

export function readLawRuntime(config: Record<string, unknown>, env: NodeJS.ProcessEnv = process.env): LawRuntime {
  return {
    assemblyBillApiKey:
      readCredentialString(env.MUSUNIL_ASSEMBLY_BILL_API_KEY) ??
      readConfigCredentialString(config, "public_data_sources.national_assembly_bill_api_key") ??
      readConfigCredentialString(config, "public_data_sources.assembly_notice_api_key"),
    assemblyBillApiUrl: env.MUSUNIL_ASSEMBLY_BILL_API_URL ?? readConfigString(config, "public_data_sources.national_assembly_bill_api_url") ?? defaultAssemblyBillApiUrl,
    assemblyBillEra: env.MUSUNIL_ASSEMBLY_BILL_ERACO ?? readConfigString(config, "public_data_sources.national_assembly_bill_eraco") ?? defaultAssemblyBillEra,
    lawApiOc: readCredentialString(env.MUSUNIL_LAW_GO_KR_OC) ?? readConfigCredentialString(config, "public_data_sources.law_go_kr_oc"),
    lawApiBaseUrl: env.MUSUNIL_LAW_GO_KR_BASE_URL ?? readConfigString(config, "public_data_sources.law_go_kr_base_url") ?? defaultLawApiBaseUrl,
    keywords: readConfigStringArray(config, "public_data_sources.law_interest_keywords", defaultKeywords)
  };
}

export function lawOperationalDiagnostics(runtime: LawRuntime): LawOperationalDiagnostics {
  const assemblyEndpoint = endpointStatus(runtime.assemblyBillApiUrl, "open.assembly.go.kr", "/portal/openapi/ALLBILLV2");
  const lawEndpoint = endpointStatus(runtime.lawApiBaseUrl, "www.law.go.kr", "/DRF/lawSearch.do");
  const providers: LawOperationalDiagnostics["providers"] = [
    {
      id: "assembly_bill",
      label: "국회 의안정보 통합 API",
      officialUrl: runtime.assemblyBillApiUrl,
      endpointHost: assemblyEndpoint.host,
      credentialStatus: runtime.assemblyBillApiKey ? "configured" : "missing",
      endpointStatus: assemblyEndpoint.status,
      queryMode: `ALLBILLV2 json ERACO=${runtime.assemblyBillEra} pIndex=1 pSize=100`
    },
    {
      id: "law_effective",
      label: "법제처 국가법령정보 API",
      officialUrl: runtime.lawApiBaseUrl,
      endpointHost: lawEndpoint.host,
      credentialStatus: runtime.lawApiOc ? "configured" : "missing",
      endpointStatus: lawEndpoint.status,
      queryMode: "lawSearch.do target=law type=JSON keyword loop"
    }
  ];
  const requiredActions = [];
  if (runtime.keywords.length === 0) requiredActions.push("public_data_sources.law_interest_keywords를 1개 이상 설정한다.");
  if (!runtime.assemblyBillApiKey && !runtime.lawApiOc) requiredActions.push("국회 의안 API key 또는 법제처 OC 중 하나를 입력한다.");
  for (const provider of providers) {
    if (provider.endpointStatus !== "official") requiredActions.push(`${provider.label} endpoint가 공식 URL인지 확인한다.`);
  }
  const officialEndpointCount = providers.filter((provider) => provider.endpointStatus === "official").length;
  const credentialConfigured = Boolean(runtime.assemblyBillApiKey || runtime.lawApiOc);
  return {
    mode: "metadata_only",
    readyForMetadataCheck: runtime.keywords.length > 0 && officialEndpointCount === providers.length,
    readyForOperationalIngest: runtime.keywords.length > 0 && credentialConfigured && officialEndpointCount === providers.length,
    summary: {
      keywordCount: runtime.keywords.length,
      credentialConfigured,
      assemblyBillCredentialConfigured: Boolean(runtime.assemblyBillApiKey),
      lawGoKrCredentialConfigured: Boolean(runtime.lawApiOc),
      officialEndpointCount,
      requiredActions
    },
    providers,
    keywords: runtime.keywords
  };
}

export async function fetchLawPayloads(runtime: LawRuntime): Promise<LawPayload[]> {
  const payloads = [
    ...(await fetchAssemblyBills(runtime)),
    ...(await fetchEffectiveLaws(runtime))
  ];
  return dedupeLawPayloads(payloads);
}

async function fetchAssemblyBills(runtime: LawRuntime): Promise<LawPayload[]> {
  if (!runtime.assemblyBillApiKey) return [];
  const pageSize = 100;
  const first = await fetchAssemblyBillPage(runtime, 1, pageSize);
  const pageCount = Math.min(10, Math.max(1, Math.ceil(readTotalCount(first.payload) / pageSize)));
  const pages = [first.rows];
  for (let page = 2; page <= pageCount; page += 1) pages.push((await fetchAssemblyBillPage(runtime, page, pageSize)).rows);
  return pages.flat().map((row) => assemblyBillPayload(row, runtime.keywords)).filter((payload): payload is LawPayload => Boolean(payload));
}

async function fetchAssemblyBillPage(runtime: LawRuntime, page: number, pageSize: number): Promise<{ payload: unknown; rows: Array<Record<string, unknown>> }> {
  const url = new URL(runtime.assemblyBillApiUrl);
  url.searchParams.set("KEY", runtime.assemblyBillApiKey!);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", String(page));
  url.searchParams.set("pSize", String(pageSize));
  url.searchParams.set("ERACO", runtime.assemblyBillEra);
  const payload = await fetchJson(url);
  return { payload, rows: extractObjectRows(payload) };
}

async function fetchEffectiveLaws(runtime: LawRuntime): Promise<LawPayload[]> {
  if (!runtime.lawApiOc) return [];
  const results: LawPayload[] = [];
  for (const keyword of runtime.keywords.slice(0, 10)) {
    const url = new URL(runtime.lawApiBaseUrl);
    url.searchParams.set("OC", runtime.lawApiOc);
    url.searchParams.set("target", "law");
    url.searchParams.set("type", "JSON");
    url.searchParams.set("query", keyword);
    url.searchParams.set("display", "20");
    const rows = extractObjectRows(await fetchJson(url));
    for (const row of rows) {
      const payload = effectiveLawPayload(row, keyword);
      if (payload) results.push(payload);
    }
  }
  return results;
}

function endpointStatus(value: string, host: string, pathname: string): { host: string; status: "official" | "custom_or_unverified" | "invalid" } {
  try {
    const url = new URL(value);
    return {
      host: url.host,
      status: url.host === host && url.pathname === pathname ? "official" : "custom_or_unverified"
    };
  } catch {
    return { host: "invalid", status: "invalid" };
  }
}

function assemblyBillPayload(row: Record<string, unknown>, keywords: string[]): LawPayload | undefined {
  const billTitle = pickString(row, ["BILL_NAME", "BILL_NM", "의안명", "법률안명", "제안이유"]);
  if (!billTitle || !keywords.some((keyword) => searchText(billTitle).includes(searchText(keyword)))) return undefined;
  const lawName = lawNameFromBillTitle(billTitle);
  const assemblyBillId = pickString(row, ["BILL_ID", "BILL_NO", "의안ID", "의안번호"]);
  const proposedDate = parseDateText(pickString(row, ["PPSL_DT", "PROPOSE_DT", "제안일자", "제안일"]));
  const statusDate = parseDateText(pickString(row, ["RGS_RSLN_DT", "JRCMIT_PROC_DT", "LAW_PROC_DT", "PROM_DT", "PROC_DT", "PROC_RESULT_DT", "처리일자", "의결일자"]));
  return {
    id: idFor("assembly_bill", assemblyBillId ?? billTitle),
    source: "assembly_bill",
    lawName,
    billTitle,
    stage: pickString(row, ["RGS_CONF_RSLT", "JRCMIT_PROC_RSLT", "LAW_PROC_RSLT", "PROC_STAGE_CD", "PROC_RESULT", "처리결과", "JRCMIT_NM", "COMMITTEE", "소관위원회"]) ?? "접수",
    proposedDate,
    statusDate,
    assemblyBillId,
    summary: pickString(row, ["PPSR_NM", "RST_PROPOSER", "제안자", "제안이유"]),
    officialUrl: officialAssemblyBillUrl(pickString(row, ["LINK_URL", "DETAIL_LINK", "URL", "의안상세링크"]), assemblyBillId),
    keywords: unique([lawName, ...keywords.filter((keyword) => searchText(billTitle).includes(searchText(keyword)))])
  };
}

function officialAssemblyBillUrl(candidate: string | undefined, assemblyBillId: string | undefined): string | undefined {
  if (candidate && isOfficialUrl(candidate, "assembly.go.kr")) return candidate;
  return assemblyBillId ? `https://likms.assembly.go.kr/bill/billDetail.do?billId=${encodeURIComponent(assemblyBillId)}` : undefined;
}

function effectiveLawPayload(row: Record<string, unknown>, keyword: string): LawPayload | undefined {
  const lawName = pickString(row, ["법령명한글", "법령명_한글", "법령명", "법령명약칭"]);
  if (!lawName) return undefined;
  const lawId = pickString(row, ["법령ID", "법령일련번호", "MST", "ID"]);
  const statusDate = parseDateText(pickString(row, ["공포일자", "시행일자"]));
  return {
    id: idFor("law_effective", lawId ?? lawName),
    source: "law_effective",
    lawName,
    stage: pickString(row, ["제개정구분명", "제개정구분"]) ?? "현행 법령",
    statusDate,
    effectiveDate: parseDateText(pickString(row, ["시행일자"])),
    lawId,
    summary: pickString(row, ["소관부처명", "소관부처"]),
    officialUrl: officialLawUrl(pickString(row, ["법령상세링크"]), lawId ?? lawName),
    keywords: unique([keyword, lawName])
  };
}

function officialLawUrl(candidate: string | undefined, lawIdOrName: string): string {
  return candidate && isOfficialUrl(candidate, "law.go.kr")
    ? candidate
    : `https://www.law.go.kr/법령/${encodeURIComponent(lawIdOrName)}`;
}

function isOfficialUrl(value: string, host: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function lawNameFromBillTitle(title: string): string {
  return title
    .replace(/\s*(일부|전부)?개정법률안.*$/u, "")
    .replace(/\s*법률안.*$/u, "")
    .trim() || title;
}

async function fetchJson(url: URL): Promise<unknown> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "MusunilPublicSourceWorker/0.1" },
        signal: controller.signal
      });
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
          await delay(attempt * 1_000);
          continue;
        }
        throw new Error(`law_source_fetch_failed:${response.status}`);
      }
      return response.json();
    } catch (error) {
      if (attempt === maxAttempts || (error instanceof Error && error.message.startsWith("law_source_fetch_failed:"))) throw error;
      await delay(attempt * 1_000);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("law_source_fetch_failed:retry_exhausted");
}

const delay = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

function extractObjectRows(value: unknown): Array<Record<string, unknown>> {
  const arrays: Array<Array<Record<string, unknown>>> = [];
  const singletonRows: Array<Record<string, unknown>> = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      const rows = node.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
      if (rows.length > 0) arrays.push(rows);
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (hasLawRowKey(record)) singletonRows.push(record);
    for (const item of Object.values(node)) visit(item);
  };
  visit(value);
  const bestArray = arrays.sort((a, b) => rowArrayScore(b) - rowArrayScore(a))[0];
  return bestArray && rowArrayScore(bestArray) >= rowArrayScore(singletonRows) ? bestArray : singletonRows;
}

function rowArrayScore(rows: Array<Record<string, unknown>>): number {
  const rowKeyHits = rows.reduce((score, row) => score + (hasLawRowKey(row) ? 10_000 : 0), 0);
  return rowKeyHits + rows.length;
}

function hasLawRowKey(row: Record<string, unknown>): boolean {
  return ["BILL_NAME", "BILL_NM", "의안명", "법률안명", "법령명한글", "법령명_한글", "법령명"].some((key) => key in row);
}

function readTotalCount(value: unknown): number {
  const values: number[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, item] of Object.entries(node)) {
      if (/^(list_)?total(_count|cnt)$/i.test(key) && (typeof item === "number" || typeof item === "string")) {
        const parsed = Number(item);
        if (Number.isFinite(parsed) && parsed > 0) values.push(parsed);
      }
      visit(item);
    }
  };
  visit(value);
  return Math.max(0, ...values);
}

function pickString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function parseDateText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return undefined;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T00:00:00.000+09:00`;
}

function idFor(source: LawPayload["source"], value: string): string {
  return `law_${createHash("sha1").update(`${source}:${value}`).digest("hex").slice(0, 16)}`;
}

function searchText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].slice(0, 12);
}

function dedupeLawPayloads(payloads: LawPayload[]): LawPayload[] {
  const byId = new Map<string, LawPayload>();
  for (const payload of payloads) byId.set(payload.id ?? idFor(payload.source, payload.lawId ?? payload.assemblyBillId ?? payload.lawName), payload);
  return [...byId.values()];
}

function readConfigString(config: Record<string, unknown>, path: string): string | undefined {
  const value = readConfigValue(config, path);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readConfigCredentialString(config: Record<string, unknown>, path: string): string | undefined {
  return readCredentialString(readConfigString(config, path));
}

function readCredentialString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || isPlaceholderCredential(trimmed)) return undefined;
  return trimmed;
}

function isPlaceholderCredential(value: string): boolean {
  return [
    /^CHANGE_ME/i,
    /(^|[/:@._-])example(\.|$|[/:@._-])/i,
    /(^|[/:@._-])sample($|[/:@._-])/i,
    /placeholder/i,
    /launch-check-only/i
  ].some((pattern) => pattern.test(value));
}

function readConfigStringArray(config: Record<string, unknown>, path: string, fallback: string[]): string[] {
  const value = readConfigValue(config, path);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : fallback;
}

function readConfigValue(config: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, config);
}
