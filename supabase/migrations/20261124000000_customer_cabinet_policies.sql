-- Customer cabinet: a signed-in customer reads their own orders, order items and chat.
--
-- Ownership is the order's contact email. The old policies compared it case-sensitively
-- (customer_data->>'email' = auth.email()), while auth emails are stored lower-case, so an
-- order typed as "Name@Mail.com" never showed up. They also let a customer insert chat
-- messages as sender 'manager'. Staff access stays on the "Staff manage …" policies from
-- 20261022000000_rls_hardening.sql.
--
-- PREREQUISITE: Supabase Auth → Email → "Confirm email" must be ON (mailer_autoconfirm off).
-- Email-based ownership is only safe when nobody can register an address they do not own.
-- New sign-ups prove the address with a server-checked code (/api/auth/register).

create or replace function public.normalized_email(value text)
returns text
language sql
immutable
as $$ select nullif(lower(trim(value)), '') $$;

-- Orders
drop policy if exists leads_select_own on public.leads;
create policy leads_select_own on public.leads
  for select to authenticated
  using (public.normalized_email(customer_data->>'email') = public.normalized_email(auth.email()));

-- Orders are created by the server route (service role), never directly by customers.
drop policy if exists leads_insert_own on public.leads;

-- Order items
drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = order_items.lead_id
        and public.normalized_email(l.customer_data->>'email') = public.normalized_email(auth.email())
    )
  );

drop policy if exists order_items_insert_own on public.order_items;

-- Chat
drop policy if exists messages_select_own on public.messages;
create policy messages_select_own on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = messages.lead_id
        and public.normalized_email(l.customer_data->>'email') = public.normalized_email(auth.email())
    )
  );

drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own on public.messages
  for insert to authenticated
  with check (
    sender = 'client'
    and exists (
      select 1 from public.leads l
      where l.id = messages.lead_id
        and public.normalized_email(l.customer_data->>'email') = public.normalized_email(auth.email())
    )
  );
