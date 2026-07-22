-- A zero-downtime Render deploy can stop an in-flight source worker before it
-- clears its lease. Release only an old public-source lease; a task started in
-- the last five minutes remains protected from concurrent execution.
update ops_task_leases
set lease_owner = null,
    lease_until = null,
    next_run_at = now(),
    updated_at = now()
where task_id = 'public_source_ingest'
  and lease_until > now()
  and last_started_at < now() - interval '5 minutes';
