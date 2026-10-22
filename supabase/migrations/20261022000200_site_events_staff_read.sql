-- Analytics events were readable by any signed-up customer (role "authenticated").
-- Restrict reads to staff. Anonymous inserts for tracking stay as they are.
drop policy if exists "Site events admin read" on site_events;
create policy "Site events staff read" on site_events
  for select to authenticated
  using (public.is_staff_member());
