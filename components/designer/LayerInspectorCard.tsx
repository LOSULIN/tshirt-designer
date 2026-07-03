"use client";

import type { LayerInspectorReport } from "@/lib/design-inspector";
import { getInspectorConstraintBadgeMeta } from "@/lib/garment-constraint-ux-polish";
import { GARMENT_CONSTRAINT_LEVEL_STYLES } from "@/lib/garment-constraint-ux-polish";
import type { DesignLayer } from "@/lib/types";
import { GarmentConstraintBadge } from "./GarmentConstraintUxPrimitives";
import { LayerTypeIcon } from "./layer-icons-ui";
import { ds } from "./design-ui";

const actionBtn =
  "rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-700 transition-colors duration-150 ease-out hover:bg-zinc-200 active:bg-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50";

export function LayerInspectorCard({
  layer,
  report,
  selected,
  displayLabel,
  visible,
  locked,
  editingName,
  editName,
  isBusy,
  onSelect,
  onStartRename,
  onEditNameChange,
  onCommitRename,
  onCancelRename,
  onToggleVisible,
  onToggleLocked,
  onMove,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggable,
  isDragging = false,
  isDropTarget = false,
}: {
  layer: DesignLayer;
  report: LayerInspectorReport;
  selected: boolean;
  displayLabel: string;
  visible: boolean;
  locked: boolean;
  editingName: boolean;
  editName: string;
  isBusy: boolean;
  onSelect: (shiftKey: boolean) => void;
  onStartRename: () => void;
  onEditNameChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onMove: (action: "top" | "up" | "down" | "bottom") => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  draggable: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
}) {
  const isWarning = report.status === "warning";
  const inspectorBadge = getInspectorConstraintBadgeMeta(
    report.exceedsPrintArea,
    report.exceedsSafeZone,
    report.name,
    report.warnings,
  );
  const levelStyles = GARMENT_CONSTRAINT_LEVEL_STYLES[inspectorBadge.level];

  return (
    <li
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative rounded-lg border px-2 py-2 transition-all duration-150 ease-out ${ds.motion.shadow} ${
        isDropTarget
          ? "border-blue-700 ring-2 ring-blue-100"
          : selected
            ? isWarning
              ? "border-amber-400 bg-amber-50 ring-2 ring-amber-100"
              : "border-blue-700 bg-blue-50/90 ring-2 ring-blue-100"
            : isWarning
              ? "border-amber-200 bg-amber-50/80 hover:border-amber-300 hover:bg-amber-50 hover:shadow-sm"
              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm"
      } ${isDragging ? "opacity-45" : ""}`}
    >
      {isDropTarget ? (
        <span
          className="pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded-full bg-blue-700"
          aria-hidden
        />
      ) : null}
      <button
        type="button"
        disabled={isBusy}
        className="mb-1 flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 rounded-md"
        onClick={(e) => onSelect(e.shiftKey)}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50">
          <LayerTypeIcon layer={layer} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium text-zinc-900 ${ds.type.body}`}>
            {displayLabel}
          </span>
        </span>
        <GarmentConstraintBadge
          level={inspectorBadge.level}
          label={inspectorBadge.shortLabel}
          tooltip={inspectorBadge.tooltip}
          pulse={inspectorBadge.level === "violation"}
          inspectorBadge
        />
      </button>

      {editingName ? (
        <input
          className={`mb-2 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-zinc-900 ${ds.type.body} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600`}
          value={editName}
          disabled={isBusy}
          onChange={(e) => onEditNameChange(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename();
            if (e.key === "Escape") onCancelRename();
          }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          disabled={isBusy}
          className={`mb-2 ${ds.type.helper} ${ds.accent.link} hover:underline`}
          onClick={onStartRename}
        >
          重新命名
        </button>
      )}

      {report.warnings.length > 0 && (
        <div
          data-garment-constraint-inspector-warning
          className="mb-2 space-y-0.5"
        >
          {report.warnings.map((warning) => (
            <p
              key={warning}
              className={`text-[10px] font-medium leading-tight ${levelStyles.text}`}
              role="status"
            >
              ⚠ {warning}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          title="顯示/隱藏"
          disabled={isBusy}
          onClick={onToggleVisible}
          className={actionBtn}
        >
          {visible ? "👁" : "👁‍🗨"}
        </button>
        <button
          type="button"
          title="鎖定/解鎖"
          disabled={isBusy}
          onClick={onToggleLocked}
          className={actionBtn}
        >
          {locked ? "🔒" : "🔓"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onMove("top")}
          className={actionBtn}
        >
          頂
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onMove("up")}
          className={actionBtn}
        >
          ↑
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onMove("down")}
          className={actionBtn}
        >
          ↓
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onMove("bottom")}
          className={actionBtn}
        >
          底
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={onDuplicate}
          className={actionBtn}
        >
          複製
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={onDelete}
          className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700 transition-colors duration-150 ease-out hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        >
          刪除
        </button>
      </div>
    </li>
  );
}
