create table if not exists ops_task_leases (
  task_id text primary key,
  cadence_seconds integer not null check (cadence_seconds > 0),
  retry_seconds integer not null check (retry_seconds > 0),
  next_run_at timestamptz not null,
  lease_owner text,
  lease_until timestamptz,
  last_started_at timestamptz,
  last_succeeded_at timestamptz,
  last_failed_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_error_code text,
  updated_at timestamptz not null default now()
);

create index if not exists ops_task_leases_due_idx
  on ops_task_leases(next_run_at, lease_until);

insert into ops_task_leases(task_id, cadence_seconds, retry_seconds, next_run_at)
values
  ('notification_dispatch', 300, 60, now()),
  ('public_source_ingest', 3600, 300, now()),
  ('law_source_ingest', 43200, 900, now()),
  ('privacy_purge', 86400, 1800, now())
on conflict (task_id) do update
set cadence_seconds = excluded.cadence_seconds,
    retry_seconds = excluded.retry_seconds,
    updated_at = now();
