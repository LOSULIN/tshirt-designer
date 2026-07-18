"use client";

import { getImageLayerPrintReady, type PrintReadyView } from "@/lib/print-ready";
import type { ImageDesignLayer } from "@/lib/types";
import { useMemo, useState } from "react";
import { ds } from "./design-ui";
import { PrintReadyConfirmModal } from "./PrintReadyConfirmModal";
import { PrintReadyFactoryCheck } from "./PrintReadyFactoryCheck";

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="text-right font-mono tabular-nums text-zinc-900">{value}</span>
    </div>
  );
}

export function PrintReadyPanel({
  layer,
  designerWidthCm,
  designerHeightCm,
  disabled = false,
  optimizing = false,
  onOptimize,
}: {
  layer: ImageDesignLayer;
  designerWidthCm: number;
  designerHeightCm: number;
  disabled?: boolean;
  optimizing?: boolean;
  onOptimize: () => void | Promise<void>;
}) {
  const printReady = useMemo(
    () => getImageLayerPrintReady(layer, designerWidthCm, designerHeightCm),
    [layer, designerWidthCm, designerHeightCm],
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <PrintReadyQualitySection
        printReady={printReady}
        disabled={disabled}
        optimizing={optimizing}
        onRequestOptimize={() => setConfirmOpen(true)}
      />
      <PrintReadyFactoryCheck printReady={printReady} />
      <PrintReadyConfirmModal
        open={confirmOpen}
        printReady={printReady}
        optimizing={optimizing}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          void (async () => {
            await onOptimize();
            setConfirmOpen(false);
          })();
        }}
      />
    </>
  );
}

function PrintReadyQualitySection({
  printReady,
  disabled,
  optimizing,
  onRequestOptimize,
}: {
  printReady: PrintReadyView;
  disabled: boolean;
  optimizing: boolean;
  onRequestOptimize: () => void;
}) {
  if (printReady.meetsPrintStandard) {
    return (
      <div className="space-y-2 border-t border-zinc-100 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          印刷品質
        </p>
        <p className="text-sm tracking-widest text-amber-500">{printReady.starDisplay}</p>
        <InfoLine label="目前解析度" value={`${printReady.currentDpi} DPI`} />
        <InfoLine label="最低建議" value={`${printReady.targetDpi} DPI`} />
        <p className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-800">
          ✔ 已符合印刷規格
          {printReady.currentDpi >= printReady.targetDpi
            ? "，可直接交付工廠"
            : ""}
        </p>
      </div>
    );
  }

  if (printReady.optimizationScaleTier === "blocked") {
    return (
      <div className="space-y-2 border-t border-zinc-100 pt-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          印刷品質
        </p>
        <p className="text-sm tracking-widest text-amber-500">{printReady.starDisplay}</p>
        <InfoLine label="目前解析度" value={`${printReady.currentDpi} DPI`} />
        <InfoLine label="最低建議" value={`${printReady.targetDpi} DPI`} />
        <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-900">
          <p className="font-medium">
            目前圖片解析度過低，需要放大 {printReady.upscaleFactor.toFixed(2)} 倍。
          </p>
          <p className="mt-0.5">可能造成模糊。</p>
          <p className="mt-1 font-medium">建議：</p>
          <ul className="mt-0.5 list-inside list-disc">
            <li>重新上傳更高解析圖片</li>
            <li>（預留）使用 AI 超解析功能</li>
          </ul>
          {printReady.exceedsMaxDimensions ? (
            <p className="mt-1">
              提升後將超過系統上限（6000×6000 px），無法自動處理。
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-zinc-100 pt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        印刷品質
      </p>
      <p className="text-sm tracking-widest text-amber-500">{printReady.starDisplay}</p>
      <InfoLine label="目前解析度" value={`${printReady.currentDpi} DPI`} />
      <InfoLine label="最低建議" value={`${printReady.targetDpi} DPI`} />
      <InfoLine
        label="需要像素"
        value={`${printReady.requiredPixelWidth} × ${printReady.requiredPixelHeight} px`}
      />

      {printReady.canOptimize ? (
        <button
          type="button"
          disabled={disabled || optimizing}
          onClick={onRequestOptimize}
          className={`w-full ${ds.button.primary} py-1.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {optimizing ? "最佳化中…" : "一鍵最佳化圖片"}
        </button>
      ) : null}
    </div>
  );
}
