alter table evidence add column if not exists source_checked_at timestamptz;
alter table evidence add column if not exists source_granularity text;
