import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadUserInputs, validateLaunchConfig } from "../packages/config/src/index.ts";

const cwd = resolve(import.meta.dirname, "..");
const { config, source, path } = loadUserInputs({ cwd });
const issues = validateLaunchConfig(config).filter((issue) => issue.path === "redaction.engine_smoke_command");
if (issues.length) {
  for (const issue of issues) console.error(`${issue.path}: ${issue.message}`);
  process.exit(1);
}

const command = readString(config, "redaction.engine_smoke_command");
if (!command) {
  console.error("redaction.engine_smoke_command is required.");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "musunil-redaction-"));
const input = join(dir, "input.mp4");
const output = join(dir, "output.webm");
const sensitiveSamples = ["sample face", "12\uAC003456"];

try {
  await createSyntheticEvidence(input);
  await runTemplate(command.replaceAll("{input}", shellQuote(input)).replaceAll("{output}", shellQuote(output)));
  const size = statSync(output).size;
  if (size <= 0) throw new Error("redaction smoke output is empty.");
  const outputBytes = readFileSync(output);
  assertSampleRedacted(outputBytes);

  const probe = JSON.parse((await runCapture("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", output], 30_000)).toString("utf8"));
  const streams = Array.isArray(probe.streams) ? probe.streams : [];
  if (streams.filter((stream) => stream.codec_type === "video").length !== 1) throw new Error("redaction output must contain one video stream.");
  if (streams.some((stream) => stream.codec_type === "audio")) throw new Error("redaction output still contains audio.");
  assertSampleRedacted(Buffer.from(JSON.stringify(probe)));

  const [inputFrame, outputFrame] = await Promise.all([firstGrayFrame(input), firstGrayFrame(output)]);
  const inputEdges = edgeEnergy(inputFrame, 160, 90);
  const outputEdges = edgeEnergy(outputFrame, 160, 90);
  if (!(outputEdges < inputEdges * 0.72)) throw new Error("redaction output did not sufficiently reduce identifying visual detail.");

  const redactionProofHash = `sha256-${createHash("sha256").update(outputBytes).digest("base64url")}`;
  console.log(JSON.stringify({
    checked: "redaction_engine_smoke",
    source,
    path,
    outputBytes: size,
    redactionProofHash,
    audioRemoved: true,
    metadataRemoved: true,
    visualDetailRatio: Number((outputEdges / inputEdges).toFixed(3))
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}

async function createSyntheticEvidence(target) {
  await runCapture("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=24:duration=2",
    "-f", "lavfi", "-i", "sine=frequency=880:duration=2",
    "-metadata", `comment=${sensitiveSamples.join(" ")}`,
    "-c:v", "mpeg4", "-q:v", "2", "-c:a", "aac", "-shortest", target
  ], 30_000);
}

async function firstGrayFrame(target) {
  return await runCapture("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-i", target,
    "-frames:v", "1", "-vf", "scale=160:90,format=gray", "-f", "rawvideo", "pipe:1"
  ], 30_000);
}

function edgeEnergy(bytes, width, height) {
  if (bytes.length !== width * height) throw new Error("redaction smoke frame decode returned an unexpected size.");
  let sum = 0;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (x + 1 < width) {
        sum += Math.abs(bytes[index] - bytes[index + 1]);
        count += 1;
      }
      if (y + 1 < height) {
        sum += Math.abs(bytes[index] - bytes[index + width]);
        count += 1;
      }
    }
  }
  return sum / count;
}

function runTemplate(commandLine) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(commandLine, { cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 4_000) stderr += chunk.toString();
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("redaction smoke command timed out."));
    }, 120_000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolveRun();
      else reject(new Error(`redaction smoke command failed with ${code}.${stderr.trim() ? ` ${stderr.trim()}` : ""}`));
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function runCapture(command, args, timeoutMs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    let stderr = "";
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 4_000) stderr += chunk.toString();
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out.`));
    }, timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolveRun(Buffer.concat(stdout));
      else reject(new Error(`${command} failed with ${code}.${stderr.trim() ? ` ${stderr.trim()}` : ""}`));
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function assertSampleRedacted(outputBytes) {
  const outputText = outputBytes.toString("utf8");
  for (const sample of sensitiveSamples) {
    if (outputText.includes(sample)) throw new Error("redaction smoke output still contains an unredacted sensitive sample token.");
  }
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function readString(config, configPath) {
  const value = configPath.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
