import { GRID_SIZE_CM } from "@/lib/constants";
import type { Side } from "@/lib/constants";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import { getGarmentPrintSafeZonePctInPrintArea } from "@/lib/coordinates/garment";
import { UI_VISIBILITY } from "./ui-visibility";

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
  if (!UI_VISIBILITY.showPrintAreaCenterGuides) {
    return UI_VISIBILITY.showPrintAreaCenterCrosshair ? (
      <PrintAreaCenterCrosshair highlightX={highlightX} highlightY={highlightY} />
    ) : null;
  }

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
      {UI_VISIBILITY.showPrintAreaCenterCrosshair ? (
        <PrintAreaCenterCrosshair highlightX={highlightX} highlightY={highlightY} />
      ) : null}
    </>
  );
}

function PrintAreaCenterCrosshair({
  highlightX,
  highlightY,
}: {
  highlightX: boolean;
  highlightY: boolean;
}) {
  const active = highlightX || highlightY;
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-[26] -translate-x-1/2 -translate-y-1/2"
      aria-hidden
      data-print-area-center-crosshair
    >
      <div
        className={`h-2.5 w-2.5 rounded-full border ${
          active
            ? "border-blue-500 bg-blue-500/25"
            : "border-blue-400/70 bg-blue-400/15"
        }`}
      />
      <div
        className={`absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 ${
          active ? "bg-blue-500" : "bg-blue-400/70"
        }`}
      />
      <div
        className={`absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 ${
          active ? "bg-blue-500" : "bg-blue-400/70"
        }`}
      />
    </div>
  );
}
