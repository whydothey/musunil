import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const json = args.includes("--json");
const stdout = args.includes("--stdout");
const refresh = args.includes("--refresh");
const template = args.includes("--template");
const outputPath = resolve(cwd, "docs/launch-missing-inputs.md");

const blockers = runJson("launch blockers", [
  "node",
  "scripts/launch-next-actions.mjs",
  "--",
  "--json",
  ...(refresh ? ["--refresh"] : [])
]);
const ops = runJson("operational diagnostics", [
  "node",
  "--disable-warning=ExperimentalWarning",
  "--experimental-strip-types",
  "scripts/operational-readiness-diagnostics.mjs",
  ...(template ? ["--template"] : [])
]);
const lawDiagnostics = runJson(
  "law source diagnostics",
  ["node", "--disable-warning=ExperimentalWarning", "--experimental-strip-types", "workers/public-source-ingest/src/index.ts", "--", "--laws-diagnose"],
  { env: template ? templateUserInputsEnv() : process.env }
);
const readyPlan = runJson("launch ready plan", ["node", "scripts/launch-ready.mjs", "--", "--list"]);
const externalPlan = runJson("external smoke plan", ["node", "scripts/external-smoke.mjs", "--", "--list"]);

const summary = buildSummary();

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const markdown = renderMarkdown(summary);
  if (stdout) {
    console.log(markdown);
  } else {
    writeFileSync(outputPath, markdown);
    console.log("Wrote docs/launch-missing-inputs.md");
    console.log(`Immediate missing: ${summary.immediateApplyInputs.length}`);
    console.log(`Provider groups not ready: ${summary.providerGroups.filter((group) => !group.readyForSmoke).length}`);
    if (summary.nextOperatorCommandScope === "dry_run_only") {
      console.log(`Immediate safe command: ${summary.nextOperatorCommand}`);
      if (summary.nextApplyCommand) console.log(`Apply command after inputs: ${summary.nextApplyCommand}`);
    } else {
      console.log(`Next command: ${summary.nextOperatorCommand}`);
    }
  }
}

if (!blockers.ok || !ops.ok || !lawDiagnostics.ok || !readyPlan.ok || !externalPlan.ok) process.exitCode = 1;

function buildSummary() {
  const blockerData = blockers.data || {};
  const opsData = ops.data || {};
  const launchApply = blockerData.launchApply || {};
  const operatorInputs = launchApply.operatorInputs || [];
  const immediateApplyInputs = operatorInputs
    .filter((input) => (input.required || input.requiredMode === "one_of") && needsInput(input.status))
    .map((input) => ({
      id: input.id,
      status: input.status,
      required: input.requiredMode === "one_of" ? "one_of" : "yes",
      env: [...(input.env || []), ...(input.alternatives || []).map((item) => `alt:${item}`)],
      purpose: input.purpose || ""
    }));

  const components = opsData.components || {};
  return {
    checked: "launch_missing_inputs",
    generatedAt: new Date().toISOString(),
    source: opsData.source || (template ? "template_file" : "actual_or_template"),
    launchState: blockerData.launchState || "unknown",
    blockerStage: blockerData.blockerStage || "unknown",
    releaseBlocked: Boolean(blockerData.releaseBlocked),
    nextOperatorCommand: blockerData.nextOperatorCommand || "pnpm launch:blockers -- --refresh",
    nextOperatorCommandScope: blockerData.nextOperatorCommandScope || "diagnostic",
    nextApplyCommand: blockerData.nextApplyCommand || "",
    nextOperatorPrerequisite: blockerData.nextOperatorPrerequisite || "",
    blockerReport: {
      lastChecked: blockerData.lastChecked || null,
      reportAgeMinutes: typeof blockerData.reportAgeMinutes === "number" ? blockerData.reportAgeMinutes : null,
      staleAfterMinutes: typeof blockerData.staleAfterMinutes === "number" ? blockerData.staleAfterMinutes : null,
      stale: Boolean(blockerData.stale),
      refreshRequired: Boolean(blockerData.refreshRequired),
      refreshAttempted: Boolean(blockerData.refresh?.attempted),
      refreshReportUpdated: blockerData.refresh?.reportUpdated ?? null
    },
    immediateApplyInputs,
    requiredEnv: launchApply.requiredEnv || [],
    providerGroups: [
      storageGroup(components.storage),
      redactionGroup(components.redaction),
      mobileIntegrityGroup(components.mobileIntegrity),
      identityGroup(components.identity),
      lawsGroup(lawDiagnostics.data?.diagnostics)
    ],
    runtimeSecretGroups: runtimeSecretGroups(),
    requiredActions: opsData.summary?.requiredActions || [],
    launchReadySteps: readyPlan.data?.steps || [],
    externalSmokeSteps: externalPlan.data?.steps || [],
    helperFailures: [blockers, ops, lawDiagnostics, readyPlan, externalPlan]
      .filter((item) => !item.ok)
      .map(({ label, command, status, error, stderr }) => ({ label, command, status, error, stderr: compact(stderr || "") }))
  };
}

