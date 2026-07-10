alter table claims add column if not exists review_target_claim_id text;
alter table claims add column if not exists field_verification text;

alter table evidence add column if not exists media_mime_type text;
alter table evidence add column if not exists byte_size integer;
alter table evidence add column if not exists duration_ms integer;
alter table evidence add column if not exists width integer;
alter table evidence add column if not exists height integer;
alter table evidence add column if not exists capture_mode text;
