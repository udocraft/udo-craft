-- ============================================================
-- RLS hardening
--
-- Context: the live database (verified 2026-10-22) allows the public/anon role to
-- read every lead, message and order item, and allows any registered customer
-- (role "authenticated") to write catalogue, CMS, ERP and lead data.
--
-- This migration is NOT applied automatically. Apply it to staging first and run
-- the storefront checkout, customer cabinet, Telegram mini-app and admin flows.
--
-- Requirements before applying to production:
--   * SUPABASE_SERVICE_ROLE_KEY is set for apps/client and apps/telegram-mini-app
--     (their lead and order inserts move to server routes that use the service role).
--   * memberships has columns user_id and status, and roles/memberships are present.
-- ============================================================

-- ── Staff check used by the write policies below ───────────────────────────────
-- Active staff = a row in memberships with status 'active'. Replace with a
-- per-permission check once the live role_permissions model is confirmed.
create or replace function public.is_staff_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

revoke execute on function public.is_staff_member() from public, anon;
grant execute on function public.is_staff_member() to authenticated, service_role;

-- ── Leads, messages, order items: remove anonymous and public access ─────────
drop policy if exists "Leads admin read" on leads;
drop policy if exists "Leads public read" on leads;
drop policy if exists "Leads public create" on leads;
drop policy if exists "Leads admin update" on leads;
drop policy if exists leads_insert_anon on leads;

drop policy if exists "Anyone can read messages" on messages;
drop policy if exists "Messages public read" on messages;
drop policy if exists "Messages public insert" on messages;
drop policy if exists "Users can insert messages" on messages;
drop policy if exists messages_insert_anon on messages;
drop policy if exists "Messages admin all" on messages;

drop policy if exists "Order items admin read" on order_items;
drop policy if exists "Order items public read" on order_items;
drop policy if exists "Order items public create" on order_items;
drop policy if exists "Order items admin update" on order_items;
drop policy if exists order_items_insert_anon on order_items;

-- Staff can work with leads, messages and order items.
drop policy if exists "Staff manage leads" on leads;
create policy "Staff manage leads" on leads for all to authenticated
  using (public.is_staff_member()) with check (public.is_staff_member());

drop policy if exists "Staff manage messages" on messages;
create policy "Staff manage messages" on messages for all to authenticated
  using (public.is_staff_member()) with check (public.is_staff_member());

drop policy if exists "Staff manage order items" on order_items;
create policy "Staff manage order items" on order_items for all to authenticated
  using (public.is_staff_member()) with check (public.is_staff_member());

-- ── Catalogue, CMS, ERP and print settings: write access for staff only ──────
-- Public read policies are left in place; only write policies change.
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('products', 'Products admin write'),
      ('products', 'Admins can manage products'),
      ('categories', 'Categories admin write'),
      ('categories', 'Categories admin all'),
      ('materials', 'Materials admin write'),
      ('print_zones', 'Print zones admin write'),
      ('print_type_pricing', 'Print type pricing admin write'),
      ('print_areas', 'Print areas admin all'),
      ('print_presets', 'Admins manage presets'),
      ('product_color_variants', 'Product color variants admin write'),
      ('size_charts', 'Size charts admin all'),
      ('erp_material_categories', 'ERP material categories admin all'),
      ('erp_material_types', 'ERP material types admin all'),
      ('cms_content', 'Authenticated users can update cms_content'),
      ('cms_content', 'Authenticated users can upsert cms_content')
    ) as v(tbl, pol)
  loop
    execute format('drop policy if exists %I on public.%I', rec.pol, rec.tbl);
  end loop;
end $$;

drop policy if exists "Staff write products" on products;
create policy "Staff write products" on products for all to authenticated
  using (public.is_staff_member()) with check (public.is_staff_member());

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'categories', 'materials', 'print_zones', 'print_type_pricing', 'print_areas',
    'product_color_variants', 'size_charts', 'erp_material_categories', 'erp_material_types',
    'cms_content'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'Staff write ' || tbl, tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_staff_member()) with check (public.is_staff_member())',
      'Staff write ' || tbl, tbl
    );
  end loop;
end $$;

-- ── lead_tags had no RLS at all ───────────────────────────────────────────────
alter table if exists public.lead_tags enable row level security;
