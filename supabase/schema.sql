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
  expires_at timestamptz,

  submission_type text not null default 'normal'
    check (submission_type in ('normal', 'contest')),
  design_name text,
  description text,
  author_name text,
  author_email text,
  product_type text,
  preview_front_url text,
  preview_back_url text,
  review_status text default 'pending'
    check (
      review_status is null
      or review_status in ('pending', 'reviewing', 'approved', 'rejected')
    ),

  submission_no text,
  shirt_color text,

  proof_version integer,
  mockup_front_url text,
  mockup_back_url text,
  print_file_url text,
  proof_pdf_url text,
  proof_package jsonb
);

comment on table public.design_submissions is '設計草稿、自由設計申請與徵選投稿紀錄';
comment on column public.design_submissions.storage_path is 'Storage 資料夾路徑，如 drafts/xxx 或 submitted/xxx';
comment on column public.design_submissions.expires_at is '草稿到期時間；submitted 為 null';
comment on column public.design_submissions.submission_type is 'normal：自由設計；contest：徵選投稿';
comment on column public.design_submissions.review_status is '徵選投稿審核狀態；normal 應為 null';
comment on column public.design_submissions.shirt_color is '衣服顏色代碼，如 white、black、navy';
comment on column public.design_submissions.proof_version is 'Proof Engine 版本號';
comment on column public.design_submissions.proof_package is 'ProofPackage schema JSON';

create index if not exists design_submissions_status_expires_idx
  on public.design_submissions (status, expires_at)
  where status = 'draft';

create index if not exists design_submissions_created_at_idx
  on public.design_submissions (created_at desc);

create index if not exists design_submissions_submission_type_idx
  on public.design_submissions (submission_type);

create index if not exists design_submissions_review_status_idx
  on public.design_submissions (review_status)
  where submission_type = 'contest';

create unique index if not exists design_submissions_submission_no_unique_idx
  on public.design_submissions (submission_no)
  where submission_no is not null;

create index if not exists design_submissions_submission_no_idx
  on public.design_submissions (submission_no)
  where submission_no is not null;

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

-- ---------------------------------------------------------------------------
-- 4. 資料表：submissions（專業交稿）
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id text primary key,
  created_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'approved', 'rejected')),

  product text not null,
  fit text not null check (fit in ('male', 'female', 'child')),
  print_side text not null,

  file_name text not null,
  file_format text not null,
  file_size_bytes bigint not null,
  file_size_label text not null,
  storage_path text not null,

  inspection_checks jsonb not null default '[]'::jsonb,

  applicant_name text not null,
  applicant_email text not null,
  applicant_phone text not null,
  company_name text,
  tax_id text,
  bulk_order boolean not null default false,
  quantity_range text,
  marketplace_apply boolean not null default false,
  notes text,

  submission_no text
);

comment on table public.submissions is '專業交稿申請紀錄';
comment on column public.submissions.storage_path is 'Storage 資料夾路徑，如 pro-uploads/xxx';

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

create index if not exists submissions_status_idx
  on public.submissions (status);

create unique index if not exists submissions_submission_no_unique_idx
  on public.submissions (submission_no)
  where submission_no is not null;

create index if not exists submissions_submission_no_idx
  on public.submissions (submission_no)
  where submission_no is not null;

alter table public.submissions enable row level security;

-- 若 submissions 表已存在，請執行：
-- alter table public.submissions
--   add column if not exists fit text check (fit in ('male', 'female', 'child'));
-- update public.submissions set fit = 'male' where fit is null;
-- alter table public.submissions alter column fit set not null;

