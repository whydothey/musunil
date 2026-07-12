import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const check = args.includes("--check");
const json = args.includes("--json");
const stdout = args.includes("--stdout");
const renderYaml = readFileSync(resolve(cwd, "render.yaml"), "utf8");
const webBlock = renderServiceBlock(renderYaml, "musunil-web");
const headers = readHeaders(webBlock);
const expression = '(http.host eq "musunil.com" or http.host eq "www.musunil.com")';
const docsPath = resolve(cwd, "docs/cloudflare-response-headers.md");
const terraformPath = resolve(cwd, "infra/cloudflare/response-headers.tf.example");

const result = {
  checked: "cloudflare_response_headers_template",
  expression,
  phase: "http_response_headers_transform",
  action: "rewrite",
  headerCount: headers.length,
  docsPath: "docs/cloudflare-response-headers.md",
  terraformPath: "infra/cloudflare/response-headers.tf.example",
  headers
};

const markdown = renderMarkdown(result);
const terraform = renderTerraform(result);

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
  if (!existsSync(docsPath) || readFileSync(docsPath, "utf8") !== markdown) failures.push("docs/cloudflare-response-headers.md is stale");
  if (!existsSync(terraformPath) || readFileSync(terraformPath, "utf8") !== terraform) failures.push("infra/cloudflare/response-headers.tf.example is stale");
  if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
  console.log(JSON.stringify({ ...result, ok: true }, null, 2));
} else {
  writeFileSync(docsPath, markdown);
  writeFileSync(terraformPath, terraform);
  console.log(`Wrote ${result.docsPath}`);
  console.log(`Wrote ${result.terraformPath}`);
}

function renderMarkdown(value) {
  return [
    "# Cloudflare Response Header Rules",
    "",
    "이 문서는 `musunil.com` Web 응답 헤더가 Render Static Site Dashboard에서 적용되지 않을 때, Cloudflare edge에서 같은 보안 헤더를 적용하기 위한 운영 템플릿이다. Cloudflare proxied Web record에서만 동작하므로 API 레코드는 `/health`, `/ready`, CORS, media smoke 통과 전까지 DNS only를 유지하고, Web 레코드에만 적용한다.",
    "",
    "Cloudflare 공식 문서 기준 Response Header Transform Rules는 방문자에게 나가는 HTTP 응답 헤더를 수정할 수 있고, Dashboard에서는 `Set static`으로 같은 이름의 기존 헤더를 덮어쓸 수 있다. Terraform 예시는 `phase = \"http_response_headers_transform\"`, `action = \"rewrite\"`, header `operation = \"set\"` 구조를 사용한다.",
    "",
    "References:",
    "",
    "- https://developers.cloudflare.com/rules/transform/response-header-modification/",
    "- https://developers.cloudflare.com/rules/transform/response-header-modification/create-dashboard/",
    "- https://developers.cloudflare.com/terraform/additional-configurations/transform-rules/#create-a-response-header-transform-rule",
    "",
    "## Dashboard Rule",
    "",
    "- Rule type: Response Header Transform Rule",
    "- Rule name: `musunil web response security headers`",
    `- Expression: \`${value.expression}\``,
    "- Operation for every header: `Set static`",
    "- Save mode: Deploy only after checking the values below.",
    "",
    "Headers:",
    "",
    ...value.headers.flatMap((header) => [
      `- ${header.name}`,
      "  ```text",
      `  ${header.value}`,
      "  ```"
    ]),
    "",
    "## Terraform Example",
    "",
    "Use [response-headers.tf.example](/Users/mk/Documents/Musunil/infra/cloudflare/response-headers.tf.example) as the copy source. The example intentionally uses `*.tf.example` so it cannot run without an operator choosing the Cloudflare zone and provider setup.",
    "",
    "## API Automation",
    "",
    "`pnpm cloudflare:apply`는 기본적으로 dry-run 계획만 출력한다. Cloudflare API token과 zone을 준비한 뒤 `--apply --headers`를 붙였을 때만 `http_response_headers_transform` phase의 zone ruleset을 생성하거나, `musunil_web_security_headers` rule을 갱신한다.",
    "",
    "```bash",
    ": \"${CLOUDFLARE_API_TOKEN:?set Cloudflare API token first}\"",
    ": \"${CLOUDFLARE_ZONE_ID:?set Cloudflare zone id first}\"",
    "pnpm cloudflare:apply -- --headers",
    "pnpm cloudflare:apply -- --headers --apply",
    "MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy",
    "```",
    "",
    "## Verification",
    "",
    "After applying the Render headers or this Cloudflare response header rule, run:",
    "",
    "```bash",
    "pnpm cloudflare:check",
    "MUSUNIL_STRICT_WEB_HEADERS=1 MUSUNIL_WEB_BASE_URL=https://musunil.com MUSUNIL_EXPECTED_API_BASE_URL=https://api.musunil.com pnpm check:web-deploy",
    "pnpm launch:final-gate",
    "```",
    "",
    "Passing Cloudflare header checks does not prove API readiness. `api.musunil.com` must still resolve over HTTPS and `/ready` must return `ready=true` before launch.",
    ""
  ].join("\n");
}

function renderTerraform(value) {
  return [
    "# Generated by scripts/cloudflare-response-headers-template.mjs.",
    "# Copy into your Cloudflare Terraform project only after setting provider credentials and cloudflare_zone_id.",
    "",
    'variable "cloudflare_zone_id" {',
    "  type        = string",
    '  description = "Cloudflare zone ID for musunil.com"',
    "}",
    "",
    'resource "cloudflare_ruleset" "musunil_web_response_headers" {',
    "  zone_id     = var.cloudflare_zone_id",
    '  name        = "musunil web response security headers"',
    '  description = "Set Musunil public Web security headers at Cloudflare edge"',
    '  kind        = "zone"',
    `  phase       = "${value.phase}"`,
    "",
    "  rules = [{",
    '    ref         = "musunil_web_security_headers"',
    '    description = "Set Web security headers for musunil.com and www.musunil.com"',
    `    expression  = ${hclString(value.expression)}`,
    `    action      = "${value.action}"`,
    "    action_parameters = {",
    "      headers = {",
    ...value.headers.flatMap((header) => [
      `        ${hclString(header.name)} = {`,
      '          operation = "set"',
      `          value     = ${hclString(header.value)}`,
      "        }"
    ]),
    "      }",
    "    }",
    "  }]",
    "}",
    ""
  ].join("\n");
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

function hclString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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
