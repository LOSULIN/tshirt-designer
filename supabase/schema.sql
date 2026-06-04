-- Run in Supabase SQL editor

create table if not exists public.design_submissions (
  id text primary key,
  created_at timestamptz not null default now(),
  template_type text not null,
  side text not null,
  status text not null check (status in ('draft', 'submitted')),
  storage_path text not null,
  expires_at timestamptz
);

create index if not exists design_submissions_status_expires_idx
  on public.design_submissions (status, expires_at)
  where status = 'draft';

-- Storage bucket: create "designs" as public or private in Supabase dashboard.
-- Recommended: private bucket + signed URLs (already used in API).
