import Link from "next/link";
import { formatSubmissionDisplayLabel } from "@/lib/submission-no";

type SubmissionSuccessModalProps = {
  submissionNo: string;
  applicantName: string;
};

export function SubmissionSuccessModal({
  submissionNo,
  applicantName,
}: SubmissionSuccessModalProps) {
  const displayLabel = formatSubmissionDisplayLabel(submissionNo, applicantName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7f8fa] p-5">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-gray-900">投稿成功！</h1>
          <p className="mt-4 text-sm font-medium text-gray-900">{displayLabel}</p>
          <p className="mt-4 text-sm leading-relaxed text-gray-500">
            您的作品已送出審核。
            <br />
            審核通過後將通知您，
          </p>
        </div>

        <Link
          href="/"
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600"
        >
          返回首頁
        </Link>
      </div>
    </div>
  );
}
