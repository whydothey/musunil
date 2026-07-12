import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const apply = args.includes("--apply");
const json = args.includes("--json");
const dnsRequested = args.includes("--dns") || args.includes("--all") || (!args.includes("--dns") && !args.includes("--headers"));
const headersRequested = args.includes("--headers") || args.includes("--all") || (!args.includes("--dns") && !args.includes("--headers"));
const zoneName = process.env.CLOUDFLARE_ZONE_NAME || "musunil.com";
const apiToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "";
const zoneIdInput = process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID || "";
const webTarget = renderTargetInput("MUSUNIL_RENDER_WEB_DNS_TARGET");
const apiTarget = renderTargetInput("MUSUNIL_RENDER_API_DNS_TARGET");
const webProxied = /^(1|true|yes)$/i.test(process.env.MUSUNIL_CLOUDFLARE_WEB_PROXIED || "");
const dnsRecords = buildDnsRecords();
const responseHeaderRule = buildResponseHeaderRule();

const plan = {
  checked: "cloudflare_apply_plan",
  mode: apply ? "apply" : "dry_run",
  docs: [
    "https://developers.cloudflare.com/dns/manage-dns-records/",
    "https://developers.cloudflare.com/rules/transform/response-header-modification/create-api/"
  ],
  zoneName,
  zoneIdConfigured: Boolean(zoneIdInput),
  tokenConfigured: Boolean(apiToken),
  requested: {
    dns: dnsRequested,
    headers: headersRequested
  },
  targetInputs: {
    web: targetInputSummary(webTarget),
    api: targetInputSummary(apiTarget)
  },
  dnsRecords,
  responseHeaderRule,
  requiredEnv: requiredEnv(),
  safety: [
    "dry_run is default; pass --apply before any Cloudflare write",
    "api.musunil.com remains DNS only",
    "Web proxied mode is opt-in via MUSUNIL_CLOUDFLARE_WEB_PROXIED=1",
    "Render DNS targets must be hostname-only values"
  ]
};

class CloudflareApiError extends Error {
  constructor(status, errors) {
    super(`Cloudflare API failed with ${status}: ${errors}`);
    this.status = status;
  }
}

if (!apply) {
  printResult({ ...plan, ok: true, applied: false, actions: [] });
  process.exit(0);
}

const validationFailures = validateApplyInputs();
if (validationFailures.length > 0) {
  printResult({ ...plan, ok: false, applied: false, failures: validationFailures });
  process.exit(1);
}

const zoneId = await resolveZoneId();
const actions = [];
if (dnsRequested) {
  for (const record of dnsRecords) {
    actions.push(await upsertDnsRecord(zoneId, record));
  }
}
if (headersRequested) {
  actions.push(await upsertResponseHeaderRule(zoneId, responseHeaderRule));
}

printResult({
  ...plan,
  ok: actions.every((item) => item.ok),
  applied: true,
  zoneId,
  actions
});
if (!actions.every((item) => item.ok)) process.exit(1);

function buildDnsRecords() {
  const records = [];
  if (webTarget.value) {
    records.push({
      id: "web_apex",
      type: "CNAME",
      name: "musunil.com",
      content: webTarget.value,
      ttl: 1,
      proxied: webProxied
    });
    records.push({
      id: "web_www",
      type: "CNAME",
      name: "www.musunil.com",
      content: "musunil.com",
      ttl: 1,
      proxied: webProxied
    });
  }
  if (apiTarget.value) {
    records.push({
      id: "api",
      type: "CNAME",
      name: "api.musunil.com",
      content: apiTarget.value,
      ttl: 1,
      proxied: false
    });
  }
  return records;
}

function buildResponseHeaderRule() {
  return {
    ref: "musunil_web_security_headers",
    description: "Set Web security headers for musunil.com and www.musunil.com",
    expression: '(http.host eq "musunil.com" or http.host eq "www.musunil.com")',
    action: "rewrite",
    action_parameters: {
      headers: Object.fromEntries(
        readRenderHeaders().map((header) => [
          header.name,
          {
            operation: "set",
            value: header.value
          }
        ])
      )
    }
  };
}

function requiredEnv() {
  const items = [];
  if (!apiToken) items.push("CLOUDFLARE_API_TOKEN");
  if (!zoneIdInput) items.push("CLOUDFLARE_ZONE_ID or CLOUDFLARE_ZONE_NAME=musunil.com with zone read permission");
  if (dnsRequested && !apiTarget.value) items.push("MUSUNIL_RENDER_API_DNS_TARGET");
  if (dnsRequested && webTarget.rawConfigured && !webTarget.value) items.push("valid MUSUNIL_RENDER_WEB_DNS_TARGET hostname");
  if (dnsRequested && apiTarget.rawConfigured && !apiTarget.value) items.push("valid MUSUNIL_RENDER_API_DNS_TARGET hostname");
  return items;
}

function validateApplyInputs() {
  const failures = [];
  if (!apiToken) failures.push("CLOUDFLARE_API_TOKEN is required for --apply");
  if (!zoneIdInput && !zoneName) failures.push("CLOUDFLARE_ZONE_ID or CLOUDFLARE_ZONE_NAME is required for --apply");
  for (const input of [webTarget, apiTarget]) {
    if (input.placeholder) failures.push(`${input.env} is a placeholder, not a Render DNS target`);
    if (input.invalidReason) failures.push(`${input.env} must be a hostname only: ${input.invalidReason}`);
  }
  if (dnsRequested && !apiTarget.rawConfigured) failures.push("MUSUNIL_RENDER_API_DNS_TARGET is required for DNS apply");
  if (dnsRequested && dnsRecords.length === 0 && !apiTarget.rawConfigured && !webTarget.rawConfigured) {
    failures.push("No DNS records can be applied without hostname-only Render targets");
  }
  return failures;
}

