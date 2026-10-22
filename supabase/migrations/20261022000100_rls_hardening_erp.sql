-- ============================================================
-- RLS hardening, part 2: ERP and production tables
--
-- Follow-up to 20261022000000_rls_hardening.sql. Those tables still allowed any
-- registered customer (role "authenticated") to write stock, production and
-- recipe data. This migration drops every policy on these tables that relies on
-- auth.role() and replaces it with a staff-only policy.
--
-- Only tables that exist are changed. Apply after reviewing the table list.
-- ============================================================

do $$
declare
  rec record;
  tbl text;
begin
  foreach tbl in array array[
    'erp_materials', 'erp_suppliers', 'erp_warehouses',
    'erp_goods_receipts', 'erp_goods_receipt_lines',
    'product_variant_skus', 'product_variant_recipe_lines', 'product_recipe_lines',
    'erp_production_orders', 'erp_production_order_lines', 'erp_processing_acts',
    'erp_finished_goods', 'erp_stock_movements', 'erp_stock_transfers', 'erp_stock_transfer_lines'
  ]
  loop
    if to_regclass('public.' || tbl) is null then
      continue;
    end if;

    for rec in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = tbl
        and (coalesce(qual, '') ilike '%auth.role()%' or coalesce(with_check, '') ilike '%auth.role()%')
    loop
      execute format('drop policy %I on public.%I', rec.policyname, tbl);
    end loop;

    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_staff_member()) with check (public.is_staff_member())',
      'Staff write ' || tbl, tbl
    );
  end loop;
end $$;
