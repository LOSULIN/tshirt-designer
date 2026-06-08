"use client";

import Link from "next/link";
import {
  getFitLabel,
  getProductLabel,
  type ProUploadProductSelection,
} from "@/lib/pro-upload-proof";
import {
  getQuantityLabel,
  type ProUploadCaseFormData,
} from "@/lib/pro-upload-case";
import type { ProUploadInspection } from "@/lib/pro-upload-inspect";

type ProUploadSubmitStepProps = {
  productSelection: ProUploadProductSelection;
  inspection: ProUploadInspection;
  caseForm: ProUploadCaseFormData;
  onBack: () => void;
  onSubmit: () => void;
  submitted: boolean;
  isSubmitting: boolean;
  submitError: string | null;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export function ProUploadSubmitStep({
  productSelection,
  inspection,
  caseForm,
  onBack,
  onSubmit,
  submitted,
  isSubmitting,
  submitError,
}: ProUploadSubmitStepProps) {
  if (submitted) {
    return (
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 sm:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-gray-900">申請送出成功</h1>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              感謝您的提交。
              <br />
              TIIIGO 已收到您的設計稿件。
              <br />
              我們將進行最終審核，
              <br />
              並透過您提供的聯絡資訊與您聯繫。
            </p>
          </div>

          <Link
            href="/"
            className="mt-8 flex w-full items-center justify-center rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">送出申請</h1>
        <p className="mt-2 text-sm text-gray-500">請確認以下資訊後送出申請</p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">申請摘要</h2>
        <dl className="mt-4">
          <SummaryRow label="商品" value={getProductLabel(productSelection.product)} />
          <SummaryRow label="版型" value={getFitLabel(productSelection.fit)} />
          <SummaryRow label="檔名" value={inspection.name} />
          <SummaryRow label="格式" value={inspection.format} />
          <SummaryRow label="姓名" value={caseForm.name} />
          <SummaryRow label="Email" value={caseForm.email} />
          <SummaryRow label="手機" value={caseForm.phone} />
          {caseForm.companyName && <SummaryRow label="公司名稱" value={caseForm.companyName} />}
          {caseForm.taxId && <SummaryRow label="統一編號" value={caseForm.taxId} />}
          {caseForm.bulkOrder && (
            <SummaryRow
              label="預估數量"
              value={
                caseForm.quantityRange
                  ? getQuantityLabel(caseForm.quantityRange)
                  : "未選擇"
              }
            />
          )}
          <SummaryRow
            label="Marketplace"
            value={caseForm.marketplaceApply ? "已申請上架" : "未申請"}
          />
          {caseForm.notes && <SummaryRow label="備註" value={caseForm.notes} />}
        </dl>
      </section>

      {submitError && (
        <p className="text-center text-sm text-red-600" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          上一步
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
        >
          {isSubmitting ? "送出中…" : "確認送出申請"}
        </button>
      </div>
    </div>
  );
}
