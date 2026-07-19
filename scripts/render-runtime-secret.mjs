import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const cwd = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const apply = args.includes("--apply");
const json = args.includes("--json");
const token = process.env.RENDER_API_TOKEN || process.env.MUSUNIL_RENDER_API_TOKEN || "";
const sourcePath = resolve(
  cwd,
  argValue("--source") ||
    process.env.MUSUNIL_RENDER_USER_INPUTS_SOURCE_PATH ||
    "config/musunil.user-inputs.local.yaml"
);
const secretFileName = process.env.MUSUNIL_RENDER_USER_INPUTS_SECRET_FILE_NAME || "musunil.user-inputs.yaml";
const runtimePath = `/etc/secrets/${secretFileName}`;
const confirmation = process.env.MUSUNIL_RENDER_SECRET_APPLY_CONFIRM || "";
const serviceInputs = [
  serviceInput("API", "musunil-api"),
  serviceInput("SCHEDULER", "musunil-ops-scheduler")
];

const local = inspectLocalSource();
const remote = token ? await inspectRemoteState() : { inspected: false, services: [] };
const readyForApply =
  local.ready &&
  Boolean(token) &&
  confirmation === "APPLY_RUNTIME_SECRET_FILE" &&
  remote.services.length === serviceInputs.length &&
  remote.services.every((service) => service.ok);

const plan = {
  checked: "render_runtime_secret_file",
  mode: apply ? "apply" : "dry_run",
  docs: [
    "https://render.com/docs/configure-environment-variables#secret-files",
    "https://api-docs.render.com/reference/add-or-update-secret-file",
    "https://api-docs.render.com/reference/update-env-var"
  ],
  secretFile: {
    name: secretFileName,
    runtimePath,
    source: safeDisplayPath(sourcePath),
    byteLength: local.byteLength,
    mode: local.mode,
    validation: local.validation,
    ready: local.ready
  },
  services: serviceInputs.map(({ kind, idEnv, id, name }) => ({ kind, idEnv, idConfigured: Boolean(id), name })),
  remote,
  tokenConfigured: Boolean(token),
  confirmationConfigured: confirmation === "APPLY_RUNTIME_SECRET_FILE",
  readyForApply,
  requiredEnv: requiredEnv(),
  safety: [
    "dry_run is default; pass --apply before any Render write",
    "apply also requires MUSUNIL_RENDER_SECRET_APPLY_CONFIRM=APPLY_RUNTIME_SECRET_FILE",
    "the local YAML must be a regular non-symlink file with no group or other permission bits",
    "the secret content and credential values are never printed",
    "the same filename is uploaded to musunil-api and musunil-ops-scheduler",
    "MUSUNIL_USER_INPUTS_FILE_PATH points both runtimes to /etc/secrets"
  ]
};

if (!apply) {
  printResult({ ...plan, ok: true, applied: false, actions: [] });
  process.exit(0);
}

if (!readyForApply) {
  printResult({
    ...plan,
    ok: false,
    applied: false,
    actions: [],
    failures: applyFailures()
  });
  process.exit(1);
}

const content = readFileSync(sourcePath, "utf8");
const actions = [];
for (const service of remote.services) {
  await putEnvironmentPath(service.id);
  actions.push({
    id: `${service.kind}_runtime_path`,
    ok: true,
    serviceId: service.id,
    serviceName: service.name,
    key: "MUSUNIL_USER_INPUTS_FILE_PATH",
    value: runtimePath
  });
  await putSecretFile(service.id, content);
  actions.push({
    id: `${service.kind}_secret_file`,
    ok: true,
    serviceId: service.id,
    serviceName: service.name,
    name: secretFileName,
    byteLength: Buffer.byteLength(content)
  });
}

printResult({ ...plan, ok: true, applied: true, actions });

function inspectLocalSource() {
  if (!existsSync(sourcePath)) {
    return { ready: false, byteLength: 0, mode: "missing", validation: "missing_source_file" };
  }
  const stat = lstatSync(sourcePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    return { ready: false, byteLength: stat.size, mode: modeLabel(stat.mode), validation: "regular_file_required" };
  }
  if ((stat.mode & 0o077) !== 0) {
    return { ready: false, byteLength: stat.size, mode: modeLabel(stat.mode), validation: "owner_only_permissions_required" };
  }
  if (stat.size < 1 || stat.size > 1024 * 1024) {
    return { ready: false, byteLength: stat.size, mode: modeLabel(stat.mode), validation: "secret_file_size_invalid" };
  }
  if (!/\.ya?ml$/i.test(sourcePath) || !/^[A-Za-z0-9._-]+$/.test(secretFileName)) {
    return { ready: false, byteLength: stat.size, mode: modeLabel(stat.mode), validation: "yaml_or_filename_invalid" };
  }
  const validation = spawnSync(process.execPath, ["scripts/check-launch-inputs.mjs", "--", sourcePath], {
    cwd,
    env: {
      ...process.env,
      MUSUNIL_USER_INPUTS_B64: "",
      MUSUNIL_USER_INPUTS_FILE_PATH: ""
    },
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024
  });
  return {
    ready: validation.status === 0,
    byteLength: stat.size,
    mode: modeLabel(stat.mode),
    validation: validation.status === 0 ? "launch_inputs_valid" : "launch_inputs_invalid"
  };
}

