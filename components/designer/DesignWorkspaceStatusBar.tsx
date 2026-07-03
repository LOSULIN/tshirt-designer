"use client";

import type { PrintAreaCmBounds } from "@/lib/design-cm";
import { formatGarmentPrintAreaCmPair } from "@/lib/garment-constraint-ux";
import type { GarmentPrintStatus } from "@/lib/garment-constraint-ux-polish";
import { GARMENT_CONSTRAINT_LEVEL_STYLES } from "@/lib/garment-constraint-ux-polish";
import { GarmentConstraintBadge, GarmentConstraintTooltip } from "./GarmentConstraintUxPrimitives";

function formatCmPair(bounds: PrintAreaCmBounds): string {
  return formatGarmentPrintAreaCmPair(bounds);
}

export function DesignWorkspaceStatusBar({
  size,
  maxPrintBounds,
  hasOverflow,
  violationCount = 0,
  statusWarning = null,
  printStatus,
}: {
  size: string;
  maxPrintBounds: PrintAreaCmBounds;
  hasOverflow: boolean;
  /** 超出目前尺碼可印的圖層數 */
  violationCount?: number;
  /** Constraint Runtime 衍生的狀態列警告文案 */
  statusWarning?: string | null;
  /** Step 12.9D：可印狀態（等級、標籤、說明） */
  printStatus?: GarmentPrintStatus;
}) {
  const showWarning = hasOverflow || violationCount > 0;
  const status = printStatus ?? {
    level: showWarning ? ("violation" as const) : ("ok" as const),
    label: showWarning ? `${violationCount} 個圖層需調整` : "可印就緒",
    detail:
      statusWarning ??
      (showWarning
        ? "部分圖層超出目前尺碼可印範圍"
        : `尺碼 ${size} · 所有圖層均在可印範圍內`),
  };
  const levelStyles = GARMENT_CONSTRAINT_LEVEL_STYLES[status.level];

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-100 bg-zinc-50 px-3 py-1.5"
      role="status"
      aria-label="設計工作區狀態"
      data-design-workspace-status-bar
    >
      <span className="text-[10px] font-medium text-zinc-600">印刷區</span>
      <span className="text-[10px] text-zinc-500">
        尺碼 <span className="font-medium text-zinc-800">{size}</span>
      </span>
      <span className="text-[10px] text-zinc-500">
        目前可印{" "}
        <span
          className="font-mono font-medium tabular-nums text-zinc-800"
          data-garment-constraint-status-print-size
        >
          {formatCmPair(maxPrintBounds)}
        </span>
      </span>
      <GarmentConstraintTooltip label={status.detail}>
        <span
          data-garment-constraint-print-status
          data-garment-constraint-warning-level={status.level}
          className="inline-flex"
        >
          <GarmentConstraintBadge
            level={status.level}
            label={status.label}
            pulse={status.level !== "ok"}
          />
        </span>
      </GarmentConstraintTooltip>
      {showWarning && (
        <span
          data-garment-constraint-status-warning
          className={`text-[10px] font-medium ${levelStyles.text} ${status.level !== "ok" ? "animate-garment-constraint-ring-pulse" : ""}`}
        >
          ⚠ {statusWarning ?? "This artwork exceeds the printable area for the current garment size."}
        </span>
      )}
    </div>
  );
}
