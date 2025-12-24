create extension if not exists "pgcrypto";

create table if not exists public.discovery_records (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discovery_records_version_idx
  on public.discovery_records (version desc);
