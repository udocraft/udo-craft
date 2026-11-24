-- Social sign-in (Telegram) and passkey (WebAuthn) credentials.
-- Both tables are written and read only by the service role (RLS on, no policies).

create table if not exists public.social_identities (
  provider     text        not null,
  provider_uid text        not null,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (provider, provider_uid)
);

alter table public.social_identities enable row level security;

create table if not exists public.passkey_credentials (
  credential_id text        primary key,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  public_key    text        not null,
  counter       bigint      not null default 0,
  transports    text[],
  created_at    timestamptz not null default now()
);

create index if not exists passkey_credentials_user_idx on public.passkey_credentials (user_id);

alter table public.passkey_credentials enable row level security;
