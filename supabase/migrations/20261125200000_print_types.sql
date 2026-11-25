-- Print types become data instead of a hardcoded enum, so the admin can add,
-- edit, hide and delete them.
--
-- 1. print_types table, seeded with the five existing types (same ids, so
--    existing pricing rows, zones and saved orders keep working).
-- 2. print_type_pricing.print_type: enum -> text + FK to print_types
--    (ON UPDATE CASCADE, ON DELETE RESTRICT: a type with prices cannot be deleted).
-- 3. print_zones.allowed_print_types: enum[] -> text[].
-- The old print_type_enum type is left in place (unused) so this migration is
-- easy to reason about; it can be dropped later.

create table if not exists public.print_types (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  label       text not null check (length(trim(label)) between 1 and 60),
  description text not null default '',
  color       text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.print_types (id, label, description, color, sort_order) values
  ('dtf',         'DTF',        'Прямий друк',       '#6366f1', 10),
  ('embroidery',  'Вишивка',    'Машинна вишивка',   '#ec4899', 20),
  ('screen',      'Шовкодрук',  'Трафаретний друк',  '#f59e0b', 30),
  ('sublimation', 'Сублімація', 'Термоперенос',      '#06b6d4', 40),
  ('patch',       'Нашивка',    'Тканинна нашивка',  '#10b981', 50)
on conflict (id) do nothing;

drop trigger if exists update_print_types_updated_at on public.print_types;
create trigger update_print_types_updated_at
  before update on public.print_types
  for each row execute function update_updated_at_column();

-- RLS: anyone can read (the storefront customizer lists types); staff write.
alter table public.print_types enable row level security;

drop policy if exists "print_types_select_public" on public.print_types;
create policy "print_types_select_public" on public.print_types
  for select to anon, authenticated using (true);

drop policy if exists "Staff write print_types" on public.print_types;
create policy "Staff write print_types" on public.print_types
  for all to authenticated
  using (public.is_staff_member()) with check (public.is_staff_member());

-- print_type_pricing: enum -> text with a foreign key.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'print_type_pricing'
      and column_name = 'print_type' and udt_name = 'print_type_enum'
  ) then
    alter table public.print_type_pricing
      alter column print_type type text using print_type::text;
  end if;

  -- Any type already used in pricing but missing from the seed gets a row,
  -- so the foreign key can be added without failing.
  insert into public.print_types (id, label)
  select distinct p.print_type, p.print_type
  from public.print_type_pricing p
  where not exists (select 1 from public.print_types t where t.id = p.print_type)
  on conflict (id) do nothing;

  if not exists (
    select 1 from pg_constraint where conname = 'print_type_pricing_print_type_fkey'
  ) then
    alter table public.print_type_pricing
      add constraint print_type_pricing_print_type_fkey
      foreign key (print_type) references public.print_types(id)
      on update cascade on delete restrict;
  end if;
end $$;

-- print_zones.allowed_print_types: enum[] -> text[].
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'print_zones'
      and column_name = 'allowed_print_types' and udt_name = '_print_type_enum'
  ) then
    alter table public.print_zones alter column allowed_print_types drop default;
    alter table public.print_zones
      alter column allowed_print_types type text[] using allowed_print_types::text[];
    alter table public.print_zones
      alter column allowed_print_types set default array['dtf']::text[];
  end if;
end $$;
