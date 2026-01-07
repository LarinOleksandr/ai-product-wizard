alter table public.discovery_records
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

create index if not exists discovery_records_project_id_idx
  on public.discovery_records (project_id, version desc);
