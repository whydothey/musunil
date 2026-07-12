import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const apply = args.includes("--apply");
const json = args.includes("--json");
const explicitScope = args.some((arg) => ["--web-headers", "--api-domain", "--deploy-web", "--deploy-api", "--all"].includes(arg));
const webHeadersRequested = args.includes("--web-headers") || args.includes("--all") || !explicitScope;
const apiDomainRequested = args.includes("--api-domain") || args.includes("--all") || !explicitScope;
const deployWebRequested = args.includes("--deploy-web") || args.includes("--deploy-all");
const deployApiRequested = args.includes("--deploy-api") || args.includes("--deploy-all");
const verifyDomains = args.includes("--verify-domains");
const clearCache = !args.includes("--no-clear-cache");

const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const webBlock = renderServiceBlock(renderYaml, "musunil-web");
const apiBlock = renderServiceBlock(renderYaml, "musunil-api");
const token = process.env.RENDER_API_TOKEN || process.env.MUSUNIL_RENDER_API_TOKEN || "";
const serviceInputs = {
  web: serviceInput("WEB", "musunil-web"),
  api: serviceInput("API", "musunil-api")
};
const webHeaders = readHeaders(webBlock);
const apiCustomDomain = "api.musunil.com";

const plan = {
  checked: "render_apply_plan",
  mode: apply ? "apply" : "dry_run",
  docs: [
    "https://render.com/docs/api",
    "https://api-docs.render.com/reference/list-services",
    "https://api-docs.render.com/reference/list-headers",
    "https://api-docs.render.com/reference/create-custom-domain",
    "https://api-docs.render.com/reference/create-deploy"
  ],
  tokenConfigured: Boolean(token),
  requested: {
    webHeaders: webHeadersRequested,
    apiDomain: apiDomainRequested,
    deployWeb: deployWebRequested,
    deployApi: deployApiRequested,
    verifyDomains
  },
  services: serviceInputs,
  webHeaders,
  apiCustomDomain,
  requiredEnv: requiredEnv(),
  safety: [
    "dry_run is default; pass --apply before any Render write",
    "Render service IDs can be supplied by MUSUNIL_RENDER_WEB_SERVICE_ID and MUSUNIL_RENDER_API_SERVICE_ID",
    "Without service IDs, the script resolves exact service names through the Render API",
    "The script does not replace service environment variables or upload secret files"
  ]
};

class RenderApiError extends Error {
  constructor(status, errors) {
    super(`Render API failed with ${status}: ${errors}`);
    this.status = status;
  }
}

let inspected = {};
if (token) {
  inspected = await inspectRenderState();
}

if (!apply) {
  printResult({ ...plan, inspected, ok: true, applied: false, actions: [] });
  process.exit(0);
}

const validationFailures = validateApplyInputs();
if (validationFailures.length > 0) {
  printResult({ ...plan, inspected, ok: false, applied: false, failures: validationFailures });
  process.exit(1);
}

const actions = [];
const services = {
  web: webHeadersRequested || deployWebRequested ? await resolveService("web") : null,
  api: apiDomainRequested || deployApiRequested || verifyDomains ? await resolveService("api") : null
};

if (webHeadersRequested) {
  actions.push(await upsertWebHeaders(services.web.id, webHeaders));
}
if (apiDomainRequested) {
  actions.push(await ensureCustomDomain(services.api.id, apiCustomDomain));
}
if (verifyDomains) {
  actions.push(await verifyCustomDomain(services.api.id, apiCustomDomain));
}
if (deployWebRequested) {
  actions.push(await triggerDeploy(services.web.id, "web", { clearCache }));
}
if (deployApiRequested) {
  actions.push(await triggerDeploy(services.api.id, "api", { clearCache }));
}

printResult({
  ...plan,
  inspected,
  ok: actions.every((item) => item.ok),
  applied: true,
  actions
});
if (!actions.every((item) => item.ok)) process.exit(1);

