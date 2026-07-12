import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const check = args.includes("--check");
const json = args.includes("--json");
const stdout = args.includes("--stdout");
const docsPath = resolve(cwd, "docs/cloudflare-dns-records.md");
const terraformPath = resolve(cwd, "infra/cloudflare/dns-records.tf.example");
const localDocsPath = resolve(cwd, "docs/cloudflare-dns-records.local.md");
const localTfvarsPath = resolve(cwd, "infra/cloudflare/dns-records.local.tfvars");

const targetInputs = {
  web: renderTargetInput("MUSUNIL_RENDER_WEB_DNS_TARGET"),
  api: renderTargetInput("MUSUNIL_RENDER_API_DNS_TARGET")
};

const records = createRecords({ useConfiguredTargets: false });
const localRecords = createRecords({ useConfiguredTargets: true });

const result = {
  checked: "cloudflare_dns_records_template",
  zone: "musunil.com",
  docsPath: "docs/cloudflare-dns-records.md",
  terraformPath: "infra/cloudflare/dns-records.tf.example",
  localDocsPath: "docs/cloudflare-dns-records.local.md",
  localTfvarsPath: "infra/cloudflare/dns-records.local.tfvars",
  targetInputs: [
    targetInputSummary(targetInputs.web),
    targetInputSummary(targetInputs.api)
  ],
  records,
  verification: [
    "pnpm cloudflare:check",
    "pnpm cloudflare:check:strict",
    "pnpm launch:final-gate"
  ]
};

const markdown = renderMarkdown(result);
const terraform = renderTerraform(result);
const localMarkdown = renderMarkdown({ ...result, records: localRecords }, { local: true });
const localTfvars = renderLocalTfvars();
const hasConfiguredTarget = Boolean(targetInputs.web.value || targetInputs.api.value);
const invalidTargetInputs = Object.values(targetInputs).filter((input) => input.placeholder || input.invalidReason);

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (stdout) {
  console.log(markdown);
  console.log("");
  console.log("---");
  console.log("");
  console.log(terraform);
} else if (check) {
  const failures = [];
  if (!existsSync(docsPath) || readFileSync(docsPath, "utf8") !== markdown) failures.push("docs/cloudflare-dns-records.md is stale");
  if (!existsSync(terraformPath) || readFileSync(terraformPath, "utf8") !== terraform) failures.push("infra/cloudflare/dns-records.tf.example is stale");
  if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
  console.log(JSON.stringify({ ...result, ok: true }, null, 2));
} else {
  if (invalidTargetInputs.length > 0) {
    console.error("Render DNS target must be a hostname only, copied without URL scheme, path, port, or dashboard label.");
    for (const input of invalidTargetInputs) {
      const reason = input.placeholder ? "placeholder value" : input.invalidReason;
      console.error(`- ${input.env}: ${reason}`);
    }
    process.exit(1);
  }
  writeFileSync(docsPath, markdown);
  writeFileSync(terraformPath, terraform);
  console.log(`Wrote ${result.docsPath}`);
  console.log(`Wrote ${result.terraformPath}`);
  if (hasConfiguredTarget) {
    writeFileSync(localDocsPath, localMarkdown);
    writeFileSync(localTfvarsPath, localTfvars);
    console.log(`Wrote ${result.localDocsPath} (git-ignored)`);
    console.log(`Wrote ${result.localTfvarsPath} (git-ignored)`);
  }
}

function createRecords({ useConfiguredTargets }) {
  return [
    {
      name: "@",
      hostname: "musunil.com",
      type: "CNAME",
      target: useConfiguredTargets && targetInputs.web.value ? targetInputs.web.value : "Render musunil-web custom-domain target",
      targetEnv: targetInputs.web.env,
      proxy: "DNS only if Render headers are applied directly; proxied only when using the Web response header fallback",
      terraformValue: "var.render_web_target",
      terraformProxied: "var.web_record_proxied"
    },
    {
      name: "www",
      hostname: "www.musunil.com",
      type: "CNAME",
      target: "musunil.com",
      targetEnv: "",
      proxy: "same policy as musunil.com",
      terraformValue: "musunil.com",
      terraformProxied: "var.web_record_proxied"
    },
    {
      name: "api",
      hostname: "api.musunil.com",
      type: "CNAME",
      target: useConfiguredTargets && targetInputs.api.value ? targetInputs.api.value : "Render musunil-api custom-domain target",
      targetEnv: targetInputs.api.env,
      proxy: "DNS only until /health, /ready, CORS, media, and identity boundary smoke pass",
      terraformValue: "var.render_api_target",
      terraformProxied: "false"
    }
  ];
}

