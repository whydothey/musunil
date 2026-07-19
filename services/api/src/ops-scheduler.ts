import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import {
  childEnvironment,
  opsLeaseSeconds,
  opsTaskDefinitions,
  taskById,
  type OpsTaskDefinition
} from "./ops-scheduler-contract.ts";

const { Pool } = pg;
const workspaceRoot = resolve(import.meta.dirname, "../../..");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is required for the operations scheduler.");
if (!process.env.MUSUNIL_API_HOSTPORT && !process.env.MUSUNIL_API_BASE_URL) {
  throw new Error("MUSUNIL_API_HOSTPORT or MUSUNIL_API_BASE_URL is required for scheduled workers.");
}
if (!process.env.MUSUNIL_INTERNAL_API_KEY) {
  throw new Error("MUSUNIL_INTERNAL_API_KEY is required for scheduled workers.");
}
if (!process.env.MUSUNIL_USER_INPUTS_FILE_PATH && !process.env.MUSUNIL_USER_INPUTS_B64) {
  throw new Error("MUSUNIL_USER_INPUTS_FILE_PATH or MUSUNIL_USER_INPUTS_B64 is required for scheduled law ingestion.");
}

const workerId = `ops-${randomUUID()}`;
const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5_000 });
let activeChild: ReturnType<typeof spawn> | undefined;
let stopping = false;

process.once("SIGTERM", () => stop("SIGTERM"));
process.once("SIGINT", () => stop("SIGINT"));

try {
  const claimed: OpsTaskDefinition[] = [];
  const results: Array<{ taskId: string; ok: boolean; exitCode: number }> = [];

  while (!stopping) {
    const task = await claimNextDueTask();
    if (!task) break;
    claimed.push(task);
    let exitCode = 1;
    try {
      exitCode = await runTask(task);
    } catch {
      console.error(JSON.stringify({ status: "spawn_failed", taskId: task.id }));
    }
    const ok = exitCode === 0;
    await finishTask(task, ok, exitCode);
    results.push({ taskId: task.id, ok, exitCode });
  }

  console.log(JSON.stringify({
    checked: "ops_scheduler_run",
    claimed: claimed.map((task) => task.id),
    results,
    ok: results.every((result) => result.ok)
  }, null, 2));

  if (results.some((result) => !result.ok)) process.exitCode = 1;
} finally {
  await pool.end();
}

async function claimNextDueTask(): Promise<OpsTaskDefinition | undefined> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const table = await client.query<{ table_name: string | null }>("select to_regclass('public.ops_task_leases')::text as table_name");
    if (!table.rows[0]?.table_name) throw new Error("ops_task_leases is missing; run pnpm db:migrate before the scheduler.");

    for (const task of opsTaskDefinitions) {
      await client.query(
        `insert into ops_task_leases(task_id, cadence_seconds, retry_seconds, next_run_at)
         values ($1, $2, $3, now())
         on conflict (task_id) do update
         set cadence_seconds = excluded.cadence_seconds,
             retry_seconds = excluded.retry_seconds,
             updated_at = now()`,
        [task.id, task.cadenceSeconds, task.retrySeconds]
      );
    }

    const due = await client.query<{ task_id: string }>(
      `select task_id
       from ops_task_leases
       where next_run_at <= now()
         and (lease_until is null or lease_until <= now())
       order by next_run_at,
                case task_id
                  when 'notification_dispatch' then 10
                  when 'public_source_ingest' then 20
                  when 'law_source_ingest' then 30
                  when 'media_redaction' then 35
                  when 'privacy_purge' then 40
                  else 100
                end
       for update skip locked
       limit 1`
    );

    const row = due.rows[0];
    if (row) {
      await client.query(
        `update ops_task_leases
         set lease_owner = $2,
             lease_until = now() + ($3::integer * interval '1 second'),
             last_started_at = now(),
             updated_at = now()
         where task_id = $1`,
        [row.task_id, workerId, opsLeaseSeconds]
      );
    }
    await client.query("commit");

    return row ? taskById(row.task_id) : undefined;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function runTask(task: OpsTaskDefinition): Promise<number> {
  console.log(JSON.stringify({ status: "started", taskId: task.id }));
  return await new Promise<number>((resolvePromise, reject) => {
    let settled = false;
    activeChild = spawn(task.command, task.args, {
      cwd: workspaceRoot,
      env: childEnvironment(task, process.env),
      stdio: "inherit"
    });
    const leaseRefresh = setInterval(() => {
      void renewLease(task).catch((error) => {
        if (settled) return;
        console.error(JSON.stringify({ status: "lease_refresh_failed", taskId: task.id }));
        activeChild?.kill("SIGTERM");
        settled = true;
        clearInterval(leaseRefresh);
        reject(error);
      });
    }, Math.max(1_000, Math.floor(opsLeaseSeconds * 1_000 / 3)));
    leaseRefresh.unref();
    activeChild.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearInterval(leaseRefresh);
      reject(error);
    });
    activeChild.once("exit", (code, signal) => {
      activeChild = undefined;
      if (settled) return;
      settled = true;
      clearInterval(leaseRefresh);
      if (signal) {
        console.error(JSON.stringify({ status: "terminated", taskId: task.id, signal }));
        resolvePromise(1);
      } else {
        resolvePromise(code ?? 1);
      }
    });
  });
}

async function renewLease(task: OpsTaskDefinition): Promise<void> {
  const result = await pool.query(
    `update ops_task_leases
     set lease_until = now() + ($3::integer * interval '1 second'),
         updated_at = now()
     where task_id = $1 and lease_owner = $2 and lease_until > now()`,
    [task.id, workerId, opsLeaseSeconds]
  );
  if (result.rowCount !== 1) throw new Error(`Lost operations scheduler lease for ${task.id}.`);
}

async function finishTask(task: OpsTaskDefinition, ok: boolean, exitCode: number): Promise<void> {
  const result = await pool.query(
    ok
      ? `update ops_task_leases
         set next_run_at = now() + (cadence_seconds * interval '1 second'),
             lease_owner = null,
             lease_until = null,
             last_succeeded_at = now(),
             failure_count = 0,
             last_error_code = null,
             updated_at = now()
         where task_id = $1 and lease_owner = $2`
      : `update ops_task_leases
         set next_run_at = now() + (retry_seconds * interval '1 second'),
             lease_owner = null,
             lease_until = null,
             last_failed_at = now(),
             failure_count = failure_count + 1,
             last_error_code = $3,
             updated_at = now()
         where task_id = $1 and lease_owner = $2`,
    ok ? [task.id, workerId] : [task.id, workerId, `task_exit_${exitCode}`]
  );
  if (result.rowCount !== 1) throw new Error(`Lost operations scheduler lease for ${task.id}.`);
}

function stop(signal: string): void {
  stopping = true;
  console.error(JSON.stringify({ status: "stopping", signal }));
  activeChild?.kill("SIGTERM");
}
