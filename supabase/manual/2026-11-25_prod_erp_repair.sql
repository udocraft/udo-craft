-- Production repair, 2026-11-25. Run once in the Supabase SQL Editor.
--
-- Production was missing tables from 20260520000000_erp_core and
-- 20260520004000_erp_goods_flow (stock movements, production lines, processing
-- acts, finished goods, transfers). This creates only what is missing, then
-- applies the two new migrations from PR #108. Everything is idempotent and
-- additive: existing tables and data are not touched.
--
-- Access: RLS on, staff-only policies (same as 20261022000100_rls_hardening_erp).
-- If public.is_staff_member() does not exist, RLS stays on with no policy, so
-- only the server (service role) can use these tables.

begin;

-- 1. Enum types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'erp_stock_movement_type') then
    create type erp_stock_movement_type as enum (
      'receipt', 'reservation', 'production_consume', 'production_output',
      'adjustment', 'write_off', 'transfer_out', 'transfer_in'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'erp_document_status') then
    create type erp_document_status as enum ('draft', 'posted', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'erp_payment_status') then
    create type erp_payment_status as enum ('unpaid', 'partial', 'paid', 'refunded');
  end if;
end $$;
alter type erp_stock_movement_type add value if not exists 'transfer_out';
alter type erp_stock_movement_type add value if not exists 'transfer_in';

