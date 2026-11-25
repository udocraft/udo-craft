-- leads.tags is written by the admin (order tags, KeyCRM sync) but was never
-- declared in schema.sql or any migration. Idempotent: a no-op where the column
-- already exists in production.
alter table if exists public.leads
  add column if not exists tags text[] not null default '{}';

-- KeyCRM sync looks leads up by customer_data->>'keycrm_id' in one batch query.
create index if not exists idx_leads_keycrm_id
  on public.leads ((customer_data->>'keycrm_id'));