function storageGroup(component = {}) {
  return {
    id: "storage",
    title: "원본 영상 저장소",
    readyForSmoke: Boolean(component.readyForSmoke),
    fields: [
      field("storage.provider", component.providerStatus),
      field("storage.bucket", component.bucketStatus),
      field("storage.region", component.regionStatus),
      field("storage.access_key_id", component.accessKeyStatus),
      field("storage.secret_access_key", component.secretKeyStatus),
      field("security.media_encryption_key", component.mediaEncryptionKeyStatus)
    ],
    command: component.smokeCommand || "pnpm storage:smoke",
    proof: "storage_put_delete"
  };
}

function redactionGroup(component = {}) {
  return {
    id: "redaction",
    title: "비식별 엔진",
    readyForSmoke: Boolean(component.readyForSmoke),
    fields: [
      field("redaction.engine_smoke_command", component.commandStatus),
      field("redaction.engine_smoke_command includes {input}", component.hasInputToken ? "configured" : "missing"),
      field("redaction.engine_smoke_command includes {output}", component.hasOutputToken ? "configured" : "missing")
    ],
    command: component.smokeCommand || "pnpm redaction:smoke",
    proof: "redaction_engine_smoke"
  };
}

function mobileIntegrityGroup(component = {}) {
  const androidEnabled = component.androidEnabled !== false;
  const iosEnabled = component.iosEnabled === true;
  return {
    id: "mobile_integrity",
    title: "모바일 기기 무결성",
    readyForSmoke: Boolean(component.readyForSmoke),
    fields: [
      field("mobile.android_play_integrity_enabled", androidEnabled ? "configured" : "not_required"),
      field("mobile.android_package_name", component.androidPackageStatus),
      field("mobile.android_play_integrity_service_account_json_b64", component.androidServiceAccountStatus),
      field("mobile.ios_app_attest_enabled", iosEnabled ? "configured" : "not_required"),
      field("mobile.ios_bundle_id", component.iosBundleStatus),
      field("mobile.ios_team_id", component.iosTeamStatus),
      field("mobile.integrity_smoke_command", component.smokeCommandStatus)
    ],
    command: component.smokeCommand || "pnpm mobile:integrity-smoke",
    proof: component.smokeMarkerRequired || "mobile_integrity_provider_dry_run"
  };
}

function identityGroup(component = {}) {
  return {
    id: "identity",
    title: "포트원 본인확인",
    readyForSmoke: Boolean(component.readyForSmoke),
    fields: [
      field("identity.provider", component.providerStatus),
      field("identity.portone_store_id", component.storeIdStatus),
      field("identity.portone_identity_channel_key", component.channelKeyStatus),
      field("identity.portone_api_secret", component.apiSecretStatus),
      field("identity.session_cookie_domain", component.sessionCookieDomainStatus),
      field("MUSUNIL_PORTONE_SMOKE_IDENTITY_VERIFICATION_ID", component.smokeVerificationIdStatus)
    ],
    command: component.smokeCommand || "pnpm identity:smoke",
    proof: "identity_portone_verified_lookup"
  };
}

