"use client";

import type { LayerInspectorReport } from "@/lib/design-inspector";
import { getInspectorConstraintBadgeMeta } from "@/lib/garment-constraint-ux-polish";
import { GARMENT_CONSTRAINT_LEVEL_STYLES } from "@/lib/garment-constraint-ux-polish";
import { GarmentConstraintBadge } from "./GarmentConstraintUxPrimitives";

export function LayerInspectorCard({
  report,
  selected,
  typeLabel,
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
}: {
  report: LayerInspectorReport;
  selected: boolean;
  typeLabel: string;
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
      className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
        selected
          ? isWarning
            ? "border-amber-400 bg-amber-50 ring-1 ring-amber-300"
            : "border-blue-400 bg-blue-50"
          : isWarning
            ? "border-amber-300 bg-amber-50/70 hover:bg-amber-50"
            : "border-zinc-200 bg-white hover:bg-zinc-50"
      }`}
    >
      <button
        type="button"
        disabled={isBusy}
        className="mb-1 flex w-full items-start justify-between gap-2 text-left"
        onClick={(e) => onSelect(e.shiftKey)}
      >
        <span>
          <span className="font-medium text-zinc-900">{report.name}</span>
          <span className="ml-1 text-xs text-zinc-600">· {typeLabel}</span>
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
          className="mb-2 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900"
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
          className="mb-2 text-xs text-blue-600 hover:underline"
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
          className="rounded bg-zinc-100 px-2 py-0.5 text-xs hover:bg-zinc-200"
        >
          {visible ? "👁" : "👁‍🗨"}
        </button>
        <button
          type="button"
          title="鎖定/解鎖"
          disabled={isBusy}
          onClick={onToggleLocked}
          className="rounded bg-zinc-100 px-2 py-0.5 text-xs hover:bg-zinc-200"
        >
          {locked ? "🔒" : "🔓"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onMove("top")}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
        >
          頂
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onMove("up")}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onMove("down")}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
        >
          ↓
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onMove("bottom")}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
        >
          底
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={onDuplicate}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs hover:bg-zinc-200"
        >
          複製
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={onDelete}
          className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100"
        >
          刪除
        </button>
      </div>
    </li>
  );
}
