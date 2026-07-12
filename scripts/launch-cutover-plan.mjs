import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const template = readFileSync(resolve(cwd, "config/musunil.user-inputs.template.yaml"), "utf8");
const webBlock = renderServiceBlock(renderYaml, "musunil-web");
const apiBlock = renderServiceBlock(renderYaml, "musunil-api");
const args = process.argv.slice(2).filter((arg) => arg !== "--");

const plan = {
  generatedAt: new Date().toISOString(),
  purpose: "musunil.com launch cutover without changing product rules",
  domains: {
    web: "https://musunil.com",
    api: "https://api.musunil.com"
  },
  currentBlockersToClear: [
    {
      id: "deploy_latest_static",
      owner: "operator",
      action: "Confirm Render musunil-web is deploying the current main commit with pnpm build:web-static:render. If the live static manifest does not match the local manifest, run Clear build cache & deploy on musunil-web, wait for completion, then verify the deployed commit and manifest.",
      verify: "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy"
    },
    {
      id: "api_dns",
      owner: "operator",
      action: "Run pnpm launch:apply. If RENDER_API_TOKEN and CLOUDFLARE_API_TOKEN are available, pnpm launch:apply -- --apply adds api.musunil.com to Render, derives the Render onrender.com target, resolves the musunil.com Cloudflare zone by name, and applies the DNS record. Without Render token, copy the Render target into MUSUNIL_RENDER_API_DNS_TARGET. If the Cloudflare token cannot read zones by name, set CLOUDFLARE_ZONE_ID as a fallback.",
      verify: "pnpm launch:apply && pnpm launch:final-gate"
    },
    {
      id: "static_headers",
      owner: "operator",
      action: "Run pnpm launch:apply. If RENDER_API_TOKEN is available, pnpm launch:apply -- --apply --deploy-web applies Render headers and requests a Web deploy. If Render headers still do not appear on live responses or the Web record is proxied by Cloudflare, apply pnpm launch:apply -- --apply --cloudflare-headers for the Web-only response header fallback.",
      verify: "pnpm launch:apply && MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy"
    },
    {
      id: "build_metadata",
      owner: "operator",
      action: "Confirm Render musunil-web uses pnpm build:web-static:render and publishes that build output. Static hash match is acceptable for UI freshness, but build-info should eventually contain the deployed Git SHA.",
      verify: "pnpm render:web-settings && MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy"
    },
    {
      id: "live_data_sync",
      owner: "operator",
      action: "After Web and API domains are connected, confirm the live browser surface reports serviceSyncState=live and renders at least 3 topic issue cards from /home.issueCards.",
      verify: "pnpm launch:final-gate"
    }
  ],
  renderStaticSite: {
    service: "musunil-web",
    branch: "main",
    rootDirectory: "",
    buildCommand: readScalar(webBlock, "buildCommand"),
    publishDirectory: readScalar(webBlock, "staticPublishPath"),
    envVars: readEnvVars(webBlock),
    headers: readHeaders(webBlock)
  },
  renderApiService: {
    service: "musunil-api",
    healthCheckPath: readScalar(apiBlock, "healthCheckPath"),
    buildCommand: readScalar(apiBlock, "buildCommand"),
    preDeployCommand: readScalar(apiBlock, "preDeployCommand"),
    startCommand: readScalar(apiBlock, "startCommand"),
    requiredEnv: readEnvKeys(apiBlock)
  },
  cloudflareDns: [
    {
      name: "musunil.com",
      type: "CNAME or Render-supported apex record",
      target: "Render musunil-web custom-domain target shown in Render",
      proxy: "DNS only when Render headers are applied directly; proxied if using the Cloudflare response header rule, with cache bypass confirmed"
    },
    {
      name: "www",
      type: "CNAME",
      target: "musunil.com or the Render musunil-web custom-domain target",
      proxy: "same as musunil.com"
    },
    {
      name: "api",
      type: "CNAME",
      target: "Render musunil-api custom-domain target shown in Render",
      proxy: "DNS only until /health, /ready, CORS, and media smoke pass"
    }
  ],
  cloudflareDnsTemplate: {
    docsPath: "docs/cloudflare-dns-records.md",
    terraformPath: "infra/cloudflare/dns-records.tf.example",
    localDocsPath: "docs/cloudflare-dns-records.local.md",
    localTfvarsPath: "infra/cloudflare/dns-records.local.tfvars",
    command: "pnpm cloudflare:dns",
    checkCommand: "pnpm check:cloudflare-dns-template",
    exactTargetEnv: [
      "MUSUNIL_RENDER_WEB_DNS_TARGET",
      "MUSUNIL_RENDER_API_DNS_TARGET"
    ]
  },
  cloudflareCacheRules: [
    "Do not cache /, /config.js, /build-info.json, or /static-manifest.json.",
    "Do not transform HTML, JS, JSON, poster, or video responses before launch verification.",
    "After proxying is enabled, rerun strict web headers and service watch."
  ],
  renderHeaderApplication: [
    "Manual Static Site: custom response headers must be entered in the Render Dashboard.",
    "Blueprint-managed service: render.yaml musunil-web.headers can be synced by Blueprint.",
    "Render API automation: RENDER_API_TOKEN=... pnpm render:apply -- --web-headers --apply can create or update musunil-web header rules.",
    "Reference: https://render.com/docs/static-site-headers and https://render.com/docs/blueprint-spec#static-sites"
  ],
  userInputPriority: [
    "app.support_email",
    "organization.legal_name/operator_name/privacy_officer_*/location_info_manager_*",
    "storage.* and security.media_encryption_key",
    "redaction.engine_smoke_command",
    "mobile Android Play Integrity or iOS App Attest credentials",
    "identity.portone_store_id / identity channel key / identity API secret",
    "public_data_sources.national_assembly_bill_api_key or public_data_sources.law_go_kr_oc",
    "payments.* only after individual business account and PG contract are ready"
  ].filter((item) => template.includes(item.split(/[ ./]/)[0]) || item.includes("organization") || item.includes("payments")),
  verificationOrder: [
    "pnpm launch:verify-inputs config/musunil.user-inputs.local.yaml",
    "pnpm config:encode -- --check config/musunil.user-inputs.local.yaml",
    "pnpm launch:ready -- config/musunil.user-inputs.local.yaml --post-laws",
    "pnpm launch:apply",
    "pnpm render:api-settings",
    "pnpm render:web-settings",
    "pnpm render:apply -- --api-domain",
    "pnpm render:apply -- --web-headers",
    ': "${MUSUNIL_RENDER_WEB_DNS_TARGET:?set exact Render Web target from Render first}"',
    ': "${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}"',
    "pnpm cloudflare:dns",
    "pnpm cloudflare:headers",
    "Apply Render custom domains, Cloudflare DNS, and Render Static headers or the Web-only Cloudflare response header fallback.",
    "pnpm cloudflare:check:strict",
    "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
    "MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm check:web-deploy",
    "pnpm check:visual-surface:live",
    "pnpm sources:refresh-preflight",
    "pnpm launch:post-deploy-smoke -- --require-laws --require-source-refreshes",
    "MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com MUSUNIL_EXPECTED_COMMIT_SHA=$(git rev-parse HEAD) pnpm service:watch:visual",
    "pnpm launch:final-gate"
  ],
  successCriteria: [
    "Final launch gate exits 0 with live post-deploy smoke and refreshed strict blocker checks.",
    "Live static manifest matches the current repo output.",
    "Live config.js apiBaseUrl matches https://api.musunil.com.",
    "Live visual surface smoke passes on musunil.com across 390px, 430px, 768px, and 1440px.",
    "Integrated service watch passes with web_runtime_config ok, web_visual_surface ok, serviceSyncState=live, and at least 3 rendered topic issue cards.",
    "Strict Web header check passes with no-store, CSP, Permissions-Policy, Referrer-Policy, nosniff, and frame protection on /, /config.js, and /build-info.json.",
    "Strict Cloudflare DNS check verifies api.musunil.com resolves to the exact Render API custom-domain target.",
    "api.musunil.com resolves over HTTPS and /ready is ready=true.",
    "Public payloads expose no raw user text, private GPS, storage keys, identity hashes, or forbidden engagement surfaces.",
    "Write endpoints return identity_required without a verified identity session.",
    "Laws endpoint is empty before official ingest or contains only official National Assembly/Law.go.kr sourced items."
  ]
};

