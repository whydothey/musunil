import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node scripts/redact-media.mjs <input-video> <output.webm>");
  process.exit(2);
}

const ffmpeg = process.env.MUSUNIL_FFMPEG_BIN || "ffmpeg";
const args = [
  "-y",
  "-hide_banner",
  "-loglevel",
  "error",
  "-i",
  input,
  "-map",
  "0:v:0",
  "-map_metadata",
  "-1",
  "-map_chapters",
  "-1",
  "-an",
  "-sn",
  "-dn",
  "-vf",
  "scale=w='min(1280,iw)':h=-2:force_original_aspect_ratio=decrease,boxblur=18:2,setsar=1,format=yuv420p",
  "-c:v",
  "libvpx-vp9",
  "-deadline",
  "good",
  "-cpu-used",
  "4",
  "-crf",
  "35",
  "-b:v",
  "0",
  "-row-mt",
  "1",
  output
];

await run(ffmpeg, args, 120_000);
const result = await stat(output);
if (result.size <= 0) throw new Error("Redaction output is empty.");

function run(command, commandArgs, timeoutMs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 4_000) stderr += chunk.toString();
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Media redaction timed out."));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0 && !signal) resolveRun();
      else reject(new Error(`Media redaction failed (${signal || code}).${stderr.trim() ? ` ${stderr.trim()}` : ""}`));
    });
  });
}
