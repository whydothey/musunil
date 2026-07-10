create table if not exists continuous_presences (
  id text primary key,
  issue_id text references issues(id),
  campaign_id text,
  area_cluster_id text not null references area_clusters(id),
  region_label text not null,
  presence_type text not null check (presence_type in ('sit_in', 'encampment', 'relay_protest', 'continuous_assembly')),
  first_proof_of_presence_at timestamptz,
  last_proof_of_presence_at timestamptz,
  state text not null check (state in ('ONGOING', 'PAUSED', 'ENDING_SOON', 'ENDED', 'ARCHIVED')),
  claim_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb
);

create table if not exists crowd_estimates (
  id text primary key,
  target_type text not null,
  target_id text not null,
  observed_at timestamptz not null,
  min_count integer not null,
  max_count integer not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  method text not null check (method in ('proof_of_presence_density', 'source_claim', 'hybrid')),
  evidence_count integer not null,
  independent_viewpoint_count integer not null,
  limitations jsonb not null default '[]'::jsonb
);

create table if not exists reports (
  id text primary key,
  user_id text,
  report_type text not null check (report_type in ('live', 'material', 'on_site_correction', 'rights_violation', 'rebuttal')),
  target_type text not null,
  target_id text not null,
  claim_id text references claims(id),
  created_at timestamptz not null
);

create index if not exists continuous_presences_area_idx on continuous_presences(area_cluster_id);
create index if not exists reports_user_idx on reports(user_id, created_at);
