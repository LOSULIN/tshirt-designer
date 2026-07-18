"use client";

import { useMemo } from "react";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import { formatGarmentPrintAreaCmPair } from "@/lib/garment-constraint-ux";
import type { GarmentPrintStatus } from "@/lib/garment-constraint-ux-polish";
import type { DesignLayer } from "@/lib/types";
import type { Side } from "@/lib/constants";
import { GarmentConstraintTooltip } from "./GarmentConstraintUxPrimitives";
import { ds } from "./design-ui";
import { resolveWorkspacePrintStatus } from "./workspace-print-status-ui";

function formatCmPair(bounds: PrintAreaCmBounds): string {
  return formatGarmentPrintAreaCmPair(bounds);
}

function WorkspaceStatusBadge({
  emoji,
  label,
  token,
  statusKind,
}: {
  emoji: string;
  label: string;
  token: "ok" | "violation" | "dpi";
  statusKind: string;
}) {
  return (
    <span
      data-garment-constraint-print-status
      data-workspace-print-status={statusKind}
      data-garment-constraint-warning-level={
        token === "ok" ? "ok" : token === "violation" ? "violation" : "caution"
      }
      className={`${ds.statusBadge.base} ${ds.statusBadge[token]} ${ds.motion.statusBadge}`}
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

export function DesignWorkspaceStatusBar({
  size,
  side = "front",
  maxPrintBounds,
  hasOverflow,
  violationCount = 0,
  layers = [],
  printStatus: _printStatus,
  embedded = false,
  compact = false,
}: {
  size: string;
  side?: Side;
  maxPrintBounds: PrintAreaCmBounds;
  hasOverflow: boolean;
  violationCount?: number;
  layers?: DesignLayer[];
  statusWarning?: string | null;
  printStatus?: GarmentPrintStatus;
  embedded?: boolean;
  /** Toolbar 內嵌 — 精簡標籤 */
  compact?: boolean;
}) {
  const statusView = useMemo(
    () =>
      resolveWorkspacePrintStatus({
        layers,
        violationCount,
        hasOverflow,
        size,
        side,
      }),
    [layers, violationCount, hasOverflow, size, side],
  );

  const printSizeLabelClass = statusView.printSizeAlert
    ? "text-red-700"
    : "text-zinc-500";
  const printSizeValueClass = statusView.printSizeAlert
    ? "text-red-700"
    : "text-zinc-800";

  if (compact) {
    return (
      <div
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
        role="status"
        aria-label="印刷資訊"
        data-design-workspace-status-bar
      >
        <span className={ds.type.helper}>
          尺寸{" "}
          <span className={`font-medium text-zinc-800 ${ds.type.body}`}>{size}</span>
        </span>
        <span className="hidden text-zinc-300 sm:inline" aria-hidden>
          ·
        </span>
        <span className={`${ds.type.helper} ${printSizeLabelClass}`}>
          可印區域{" "}
          <span
            className={`font-medium ${ds.type.body} ${printSizeValueClass}`}
            data-garment-constraint-status-print-size
          >
            {formatCmPair(maxPrintBounds)} cm
          </span>
        </span>
        <span className="hidden text-zinc-300 sm:inline" aria-hidden>
          ·
        </span>
        <GarmentConstraintTooltip label={statusView.detail}>
          <span className="inline-flex">
            <WorkspaceStatusBadge
              emoji={statusView.emoji}
              label={statusView.label}
              token={statusView.badgeToken}
              statusKind={statusView.kind}
            />
          </span>
        </GarmentConstraintTooltip>
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 py-0"
          : "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-100 bg-zinc-50 px-3 py-1.5"
      }
      role="status"
      aria-label="設計工作區狀態"
      data-design-workspace-status-bar
    >
      <span className={`font-medium text-zinc-600 ${ds.type.helper}`}>印刷區</span>
      <span className={ds.type.helper}>
        尺碼 <span className={`font-medium text-zinc-800 ${ds.type.body}`}>{size}</span>
      </span>
      <span className={`${ds.type.helper} ${printSizeLabelClass}`}>
        目前可印{" "}
        <span
          className={`font-medium ${ds.type.body} ${printSizeValueClass}`}
          data-garment-constraint-status-print-size
        >
          {formatCmPair(maxPrintBounds)}
        </span>
      </span>
      <GarmentConstraintTooltip label={statusView.detail}>
        <span className="inline-flex">
          <WorkspaceStatusBadge
            emoji={statusView.emoji}
            label={statusView.label}
            token={statusView.badgeToken}
            statusKind={statusView.kind}
          />
        </span>
      </GarmentConstraintTooltip>
    </div>
  );
}
