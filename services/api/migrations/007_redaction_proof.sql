alter table evidence add column if not exists redaction_checked_at timestamptz;
alter table evidence add column if not exists redaction_proof_hash text;
