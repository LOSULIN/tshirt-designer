"use client";

import { useState, type ReactNode } from "react";
import {
  getFitLabel,
  getProductLabel,
  getProofFileInfo,
  type ProUploadProductSelection,
} from "@/lib/pro-upload-proof";
import type { ProUploadInspection } from "@/lib/pro-upload-inspect";

type ProUploadProofStepProps = {
  productSelection: ProUploadProductSelection;
  inspection: ProUploadInspection;
  onBack: () => void;
  onNext: () => void;
};

type InfoRowProps = {
  label: string;
  value: string;
};

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export function ProUploadProofStep({
  productSelection,
  inspection,
  onBack,
  onNext,
}: ProUploadProofStepProps) {
  const [confirmedContent, setConfirmedContent] = useState(false);
  const [confirmedProduction, setConfirmedProduction] = useState(false);

  const fileInfo = getProofFileInfo(inspection);
  const canProceed = confirmedContent && confirmedProduction;

  return (
    <div className="w-full max-w-2xl space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">校稿確認</h1>
        <p className="mt-2 text-sm text-gray-500">請確認商品、檔案與套版預覽後再送出</p>
      </div>

      <SectionCard title="商品資訊">
        <dl>
          <InfoRow label="商品" value={getProductLabel(productSelection.product)} />
          <InfoRow label="版型" value={getFitLabel(productSelection.fit)} />
        </dl>
      </SectionCard>

      <SectionCard title="檔案資訊">
        <dl>
          <InfoRow label="檔名" value={fileInfo.name} />
          <InfoRow label="格式" value={fileInfo.format} />
          <InfoRow label="檔案大小" value={fileInfo.size} />
          <InfoRow label="商品尺寸" value={fileInfo.productSize} />
        </dl>
      </SectionCard>

      <SectionCard title="套版預覽">
        <div className="flex min-h-[12rem] items-center justify-center rounded-xl bg-gray-50 p-6 ring-1 ring-gray-100">
          <p className="text-sm text-gray-400">套版預覽即將支援</p>
        </div>
      </SectionCard>

      <SectionCard title="確認區">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={confirmedContent}
              onChange={(event) => setConfirmedContent(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span>我已確認稿件內容正確</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={confirmedProduction}
              onChange={(event) => setConfirmedProduction(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span>我了解送出後將依此稿件進行製作</span>
          </label>
        </div>
      </SectionCard>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          上一步
        </button>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="flex-1 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
        >
          下一步
        </button>
      </div>
    </div>
  );
}
