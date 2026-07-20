-- Re-run the public source once so existing individual schedules are grouped
-- into honest, location-based schedule topics without inventing protest aims.
update ops_task_leases
set next_run_at = now(),
    updated_at = now()
where task_id = 'public_source_ingest';
