-- Re-run once with the expanded batch limit so no individual schedule row is
-- dropped when source-only bulletins and event rows total more than 25 records.
update ops_task_leases
set next_run_at = now(),
    updated_at = now()
where task_id = 'public_source_ingest';