function lawsGroup(diagnostics = {}) {
  const summary = diagnostics.summary || {};
  const providers = Array.isArray(diagnostics.providers) ? diagnostics.providers : [];
  const assembly = providers.find((provider) => provider.id === "assembly_bill") || {};
  const law = providers.find((provider) => provider.id === "law_effective") || {};
  const credentialConfigured = Boolean(summary.credentialConfigured);
  const assemblyStatus = assembly.credentialStatus || (summary.assemblyBillCredentialConfigured ? "configured" : "missing");
  const lawStatus = law.credentialStatus || (summary.lawGoKrCredentialConfigured ? "configured" : "missing");
  return {
    id: "laws",
    title: "법안·법령 공식 원천",
    readyForSmoke: Boolean(diagnostics.readyForOperationalIngest),
    fields: [
      field("public_data_sources.national_assembly_bill_api_key or public_data_sources.law_go_kr_oc", credentialConfigured ? "configured" : "missing"),
      field("public_data_sources.national_assembly_bill_api_key", assemblyStatus),
      field("public_data_sources.law_go_kr_oc", lawStatus === "missing" && credentialConfigured ? "optional_not_configured" : lawStatus),
      field("public_data_sources.official_law_endpoints", `${summary.officialEndpointCount ?? 0}_official`),
      field("public_data_sources.law_interest_keywords", summary.keywordCount > 0 ? `${summary.keywordCount}_keywords` : "missing")
    ],
    command: "pnpm sources:laws",
    proof: "laws_dry_run"
  };
}

function runtimeSecretGroups() {
  return [
    {
      id: "render_api_runtime",
      title: "Render API service secrets",
      fields: [
        "DATABASE_URL",
        "REDIS_URL",
        "MUSUNIL_USER_INPUTS_B64",
        "MUSUNIL_INTERNAL_API_KEY",
        "MUSUNIL_USER_TOKEN_SECRET",
        "MUSUNIL_ENCRYPTION_KEY"
      ],
      note: "API/worker Secret File 또는 Render 환경변수에만 넣는다. Static Web에는 넣지 않는다."
    },
    {
      id: "cloudflare_render_cutover",
      title: "Render/Cloudflare cutover shell env",
      fields: ["RENDER_API_TOKEN or MUSUNIL_RENDER_API_DNS_TARGET", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID only if zone name lookup fails"],
      note: "`pnpm launch:apply` dry-run과 apply 자동화에서만 사용한다."
    }
  ];
}

function field(path, status = "unknown") {
  return { path, status: status || "unknown", missing: needsInput(status || "unknown") };
}

function needsInput(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "not_required") return false;
  return /missing|placeholder|invalid|too_short|required/i.test(normalized);
}

function renderMarkdown(value) {
  return [
    "# Launch Missing Inputs",
    "",
    "이 문서는 실제 값을 담지 않는다. 사용자가 마지막에 채울 필드명, 현재 상태, 검증 명령만 보여준다.",
    "운영 브리프와 같은 live blocker 스냅샷으로 갱신하려면 `pnpm launch:handoff`를 실행한다.",
    "",
    "## Current Gate",
    "",
    `- Generated: ${value.generatedAt}`,
    `- Source: ${value.source}`,
    `- Launch state: ${value.launchState}`,
    `- Current stage: ${value.blockerStage}`,
    `- Release blocked: ${value.releaseBlocked ? "yes" : "no"}`,
    `- Blocker report: ${blockerReportLine(value.blockerReport)}`,
    `- Report freshness: ${value.blockerReport?.stale ? "stale" : "fresh"}`,
    ...operatorCommandLines(value),
    "",
    ...staleReportLines(value.blockerReport),
    ...helperFailureLines(value.helperFailures),
    "## Immediate Apply Inputs",
    "",
    value.immediateApplyInputs.length
      ? "- 아래 값이 없으면 실제 적용이나 final gate를 실행하지 않는다."
      : "- 현재 dry-run 기준 즉시 필요한 apply 입력은 없다.",
    "",
    ...applyInputLines(value.immediateApplyInputs, value.requiredEnv),
    "",
    "## Provider Smoke Inputs",
    "",
    ...providerGroupLines(value.providerGroups),
    "",
    "## Runtime Secrets",
    "",
    ...runtimeSecretLines(value.runtimeSecretGroups),
    "",
    "## Launch Ready Steps",
    "",
    ...stepLines(value.launchReadySteps),
    "",
    "## External Smoke Proofs",
    "",
    ...stepLines(value.externalSmokeSteps),
    "",
    "## Required Actions",
    "",
    ...listLines(value.requiredActions),
    ""
  ].join("\n");
}

