create table if not exists public.project_inputs (
  project_id uuid primary key references public.projects(id) on delete cascade,
  product_idea text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.project_inputs enable row level security;

create policy "project inputs are user-owned"
  on public.project_inputs
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_inputs.project_id
        and (p.owner_user_id = auth.uid() or p.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_inputs.project_id
        and (p.owner_user_id = auth.uid() or p.user_id = auth.uid())
    )
  );
