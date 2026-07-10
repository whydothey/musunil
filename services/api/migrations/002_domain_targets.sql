create table if not exists continuous_presences (
  id text primary key,
  issue_id text references issues(id),
  campaign_id text,
  area_cluster_id text not null references area_clusters(id),
  region_label text not null,
  presence_type text not null check (presence_type in ('sit_in', 'encampment', 'relay_protest', 'continuous_assembly')),
  first_proof_of_presence_at timestamptz,
  last_proof_of_presence_at timestamptz,
  state text not null check (state in ('ONGOING', 'WEAKLY_OBSERVED', 'PAUSED', 'ENDING_SOON', 'ENDED', 'ARCHIVED')),
  claim_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb
);

create table if not exists transit_occurrences (
  id text primary key,
  issue_id text references issues(id),
  line_id text not null,
  station_ids jsonb not null default '[]'::jsonb,
  direction text,
  state text not null,
  delay_claim_ids jsonb not null default '[]'::jsonb,
  service_status_claim_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb
);

create table if not exists crowd_density_signals (
  id text primary key,
  area_cluster_id text not null references area_clusters(id),
  density_level text not null check (density_level in ('low', 'medium', 'high', 'critical', 'unknown')),
  bottleneck_flag boolean not null default false,
  flow_direction_claim_ids jsonb not null default '[]'::jsonb,
  emergency_signal_claim_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb
);

create table if not exists route_segments (
  id text primary key,
  route_id text not null,
  verification text not null check (verification in ('verified', 'claimed')),
  claim_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb
);

create table if not exists route_checkpoints (
  id text primary key,
  route_id text not null,
  checkpoint_type text not null check (checkpoint_type in ('police_block', 'traffic_control', 'standoff', 'route_split', 'unknown')),
  passable_status text not null check (passable_status in ('passable', 'blocked', 'uncertain')),
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
create index if not exists transit_occurrences_line_idx on transit_occurrences(line_id);
create index if not exists crowd_density_signals_area_idx on crowd_density_signals(area_cluster_id);
create index if not exists route_segments_route_idx on route_segments(route_id);
create index if not exists route_checkpoints_route_idx on route_checkpoints(route_id);
create index if not exists reports_user_idx on reports(user_id, created_at);
