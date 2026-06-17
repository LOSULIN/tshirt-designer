"use client";

import { useMemo } from "react";
import { cmToUiPx } from "@/lib/design-cm";
import { inspectDesignLayer } from "@/lib/design-inspector";
import {
  formatInspectorDimensionDisplay,
  formatInspectorDimensionPrecise,
  getImageInspectorValues,
  getTextInspectorValues,
} from "@/lib/inspector-sync";
import { cmToExportPx, PRINT_EXPORT_DPI } from "@/lib/print-export-system";
import type { DesignLayer } from "@/lib/types";

function DetailLine({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-1 text-[9px] leading-tight">
      <span className="shrink-0 text-zinc-400">{label}</span>
      <span
        className="text-right font-mono tabular-nums text-zinc-600"
        title={title}
      >
        {value}
      </span>
    </div>
  );
}

function formatCmPair(width: number, height: number): string {
  return `${formatInspectorDimensionDisplay(width)} × ${formatInspectorDimensionDisplay(height)} cm`;
}

function formatCmPairPrecise(width: number, height: number): string {
  return `${formatInspectorDimensionPrecise(width)} × ${formatInspectorDimensionPrecise(height)}`;
}

function formatPxPair(width: number, height: number): string {
  return `${Math.round(width)} × ${Math.round(height)} px`;
}

/** 校稿／匯出用尺寸明細（僅 UI 顯示，不修改 production 邏輯） */
export function InspectorProofDetails({
  layer,
  compact = false,
}: {
  layer: DesignLayer;
  compact?: boolean;
}) {
  const report = useMemo(() => inspectDesignLayer(layer), [layer]);
  const { aabb } = report;

  const uiSize = useMemo(
    () => ({
      w: cmToUiPx(report.width_cm),
      h: cmToUiPx(report.height_cm),
    }),
    [report.width_cm, report.height_cm],
  );

  const exportSize = useMemo(
    () => ({
      w: cmToExportPx(report.width_cm),
      h: cmToExportPx(report.height_cm),
    }),
    [report.width_cm, report.height_cm],
  );

  const aabbExport = useMemo(
    () => ({
      w: cmToExportPx(aabb.width_cm),
      h: cmToExportPx(aabb.height_cm),
    }),
    [aabb.width_cm, aabb.height_cm],
  );

  const aabbDiffers =
    Math.abs(aabb.width_cm - report.width_cm) > 0.05 ||
    Math.abs(aabb.height_cm - report.height_cm) > 0.05;

  const textValues =
    layer.type === "text" ? getTextInspectorValues(layer) : null;
  const imageValues =
    layer.type === "image" ? getImageInspectorValues(layer) : null;

  return (
    <div className={compact ? "space-y-0" : "space-y-0.5"}>
      <div
        className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-0 leading-none text-zinc-500 ${
          compact ? "text-[8px]" : "text-[9px] leading-tight"
        }`}
      >
        <span className="font-mono tabular-nums text-zinc-500">
          Export {exportSize.w}×{exportSize.h}px
        </span>
        {aabbDiffers && (
          <span className="font-mono tabular-nums text-zinc-500">
            BBox {formatInspectorDimensionDisplay(aabb.width_cm)}×
            {formatInspectorDimensionDisplay(aabb.height_cm)}
          </span>
        )}
      </div>

      <details>
        <summary
          className={`cursor-pointer list-none text-zinc-400 hover:text-zinc-600 [&::-webkit-details-marker]:hidden ${
            compact ? "text-[8px] leading-none" : "text-[9px]"
          }`}
        >
          <span className="underline decoration-dotted underline-offset-2">
            完整校稿尺寸
          </span>
        </summary>
        <div className="mt-0.5 space-y-0.5 border-t border-zinc-100 pt-0.5">
          <DetailLine
            label="Size"
            value={formatCmPair(report.width_cm, report.height_cm)}
            title={formatCmPairPrecise(report.width_cm, report.height_cm)}
          />
          <DetailLine
            label="BBox"
            value={formatCmPair(aabb.width_cm, aabb.height_cm)}
            title={formatCmPairPrecise(aabb.width_cm, aabb.height_cm)}
          />
          <DetailLine label="UI" value={formatPxPair(uiSize.w, uiSize.h)} />
          <DetailLine
            label={`Export @${PRINT_EXPORT_DPI}`}
            value={`${exportSize.w} × ${exportSize.h} px`}
          />
          <DetailLine
            label="BBox export"
            value={`${aabbExport.w} × ${aabbExport.h} px`}
          />
          <DetailLine
            label="Pos"
            value={`${report.x_cm.toFixed(1)}, ${report.y_cm.toFixed(1)} cm`}
          />
          {textValues && (
            <DetailLine
              label="Font"
              value={`${textValues.fontSize_cm.toFixed(1)} cm`}
            />
          )}
          {imageValues && (
            <DetailLine label="Scale" value={imageValues.scale.toFixed(2)} />
          )}
          {layer.rotation !== 0 && (
            <DetailLine label="Rot" value={`${layer.rotation}°`} />
          )}
          {report.warnings.map((warning) => (
            <p key={warning} className="text-[9px] leading-tight text-amber-700">
              {warning}
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}
