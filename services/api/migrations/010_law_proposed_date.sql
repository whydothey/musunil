alter table law_items add column if not exists proposed_date timestamptz;

create index if not exists law_items_proposed_date_idx
  on law_items(source, proposed_date desc nulls last);
