create table if not exists law_items (
  id text primary key,
  source text not null check (source in ('assembly_bill', 'law_effective')),
  law_name text not null,
  bill_title text,
  stage text not null,
  status_date timestamptz,
  effective_date timestamptz,
  assembly_bill_id text,
  law_id text,
  summary text,
  official_url text,
  keywords jsonb not null default '[]'::jsonb
);

create table if not exists issue_law_links (
  issue_id text not null references issues(id),
  law_item_id text not null references law_items(id),
  match_basis text not null check (match_basis in ('law_name', 'keyword', 'bill_title', 'manual')),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  claim_ids jsonb not null default '[]'::jsonb,
  primary key (issue_id, law_item_id)
);

create index if not exists law_items_source_idx on law_items(source, status_date);
create index if not exists law_items_keywords_idx on law_items using gin(keywords);
create index if not exists issue_law_links_law_idx on issue_law_links(law_item_id);
