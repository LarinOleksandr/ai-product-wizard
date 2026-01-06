create table if not exists public.project_document_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  doc_type text not null default 'discovery',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_document_items_project_id_idx
  on public.project_document_items(project_id);

create table if not exists public.project_document_state (
  project_id uuid primary key references public.projects(id) on delete cascade,
  last_selected_document_id uuid references public.project_document_items(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.project_document_items enable row level security;
alter table public.project_document_state enable row level security;

create policy "project document items are user-owned"
  on public.project_document_items
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.owner_user_id = auth.uid() or p.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.owner_user_id = auth.uid() or p.user_id = auth.uid())
    )
  );

create policy "project document state is user-owned"
  on public.project_document_state
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.owner_user_id = auth.uid() or p.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and (p.owner_user_id = auth.uid() or p.user_id = auth.uid())
    )
  );
