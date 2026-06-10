-- 一次性套用增量 migration（已執行過舊版 schema.sql 的既有專案）
-- Supabase Dashboard → SQL Editor → 貼上並 Run
-- 可重複執行（使用 IF NOT EXISTS）

-- submission_no
alter table public.design_submissions
  add column if not exists submission_no text;

alter table public.submissions
  add column if not exists submission_no text;

create unique index if not exists design_submissions_submission_no_unique_idx
  on public.design_submissions (submission_no)
  where submission_no is not null;

create unique index if not exists submissions_submission_no_unique_idx
  on public.submissions (submission_no)
  where submission_no is not null;

-- shirt_color
alter table public.design_submissions
  add column if not exists shirt_color text;

create index if not exists design_submissions_shirt_color_idx
  on public.design_submissions (shirt_color)
  where shirt_color is not null;

-- Proof Engine
alter table public.design_submissions
  add column if not exists proof_version integer,
  add column if not exists mockup_front_url text,
  add column if not exists mockup_back_url text,
  add column if not exists print_file_url text,
  add column if not exists proof_pdf_url text,
  add column if not exists proof_package jsonb;
