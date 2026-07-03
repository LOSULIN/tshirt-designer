"use client";

import type { PrintAreaCmBounds } from "@/lib/design-cm";
import { formatGarmentPrintAreaCmPair } from "@/lib/garment-constraint-ux";

/**
 * Phase 14.1 — edge ruler labels on the fixed blue frame.
 * 100% width/height of the frame represents current garment printable cm.
 */
export function PrintAreaDisplayRuler({
  printableArea,
}: {
  printableArea: PrintAreaCmBounds;
}) {
  const dimensionLabel = `${formatGarmentPrintAreaCmPair(printableArea)} cm`;

  return (
    <div
      data-print-area-display-ruler
      className="pointer-events-none absolute inset-0 z-[3]"
      aria-hidden
    >
      <span
        data-ruler-origin-x
        className="absolute left-1 top-0.5 font-mono text-[8px] font-medium tabular-nums text-blue-700/75"
      >
        0
      </span>
      <span
        data-ruler-width-cm
        className="absolute right-1 top-0.5 font-mono text-[8px] font-semibold tabular-nums text-blue-800/90"
      >
        {printableArea.width} cm
      </span>
      <span
        data-ruler-height-cm
        className="absolute bottom-1 left-0.5 origin-bottom-left -rotate-90 font-mono text-[8px] font-semibold tabular-nums text-blue-800/90"
      >
        {printableArea.height} cm
      </span>
      <span
        data-ruler-scale-label
        className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap rounded bg-blue-500/10 px-1 py-px font-mono text-[8px] font-medium tabular-nums text-blue-700/85"
      >
        100% = {printableArea.width} cm · {dimensionLabel}
      </span>
    </div>
  );
}
