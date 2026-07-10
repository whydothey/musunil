alter table claims add column if not exists visibility text not null default 'public';

do $$
begin
  alter table claims add constraint claims_visibility_check check (visibility in ('public', 'held_private'));
exception
  when duplicate_object then null;
end $$;
