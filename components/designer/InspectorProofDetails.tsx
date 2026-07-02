"use client";

import { useMemo } from "react";
import { cmToUiPx } from "@/lib/design-cm";
import { inspectDesignLayer } from "@/lib/design-inspector";
import {
  createDesignerDisplayContext,
  projectWorkspaceRectToDesignerDisplay,
} from "@/lib/designer-display-projection";
import {
  formatInspectorDimensionDisplay,
  formatInspectorDimensionPrecise,
  getImageInspectorValues,
  getTextInspectorValues,
} from "@/lib/inspector-sync";
import { cmToExportPx, PRINT_EXPORT_DPI } from "@/lib/print-export-system";
import type { Side } from "@/lib/constants";
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

/** 校稿／匯出用尺寸明細（Display：Designer Coordinate；Export px 仍為 Production） */
export function InspectorProofDetails({
  layer,
  side = "front",
  size = "M",
}: {
  layer: DesignLayer;
  side?: Side;
  size?: string;
}) {
  const designerContext = useMemo(
    () => createDesignerDisplayContext(side, size),
    [side, size],
  );
  const report = useMemo(
    () => inspectDesignLayer(layer, { side, size }),
    [layer, side, size],
  );
  const designerRect = useMemo(
    () =>
      projectWorkspaceRectToDesignerDisplay(
        {
          x_cm: report.x_cm,
          y_cm: report.y_cm,
          width_cm: report.width_cm,
          height_cm: report.height_cm,
        },
        designerContext,
      ),
    [report, designerContext],
  );
  const { aabb } = report;

  const uiSize = useMemo(
    () => ({
      w: cmToUiPx(designerRect.width_cm),
      h: cmToUiPx(designerRect.height_cm),
    }),
    [designerRect.width_cm, designerRect.height_cm],
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
    Math.abs(aabb.width_cm - designerRect.width_cm) > 0.05 ||
    Math.abs(aabb.height_cm - designerRect.height_cm) > 0.05;

  const textValues =
    layer.type === "text" ? getTextInspectorValues(layer) : null;
  const imageValues =
    layer.type === "image" ? getImageInspectorValues(layer) : null;

  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 text-[9px] leading-tight text-zinc-500">
        <span className="font-mono tabular-nums text-zinc-600">
          Export: {exportSize.w}×{exportSize.h}px
        </span>
        {aabbDiffers && (
          <span className="font-mono tabular-nums text-zinc-600">
            BBox: {formatCmPair(aabb.width_cm, aabb.height_cm)}
          </span>
        )}
      </div>

      <details>
        <summary className="cursor-pointer list-none text-[9px] text-zinc-400 hover:text-zinc-600 [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-dotted underline-offset-2">
            完整校稿尺寸
          </span>
        </summary>
        <div className="mt-0.5 space-y-0.5 border-t border-zinc-100 pt-0.5">
          <DetailLine
            label="Size"
            value={formatCmPair(designerRect.width_cm, designerRect.height_cm)}
            title={formatCmPairPrecise(
              designerRect.width_cm,
              designerRect.height_cm,
            )}
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
            value={`${designerRect.x_cm.toFixed(1)}, ${designerRect.y_cm.toFixed(1)} cm`}
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
