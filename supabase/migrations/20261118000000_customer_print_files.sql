-- Customer-owned print files (own prints uploaded from the cabinet).
-- Files live in a PRIVATE bucket; the browser never gets a public URL.
-- Writes go through the API routes (service role after a session auth check),
-- so the table has read-only RLS for the owner.

create table if not exists customer_print_files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_print_files_user
  on customer_print_files(user_id, created_at desc);

alter table customer_print_files enable row level security;

drop policy if exists "Customer print files owner read" on customer_print_files;
create policy "Customer print files owner read" on customer_print_files
  for select to authenticated
  using (user_id = auth.uid());

drop trigger if exists update_customer_print_files_updated_at on customer_print_files;
create trigger update_customer_print_files_updated_at before update on customer_print_files
  for each row execute function update_updated_at_column();

insert into storage.buckets (id, name, public)
values ('customer-prints', 'customer-prints', false)
on conflict (id) do update set public = false;
