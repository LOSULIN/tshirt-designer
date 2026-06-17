-- 設計投稿：衣服顏色（後台查詢用）
alter table public.design_submissions
  add column if not exists shirt_color text;

comment on column public.design_submissions.shirt_color is
  '衣服顏色代碼，如 white、black、navy（對應 adult-tshirt-{color} 模板）';

create index if not exists design_submissions_shirt_color_idx
  on public.design_submissions (shirt_color)
  where shirt_color is not null;
