-- 三套獨立對外編號：FD / PD / CT

alter table public.design_submissions
  add column if not exists submission_no text;

alter table public.submissions
  add column if not exists submission_no text;

comment on column public.design_submissions.submission_no is
  '對外編號：FD-YYYYMMDD-0001（自由設計）或 CT-YYYYMMDD-0001（徵選投稿）';

comment on column public.submissions.submission_no is
  '對外編號：PD-YYYYMMDD-0001（專業交稿）';

create unique index if not exists design_submissions_submission_no_unique_idx
  on public.design_submissions (submission_no)
  where submission_no is not null;

create unique index if not exists submissions_submission_no_unique_idx
  on public.submissions (submission_no)
  where submission_no is not null;

create index if not exists design_submissions_submission_no_idx
  on public.design_submissions (submission_no)
  where submission_no is not null;

create index if not exists submissions_submission_no_idx
  on public.submissions (submission_no)
  where submission_no is not null;
