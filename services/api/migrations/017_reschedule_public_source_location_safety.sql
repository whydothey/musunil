-- Re-run the official source parser once so route-like location labels are
-- corrected and newly allowlisted blurred area pins are attached immediately.
update ops_task_leases
set next_run_at = now(),
    updated_at = now()
where task_id = 'public_source_ingest';