if (args.includes("--json")) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  printMarkdown(plan);
}

function printMarkdown(value) {
  console.log("# Musunil Launch Cutover Plan");
  console.log("");
  console.log(`Generated: ${value.generatedAt}`);
  console.log("");
  console.log("## Domains");
  console.log("");
  console.log(`- Web: ${value.domains.web}`);
  console.log(`- API: ${value.domains.api}`);
  console.log("");
  console.log("## Blockers To Clear");
  console.log("");
  for (const item of value.currentBlockersToClear) {
    console.log(`- ${item.id}: ${item.action}`);
    console.log(`  Verify: ${item.verify}`);
  }
  console.log("");
  console.log("## Render Static Site");
  console.log("");
  console.log(`- Service: ${value.renderStaticSite.service}`);
  console.log(`- Branch: ${value.renderStaticSite.branch}`);
  console.log("- Root Directory: (blank)");
  console.log(`- Build Command: ${value.renderStaticSite.buildCommand}`);
  console.log(`- Publish Directory: ${value.renderStaticSite.publishDirectory}`);
  console.log(`- Env Vars: ${value.renderStaticSite.envVars.map((envVar) => `${envVar.key}=${envVar.value}`).join(", ")}`);
  console.log("");
  console.log("Headers:");
  for (const header of value.renderStaticSite.headers) {
    console.log(`- ${header.path} | ${header.name}: ${header.value}`);
  }
  console.log("");
  console.log("Header application mode:");
  for (const mode of value.renderHeaderApplication) console.log(`- ${mode}`);
  console.log("");
  console.log("## Render API Service");
  console.log("");
  console.log(`- Health Check Path: ${value.renderApiService.healthCheckPath}`);
  console.log(`- Build Command: ${value.renderApiService.buildCommand}`);
  console.log(`- Pre Deploy Command: ${value.renderApiService.preDeployCommand}`);
  console.log(`- Start Command: ${value.renderApiService.startCommand}`);
  console.log(`- Env Keys: ${value.renderApiService.requiredEnv.join(", ")}`);
  console.log("");
  console.log("## Cloudflare DNS");
  console.log("");
  console.log(`Template: ${value.cloudflareDnsTemplate.command} (${value.cloudflareDnsTemplate.docsPath}, ${value.cloudflareDnsTemplate.terraformPath})`);
  console.log(`Exact target env: ${value.cloudflareDnsTemplate.exactTargetEnv.join(", ")}`);
  console.log(`Local exact copy: ${value.cloudflareDnsTemplate.localDocsPath}, ${value.cloudflareDnsTemplate.localTfvarsPath}`);
  console.log("");
  for (const record of value.cloudflareDns) {
    console.log(`- ${record.name}: ${record.type} -> ${record.target}. Proxy: ${record.proxy}.`);
  }
  console.log("");
  console.log("Cache rules:");
  for (const rule of value.cloudflareCacheRules) console.log(`- ${rule}`);
  console.log("");
  console.log("## User Input Priority");
  console.log("");
  for (const item of value.userInputPriority) console.log(`- ${item}`);
  console.log("");
  console.log("## Verification Order");
  console.log("");
  for (const command of value.verificationOrder) console.log(`- ${command}`);
  console.log("");
  console.log("## Success Criteria");
  console.log("");
  for (const item of value.successCriteria) console.log(`- ${item}`);
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

function readScalar(block, key) {
  const match = block.match(new RegExp(`^\\s*${escapeRegExp(key)}:\\s*(.+)$`, "m"));
  return match ? stripQuotes(match[1].trim()) : "";
}

function readEnvKeys(block) {
  return [...block.matchAll(/^\s+-\s+key:\s*([A-Z0-9_]+)\s*$/gm)].map((match) => match[1]);
}

function readEnvVars(block) {
  const lines = block.split("\n");
  const envIndex = lines.findIndex((line) => /^\s*envVars:\s*$/.test(line));
  if (envIndex < 0) return [];
  const envIndent = lines[envIndex].match(/^(\s*)/)?.[1].length || 0;
  const sectionLines = [];
  for (let index = envIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && (line.match(/^(\s*)/)?.[1].length || 0) <= envIndent) break;
    sectionLines.push(line);
  }
  const envVars = [];
  let current;
  for (const line of sectionLines) {
    const key = line.match(/^\s*-\s+key:\s*(.+)$/);
    if (key) {
      current = { key: stripQuotes(key[1].trim()), value: "" };
      envVars.push(current);
      continue;
    }
    const value = line.match(/^\s+value:\s*(.+)$/);
    if (value && current) current.value = stripQuotes(value[1].trim());
  }
  return envVars.filter((envVar) => envVar.key && envVar.value);
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
