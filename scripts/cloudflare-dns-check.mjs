import { lookup, resolveCname } from "node:dns/promises";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const strict = args.includes("--strict");
const webBaseUrl = deployedHttpsUrl(process.env.MUSUNIL_WEB_BASE_URL ?? "https://musunil.com");
const apiBaseUrl = deployedHttpsUrl(process.env.MUSUNIL_API_BASE_URL ?? "https://api.musunil.com");
const expectedApiBaseUrl = deployedHttpsUrl(process.env.MUSUNIL_EXPECTED_API_BASE_URL ?? apiBaseUrl);
const renderApiTargetInput = readRenderTargetInput("MUSUNIL_RENDER_API_DNS_TARGET");
const renderWebTargetInput = readRenderTargetInput("MUSUNIL_RENDER_WEB_DNS_TARGET");
const expectedRenderApiTarget = renderApiTargetInput.value;
const expectedRenderWebTarget = renderWebTargetInput.value;
const checks = [];

await check("web_dns", async () => dnsSummary(new URL(webBaseUrl).hostname));
await check("api_dns", async () => dnsSummary(new URL(apiBaseUrl).hostname));
await check("render_target_inputs", async () => {
  const placeholderInputs = [renderApiTargetInput, renderWebTargetInput].filter((input) => input.placeholder);
  const invalidInputs = [renderApiTargetInput, renderWebTargetInput].filter((input) => input.invalidReason);
  if (placeholderInputs.length > 0) {
    throw new Error(
      `Render DNS target placeholder is not valid input: ${placeholderInputs.map((input) => input.env).join(", ")}`
    );
  }
  if (invalidInputs.length > 0) {
    throw new Error(
      `Render DNS target must be a hostname only, copied without URL scheme, path, port, or dashboard label: ${
        invalidInputs.map((input) => `${input.env} (${input.invalidReason})`).join(", ")
      }`
    );
  }
  if (strict && !expectedRenderApiTarget) {
    throw new Error(
      "strict DNS check requires MUSUNIL_RENDER_API_DNS_TARGET copied from Render musunil-api Custom Domains"
    );
  }
  return {
    apiTargetConfigured: Boolean(expectedRenderApiTarget),
    webTargetConfigured: Boolean(expectedRenderWebTarget),
    apiTargetRawProvided: renderApiTargetInput.rawConfigured,
    webTargetRawProvided: renderWebTargetInput.rawConfigured,
    note: "Apex web CNAME target may be flattened by Cloudflare, so exact DNS target comparison is enforced for api.musunil.com."
  };
});
if (checkOk("api_dns") && expectedRenderApiTarget) {
  await check("api_render_target", async () => cnameTargetSummary(new URL(apiBaseUrl).hostname, expectedRenderApiTarget));
} else if (checkOk("api_dns")) {
  await check("api_render_target", async () => ({
    compared: false,
    message: "Set MUSUNIL_RENDER_API_DNS_TARGET for exact API CNAME target comparison."
  }));
} else {
  skip("api_render_target", "skipped: API DNS failed or Render API target not configured");
}
await check("web_https", async () => {
  const response = await fetchWithTimeout(`${webBaseUrl}/`);
  if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
  return {
    status: response.status,
    cacheControl: response.headers.get("cache-control") || "",
    cfCacheStatus: response.headers.get("cf-cache-status") || "",
    server: response.headers.get("server") || ""
  };
});
await check("web_config", async () => {
  const response = await fetchWithTimeout(`${webBaseUrl}/config.js`);
  if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
  const source = await response.text();
  const config = parseWebConfig(source);
  const apiBase = deployedHttpsUrl(config.apiBaseUrl);
  if (apiBase !== expectedApiBaseUrl) throw new Error(`apiBaseUrl ${apiBase || "(invalid)"} != ${expectedApiBaseUrl}`);
  const publicKeys = Object.keys(config).sort();
  if (JSON.stringify(publicKeys) !== JSON.stringify(["apiBaseUrl", "mapStyleUrl"])) {
    throw new Error(`unexpected public config keys: ${publicKeys.join(", ") || "(none)"}`);
  }
  return {
    apiBaseUrl: apiBase,
    cacheControl: response.headers.get("cache-control") || "",
    cfCacheStatus: response.headers.get("cf-cache-status") || "",
    publicKeys
  };
});
await check("web_header_smoke", async () => {
  const failures = [];
  for (const path of ["/", "/config.js", "/build-info.json"]) {
    const response = await fetchWithTimeout(`${webBaseUrl}${path}`);
    const cacheControl = response.headers.get("cache-control") || "";
    const csp = response.headers.get("content-security-policy") || "";
    const permissions = response.headers.get("permissions-policy") || "";
    const referrer = response.headers.get("referrer-policy") || "";
    const nosniff = response.headers.get("x-content-type-options") || "";
    const frame = response.headers.get("x-frame-options") || "";
    if (!cacheControl.toLowerCase().includes("no-store")) failures.push(`${path} Cache-Control=${cacheControl || "missing"}`);
    if (!csp.includes("default-src 'self'")) failures.push(`${path} CSP missing`);
    if (!permissions.includes("camera=(self)") || !permissions.includes("geolocation=(self)")) failures.push(`${path} Permissions-Policy=${permissions || "missing"}`);
    if (referrer.toLowerCase() !== "no-referrer") failures.push(`${path} Referrer-Policy=${referrer || "missing"}`);
    if (nosniff.toLowerCase() !== "nosniff") failures.push(`${path} X-Content-Type-Options=${nosniff || "missing"}`);
    if (frame.toUpperCase() !== "DENY") failures.push(`${path} X-Frame-Options=${frame || "missing"}`);
  }
  if (failures.length > 0) throw new Error(failures.join("; "));
  return { paths: ["/", "/config.js", "/build-info.json"] };
});
if (checkOk("api_dns")) {
  await check("api_health", async () => {
    const response = await fetchWithTimeout(`${apiBaseUrl}/health`);
    if (response.status !== 200) throw new Error(`expected 200, got ${response.status}`);
    const body = await response.json();
    if (body.ok !== true) throw new Error(`health ok is not true: ${JSON.stringify(body)}`);
    return { status: response.status, ok: body.ok };
  });
  await check("api_ready", async () => {
    const response = await fetchWithTimeout(`${apiBaseUrl}/ready`);
    const body = await response.json().catch(() => ({}));
    if (response.status !== 200 || body.ready !== true) {
      throw new Error(`ready failed: status=${response.status}, ready=${body.ready}; ${formatReadinessFailure(body)}`);
    }
    return { status: response.status, ready: body.ready };
  });
} else {
  skip("api_health", "skipped: API DNS failed");
  skip("api_ready", "skipped: API DNS failed");
}

