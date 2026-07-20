-- The public-source v2 parser changes police bulletins from public occurrences
-- into source-only evidence and emits individual schedule rows. Run it once as
-- soon as this migration lands instead of waiting for the previous hourly lease.
update ops_task_leases
set next_run_at = now(),
    updated_at = now()
where task_id = 'public_source_ingest';
