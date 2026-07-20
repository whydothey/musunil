alter table evidence add column if not exists external_provider text;
alter table evidence add column if not exists external_id text;
alter table evidence add column if not exists source_url text;
alter table evidence add column if not exists aggregator_url text;
alter table evidence add column if not exists publisher_label text;
alter table evidence add column if not exists source_published_at timestamptz;
alter table evidence add column if not exists source_title text;
alter table evidence add column if not exists public_summary text;
alter table evidence add column if not exists news_direct_bill_match boolean not null default false;

create unique index if not exists evidence_external_provider_id_idx
  on evidence(external_provider, external_id)
  where external_provider is not null and external_id is not null;

create table if not exists news_issue_candidates (
  id text primary key,
  law_group_id text not null,
  core_topic_key text not null,
  suggested_title text not null,
  pending_evidence_ids jsonb not null default '[]'::jsonb,
  approved_evidence_ids jsonb not null default '[]'::jsonb,
  rejected_evidence_ids jsonb not null default '[]'::jsonb,
  status text not null check (status in ('candidate', 'approved', 'rejected')),
  issue_id text references issues(id),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  reviewed_at timestamptz,
  review_note text
);

create index if not exists news_issue_candidates_group_idx
  on news_issue_candidates(law_group_id, core_topic_key, status);

create table if not exists news_provider_usage (
  provider text not null,
  month text not null,
  call_count integer not null default 0,
  updated_at timestamptz not null,
  primary key(provider, month)
);

insert into ops_task_leases(task_id, cadence_seconds, retry_seconds, next_run_at)
values ('news_source_ingest', 3600, 600, now())
on conflict (task_id) do update
set cadence_seconds = excluded.cadence_seconds,
    retry_seconds = excluded.retry_seconds,
    updated_at = now();