const result = {
  checked: "cloudflare_dns_and_edge_preflight",
  strict,
  webBaseUrl,
  apiBaseUrl,
  expectedRenderTargets: {
    webConfigured: Boolean(expectedRenderWebTarget),
    apiConfigured: Boolean(expectedRenderApiTarget),
    webRawProvided: renderWebTargetInput.rawConfigured,
    apiRawProvided: renderApiTargetInput.rawConfigured
  },
  ok: checks.every((item) => item.ok),
  checks,
  requiredActions: requiredActions(checks)
};

console.log(JSON.stringify(result, null, 2));
if (strict && !result.ok) process.exit(1);

async function check(id, run) {
  try {
    const detail = await run();
    checks.push({ id, ok: true, detail });
  } catch (error) {
    checks.push({ id, ok: false, message: error instanceof Error ? error.message : String(error) });
  }
}

function skip(id, message) {
  checks.push({ id, ok: false, skipped: true, message });
}

function checkOk(id) {
  return checks.find((item) => item.id === id)?.ok === true;
}

async function dnsSummary(hostname) {
  const addresses = await lookup(hostname, { all: true });
  return {
    hostname,
    addressFamilies: [...new Set(addresses.map((item) => `IPv${item.family}`))],
    addresses: addresses.map((item) => item.address).slice(0, 4)
  };
}

async function cnameTargetSummary(hostname, expectedTarget) {
  const cnames = await resolveCname(hostname);
  const normalized = cnames.map(normalizeDnsTarget).filter(Boolean);
  if (!normalized.includes(expectedTarget)) {
    throw new Error(`expected ${hostname} CNAME ${expectedTarget}, got ${normalized.join(", ") || "(none)"}`);
  }
  return { hostname, target: expectedTarget, cnames: normalized };
}

async function fetchWithTimeout(url) {
  return fetch(url, {
    redirect: "manual",
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache"
    },
    signal: AbortSignal.timeout(12_000)
  });
}

function parseWebConfig(source) {
  const match = source.match(/window\.MUSUNIL_WEB_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*$/);
  if (!match) throw new Error("config.js missing MUSUNIL_WEB_CONFIG");
  return JSON.parse(match[1]);
}

function deployedHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("deployed HTTPS URL is required");
  const parsed = new URL(value.trim());
  if (parsed.protocol !== "https:") throw new Error(`deployed URL must use HTTPS: ${value}`);
  return parsed.toString().replace(/\/$/, "");
}

