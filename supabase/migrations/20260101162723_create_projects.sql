create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  document_type text not null default 'discovery',
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, document_type)
);

alter table public.projects enable row level security;
alter table public.project_documents enable row level security;

create policy "Projects are user-owned" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Project documents follow project ownership" on public.project_documents
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and p.user_id = auth.uid()
    )
  );
