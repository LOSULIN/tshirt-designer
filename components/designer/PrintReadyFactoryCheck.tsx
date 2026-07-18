"use client";

import type { PrintReadyView } from "@/lib/print-ready";

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

/** 工廠交付檢查（Print Ready）— 僅 UI 顯示 */
export function PrintReadyFactoryCheck({
  printReady,
  compact = false,
}: {
  printReady: PrintReadyView;
  compact?: boolean;
}) {
  return (
    <div
      className={`space-y-1.5 ${compact ? "" : "border-t border-zinc-100 pt-2"}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Print Ready
      </p>
      <InfoLine
        label="Artwork Size"
        value={`${printReady.designerWidthCmDisplay} × ${printReady.designerHeightCmDisplay} cm`}
      />
      <InfoLine
        label="Pixel Size"
        value={`${printReady.artworkPixelWidth} × ${printReady.artworkPixelHeight} px`}
      />
      <InfoLine label="目前解析度" value={`${printReady.currentDpi} DPI`} />
      <InfoLine
        label="透明背景"
        value={printReady.hasTransparentBackground ? "✔" : "—"}
      />
      <InfoLine label="印刷品質" value={printReady.starDisplay} />
      <InfoLine label="狀態" value={printReady.factoryStatusLabel} />
    </div>
  );
}
