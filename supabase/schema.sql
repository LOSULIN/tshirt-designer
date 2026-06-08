-- DressUp 設計器 — Supabase 初始化腳本
-- 於 Supabase Dashboard → SQL Editor → New query → 貼上並 Run

-- ---------------------------------------------------------------------------
-- 1. 資料表：design_submissions
-- ---------------------------------------------------------------------------
create table if not exists public.design_submissions (
  id text primary key,
  created_at timestamptz not null default now(),
  template_type text not null,
  side text not null,
  status text not null check (status in ('draft', 'submitted')),
  storage_path text not null,
  expires_at timestamptz
);

comment on table public.design_submissions is '設計草稿與已送出申請紀錄';
comment on column public.design_submissions.storage_path is 'Storage 資料夾路徑，如 drafts/xxx 或 submitted/xxx';
comment on column public.design_submissions.expires_at is '草稿到期時間；submitted 為 null';

create index if not exists design_submissions_status_expires_idx
  on public.design_submissions (status, expires_at)
  where status = 'draft';

create index if not exists design_submissions_created_at_idx
  on public.design_submissions (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. RLS（僅後端 Service Role 存取，前端不直連資料表）
-- ---------------------------------------------------------------------------
alter table public.design_submissions enable row level security;

-- 不建立 anon / authenticated 政策；Next.js API 使用 Service Role 繞過 RLS

-- ---------------------------------------------------------------------------
-- 3. Storage bucket：designs（私有）
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('designs', 'designs', false, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- 不開放公開讀取；上傳／下載皆透過 Next.js API + Service Role