function operatorCommandLines(value) {
  if (value.nextOperatorCommandScope === "dry_run_only") {
    return [
      value.nextOperatorPrerequisite ? `- Before apply command: ${value.nextOperatorPrerequisite}` : "",
      `- Immediate safe command: \`${value.nextOperatorCommand}\``,
      value.nextApplyCommand ? `- Apply command after inputs: \`${value.nextApplyCommand}\`` : ""
    ].filter(Boolean);
  }
  return [
    value.nextOperatorPrerequisite ? `- Before next command: ${value.nextOperatorPrerequisite}` : "",
    `- Next command: \`${value.nextOperatorCommand}\``
  ].filter(Boolean);
}

function blockerReportLine(report = {}) {
  const lastChecked = report.lastChecked || "unknown";
  const age = typeof report.reportAgeMinutes === "number" ? `${report.reportAgeMinutes}m old` : "age unknown";
  const staleAfter = typeof report.staleAfterMinutes === "number" ? `refresh after ${report.staleAfterMinutes}m` : "refresh window unknown";
  return `${lastChecked} (${age}, ${staleAfter})`;
}

function staleReportLines(report = {}) {
  if (!report.stale) return [];
  return [
    "> 이 입력 체크리스트는 stale live blocker report를 기준으로 한다. 출시 판단이나 실제 적용 전에는 `pnpm launch:missing-inputs -- --refresh`를 다시 실행한다.",
    ""
  ];
}

function helperFailureLines(items) {
  if (!items.length) return [];
  return ["## Helper Failures", "", ...items.map((item) => `- ${item.label}: ${compact(item.error || item.stderr || `exit ${item.status}`)}`), ""];
}

function applyInputLines(inputs, requiredEnv) {
  const lines = [];
  lines.push(`- Required env: ${requiredEnv.length ? requiredEnv.map((item) => `\`${item}\``).join(", ") : "(none)"}`);
  if (!inputs.length) return lines;
  lines.push("");
  lines.push("| ID | Required | Status | Env | Purpose |");
  lines.push("|---|---|---|---|---|");
  for (const input of inputs) {
    lines.push(`| ${input.id} | ${input.required} | ${input.status} | ${input.env.map((item) => `\`${item}\``).join("<br>")} | ${input.purpose} |`);
  }
  return lines;
}

function providerGroupLines(groups) {
  return groups.flatMap((group) => [
    `### ${group.title}`,
    "",
    `- Status: ${group.readyForSmoke ? "ready_for_smoke" : "missing_inputs"}`,
    `- Command: \`${group.command}\``,
    `- Proof marker: \`${group.proof}\``,
    "",
    "| Field | Status |",
    "|---|---|",
    ...group.fields.map((item) => `| \`${item.path}\` | ${item.status} |`),
    ""
  ]);
}

function runtimeSecretLines(groups) {
  return groups.flatMap((group) => [
    `### ${group.title}`,
    "",
    group.note ? `- ${group.note}` : "",
    ...group.fields.map((item) => `- \`${item}\``),
    ""
  ].filter(Boolean));
}

function stepLines(steps) {
  if (!steps?.length) return ["- (none)"];
  return steps.map((step) => {
    const command = step.command || "";
    const proof = step.proofMarker ? `, proof: \`${step.proofMarker}\`` : "";
    const forbidden = step.forbiddenMarker ? `, forbidden: \`${step.forbiddenMarker}\`` : "";
    return `- ${step.id}: \`${command}\`${proof}${forbidden}`;
  });
}

function listLines(items) {
  if (!items?.length) return ["- (none)"];
  return items.map((item) => `- ${item}`);
}

function runJson(label, command, options = {}) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    env: options.env || process.env,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024
  });
  if (result.error) return { ok: false, label, command: command.join(" "), error: result.error.message };
  if (result.status !== 0) {
    return {
      ok: false,
      label,
      command: command.join(" "),
      status: result.status,
      stderr: compact(result.stderr, 1000),
      stdout: compact(result.stdout, 1000)
    };
  }
  try {
    return { ok: true, label, command: command.join(" "), data: JSON.parse(result.stdout) };
  } catch (error) {
    return { ok: false, label, command: command.join(" "), error: `invalid JSON output: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function compact(value, maxLength = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function templateUserInputsEnv() {
  const templateYaml = readFileSync(resolve(cwd, "config/musunil.user-inputs.template.yaml"), "utf8");
  return {
    ...process.env,
    MUSUNIL_USER_INPUTS_B64: Buffer.from(templateYaml).toString("base64"),
    MUSUNIL_USER_INPUTS_FILE_PATH: ""
  };
}
