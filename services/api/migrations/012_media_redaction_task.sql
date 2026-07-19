insert into ops_task_leases(task_id, cadence_seconds, retry_seconds, next_run_at)
values ('media_redaction', 300, 120, now())
on conflict (task_id) do update
set cadence_seconds = excluded.cadence_seconds,
    retry_seconds = excluded.retry_seconds,
    updated_at = now();