function renderMarkdown(value, options = {}) {
  const local = Boolean(options.local);
  return [
    local ? "# Cloudflare DNS Records Local Copy" : "# Cloudflare DNS Records",
    "",
    "이 문서는 `musunil.com` 출시 컷오버 때 Cloudflare DNS에 입력할 레코드 템플릿이다. Render Dashboard가 각 custom domain에 대해 보여주는 target을 그대로 복사해야 하며, 임의로 `.onrender.com` 주소를 추측해 넣지 않는다.",
    "Target 값은 호스트명만 허용한다. `https://`, 경로, 포트, `DNS target:` 같은 Dashboard 라벨이 섞이면 `pnpm cloudflare:dns`와 strict check가 실패한다.",
    local
      ? "이 파일은 로컬 전용 산출물이며 git에 커밋하지 않는다. 값이 비어 있거나 hostname-only 형식이 아니면 Render Dashboard에서 target을 다시 확인한다."
      : "추적 문서는 placeholder를 유지한다. 실제 target을 복사한 뒤에는 아래 로컬 환경변수로 검증용 산출물을 만들고 strict check를 실행한다.",
    "",
    "## Dashboard Records",
    "",
    "| Name | Hostname | Type | Target | Proxy |",
    "|---|---|---|---|---|",
    ...value.records.map((record) => `| \`${record.name}\` | \`${record.hostname}\` | \`${record.type}\` | ${record.target} | ${record.proxy} |`),
    "",
    "## Exact Target Workflow",
    "",
    "Render target은 secret이 아니지만 서비스별로 다르므로 추적 문서에는 placeholder로 둔다. Render Dashboard에서 Custom Domain target을 복사한 뒤 로컬 셸에만 아래처럼 넣는다. 문서의 괄호 예시나 `custom-domain target` 문구를 그대로 넣으면 placeholder로 거부된다.",
    "",
    "```bash",
    "# Render Dashboard에서 복사한 실제 target을 두 환경변수에 먼저 export한다.",
    ": \"${MUSUNIL_RENDER_WEB_DNS_TARGET:?set exact Render Web target from Render first}\"",
    ": \"${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}\"",
    "pnpm cloudflare:dns",
    "pnpm cloudflare:check:strict",
    "```",
    "",
    "`pnpm cloudflare:dns`는 위 값이 있으면 git-ignored local copy인 `docs/cloudflare-dns-records.local.md`와 `infra/cloudflare/dns-records.local.tfvars`도 쓴다. `MUSUNIL_RENDER_API_DNS_TARGET`이 있으면 strict check는 `api.musunil.com` CNAME이 Render target과 일치하는지 검사한다.",
    "",
    "## API Automation",
    "",
    "`pnpm cloudflare:apply`는 기본적으로 dry-run 계획만 출력한다. Cloudflare API token을 준비한 뒤 `--apply`를 붙였을 때만 DNS 레코드를 생성/갱신한다. 기본 zone은 `musunil.com` 이름으로 조회하며, token이 zone name 조회 권한을 갖지 못한 경우에만 `CLOUDFLARE_ZONE_ID`를 fallback으로 넣는다. DNS 적용은 Cloudflare DNS Records API를 사용하고, 기존 같은 이름의 비-CNAME 레코드가 있으면 자동 변경하지 않고 실패한다.",
    "",
    "```bash",
    ": \"${CLOUDFLARE_API_TOKEN:?set Cloudflare API token first}\"",
    ": \"${MUSUNIL_RENDER_API_DNS_TARGET:?set exact Render API target from Render first}\"",
    "pnpm cloudflare:apply -- --dns",
    "pnpm cloudflare:apply -- --dns --apply",
    "pnpm cloudflare:check:strict",
    "```",
    "",
    "## Proxy Policy",
    "",
    "- `api.musunil.com`은 API `/health`, `/ready`, CORS, redacted media, identity write boundary smoke가 통과하기 전까지 DNS only로 둔다.",
    "- Web 레코드는 Render Static headers가 직접 적용되면 DNS only가 단순하다.",
    "- Web strict headers가 live 응답에 계속 빠지면 `pnpm cloudflare:headers`로 생성되는 Response Header Transform Rule을 적용하기 위해 Web 레코드만 proxied로 전환한다.",
    "- Web을 proxied로 전환하면 `/`, `/config.js`, `/build-info.json`, `/static-manifest.json`은 캐시하지 않는다.",
    "",
    "## Terraform Example",
    "",
    "Use [dns-records.tf.example](/Users/mk/Documents/Musunil/infra/cloudflare/dns-records.tf.example) as the copy source. The example intentionally keeps Render targets as variables because only Render Dashboard can provide the correct custom-domain targets.",
    "",
    "## Verification",
    "",
    "After applying DNS records, run:",
    "",
    "```bash",
    ...value.verification,
    "```",
    "",
    "`pnpm cloudflare:check` separates DNS failures from API runtime failures. A skipped API check is not a launch pass.",
    ""
  ].join("\n");
}

