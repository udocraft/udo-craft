-- Admin authorization foundation.
-- Source of truth for admin access is server-owned membership and permission data,
-- not auth.users.user_metadata.

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users add column if not exists id uuid references auth.users(id) on delete cascade;
alter table public.app_users add column if not exists email text;
alter table public.app_users add column if not exists full_name text;
alter table public.app_users add column if not exists created_at timestamptz not null default now();
alter table public.app_users add column if not exists updated_at timestamptz not null default now();
create unique index if not exists app_users_id_key on public.app_users (id);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.roles add column if not exists id uuid default gen_random_uuid();
alter table public.roles add column if not exists name text;
alter table public.roles add column if not exists description text;
alter table public.roles add column if not exists created_at timestamptz not null default now();
update public.roles set id = gen_random_uuid() where id is null;
create unique index if not exists roles_id_key on public.roles (id);
create unique index if not exists roles_name_key on public.roles (name);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.permissions add column if not exists id uuid default gen_random_uuid();
alter table public.permissions add column if not exists key text;
alter table public.permissions add column if not exists description text;
alter table public.permissions add column if not exists created_at timestamptz not null default now();
update public.permissions set id = gen_random_uuid() where id is null;
create unique index if not exists permissions_id_key on public.permissions (id);
create unique index if not exists permissions_key_key on public.permissions (key);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_id)
);

alter table public.memberships add column if not exists id uuid default gen_random_uuid();
alter table public.memberships add column if not exists user_id uuid references public.app_users(id) on delete cascade;
alter table public.memberships add column if not exists role_id uuid references public.roles(id) on delete cascade;
alter table public.memberships add column if not exists status text not null default 'active';
alter table public.memberships add column if not exists created_at timestamptz not null default now();
alter table public.memberships add column if not exists updated_at timestamptz not null default now();
update public.memberships set id = gen_random_uuid() where id is null;
create unique index if not exists memberships_id_key on public.memberships (id);
create unique index if not exists memberships_user_id_role_id_key on public.memberships (user_id, role_id);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

alter table public.role_permissions add column if not exists role_id uuid references public.roles(id) on delete cascade;
alter table public.role_permissions add column if not exists permission_id uuid references public.permissions(id) on delete cascade;
alter table public.role_permissions add column if not exists created_at timestamptz not null default now();
create unique index if not exists role_permissions_role_id_permission_id_key on public.role_permissions (role_id, permission_id);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_events add column if not exists id uuid default gen_random_uuid();
alter table public.admin_audit_events add column if not exists actor_user_id uuid references auth.users(id) on delete set null;
alter table public.admin_audit_events add column if not exists action text;
alter table public.admin_audit_events add column if not exists resource_type text;
alter table public.admin_audit_events add column if not exists resource_id text;
alter table public.admin_audit_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.admin_audit_events add column if not exists created_at timestamptz not null default now();
update public.admin_audit_events set id = gen_random_uuid() where id is null;
create unique index if not exists admin_audit_events_id_key on public.admin_audit_events (id);

alter table public.app_users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.role_permissions enable row level security;
alter table public.admin_audit_events enable row level security;

insert into public.permissions (key, description) values
  ('admin.access', 'Access the admin application'),
  ('users.manage', 'Manage admin users and roles'),
  ('system.hard_reset', 'Run destructive hard reset operations'),
  ('system.health', 'View system health checks'),
  ('catalog.read', 'Read catalog settings and product data'),
  ('catalog.write', 'Edit catalog settings and product data'),
  ('erp.read', 'Read ERP data'),
  ('erp.manage', 'Mutate ERP data'),
  ('messages.read', 'Read customer messages'),
  ('messages.manage', 'Send and mutate customer messages'),
  ('analytics.read', 'Read analytics dashboards'),
  ('uploads.manage', 'Upload and proxy customer assets'),
  ('cms.read', 'Read CMS content'),
  ('cms.manage', 'Edit CMS content'),
  ('ai.generate', 'Generate AI assets')
on conflict (key) do update set description = excluded.description;

insert into public.roles (name, description) values
  ('admin', 'Full administrative access'),
  ('manager', 'Operational admin access without destructive reset or user management'),
  ('viewer', 'Read-only admin access'),
  ('sewer', 'Production-focused ERP and messages access'),
  ('seamstress', 'Legacy alias for sewer')
on conflict (name) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on
  r.name = 'admin'
  or (r.name = 'manager' and p.key in (
    'admin.access', 'catalog.read', 'catalog.write', 'erp.read', 'erp.manage',
    'messages.read', 'messages.manage', 'analytics.read', 'uploads.manage',
    'cms.read', 'cms.manage', 'ai.generate', 'system.health'
  ))
  or (r.name = 'viewer' and p.key in (
    'admin.access', 'catalog.read', 'erp.read', 'messages.read',
    'analytics.read', 'cms.read', 'system.health'
  ))
  or (r.name in ('sewer', 'seamstress') and p.key in (
    'admin.access', 'erp.read', 'erp.manage', 'messages.read'
  ))
on conflict do nothing;

create or replace function public.has_permission(permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = auth.uid()
      and m.status = 'active'
      and p.key = permission
  );
$$;

create or replace function public.log_admin_audit_event(
  action text,
  resource_type text default null,
  resource_id text default null,
  metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
begin
  insert into public.admin_audit_events (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) values (
    auth.uid(),
    action,
    resource_type,
    resource_id,
    coalesce(metadata, '{}'::jsonb)
  )
  returning id into event_id;

  return event_id;
end;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'roles' AND policyname = 'roles_select_admin') THEN
    CREATE POLICY "roles_select_admin"
      ON public.roles FOR SELECT TO authenticated
      USING (public.has_permission('users.manage'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'permissions' AND policyname = 'permissions_select_admin') THEN
    CREATE POLICY "permissions_select_admin"
      ON public.permissions FOR SELECT TO authenticated
      USING (public.has_permission('users.manage'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'memberships' AND policyname = 'memberships_select_admin') THEN
    CREATE POLICY "memberships_select_admin"
      ON public.memberships FOR SELECT TO authenticated
      USING (public.has_permission('users.manage') OR user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_events' AND policyname = 'audit_select_admin') THEN
    CREATE POLICY "audit_select_admin"
      ON public.admin_audit_events FOR SELECT TO authenticated
      USING (public.has_permission('users.manage') OR public.has_permission('system.health'));
  END IF;
END $$;