async function resolveZoneId() {
  if (zoneIdInput) return zoneIdInput;
  const query = new URLSearchParams({ name: zoneName, status: "active", per_page: "1" });
  const body = await cloudflareRequest("GET", `/zones?${query}`);
  const zone = body.result?.[0];
  if (!zone?.id) throw new Error(`Cloudflare zone not found: ${zoneName}`);
  return zone.id;
}

async function upsertDnsRecord(zoneId, record) {
  const query = new URLSearchParams({ name: record.name });
  const existingBody = await cloudflareRequest("GET", `/zones/${zoneId}/dns_records?${query}`);
  const existing = existingBody.result || [];
  const conflicts = existing.filter((item) => item.type !== record.type);
  if (conflicts.length > 0) {
    return {
      id: record.id,
      kind: "dns",
      ok: false,
      action: "blocked_by_conflicting_record",
      conflicts: conflicts.map((item) => ({ id: item.id, type: item.type, name: item.name }))
    };
  }
  const current = existing.find((item) => item.type === record.type);
  const payload = {
    type: record.type,
    name: record.name,
    content: record.content,
    ttl: record.ttl,
    proxied: record.proxied,
    comment: "Managed by Musunil launch automation"
  };
  if (current && sameDnsRecord(current, payload)) {
    return { id: record.id, kind: "dns", ok: true, action: "unchanged", name: record.name };
  }
  if (current) {
    const body = await cloudflareRequest("PUT", `/zones/${zoneId}/dns_records/${current.id}`, payload);
    return { id: record.id, kind: "dns", ok: true, action: "updated", name: body.result?.name || record.name };
  }
  const body = await cloudflareRequest("POST", `/zones/${zoneId}/dns_records`, payload);
  return { id: record.id, kind: "dns", ok: true, action: "created", name: body.result?.name || record.name };
}

async function upsertResponseHeaderRule(zoneId, rule) {
  const entrypoint = await getResponseHeaderEntrypoint(zoneId);
  if (!entrypoint) {
    const body = await cloudflareRequest("POST", `/zones/${zoneId}/rulesets`, {
      name: "Musunil Web response header transforms",
      description: "Musunil public Web security headers",
      kind: "zone",
      phase: "http_response_headers_transform",
      rules: [rule]
    });
    return {
      id: "web_response_headers",
      kind: "ruleset",
      ok: true,
      action: "created",
      rulesetId: body.result?.id || null
    };
  }
  const rules = Array.isArray(entrypoint.rules) ? entrypoint.rules : [];
  const index = rules.findIndex((item) => item.ref === rule.ref || item.description === rule.description);
  const nextRules = index >= 0
    ? [...rules.slice(0, index), { ...rules[index], ...rule }, ...rules.slice(index + 1)]
    : [...rules, rule];
  const unchanged = JSON.stringify(rules) === JSON.stringify(nextRules);
  if (unchanged) {
    return {
      id: "web_response_headers",
      kind: "ruleset",
      ok: true,
      action: "unchanged",
      rulesetId: entrypoint.id
    };
  }
  const body = await cloudflareRequest("PUT", `/zones/${zoneId}/rulesets/${entrypoint.id}`, {
    name: entrypoint.name || "Musunil Web response header transforms",
    description: entrypoint.description || "Musunil public Web security headers",
    kind: entrypoint.kind || "zone",
    phase: entrypoint.phase || "http_response_headers_transform",
    rules: nextRules
  });
  return {
    id: "web_response_headers",
    kind: "ruleset",
    ok: true,
    action: index >= 0 ? "updated" : "added",
    rulesetId: body.result?.id || entrypoint.id
  };
}

async function getResponseHeaderEntrypoint(zoneId) {
  try {
    const body = await cloudflareRequest("GET", `/zones/${zoneId}/rulesets/phases/http_response_headers_transform/entrypoint`);
    return body.result || null;
  } catch (error) {
    if (error instanceof CloudflareApiError && error.status === 404) return null;
    throw error;
  }
}

async function cloudflareRequest(method, path, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      authorization: `Bearer ${apiToken}`,
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new CloudflareApiError(response.status, sanitizeCloudflareErrors(payload.errors));
  }
  return payload;
}

function sanitizeCloudflareErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return "unknown error";
  return errors.map((item) => [item.code, item.message].filter(Boolean).join(": ")).join("; ");
}

function sameDnsRecord(current, next) {
  return current.type === next.type &&
    current.name === next.name &&
    normalizeRenderTarget(current.content) === normalizeRenderTarget(next.content) &&
    Number(current.ttl) === Number(next.ttl) &&
    Boolean(current.proxied) === Boolean(next.proxied);
}

function readRenderHeaders() {
  const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
  const webBlock = renderServiceBlock(renderYaml, "musunil-web");
  return readHeaders(webBlock);
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
  return rules.filter((rule) => rule.path === "/*" && rule.name && rule.value);
}

function targetInputSummary(input) {
  return {
    env: input.env,
    configured: Boolean(input.value),
    rawProvided: input.rawConfigured,
    placeholderRejected: input.placeholder,
    invalidReason: input.invalidReason
  };
}

function renderTargetInput(env) {
  const raw = typeof process.env[env] === "string" ? process.env[env].trim() : "";
  const placeholder = Boolean(raw && isPlaceholderRenderTarget(raw));
  const invalidReason = placeholder ? "" : invalidRenderTargetReason(raw);
  return {
    env,
    rawConfigured: Boolean(raw),
    placeholder,
    invalidReason,
    value: placeholder || invalidReason ? "" : normalizeRenderTarget(raw)
  };
}

function normalizeRenderTarget(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\.$/, "");
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
