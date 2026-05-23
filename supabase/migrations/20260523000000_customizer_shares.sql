-- Customizer share links and comments

create table if not exists customizer_shares (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  product_id uuid references products(id) on delete cascade not null,
  created_by uuid,
  owner_email text,
  access text not null default 'view' check (access in ('view', 'comment', 'edit')),
  payload jsonb not null default '{}',
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customizer_share_comments (
  id uuid primary key default uuid_generate_v4(),
  share_id uuid references customizer_shares(id) on delete cascade not null,
  body text not null,
  author_id uuid,
  author_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customizer_shares_token on customizer_shares(token);
create index if not exists idx_customizer_shares_product_id on customizer_shares(product_id);
create index if not exists idx_customizer_share_comments_share_id on customizer_share_comments(share_id, created_at);

alter table if exists customizer_shares enable row level security;
alter table if exists customizer_share_comments enable row level security;

do $$
begin
  drop policy if exists "Customizer shares no direct access" on customizer_shares;
  drop policy if exists "Customizer share comments no direct access" on customizer_share_comments;
end $$;

drop trigger if exists update_customizer_shares_updated_at on customizer_shares;
create trigger update_customizer_shares_updated_at before update on customizer_shares
  for each row execute function update_updated_at_column();
