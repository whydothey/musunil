-- Re-run the official public-source worker once after deployment so recent
-- police bulletin attachments are split into individual occurrence Claims.
update ops_task_leases
set next_run_at = now(),
    updated_at = now()
where task_id = 'public_source_ingest';