-- 2. Missing tables (copied from the original migrations)
create table if not exists erp_stock_movements (
  id uuid primary key default uuid_generate_v4(),
  erp_material_id uuid not null references erp_materials(id) on delete restrict,
  production_order_id uuid references erp_production_orders(id) on delete set null,
  movement_type erp_stock_movement_type not null,
  quantity numeric(14,3) not null,
  unit_cost_cents integer not null default 0 check (unit_cost_cents >= 0),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_erp_stock_movements_material on erp_stock_movements(erp_material_id, created_at desc);

create table if not exists erp_production_order_lines (
  id uuid primary key default uuid_generate_v4(),
  production_order_id uuid not null references erp_production_orders(id) on delete cascade,
  variant_sku_id uuid references product_variant_skus(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  due_date date,
  comment text,
  material_requirements jsonb not null default '[]',
  sort_order integer not null default 0
);

create table if not exists erp_processing_acts (
  id uuid primary key default uuid_generate_v4(),
  document_no text not null default ('ACT-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
  production_order_id uuid references erp_production_orders(id) on delete set null,
  warehouse_id uuid references erp_warehouses(id) on delete set null,
  status erp_document_status not null default 'draft',
  comment text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists erp_finished_goods (
  id uuid primary key default uuid_generate_v4(),
  variant_sku_id uuid not null references product_variant_skus(id) on delete cascade,
  warehouse_id uuid references erp_warehouses(id) on delete set null,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (variant_sku_id, warehouse_id)
);

create table if not exists erp_stock_transfers (
  id uuid primary key default uuid_generate_v4(),
  document_no text not null default ('TRN-' || to_char(now(), 'YYYYMMDD-HH24MISS')),
  from_warehouse_id uuid references erp_warehouses(id) on delete set null,
  to_warehouse_id uuid references erp_warehouses(id) on delete set null,
  status erp_document_status not null default 'draft',
  comment text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists erp_stock_transfer_lines (
  id uuid primary key default uuid_generate_v4(),
  transfer_id uuid not null references erp_stock_transfers(id) on delete cascade,
  erp_material_id uuid not null references erp_materials(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit text not null default 'шт.',
  comment text,
  sort_order integer not null default 0
);

alter table erp_stock_movements
  add column if not exists warehouse_id uuid references erp_warehouses(id) on delete set null,
  add column if not exists receipt_id uuid references erp_goods_receipts(id) on delete set null,
  add column if not exists transfer_id uuid references erp_stock_transfers(id) on delete set null,
  add column if not exists processing_act_id uuid references erp_processing_acts(id) on delete set null;

alter table leads
  add column if not exists payment_status erp_payment_status not null default 'unpaid',
  add column if not exists payment_amount_cents integer not null default 0,
  add column if not exists buyer_requisites jsonb not null default '{}',
  add column if not exists nova_poshta_data jsonb not null default '{}',
  add column if not exists fiscal_data jsonb not null default '{}';

create index if not exists idx_production_lines_order on erp_production_order_lines(production_order_id, sort_order);
create index if not exists idx_processing_acts_order on erp_processing_acts(production_order_id, created_at desc);
create index if not exists idx_finished_goods_variant on erp_finished_goods(variant_sku_id);
create index if not exists idx_transfers_status on erp_stock_transfers(status, created_at desc);

-- 3. Row level security: staff only
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'erp_stock_movements', 'erp_production_order_lines', 'erp_processing_acts',
    'erp_finished_goods', 'erp_stock_transfers', 'erp_stock_transfer_lines'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    if to_regprocedure('public.is_staff_member()') is not null then
      execute format('drop policy if exists %I on public.%I', 'Staff write ' || tbl, tbl);
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_staff_member()) with check (public.is_staff_member())',
        'Staff write ' || tbl, tbl
      );
    end if;
  end loop;
end $$;

-- 4. PR #108: leads.tags is written by the admin (order tags, KeyCRM sync) but was never
-- leads.tags is written by the admin (order tags, KeyCRM sync) but was never
-- declared in schema.sql or any migration. Idempotent: a no-op where the column
-- already exists in production.
alter table if exists public.leads
  add column if not exists tags text[] not null default '{}';

-- KeyCRM sync looks leads up by customer_data->>'keycrm_id' in one batch query.
create index if not exists idx_leads_keycrm_id
  on public.leads ((customer_data->>'keycrm_id'));

-- 5. PR #108: atomic stock functions
-- Atomic stock changes. The admin used to read stock_quantity, add in JS and
-- write it back, so two postings at the same moment could lose one of them.
-- These functions change the number inside one UPDATE, which Postgres serialises.

create or replace function public.erp_adjust_material_stock(
  p_material_id uuid,
  p_delta numeric,
  p_unit_cost_cents integer default null
) returns numeric
language sql
security definer
set search_path = public
as $$
  update erp_materials
     set stock_quantity = stock_quantity + p_delta,
         unit_cost_cents = coalesce(p_unit_cost_cents, unit_cost_cents)
   where id = p_material_id
  returning stock_quantity;
$$;

create or replace function public.erp_add_finished_goods(
  p_variant_sku_id uuid,
  p_warehouse_id uuid,
  p_quantity integer
) returns integer
language sql
security definer
set search_path = public
as $$
  -- Rows without a warehouse never conflict (NULLs are distinct), matching how
  -- the admin stored them before.
  insert into erp_finished_goods (variant_sku_id, warehouse_id, quantity)
  values (p_variant_sku_id, p_warehouse_id, p_quantity)
  on conflict (variant_sku_id, warehouse_id)
  do update set quantity = erp_finished_goods.quantity + excluded.quantity,
                updated_at = now()
  returning quantity;
$$;

-- Only the server (service role) may call them.
revoke all on function public.erp_adjust_material_stock(uuid, numeric, integer) from public, anon, authenticated;
revoke all on function public.erp_add_finished_goods(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.erp_adjust_material_stock(uuid, numeric, integer) to service_role;
grant execute on function public.erp_add_finished_goods(uuid, uuid, integer) to service_role;

commit;

-- Check: every row should say true.
select t.name, to_regclass('public.' || t.name) is not null as exists
from unnest(array[
  'erp_stock_movements','erp_production_order_lines','erp_processing_acts',
  'erp_finished_goods','erp_stock_transfers','erp_stock_transfer_lines'
]) as t(name)
union all
select 'function erp_adjust_material_stock', to_regprocedure('public.erp_adjust_material_stock(uuid,numeric,integer)') is not null
union all
select 'function erp_add_finished_goods', to_regprocedure('public.erp_add_finished_goods(uuid,uuid,integer)') is not null
union all
select 'column leads.tags', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leads' and column_name = 'tags');
