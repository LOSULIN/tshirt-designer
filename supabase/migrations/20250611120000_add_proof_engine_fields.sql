-- Proof Engine 標準化輸出欄位

alter table public.design_submissions
  add column if not exists proof_version integer,
  add column if not exists mockup_front_url text,
  add column if not exists mockup_back_url text,
  add column if not exists print_file_url text,
  add column if not exists proof_pdf_url text,
  add column if not exists proof_package jsonb;

comment on column public.design_submissions.proof_version is 'Proof Engine 版本號';
comment on column public.design_submissions.proof_package is 'ProofPackage schema JSON';
