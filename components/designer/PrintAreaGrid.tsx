import { GRID_SIZE_CM } from "@/lib/constants";
import type { Side } from "@/lib/constants";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import { getGarmentPrintSafeZonePctInPrintArea } from "@/lib/coordinates/garment";

export function PrintAreaGrid({
  visible,
  printArea,
  gridSizeCm = GRID_SIZE_CM,
}: {
  visible: boolean;
  printArea: PrintAreaCmBounds;
  /** Step 13.0I：Designer Printable Area 格線間距（cm） */
  gridSizeCm?: number;
}) {
  if (!visible) return null;

  const cellW = (gridSizeCm / printArea.width) * 100;
  const cellH = (gridSizeCm / printArea.height) * 100;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5]"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(to right, rgb(59 130 246 / 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(59 130 246 / 0.12) 1px, transparent 1px)
        `,
        backgroundSize: `${cellW}% ${cellH}%`,
      }}
    />
  );
}

/**
 * 尺碼建議安全區（橘色虛線）— 僅視覺 Guide，不限制編輯。
 */
export function GarmentPrintSafeZoneGuide({
  side,
  size,
}: {
  side: Side;
  size: string;
}) {
  const { leftPct, topPct, widthPct, heightPct } =
    getGarmentPrintSafeZonePctInPrintArea({ side, size });

  return (
    <div
      className="pointer-events-none absolute z-[6] border-2 border-dashed border-amber-500/90"
      aria-hidden
      data-garment-safe-zone
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${widthPct}%`,
        height: `${heightPct}%`,
      }}
    />
  );
}

export function PrintAreaCenterGuides({
  highlightX,
  highlightY,
}: {
  highlightX: boolean;
  highlightY: boolean;
}) {
  return (
    <>
      <div
        className={`pointer-events-none absolute left-1/2 top-0 z-[25] h-full w-px -translate-x-1/2 transition-opacity duration-75 ${
          highlightY ? "bg-blue-500 opacity-100" : "bg-blue-400/45 opacity-80"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute left-0 top-1/2 z-[25] h-px w-full -translate-y-1/2 transition-opacity duration-75 ${
          highlightX ? "bg-blue-500 opacity-100" : "bg-blue-400/45 opacity-80"
        }`}
        aria-hidden
      />
    </>
  );
}
