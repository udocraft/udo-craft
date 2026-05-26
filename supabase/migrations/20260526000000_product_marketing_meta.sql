alter table public.products
  add column if not exists discount_grid jsonb not null default '[]';

alter table public.products
  add column if not exists marketing_meta jsonb not null default '{}';

alter table public.products
  alter column discount_grid set default '[]'::jsonb;
