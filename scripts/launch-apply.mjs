import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const apply = args.includes("--apply");
const json = args.includes("--json");
const deployWeb = args.includes("--deploy-web") || args.includes("--deploy-all");
const deployApi = args.includes("--deploy-api") || args.includes("--deploy-all");
const verifyDomains = args.includes("--verify-domains");
const cloudflareHeaders = args.includes("--cloudflare-headers");
const skipRender = args.includes("--skip-render");
const skipCloudflare = args.includes("--skip-cloudflare");

const base = {
  checked: "launch_apply_plan",
  mode: apply ? "apply" : "dry_run",
  docs: [
    "https://render.com/docs/api",
    "https://render.com/docs/configure-cloudflare-dns",
    "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/",
    "https://developers.cloudflare.com/rules/transform/response-header-modification/create-api/"
  ],
  requested: {
    render: !skipRender,
    cloudflare: !skipCloudflare,
    deployWeb,
    deployApi,
    verifyDomains,
    cloudflareHeaders
  },
  safety: [
    "dry_run is default; pass --apply before any Render or Cloudflare write",
    "Render service onrender.com hosts are derived only from Render API serviceDetails.url",
    "Cloudflare api.musunil.com remains DNS only",
    "Render env vars and secret files are not replaced"
  ]
};

const steps = [];
let renderData = null;
if (!skipRender) {
  const renderArgs = [
    "--api-domain",
    "--web-headers",
    ...(deployWeb ? ["--deploy-web"] : []),
    ...(deployApi ? ["--deploy-api"] : []),
    ...(verifyDomains ? ["--verify-domains"] : []),
    "--json",
    ...(apply ? ["--apply"] : [])
  ];
  const renderStep = runNode("render_apply", "scripts/render-apply.mjs", renderArgs, process.env);
  steps.push(renderStep);
  renderData = renderStep.data || null;
}

const derivedTargets = deriveTargets(renderData);
const cloudflareEnv = {
  ...process.env,
  ...(derivedTargets.web && !process.env.MUSUNIL_RENDER_WEB_DNS_TARGET
    ? { MUSUNIL_RENDER_WEB_DNS_TARGET: derivedTargets.web }
    : {}),
  ...(derivedTargets.api && !process.env.MUSUNIL_RENDER_API_DNS_TARGET
    ? { MUSUNIL_RENDER_API_DNS_TARGET: derivedTargets.api }
    : {})
};

if (!skipCloudflare) {
  const dnsStep = runNode("cloudflare_dns_apply", "scripts/cloudflare-apply.mjs", [
    "--dns",
    "--json",
    ...(apply ? ["--apply"] : [])
  ], cloudflareEnv);
  steps.push(dnsStep);
  if (cloudflareHeaders) {
    const headerStep = runNode("cloudflare_header_apply", "scripts/cloudflare-apply.mjs", [
      "--headers",
      "--json",
      ...(apply ? ["--apply"] : [])
    ], cloudflareEnv);
    steps.push(headerStep);
  }
}

const result = {
  ...base,
  tokenState: {
    render: Boolean(process.env.RENDER_API_TOKEN || process.env.MUSUNIL_RENDER_API_TOKEN),
    cloudflare: Boolean(process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN),
    cloudflareZoneId: Boolean(process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID),
    cloudflareZoneName: process.env.CLOUDFLARE_ZONE_NAME || "musunil.com"
  },
  derivedTargets,
  targetSource: {
    web: targetSource("web", derivedTargets.web),
    api: targetSource("api", derivedTargets.api)
  },
  steps,
  operatorInputs: [],
  requiredEnv: [],
  ok: steps.every((step) => step.ok),
  next: []
};
result.operatorInputs = operatorInputs(result);
result.requiredEnv = requiredEnv(result.operatorInputs);
result.next = nextCommands(result);

printResult(result);
if (!result.ok) process.exit(1);