function requiredActions(items) {
  const failedIds = new Set(items.filter((item) => !item.ok && !item.skipped).map((item) => item.id));
  const skippedIds = new Set(items.filter((item) => item.skipped).map((item) => item.id));
  const apiDnsOk = items.find((item) => item.id === "api_dns")?.ok === true;
  const actions = [];
  if (failedIds.has("render_target_inputs")) {
    actions.push({
      id: "set_render_dns_target_inputs",
      action: "Render musunil-api Custom Domains 화면의 실제 DNS target을 로컬 셸에 MUSUNIL_RENDER_API_DNS_TARGET으로 넣고 pnpm cloudflare:dns를 다시 실행한다. 문서의 괄호 예시나 placeholder 문구를 그대로 넣으면 실패한다. Web target은 MUSUNIL_RENDER_WEB_DNS_TARGET으로 같이 넣으면 로컬 copy가 더 명확해진다.",
      verify: ': "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}" && : "${MUSUNIL_RENDER_WEB_DNS_TARGET:?set exact Render Web target from Render first}" && pnpm cloudflare:dns && pnpm cloudflare:check:strict'
    });
  }
  if (failedIds.has("api_render_target") || (apiDnsOk && skippedIds.has("api_render_target"))) {
    actions.push({
      id: "verify_api_render_target",
      action: "Cloudflare api CNAME이 Render musunil-api Custom Domain target과 정확히 일치하는지 확인한다. API smoke 전에는 api 레코드를 DNS only로 둔다.",
      verify: ': "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}" && pnpm cloudflare:check:strict'
    });
  }
  if (failedIds.has("api_dns")) {
    actions.push({
      id: "connect_api_dns",
      action: "pnpm render:api-settings와 pnpm cloudflare:dns 출력대로 Render musunil-api Custom Domains에 api.musunil.com을 추가하고, Render target을 MUSUNIL_RENDER_API_DNS_TARGET에 넣은 뒤 Cloudflare api CNAME에 DNS only로 연결한다.",
      verify: 'pnpm render:api-settings && : "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}" && pnpm cloudflare:dns && pnpm cloudflare:check:strict'
    });
  }
  if (failedIds.has("web_dns") || failedIds.has("web_https")) {
    actions.push({
      id: "connect_web_dns",
      action: "musunil.com/www가 Render musunil-web custom-domain target을 가리키는지 확인한다.",
      verify: "pnpm cloudflare:check"
    });
  }
  if (failedIds.has("web_config")) {
    actions.push({
      id: "fix_web_config",
      action: "Render Web build command가 MUSUNIL_WEB_API_BASE_URL=https://api.musunil.com으로 config.js를 생성하는지 확인하고 Clear build cache & deploy를 실행한다.",
      verify: "pnpm render:web-settings && pnpm cloudflare:check"
    });
  }
  if (failedIds.has("web_header_smoke")) {
    actions.push({
      id: "apply_static_headers",
      action: "Render musunil-web Settings > Headers에 Cache-Control, CSP, Permissions-Policy, Referrer-Policy, nosniff, X-Frame-Options를 적용한다. Render Static headers가 live 응답에 계속 반영되지 않거나 Cloudflare proxy를 쓰는 경우 pnpm cloudflare:headers 출력의 Web 전용 Response Header Transform Rule을 적용하고 캐시 우회를 확인한다.",
      verify: "pnpm render:web-settings && pnpm cloudflare:headers && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy"
    });
  }
  if (failedIds.has("api_health") || failedIds.has("api_ready")) {
    actions.push({
      id: "fix_api_runtime",
      action: "Render musunil-api /ready 응답의 summary.blockingGroups와 requiredActions를 먼저 확인한다. DB/Redis, Secret File, PortOne, storage, public source key, migration 중 실패한 운영 묶음을 채운 뒤 재배포한다.",
      verify: "pnpm render:api-settings && pnpm cloudflare:check && pnpm launch:post-deploy-smoke -- --require-laws"
    });
  }
  return actions;
}

function formatReadinessFailure(body) {
  const failedIds = Array.isArray(body?.summary?.failedIds) ? body.summary.failedIds : [];
  const blockingGroups = Array.isArray(body?.summary?.blockingGroups) ? body.summary.blockingGroups : [];
  const requiredActions = Array.isArray(body?.requiredActions)
    ? body.requiredActions.map((item) => [item?.id, item?.action].filter(Boolean).join(": "))
    : [];
  return [
    `blockingGroups=${blockingGroups.join(",") || "unknown"}`,
    `failedIds=${failedIds.join(",") || "unknown"}`,
    `requiredActions=${requiredActions.join(" | ") || "none"}`
  ].join("; ");
}

function normalizeDnsTarget(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function readRenderTargetInput(env) {
  const raw = typeof process.env[env] === "string" ? process.env[env].trim() : "";
  const placeholder = Boolean(raw && isPlaceholderRenderTarget(raw));
  const invalidReason = placeholder ? "" : invalidRenderTargetReason(raw);
  return {
    env,
    rawConfigured: Boolean(raw),
    placeholder,
    invalidReason,
    value: placeholder || invalidReason ? "" : normalizeDnsTarget(raw)
  };
}

function isPlaceholderRenderTarget(value) {
  const text = String(value).trim().toLowerCase();
  return (
    /^<[^>]+>$/.test(text) ||
    text.includes("custom-domain target") ||
    text.includes("render api target") ||
    text.includes("render web target") ||
    text.includes("copy from render") ||
    text.includes("srv-actual-")
  );
}

function invalidRenderTargetReason(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return "URL scheme present";
  if (/[/?#]/.test(text)) return "path or query present";
  if (/\s/.test(text)) return "space or dashboard label present";
  if (/:/.test(text)) return "port or label separator present";
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\.?$/i.test(text)) {
    return "not a DNS hostname";
  }
  return "";
}
