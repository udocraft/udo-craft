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
