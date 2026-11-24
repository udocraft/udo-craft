-- Agent console: agent definitions and a job queue run by a local worker.
-- Both tables are read and written only by the service role (RLS on, no policies).
-- The local worker claims jobs with the service role key from the operator's machine.

create table if not exists public.agent_definitions (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name          text        not null check (char_length(name) between 1 and 120),
  description   text        not null default '' check (char_length(description) <= 500),
  model         text        not null check (model in ('opus', 'sonnet', 'haiku')),
  system_prompt text        not null default '' check (char_length(system_prompt) <= 20000),
  -- Read-only by default. The worker also passes a hard deny list.
  allowed_tools text[]      not null default '{Read,Grep,Glob}',
  is_active     boolean     not null default true,
  version       integer     not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.agent_definitions enable row level security;

create table if not exists public.agent_jobs (
  id            uuid        primary key default gen_random_uuid(),
  definition_id uuid        references public.agent_definitions (id) on delete set null,
  prompt        text        not null check (char_length(prompt) between 1 and 8000),
  status        text        not null default 'queued'
                check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  result        text,
  error         text,
  created_by    uuid        references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz
);

create index if not exists agent_jobs_queue_idx on public.agent_jobs (status, created_at);

alter table public.agent_jobs enable row level security;
