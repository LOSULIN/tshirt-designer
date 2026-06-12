"use client";

import { useState } from "react";
import { getLayerInspectorCmRect } from "@/lib/design-inspector";
import {
  formatInspectorDimensionDisplay,
  formatInspectorDimensionPrecise,
} from "@/lib/inspector-sync";
import { getLayerTypeLabel } from "@/lib/layer-system";
import { sortLayersForPanel } from "@/lib/layers";
import type { DesignLayer } from "@/lib/types";
import { InspectorProofDetails } from "./InspectorProofDetails";
import { InspectorNumberInput } from "./InspectorNumberInput";

function getObjectTypeLabel(type: DesignLayer["type"]): string {
  if (type === "text") return "Text";
  if (type === "image") return "Image";
  return "Shape";
}

function getObjectDisplayName(
  layer: DesignLayer,
  allLayers: DesignLayer[],
): string {
  const sameType = sortLayersForPanel(allLayers).filter(
    (entry) => entry.type === layer.type,
  );
  const index = sameType.findIndex((entry) => entry.id === layer.id) + 1;
  return `${getObjectTypeLabel(layer.type)} ${index}`;
}

function CompactSizeRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] leading-tight">
      <span className="w-10 shrink-0 text-zinc-500">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1">{children}</div>
    </div>
  );
}

export function InspectorObjectCard({
  layer,
  allLayers,
  disabled,
  isSelected = false,
  onSelect,
  onDelete,
  onResize,
}: {
  layer: DesignLayer;
  allLayers: DesignLayer[];
  disabled: boolean;
  isSelected?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
    lockAspect: boolean,
  ) => void;
}) {
  const [lockAspect, setLockAspect] = useState(true);
  const bounds = getLayerInspectorCmRect(layer);
  const displayName = getObjectDisplayName(layer, allLayers);
  const typeLabel = getLayerTypeLabel(layer.type);

  const commitSize = (patch: { width_cm?: number; height_cm?: number }) => {
    let width_cm = patch.width_cm ?? bounds.width_cm;
    let height_cm = patch.height_cm ?? bounds.height_cm;

    if (
      lockAspect &&
      bounds.width_cm > 0 &&
      bounds.height_cm > 0
    ) {
      if (patch.width_cm !== undefined && patch.height_cm === undefined) {
        height_cm = bounds.height_cm * (width_cm / bounds.width_cm);
      } else if (patch.height_cm !== undefined && patch.width_cm === undefined) {
        width_cm = bounds.width_cm * (height_cm / bounds.height_cm);
      }
    }

    const centerX = bounds.x_cm + bounds.width_cm / 2;
    const centerY = bounds.y_cm + bounds.height_cm / 2;

    onResize(
      layer.id,
      {
        x_cm: centerX - width_cm / 2,
        y_cm: centerY - height_cm / 2,
        width_cm,
        height_cm,
      },
      lockAspect,
    );
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(layer.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(layer.id);
        }
      }}
      className={`cursor-pointer rounded border px-1.5 py-1 transition-colors ${
        isSelected
          ? "border-sky-400 bg-sky-50/60 ring-1 ring-sky-200"
          : "border-zinc-200 bg-zinc-50/40 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
      aria-label={`${displayName} object card`}
      aria-pressed={isSelected}
    >
      <header className="mb-0.5 flex items-center justify-between gap-1 leading-tight">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold text-zinc-800">
            {displayName}
          </p>
          <p className="truncate text-[9px] text-zinc-500">{layer.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[9px] font-medium uppercase text-zinc-400">
            {typeLabel}
          </span>
          <button
            type="button"
            title="刪除物件"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
            className="rounded px-1 text-[11px] leading-none text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            aria-label={`刪除 ${displayName}`}
          >
            ×
          </button>
        </div>
      </header>

      <div
        className="space-y-1"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
          尺寸
        </p>
        <CompactSizeRow label="寬度">
          <InspectorNumberInput
            compact
            value={bounds.width_cm}
            decimals={1}
            dimensionDisplay
            disabled={disabled}
            ariaLabel={`${displayName} 寬度 cm`}
            onCommit={(width_cm) => commitSize({ width_cm })}
          />
          <span className="shrink-0 text-[9px] text-zinc-400">cm</span>
        </CompactSizeRow>
        <CompactSizeRow label="高度">
          <InspectorNumberInput
            compact
            value={bounds.height_cm}
            decimals={1}
            dimensionDisplay
            disabled={disabled}
            ariaLabel={`${displayName} 高度 cm`}
            onCommit={(height_cm) => commitSize({ height_cm })}
          />
          <span className="shrink-0 text-[9px] text-zinc-400">cm</span>
        </CompactSizeRow>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-zinc-600">
          <input
            type="checkbox"
            className="h-3 w-3 rounded border-zinc-300"
            checked={lockAspect}
            disabled={disabled}
            onChange={(e) => setLockAspect(e.target.checked)}
          />
          保持比例
        </label>
        <InspectorProofDetails layer={layer} />
      </div>
    </article>
  );
}
