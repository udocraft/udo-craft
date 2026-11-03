-- English catalog copy. The en locale shows these when filled in;
-- an empty value falls back to the Ukrainian name or description.
alter table public.products add column if not exists name_en text;
alter table public.products add column if not exists description_en text;
alter table public.categories add column if not exists name_en text;
