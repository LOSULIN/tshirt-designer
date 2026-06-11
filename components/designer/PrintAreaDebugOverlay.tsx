"use client";

import { useEffect, useMemo } from "react";
import type { Side, Size } from "@/lib/constants";
import {
  buildPrintAreaDebugSnapshot,
  logPrintAreaDebug,
} from "@/lib/coordinates/debug-print-area";
import {
  getPreviewPrintReference,
  PREVIEW_CONTAINER,
} from "@/lib/coordinates/preview";
import { getModelMockupPrintReference } from "@/lib/coordinates/mockup";
import { UI_GLOBAL_PRINT_OFFSET_Y_PX } from "@/lib/coordinates/ui-print-offset";
import { readLayerProductionRectMm } from "@/lib/design-cm";
import type { DesignLayer } from "@/lib/types";

const FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * Debug Print Area Mode — 襯衫 container 上的錨點線與座標資訊面板。
 * 不影響 Production 圖層資料。
 */
export function PrintAreaDebugOverlay({
  side,
  size,
  selectedLayer,
}: {
  side: Side;
  size: Size;
  selectedLayer?: DesignLayer | null;
}) {
  const snapshot = useMemo(
    () =>
      buildPrintAreaDebugSnapshot({
        side,
        size,
        selectedLayer,
        readLayerProductionRectMm,
      }),
    [side, size, selectedLayer],
  );

  useEffect(() => {
    logPrintAreaDebug(snapshot);
  }, [snapshot]);

  const previewRef = getPreviewPrintReference(side);
  const modelRef = getModelMockupPrintReference(side);
  const { widthPct, heightPct } = snapshot.preview.printAreaPct;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[35]"
      data-print-area-debug
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line
          x1={previewRef.x * 100}
          y1={0}
          x2={previewRef.x * 100}
          y2={100}
          stroke="#f97316"
          strokeWidth={0.2}
          strokeDasharray="0.6 0.4"
          opacity={0.9}
        />
        <line
          x1={0}
          y1={previewRef.y * 100}
          x2={100}
          y2={previewRef.y * 100}
          stroke="#f97316"
          strokeWidth={0.2}
          strokeDasharray="0.6 0.4"
          opacity={0.9}
        />
        <circle
          cx={previewRef.x * 100}
          cy={previewRef.y * 100}
          r={0.6}
          fill="#f97316"
        />
        <line
          x1={0}
          y1={modelRef.y * 100}
          x2={100}
          y2={modelRef.y * 100}
          stroke="#a855f7"
          strokeWidth={0.15}
          strokeDasharray="0.4 0.6"
          opacity={0.75}
        />
        <text
          x={2}
          y={previewRef.y * 100 - 1}
          fill="#c2410c"
          fontSize={1.8}
          fontFamily={FONT}
        >
          Preview ref y={previewRef.y}
        </text>
        <text
          x={2}
          y={modelRef.y * 100 - 1}
          fill="#7e22ce"
          fontSize={1.8}
          fontFamily={FONT}
        >
          Mockup model ref y={modelRef.y}
        </text>
      </svg>

      <div className="absolute left-2 top-2 max-w-[min(100%,280px)] rounded-md border border-zinc-800/20 bg-black/75 px-2.5 py-2 text-[10px] leading-relaxed text-emerald-300 shadow-lg backdrop-blur-sm">
        <p className="mb-1 font-semibold text-white">Debug Print Area</p>
        <p>
          <span className="text-zinc-400">Production</span>{" "}
          {snapshot.production.printArea_mm.width_mm}×
          {snapshot.production.printArea_mm.height_mm} mm
        </p>
        <p>
          <span className="text-zinc-400">Export</span>{" "}
          {snapshot.production.export_px.widthPx}×
          {snapshot.production.export_px.heightPx} px
        </p>
        <p>
          <span className="text-zinc-400">Safe</span>{" "}
          {snapshot.production.safeArea_mm.width_mm}×
          {snapshot.production.safeArea_mm.height_mm} mm
        </p>
        <p>
          <span className="text-zinc-400">UI global</span> Y offset{" "}
          {UI_GLOBAL_PRINT_OFFSET_Y_PX}px
        </p>
        <p>
          <span className="text-zinc-400">Preview</span> ref (
          {previewRef.x}, {previewRef.y.toFixed(4)}) · scale{" "}
          {snapshot.preview.garmentVisualScale}
        </p>
        <p>
          <span className="text-zinc-400">Overlay</span>{" "}
          {(widthPct * 100).toFixed(1)}%×{(heightPct * 100).toFixed(1)}% on{" "}
          {PREVIEW_CONTAINER.width}×{PREVIEW_CONTAINER.height}
        </p>
        {snapshot.selectedLayer_mm && (
          <p className="mt-1 border-t border-white/10 pt-1 text-amber-200">
            Layer: x={snapshot.selectedLayer_mm.x_mm.toFixed(1)} y=
            {snapshot.selectedLayer_mm.y_mm.toFixed(1)} w=
            {snapshot.selectedLayer_mm.width_mm.toFixed(1)} h=
            {snapshot.selectedLayer_mm.height_mm.toFixed(1)} mm
          </p>
        )}
      </div>
    </div>
  );
}
