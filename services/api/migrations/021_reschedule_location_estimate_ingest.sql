-- Re-run official attachment ingestion once so individual schedules receive
-- display-safe location text, blurred source estimates, and cleaned titles.
update ops_task_leases
set next_run_at = now(),
    updated_at = now()
where task_id = 'public_source_ingest';
