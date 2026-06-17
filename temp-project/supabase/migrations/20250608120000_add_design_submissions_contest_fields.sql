-- 擴充 design_submissions：支援徵選投稿（contest）與既有自由設計（normal）
-- 於 Supabase Dashboard → SQL Editor 執行，或使用 supabase db push

-- ---------------------------------------------------------------------------
-- 1. 新增欄位
-- ---------------------------------------------------------------------------
alter table public.design_submissions
  add column if not exists submission_type text default 'normal';

alter table public.design_submissions
  add column if not exists design_name text;

alter table public.design_submissions
  add column if not exists description text;

alter table public.design_submissions
  add column if not exists author_name text;

alter table public.design_submissions
  add column if not exists author_email text;

alter table public.design_submissions
  add column if not exists product_type text;

alter table public.design_submissions
  add column if not exists preview_front_url text;

alter table public.design_submissions
  add column if not exists preview_back_url text;

alter table public.design_submissions
  add column if not exists review_status text default 'pending';

-- ---------------------------------------------------------------------------
-- 2. 既有資料回填（不影響現有功能）
-- ---------------------------------------------------------------------------
update public.design_submissions
set submission_type = 'normal'
where submission_type is null;

-- 自由設計／草稿不使用 review_status
update public.design_submissions
set review_status = null
where submission_type = 'normal'
   or status = 'draft';

-- ---------------------------------------------------------------------------
-- 3. 約束與索引
-- ---------------------------------------------------------------------------
alter table public.design_submissions
  drop constraint if exists design_submissions_submission_type_check;

alter table public.design_submissions
  add constraint design_submissions_submission_type_check
  check (submission_type in ('normal', 'contest'));

alter table public.design_submissions
  drop constraint if exists design_submissions_review_status_check;

alter table public.design_submissions
  add constraint design_submissions_review_status_check
  check (
    review_status is null
    or review_status in ('pending', 'reviewing', 'approved', 'rejected')
  );

create index if not exists design_submissions_submission_type_idx
  on public.design_submissions (submission_type);

create index if not exists design_submissions_review_status_idx
  on public.design_submissions (review_status)
  where submission_type = 'contest';

-- ---------------------------------------------------------------------------
-- 4. 欄位說明
-- ---------------------------------------------------------------------------
comment on column public.design_submissions.submission_type is 'normal：自由設計；contest：徵選投稿';
comment on column public.design_submissions.review_status is '徵選投稿審核狀態；normal 應為 null';
comment on column public.design_submissions.design_name is '徵選投稿作品名稱';
comment on column public.design_submissions.description is '徵選投稿說明／聯繫備註';
comment on column public.design_submissions.author_name is '徵選投稿作者名稱';
comment on column public.design_submissions.author_email is '徵選投稿作者 Email';
comment on column public.design_submissions.product_type is '徵選投稿商品類型';
comment on column public.design_submissions.preview_front_url is '徵選投稿正面預覽圖 URL';
comment on column public.design_submissions.preview_back_url is '徵選投稿背面預覽圖 URL';
