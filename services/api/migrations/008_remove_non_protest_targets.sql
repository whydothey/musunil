drop table if exists route_checkpoints;
drop table if exists route_segments;
drop table if exists crowd_density_signals;
drop table if exists transit_occurrences;

alter table occurrences add column if not exists public_location jsonb;
alter table continuous_presences add column if not exists public_location jsonb;
alter table evidence add column if not exists private_lng double precision;
alter table evidence add column if not exists private_lat double precision;