async function inspectRenderState() {
  const result = {};
  for (const kind of ["web", "api"]) {
    try {
      const service = await resolveService(kind);
      result[kind] = serviceSummary(service);
      if (kind === "web" && webHeadersRequested) {
        result.web.headers = summarizeHeaders(await listHeaders(service.id));
      }
      if (kind === "api" && apiDomainRequested) {
        result.api.customDomains = summarizeCustomDomains(await listCustomDomains(service.id, apiCustomDomain));
      }
    } catch (error) {
      result[kind] = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  return result;
}

function requiredEnv() {
  const items = [];
  if (!token) items.push("RENDER_API_TOKEN");
  if ((webHeadersRequested || deployWebRequested) && !serviceInputs.web.id) {
    items.push("MUSUNIL_RENDER_WEB_SERVICE_ID or exact Render service name musunil-web");
  }
  if ((apiDomainRequested || deployApiRequested || verifyDomains) && !serviceInputs.api.id) {
    items.push("MUSUNIL_RENDER_API_SERVICE_ID or exact Render service name musunil-api");
  }
  return items;
}

function validateApplyInputs() {
  const failures = [];
  if (!token) failures.push("RENDER_API_TOKEN is required for --apply");
  if (!webHeaders.length) failures.push("musunil-web headers are missing from render.yaml");
  return failures;
}

async function resolveService(kind) {
  const input = serviceInputs[kind];
  if (input.id) return await getService(input.id);
  const query = new URLSearchParams({
    name: input.name,
    includePreviews: "false",
    limit: "100"
  });
  const body = await renderRequest("GET", `/services?${query}`);
  const services = (Array.isArray(body) ? body : [])
    .map((item) => item.service || item)
    .filter((service) => service?.name === input.name);
  if (services.length !== 1) {
    throw new Error(`Render service lookup for ${input.name} returned ${services.length}; set ${input.idEnv}`);
  }
  return services[0];
}

async function getService(id) {
  const body = await renderRequest("GET", `/services/${encodeURIComponent(id)}`);
  return body.service || body;
}

async function upsertWebHeaders(serviceId, requiredHeaders) {
  const existing = await listHeaders(serviceId);
  const merged = mergeHeaders(existing, requiredHeaders);
  if (sameHeaders(existing, merged)) {
    return {
      id: "web_headers",
      kind: "headers",
      ok: true,
      action: "unchanged",
      headerCount: merged.length
    };
  }
  const body = await renderRequest("PUT", `/services/${encodeURIComponent(serviceId)}/headers`, merged);
  return {
    id: "web_headers",
    kind: "headers",
    ok: true,
    action: "updated",
    headerCount: Array.isArray(body) ? body.length : merged.length
  };
}

async function ensureCustomDomain(serviceId, name) {
  const existing = await listCustomDomains(serviceId, name);
  const current = existing.find((item) => item.name === name);
  if (current) {
    return {
      id: "api_custom_domain",
      kind: "custom_domain",
      ok: true,
      action: "unchanged",
      name,
      verificationStatus: current.verificationStatus || "unknown"
    };
  }
  try {
    const body = await renderRequest("POST", `/services/${encodeURIComponent(serviceId)}/custom-domains`, { name });
    const created = Array.isArray(body) ? body.map((item) => item.customDomain || item).find((item) => item.name === name) : body;
    return {
      id: "api_custom_domain",
      kind: "custom_domain",
      ok: true,
      action: "created",
      name,
      verificationStatus: created?.verificationStatus || "unknown"
    };
  } catch (error) {
    if (error instanceof RenderApiError && error.status === 409) {
      const afterConflict = await listCustomDomains(serviceId, name);
      const domain = afterConflict.find((item) => item.name === name);
      if (domain) {
        return {
          id: "api_custom_domain",
          kind: "custom_domain",
          ok: true,
          action: "unchanged_after_conflict",
          name,
          verificationStatus: domain.verificationStatus || "unknown"
        };
      }
    }
    throw error;
  }
}

async function verifyCustomDomain(serviceId, name) {
  const body = await renderRequest("POST", `/services/${encodeURIComponent(serviceId)}/custom-domains/${encodeURIComponent(name)}/verify`);
  return {
    id: "api_custom_domain_verify",
    kind: "custom_domain",
    ok: true,
    action: "verification_requested",
    name,
    status: body?.status || "queued"
  };
}

async function triggerDeploy(serviceId, kind, options) {
  const body = await renderRequest("POST", `/services/${encodeURIComponent(serviceId)}/deploys`, {
    clearCache: options.clearCache ? "clear" : "do_not_clear"
  });
  return {
    id: `${kind}_deploy`,
    kind: "deploy",
    ok: true,
    action: options.clearCache ? "triggered_clear_cache" : "triggered",
    deployId: body?.id || null,
    status: body?.status || "queued"
  };
}

async function listHeaders(serviceId) {
  const body = await renderRequest("GET", `/services/${encodeURIComponent(serviceId)}/headers?limit=100`);
  return (Array.isArray(body) ? body : []).map((item) => item.header || item).filter(Boolean);
}

async function listCustomDomains(serviceId, name) {
  const query = new URLSearchParams();
  if (name) query.append("name", name);
  query.set("limit", "100");
  const body = await renderRequest("GET", `/services/${encodeURIComponent(serviceId)}/custom-domains?${query}`);
  return (Array.isArray(body) ? body : []).map((item) => item.customDomain || item).filter(Boolean);
}

async function renderRequest(method, path, body) {
  const response = await fetch(`https://api.render.com/v1${path}`, {
    method,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new RenderApiError(response.status, sanitizeRenderErrors(payload));
  }
  return payload;
}

function mergeHeaders(existingHeaders, requiredHeaders) {
  const merged = existingHeaders.map((header) => ({
    path: header.path,
    name: header.name,
    value: header.value
  }));
  for (const header of requiredHeaders) {
    const index = merged.findIndex((item) => headerKey(item) === headerKey(header));
    if (index >= 0) merged[index] = { ...merged[index], value: header.value };
    else merged.push({ path: header.path, name: header.name, value: header.value });
  }
  return merged;
}

function sameHeaders(left, right) {
  return JSON.stringify(normalizeHeaders(left)) === JSON.stringify(normalizeHeaders(right));
}

function normalizeHeaders(headers) {
  return headers
    .map((header) => ({ path: header.path, name: header.name, value: header.value }))
    .sort((a, b) => headerKey(a).localeCompare(headerKey(b)));
}

function headerKey(header) {
  return `${header.path}\0${String(header.name).toLowerCase()}`;
}

function summarizeHeaders(headers) {
  const expected = new Set(webHeaders.map(headerKey));
  return {
    count: headers.length,
    requiredPresent: webHeaders.every((header) => headers.some((item) => headerKey(item) === headerKey(header) && item.value === header.value)),
    currentRequired: headers
      .filter((header) => expected.has(headerKey(header)))
      .map((header) => ({ path: header.path, name: header.name, value: header.value }))
  };
}

function summarizeCustomDomains(domains) {
  return domains.map((domain) => ({
    name: domain.name,
    domainType: domain.domainType,
    verificationStatus: domain.verificationStatus,
    createdAt: domain.createdAt
  }));
}

function serviceSummary(service) {
  const url = service?.serviceDetails?.url || "";
  return {
    ok: true,
    id: service.id,
    name: service.name,
    type: service.type,
    branch: service.branch || "",
    dashboardUrl: service.dashboardUrl || "",
    serviceUrl: url,
    serviceUrlHost: urlHost(url)
  };
}

function serviceInput(kind, defaultName) {
  const idEnv = `MUSUNIL_RENDER_${kind}_SERVICE_ID`;
  const nameEnv = `MUSUNIL_RENDER_${kind}_SERVICE_NAME`;
  return {
    idEnv,
    nameEnv,
    id: process.env[idEnv] || "",
    name: process.env[nameEnv] || defaultName
  };
}

function readHeaders(block) {
  const lines = block.split("\n");
  const headerIndex = lines.findIndex((line) => /^\s*headers:\s*$/.test(line));
  if (headerIndex < 0) return [];
  const headerIndent = lines[headerIndex].match(/^(\s*)/)?.[1].length || 0;
  const sectionLines = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && (line.match(/^(\s*)/)?.[1].length || 0) <= headerIndent) break;
    sectionLines.push(line);
  }
  const rules = [];
  let current;
  for (const line of sectionLines) {
    const path = line.match(/^\s*-\s+path:\s*(.+)$/);
    if (path) {
      current = { path: stripQuotes(path[1].trim()), name: "", value: "" };
      rules.push(current);
      continue;
    }
    const name = line.match(/^\s+name:\s*(.+)$/);
    if (name && current) {
      current.name = stripQuotes(name[1].trim());
      continue;
    }
    const value = line.match(/^\s+value:\s*(.+)$/);
    if (value && current) current.value = stripQuotes(value[1].trim());
  }
  return rules.filter((rule) => rule.path && rule.name && rule.value);
}

function renderServiceBlock(source, name) {
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const start = lines[index].match(/^(\s*)-\s+type:\s+/);
    if (!start) continue;
    const indent = start[1].length;
    const preview = lines.slice(index, index + 8).join("\n");
    if (!new RegExp(`^\\s+name:\\s+${escapeRegExp(name)}\\b`, "m").test(preview)) continue;
    let end = index + 1;
    const nextService = new RegExp(`^\\s{${indent}}-\\s+type:\\s+`);
    while (end < lines.length && !nextService.test(lines[end]) && !/^databases:/.test(lines[end])) end += 1;
    return lines.slice(index, end).join("\n");
  }
  throw new Error(`render.yaml service block not found: ${name}`);
}

function sanitizeRenderErrors(payload) {
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    return payload.errors.map((item) => [item.code, item.message].filter(Boolean).join(": ")).join("; ");
  }
  if (payload?.message) return payload.message;
  return "unknown error";
}

function urlHost(value) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function printResult(value) {
  const output = json ? JSON.stringify(value, null, 2) : JSON.stringify(value, null, 2);
  console.log(output);
}