function runNode(id, script, scriptArgs, env) {
  const command = ["node", script, "--", ...scriptArgs];
  const run = spawnSync(command[0], command.slice(1), {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  const parsed = parseJson(run.stdout);
  return {
    id,
    command: command.join(" "),
    ok: run.status === 0 && (parsed ? parsed.ok !== false : true),
    exitStatus: run.status,
    signal: run.signal,
    data: parsed,
    error: run.error?.message || "",
    stderr: compact(run.stderr),
    stdout: parsed ? "" : compact(run.stdout)
  };
}

function deriveTargets(renderData) {
  return {
    web: process.env.MUSUNIL_RENDER_WEB_DNS_TARGET || renderData?.inspected?.web?.serviceUrlHost || "",
    api: process.env.MUSUNIL_RENDER_API_DNS_TARGET || renderData?.inspected?.api?.serviceUrlHost || ""
  };
}

function targetSource(kind, value) {
  if (!value) return "missing";
  const envName = kind === "web" ? "MUSUNIL_RENDER_WEB_DNS_TARGET" : "MUSUNIL_RENDER_API_DNS_TARGET";
  if (process.env[envName]) return envName;
  return "render_api_service_url";
}

function operatorInputs(value) {
  const inputs = [];
  if (value.requested.render) {
    inputs.push({
      id: "render_target_source",
      required: !value.derivedTargets.api,
      status: value.derivedTargets.api
        ? value.targetSource.api === "render_api_service_url"
          ? "derived_from_render_api"
          : "configured"
        : "missing",
      requiredMode: "one_of",
      env: ["RENDER_API_TOKEN", "MUSUNIL_RENDER_API_DNS_TARGET"],
      alternatives: ["MUSUNIL_RENDER_API_TOKEN"],
      purpose: "Choose one source for the Render API onrender.com target used by api.musunil.com"
    });
    inputs.push({
      id: "render_api_token",
      required: false,
      status: value.tokenState.render
        ? "configured"
        : value.derivedTargets.api
          ? "not_required_target_available"
          : "missing_for_auto_target_derivation",
      env: ["RENDER_API_TOKEN"],
      alternatives: ["MUSUNIL_RENDER_API_TOKEN", "MUSUNIL_RENDER_API_DNS_TARGET"],
      purpose: "Render service lookup, custom domain/header apply, and onrender.com target derivation"
    });
    inputs.push({
      id: "render_service_identity",
      required: false,
      status: process.env.MUSUNIL_RENDER_API_SERVICE_ID || process.env.MUSUNIL_RENDER_WEB_SERVICE_ID
        ? "configured"
        : "optional_by_exact_service_name",
      env: ["MUSUNIL_RENDER_WEB_SERVICE_ID", "MUSUNIL_RENDER_API_SERVICE_ID"],
      alternatives: ["MUSUNIL_RENDER_WEB_SERVICE_NAME=musunil-web", "MUSUNIL_RENDER_API_SERVICE_NAME=musunil-api"],
      purpose: "Use exact Render service IDs when service-name lookup is ambiguous"
    });
  }
  if (value.requested.cloudflare) {
    inputs.push({
      id: "cloudflare_api_token",
      required: true,
      status: value.tokenState.cloudflare ? "configured" : "missing",
      env: ["CLOUDFLARE_API_TOKEN"],
      alternatives: ["CF_API_TOKEN"],
      purpose: "Create or update Cloudflare DNS records and optional response header rule"
    });
    inputs.push({
      id: "cloudflare_zone",
      required: false,
      status: value.tokenState.cloudflareZoneId ? "configured" : "default_zone_name_lookup",
      env: ["CLOUDFLARE_ZONE_ID"],
      alternatives: ["CF_ZONE_ID", "CLOUDFLARE_ZONE_NAME=musunil.com"],
      purpose: "Optional fallback when the Cloudflare token cannot resolve the musunil.com zone by name"
    });
    inputs.push({
      id: "render_api_dns_target",
      required: false,
      status: value.derivedTargets.api
        ? value.targetSource.api === "render_api_service_url"
          ? "derived_from_render_api"
          : "configured"
        : "missing_manual_fallback",
      env: ["MUSUNIL_RENDER_API_DNS_TARGET"],
      alternatives: ["RENDER_API_TOKEN"],
      purpose: "Manual fallback CNAME target for api.musunil.com when Render API target derivation is unavailable"
    });
    inputs.push({
      id: "render_web_dns_target",
      required: value.requested.cloudflareHeaders && !value.derivedTargets.web,
      status: value.derivedTargets.web
        ? value.targetSource.web === "render_api_service_url"
          ? "derived_from_render_api"
          : "configured"
        : value.requested.cloudflareHeaders
          ? "missing"
          : "not_required_for_current_request",
      env: ["MUSUNIL_RENDER_WEB_DNS_TARGET"],
      alternatives: ["RENDER_API_TOKEN"],
      purpose: "Manual fallback CNAME target for musunil.com when Web DNS/header fallback is being applied"
    });
  }
  return inputs;
}

function nextCommands(value) {
  const commands = [];
  const missingRequired = missingRequiredInputs(value.operatorInputs).map((item) => item.id);
  if (missingRequired.length > 0) {
    commands.push(`Fill required launch inputs: ${missingRequired.join(", ")}.`);
  }
  if (!value.derivedTargets.api) {
    commands.push("Set RENDER_API_TOKEN so pnpm launch:apply can derive the Render API onrender.com target, or set MUSUNIL_RENDER_API_DNS_TARGET manually.");
  }
  if (value.steps.some((step) => step.id === "render_apply" && !step.ok)) {
    commands.push("Fix Render API token/service lookup, then rerun pnpm launch:apply.");
  }
  if (value.steps.some((step) => step.id === "cloudflare_dns_apply" && !step.ok)) {
    commands.push("Set CLOUDFLARE_API_TOKEN. If the token cannot read zones by name, also set CLOUDFLARE_ZONE_ID, then rerun pnpm launch:apply -- --apply.");
  }
  commands.push("After apply succeeds, run pnpm launch:final-gate.");
  return commands;
}

function missingRequiredInputs(inputs) {
  return inputs.filter((item) => item.required && item.status === "missing");
}

function requiredEnv(inputs) {
  return missingRequiredInputs(inputs).map((item) =>
    item.requiredMode === "one_of" ? item.env.join(" or ") : item.env.join(", ")
  );
}

function parseJson(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function compact(value, limit = 1200) {
  const text = String(value || "").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function printResult(value) {
  const output = json ? JSON.stringify(value, null, 2) : JSON.stringify(value, null, 2);
  console.log(output);
}
