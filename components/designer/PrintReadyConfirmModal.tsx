"use client";

import type { PrintReadyView } from "@/lib/print-ready";
import { ds } from "./design-ui";

export function PrintReadyConfirmModal({
  open,
  printReady,
  optimizing = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  printReady: PrintReadyView | null;
  optimizing?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open || !printReady) return null;

  const showCaution = printReady.optimizationScaleTier === "caution";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={optimizing ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="print-ready-confirm-title"
      >
        <h2
          id="print-ready-confirm-title"
          className="text-base font-semibold text-zinc-900"
        >
          最佳化圖片
        </h2>

        <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-zinc-700">
          <Row label="目前解析度" value={`${printReady.currentDpi} DPI`} />
          <Row label="最佳化後" value={`${printReady.optimizedDpiPreview} DPI`} />
          <Row label="圖片尺寸" value="不變" />
          <Row label="Artwork Size" value="不變" />
          <Row label="圖片位置" value="不變" />
          <Row label="比例" value="不變" />
          <Row label="版型" value="不變" />
          <Row label="Print Area" value="不變" />
          <Row label="Export" value="不變" />
        </div>

        <p className="mt-3 text-[11px] text-zinc-600">僅提升圖片像素。</p>

        {showCaution ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            需要放大約 {printReady.upscaleFactor.toFixed(2)} 倍，可能略微影響圖片品質。仍可繼續。
          </p>
        ) : null}

        <p className="mt-4 text-[11px] font-medium text-zinc-800">是否開始？</p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={optimizing}
            onClick={onClose}
            className={`flex-1 ${ds.button.secondary} py-2 text-[11px] disabled:opacity-50`}
          >
            取消
          </button>
          <button
            type="button"
            disabled={optimizing}
            onClick={onConfirm}
            className={`flex-1 ${ds.button.primary} py-2 text-[11px] disabled:opacity-50`}
          >
            {optimizing ? "最佳化中…" : "開始最佳化"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-900">{value}</span>
    </div>
  );
}
