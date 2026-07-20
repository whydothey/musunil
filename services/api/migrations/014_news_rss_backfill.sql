update ops_task_leases
set next_run_at = now(),
    lease_owner = null,
    lease_until = null,
    failure_count = 0,
    last_error_code = null,
    updated_at = now()
where task_id = 'news_source_ingest';