function renderTerraform(value) {
  return [
    "# Generated by scripts/cloudflare-dns-template.mjs.",
    "# Copy into your Cloudflare Terraform project only after setting provider credentials, zone ID, and Render custom-domain targets.",
    "",
    'variable "cloudflare_zone_id" {',
    "  type        = string",
    '  description = "Cloudflare zone ID for musunil.com"',
    "}",
    "",
    'variable "render_web_target" {',
    "  type        = string",
    '  description = "Render custom-domain target for musunil-web"',
    "}",
    "",
    'variable "render_api_target" {',
    "  type        = string",
    '  description = "Render custom-domain target for musunil-api"',
    "}",
    "",
    'variable "web_record_proxied" {',
    "  type        = bool",
    "  default     = false",
    '  description = "Set true only when using the Cloudflare Web response header fallback and cache bypass rules"',
    "}",
    "",
    ...value.records.flatMap((record) => renderRecord(record)),
    ""
  ].join("\n");
}

function renderRecord(record) {
  const resourceName = record.hostname === "musunil.com" ? "web_apex" : record.name.replaceAll("-", "_");
  const valueExpression = record.terraformValue.startsWith("var.") || record.terraformValue === "false"
    ? record.terraformValue
    : hclString(record.terraformValue);
  const proxiedExpression = record.terraformProxied.startsWith("var.") || record.terraformProxied === "false"
    ? record.terraformProxied
    : hclString(record.terraformProxied);
  return [
    `resource "cloudflare_record" "musunil_${resourceName}" {`,
    "  zone_id = var.cloudflare_zone_id",
    `  name    = ${hclString(record.name)}`,
    `  type    = ${hclString(record.type)}`,
    `  value   = ${valueExpression}`,
    "  ttl     = 1",
    `  proxied = ${proxiedExpression}`,
    "}"
  ];
}

function hclString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function renderLocalTfvars() {
  return [
    "# Generated by scripts/cloudflare-dns-template.mjs when MUSUNIL_RENDER_*_DNS_TARGET is set.",
    "# This file is git-ignored. Copy values into your private Terraform workspace only.",
    targetInputs.web.value ? `render_web_target = ${hclString(targetInputs.web.value)}` : "# render_web_target = \"Render musunil-web custom-domain target\"",
    targetInputs.api.value ? `render_api_target = ${hclString(targetInputs.api.value)}` : "# render_api_target = \"Render musunil-api custom-domain target\"",
    "web_record_proxied = false",
    ""
  ].join("\n");
}

function targetInputSummary(input) {
  return {
    env: input.env,
    configured: Boolean(input.value),
    rawProvided: input.rawConfigured,
    placeholderRejected: input.placeholder,
    invalidReason: input.invalidReason,
    purpose: input.env.includes("_API_") ? "api.musunil.com CNAME exact target check" : "musunil.com Render custom-domain target copy aid"
  };
}

function normalizeRenderTarget(value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (isPlaceholderRenderTarget(raw) || invalidRenderTargetReason(raw)) return "";
  return raw.replace(/\.$/, "");
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
