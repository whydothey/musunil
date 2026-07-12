import { spawnSync } from "node:child_process";

const nodeArgs = ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "scripts/redaction-smoke.mjs"];

const redacted = runRedactionSmoke("node scripts/redaction-smoke-fixture.mjs redact {input} {output}");
if (redacted.status !== 0) {
  process.stderr.write(redacted.stderr || redacted.stdout || "redaction smoke redact fixture failed without output\n");
  process.exit(1);
}
if (!redacted.stdout.includes("redaction_engine_smoke")) {
  process.stderr.write("redaction smoke redact fixture did not emit redaction_engine_smoke proof marker.\n");
  process.exit(1);
}

const copied = runRedactionSmoke("node scripts/redaction-smoke-fixture.mjs copy {input} {output}");
if (copied.status === 0) {
  process.stderr.write("redaction smoke copy fixture unexpectedly passed with unredacted sample content.\n");
  process.exit(1);
}
if (!copied.stderr.includes("unredacted sensitive sample token")) {
  process.stderr.write("redaction smoke copy fixture failed for the wrong reason.\n");
  process.exit(1);
}
for (const output of [redacted.stdout, redacted.stderr, copied.stdout, copied.stderr]) {
  if (output.includes("sample face") || output.includes("12가3456")) {
    process.stderr.write("redaction smoke safety check leaked sensitive sample content to logs.\n");
    process.exit(1);
  }
}

console.log(JSON.stringify({ checked: "redaction_smoke_safety", redactedFixture: "passed", copyFixture: "rejected" }, null, 2));

function runRedactionSmoke(command) {
  return spawnSync(process.execPath, nodeArgs, {
    env: {
      ...process.env,
      MUSUNIL_USER_INPUTS_FILE_PATH: "",
      MUSUNIL_USER_INPUTS_B64: Buffer.from(userInputs(command)).toString("base64")
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function userInputs(command) {
  return `features:
  free_comments_enabled: false
  voting_enabled: false
redaction:
  engine_smoke_command: "${command}"
`;
}
