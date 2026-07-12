import { mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");
const lockRoot = resolve(cwd, "tmp");
const lockDir = resolve(lockRoot, "web-static-files.lock");
const waitMs = 100;
const timeoutMs = 120_000;
const staleMs = 300_000;

export function acquireWebStaticFileLock(label) {
  mkdirSync(lockRoot, { recursive: true });
  const startedAt = Date.now();
  for (;;) {
    try {
      mkdirSync(lockDir);
      writeFileSync(
        resolve(lockDir, "owner.json"),
        `${JSON.stringify({ label, pid: process.pid, acquiredAt: new Date().toISOString() }, null, 2)}\n`
      );
      return () => rmSync(lockDir, { recursive: true, force: true });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      removeStaleLock();
      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`Timed out waiting for Web static file lock: ${lockDir}`);
      }
      sleep(waitMs);
    }
  }
}

function removeStaleLock() {
  try {
    const stats = statSync(lockDir);
    if (Date.now() - stats.mtimeMs > staleMs) rmSync(lockDir, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
