create table if not exists issues (
  id text primary key,
  title text not null,
  normalized_topic_key text not null,
  topic_tags jsonb not null default '[]'::jsonb,
  status text not null check (status in ('active', 'quiet', 'archived')),
  first_seen_at timestamptz not null,
  last_updated_at timestamptz not null
);

create table if not exists area_clusters (
  id text primary key,
  label text not null,
  region_label text not null,
  target_refs jsonb not null default '[]'::jsonb
);

create table if not exists occurrences (
  id text primary key,
  issue_id text references issues(id),
  campaign_id text,
  type text not null,
  area_cluster_id text not null references area_clusters(id),
  region_label text not null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  lifecycle_state text not null,
  claim_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb
);

create table if not exists claims (
  id text primary key,
  visibility text not null default 'public' check (visibility in ('public', 'held_private')),
  target_type text not null,
  target_id text not null,
  source_provenance text not null,
  claimant_label text not null,
  statement text not null default '',
  normalized_statement text not null,
  evidence_strength text not null,
  risk_level text not null,
  occurred_at timestamptz,
  observed_at timestamptz,
  created_at timestamptz not null,
  evidence_ids jsonb not null default '[]'::jsonb,
  disputed_by_claim_ids jsonb not null default '[]'::jsonb
);

create table if not exists evidence (
  id text primary key,
  evidence_type text not null,
  uploaded_at timestamptz not null,
  captured_at timestamptz,
  storage_key text,
  public_storage_key text,
  hash text,
  geo_cell text,
  public_radius_m integer,
  foreground_gps boolean,
  gps_accuracy_m integer,
  distance_to_target_m integer,
  device_integrity_status text,
  proof_of_presence_status text,
  redaction_status text not null default 'not_required'
);

create table if not exists subscriptions (
  id text primary key,
  user_id text not null,
  target_type text not null,
  target_id text not null,
  alert_level text not null,
  alert_types jsonb not null default '[]'::jsonb,
  muted_until timestamptz
);

create table if not exists notification_outbox (
  id text primary key,
  user_id text not null,
  target_type text not null,
  target_id text not null,
  notification_type text not null,
  dedupe_key text not null,
  title text not null,
  body text not null,
  uncertainty_label text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null
);

create table if not exists audit_logs (
  id text primary key,
  action text not null,
  target_type text not null,
  target_id text not null,
  created_at timestamptz not null,
  reason text not null
);

create table if not exists transparency_logs (
  id text primary key,
  action text not null,
  target_type text not null,
  target_id text not null,
  created_at timestamptz not null,
  public_reason text not null
);

create table if not exists store_snapshots (
  id text primary key,
  state jsonb not null,
  state_ciphertext text,
  updated_at timestamptz not null default now()
);

create index if not exists claims_target_idx on claims(target_type, target_id);
create index if not exists occurrences_area_idx on occurrences(area_cluster_id);
create index if not exists notification_outbox_pending_idx on notification_outbox(status, scheduled_for);
create unique index if not exists notification_outbox_pending_dedupe_idx on notification_outbox(dedupe_key) where status = 'pending';
