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
    "occurrences",
    "continuous_presences",
    "transit_occurrences",
    "crowd_density_signals",
    "route_segments",
    "route_checkpoints",
    "crowd_estimates",
    "claims",
    "evidence",
    "subscriptions",
    "notification_outbox",
    "reports",
    "audit_logs",
    "transparency_logs",
    "store_snapshots"
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
