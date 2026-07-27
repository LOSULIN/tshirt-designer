"use client";

import type { PrintAreaCmBounds } from "@/lib/design-cm";
import { formatGarmentPrintAreaCmPair } from "@/lib/garment-constraint-ux";
import { UI_VISIBILITY } from "./ui-visibility";

/**
 * Phase 14.1 — edge ruler labels on the fixed blue frame.
 * 100% width/height of the frame represents current garment printable cm.
 */
export function PrintAreaDisplayRuler({
  printableArea,
}: {
  printableArea: PrintAreaCmBounds;
}) {
  if (!UI_VISIBILITY.showPrintAreaSizeLabel) {
    return null;
  }

  const dimensionLabel = `${formatGarmentPrintAreaCmPair(printableArea)} cm`;

  return (
    <div
      data-print-area-display-ruler
      className="pointer-events-none absolute inset-0 z-[3]"
      aria-hidden
    >
      <span
        data-ruler-dimension-label
        className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded bg-blue-500/10 px-1.5 py-px font-mono text-[8px] font-semibold tabular-nums text-blue-800/90"
      >
        {dimensionLabel}
      </span>
    </div>
  );
}
