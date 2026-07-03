"use client";

import type { Side } from "@/lib/constants";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import { buildConstraintOverlayUxLabels } from "@/lib/garment-constraint-ux-labels";
import {
  getDisplayExclusionMaskRects,
  getDisplayPrintableRegionPct,
} from "@/lib/designer-display-scale";
import { GarmentConstraintTooltip } from "./GarmentConstraintUxPrimitives";

function ConstraintDimensionLabels({
  labels,
}: {
  labels: ReturnType<typeof buildConstraintOverlayUxLabels>;
}) {
  return (
    <div
      data-garment-constraint-dimension-labels
      className="absolute bottom-0 left-0 right-0 space-y-0.5 rounded-tr bg-violet-950/80 px-1.5 py-1 text-[8px] leading-tight text-white opacity-0 transition-opacity group-hover/overlay:opacity-100 group-focus-within/overlay:opacity-100"
    >
      <div data-current-print-area-label className="flex flex-col">
        <span className="font-medium text-violet-200/90">
          {labels.currentPrintAreaTitle}
        </span>
        <span
          data-garment-constraint-current-dimension
          className="font-mono text-[9px] font-semibold tabular-nums"
        >
          {labels.currentPrintAreaDimension}
        </span>
      </div>
      <div data-recommended-area-label className="flex flex-col border-t border-white/15 pt-0.5">
        <span className="font-medium text-amber-200/90">
          {labels.recommendedAreaTitle}
        </span>
        <span
          data-garment-constraint-recommended-dimension
          className="font-mono text-[9px] font-semibold tabular-nums text-amber-50"
        >
          {labels.recommendedAreaDimension}
        </span>
      </div>
    </div>
  );
}

/**
 * Step 13.1B/13.1C + Phase 14.1 — 固定藍框內可印區視覺化。
 * 藍框視覺大小不變；尺碼切換僅更新代表的可印 cm 與標籤。
 */
export function CurrentGarmentConstraintVisualization({
  side,
  size,
  workspacePrintArea,
  garmentPrintArea,
  description,
}: {
  side: Side;
  size: string;
  workspacePrintArea: PrintAreaCmBounds;
  garmentPrintArea: PrintAreaCmBounds;
  /** 覆寫 hover tooltip（省略則用內建多行標籤） */
  description?: string;
}) {
  const labels = buildConstraintOverlayUxLabels({
    side,
    size,
    workspacePrintArea,
    garmentPrintArea,
  });
  const printablePct = getDisplayPrintableRegionPct(
    workspacePrintArea,
    garmentPrintArea,
  );
  const exclusionMasks = getDisplayExclusionMaskRects(
    workspacePrintArea,
    garmentPrintArea,
  );
  const printableTooltip = description ?? labels.printableRegionTooltip;

  return (
    <div
      data-current-garment-constraint-viz
      data-garment-constraint-size={size}
      data-garment-constraint-side={side}
      className="pointer-events-none absolute inset-0 z-[4]"
      aria-hidden
    >
      {exclusionMasks.map((mask, index) => (
        <GarmentConstraintTooltip
          key={`exclusion-${index}`}
          label={labels.exclusionRegionTooltip}
          className="absolute"
          style={{
            left: `${mask.leftPct}%`,
            top: `${mask.topPct}%`,
            width: `${mask.widthPct}%`,
            height: `${mask.heightPct}%`,
          }}
          data-garment-constraint-exclusion-mask-tooltip
        >
          <div
            data-garment-constraint-exclusion-mask
            className="pointer-events-auto h-full w-full bg-zinc-500/20 backdrop-blur-[0.5px] transition-colors hover:bg-zinc-500/35"
          />
        </GarmentConstraintTooltip>
      ))}

      <div
        className="absolute"
        style={{
          left: `${printablePct.leftPct}%`,
          top: `${printablePct.topPct}%`,
          width: `${printablePct.widthPct}%`,
          height: `${printablePct.heightPct}%`,
        }}
      >
        <GarmentConstraintTooltip
          label={printableTooltip}
          className="pointer-events-auto h-full w-full"
          data-garment-print-constraint-overlay-tooltip
        >
          <div
            data-garment-print-constraint-overlay
            data-garment-printable-constraint-region
            data-garment-constraint-warning-level="ok"
            className="group/overlay relative h-full w-full border-2 border-dashed border-violet-500/85 bg-violet-500/[0.03] transition-colors hover:border-violet-600 hover:bg-violet-500/[0.08]"
          >
            <span
              data-garment-print-constraint-label
              className="absolute left-0 top-0 z-10 max-w-full truncate rounded-br bg-violet-600/90 px-1.5 py-0.5 text-[9px] font-medium leading-tight text-white transition-colors group-hover/overlay:bg-violet-700"
            >
              {labels.compactHeader}
            </span>
            <ConstraintDimensionLabels labels={labels} />
          </div>
        </GarmentConstraintTooltip>
      </div>
    </div>
  );
}

/** @deprecated 使用 CurrentGarmentConstraintVisualization */
export const GarmentPrintConstraintOverlay = CurrentGarmentConstraintVisualization;