async function inspectRemoteState() {
  const services = [];
  for (const input of serviceInputs) {
    try {
      const service = await resolveService(input);
      const secretFiles = await listSecretFiles(service.id);
      services.push({
        kind: input.kind,
        ok: true,
        id: service.id,
        name: service.name,
        type: service.type,
        secretFilePresent: secretFiles.includes(secretFileName)
      });
    } catch (error) {
      services.push({
        kind: input.kind,
        ok: false,
        id: input.id,
        name: input.name,
        error: error instanceof Error ? error.message : "Render inspection failed"
      });
    }
  }
  return { inspected: true, services };
}

function requiredEnv() {
  const required = [];
  if (!token) required.push("RENDER_API_TOKEN");
  if (confirmation !== "APPLY_RUNTIME_SECRET_FILE") {
    required.push("MUSUNIL_RENDER_SECRET_APPLY_CONFIRM=APPLY_RUNTIME_SECRET_FILE");
  }
  if (!local.ready) required.push("valid owner-only config/musunil.user-inputs.local.yaml");
  for (const service of remote.services.filter((item) => !item.ok)) {
    required.push(`${service.kind} service ${service.name} must exist or its exact service ID must be set`);
  }
  return required;
}

function applyFailures() {
  const failures = [];
  if (!local.ready) failures.push(`local user-inputs source is not ready: ${local.validation}`);
  if (!token) failures.push("RENDER_API_TOKEN is required for --apply");
  if (confirmation !== "APPLY_RUNTIME_SECRET_FILE") {
    failures.push("MUSUNIL_RENDER_SECRET_APPLY_CONFIRM must equal APPLY_RUNTIME_SECRET_FILE");
  }
  for (const service of remote.services.filter((item) => !item.ok)) {
    failures.push(`${service.kind} service is unavailable: ${service.name}`);
  }
  return failures;
}

async function resolveService(input) {
  if (input.id) return await getService(input.id);
  const query = new URLSearchParams({ name: input.name, includePreviews: "false", limit: "100" });
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

async function listSecretFiles(serviceId) {
  const body = await renderRequest("GET", `/services/${encodeURIComponent(serviceId)}/secret-files?limit=100`);
  return (Array.isArray(body) ? body : [])
    .map((item) => item.secretFile || item)
    .map((item) => item?.name || item?.filename || item?.key || "")
    .filter(Boolean);
}

async function putEnvironmentPath(serviceId) {
  await renderRequest(
    "PUT",
    `/services/${encodeURIComponent(serviceId)}/env-vars/${encodeURIComponent("MUSUNIL_USER_INPUTS_FILE_PATH")}`,
    { value: runtimePath }
  );
}

async function putSecretFile(serviceId, content) {
  await renderRequest(
    "PUT",
    `/services/${encodeURIComponent(serviceId)}/secret-files/${encodeURIComponent(secretFileName)}`,
    { content }
  );
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
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const codes = Array.isArray(payload?.errors)
      ? payload.errors.map((item) => item?.code).filter(Boolean).join(",")
      : "";
    throw new Error(`Render API failed with ${response.status}${codes ? ` (${codes})` : ""}`);
  }
  return payload;
}

function serviceInput(kind, defaultName) {
  const idEnv = `MUSUNIL_RENDER_${kind}_SERVICE_ID`;
  const nameEnv = `MUSUNIL_RENDER_${kind}_SERVICE_NAME`;
  return {
    kind: kind.toLowerCase(),
    idEnv,
    id: process.env[idEnv] || "",
    name: process.env[nameEnv] || defaultName
  };
}

function argValue(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || "" : "";
}

function safeDisplayPath(path) {
  const local = relative(cwd, path);
  return local && !local.startsWith("..") ? local : basename(path);
}

function modeLabel(mode) {
  return `0${(mode & 0o777).toString(8).padStart(3, "0")}`;
}

function printResult(value) {
  const output = JSON.stringify(value, null, 2);
  if (json) console.log(output);
  else console.log(output);
}
