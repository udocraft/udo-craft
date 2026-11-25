-- Bestseller flag for the home page try-on section («Спробуй наші бестселери»).
-- Set in admin → product → «Бестселер». The storefront cycles through active
-- bestsellers; with none flagged it falls back to its automatic pick.
alter table public.products
  add column if not exists is_bestseller boolean not null default false;

create index if not exists idx_products_bestseller
  on public.products (is_bestseller) where is_bestseller;
