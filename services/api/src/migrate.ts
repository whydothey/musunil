import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { loadUserInputs } from "../../../packages/config/src/index.ts";

const { Pool } = pg;
const cwd = resolve(import.meta.dirname, "../../..");
const migrations = readMigrations();

if (process.argv.includes("--check")) {
  if (migrations.length === 0) throw new Error("No SQL migrations found.");
  assertRequiredTables(migrations.map((item) => item.sql).join("\n"));
  console.log(`Migration check passed: ${migrations.map((item) => item.name).join(", ")}`);
} else {
  const databaseUrl = readDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    for (const migration of migrations) {
      await pool.query(migration.sql);
      console.log(`Applied ${migration.name}`);
    }
  } finally {
    await pool.end();
  }
}

function assertRequiredTables(sql: string): void {
  for (const table of [
    "issues",
    "area_clusters",
    "law_items",
    "issue_law_links",
    "news_issue_candidates",
    "news_provider_usage",
    "occurrences",
    "continuous_presences",
    "crowd_estimates",
    "claims",
    "evidence",
    "subscriptions",
    "notification_outbox",
    "reports",
    "audit_logs",
    "transparency_logs",
    "store_snapshots",
    "ops_task_leases"
  ]) {
    if (!new RegExp(`create table if not exists ${table}\\b`, "i").test(sql)) {
      throw new Error(`Missing required migration table: ${table}`);
    }
  }
  if (/unique\s*\(\s*dedupe_key\s*,\s*status\s*\)/i.test(sql)) {
    throw new Error("notification_outbox must not use unique(dedupe_key, status); use a pending-only unique index.");
  }
  if (!/unique index if not exists notification_outbox_pending_dedupe_idx[\s\S]*where status = 'pending'/i.test(sql)) {
    throw new Error("notification_outbox pending dedupe partial unique index is missing.");
  }
  if (!/state_ciphertext\s+text/i.test(sql)) {
    throw new Error("store_snapshots.state_ciphertext column is missing.");
  }
  if (!/claims[\s\S]*visibility\s+text/i.test(sql)) {
    throw new Error("claims.visibility column is missing.");
  }
  if (!/public_location\s+jsonb/i.test(sql)) {
    throw new Error("public_location column is missing for map occurrence units.");
  }
  if (!/private_lng\s+double precision/i.test(sql) || !/private_lat\s+double precision/i.test(sql)) {
    throw new Error("private coordinate columns are missing for proof-of-presence area derivation.");
  }
  const schedulerSource = readFileSync(resolve(cwd, "services/api/src/ops-scheduler.ts"), "utf8");
  if (!/for update skip locked\s+limit 1/i.test(schedulerSource) || !/renewLease\(task\)/.test(schedulerSource)) {
    throw new Error("operations scheduler must claim one due task with FOR UPDATE SKIP LOCKED and renew its lease.");
  }
  for (const taskId of ["notification_dispatch", "public_source_ingest", "law_source_ingest", "news_source_ingest", "media_redaction", "privacy_purge"]) {
    if (!sql.includes(`'${taskId}'`)) throw new Error(`operations scheduler migration seed is missing: ${taskId}`);
  }
}

function readMigrations(): Array<{ name: string; sql: string }> {
  const dir = resolve(cwd, "services/api/migrations");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(resolve(dir, name), "utf8") }))
    .filter((migration) => migration.sql.trim().length > 0);
}

function readDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl) return envUrl;
  const configUrl = readString(loadUserInputs({ cwd }).config, "postgres.database_url");
  if (!configUrl) throw new Error("postgres.database_url or DATABASE_URL is required.");
  return configUrl;
}

function readString(config: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, config);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
