"use client";

import { useState } from "react";
import { getLayerInspectorCmRect } from "@/lib/design-inspector";
import { coupleInspectorDimensions } from "@/lib/inspector-sync";
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
    <div className="flex items-center gap-1 text-[9px] leading-none">
      <span className="w-4 shrink-0 text-zinc-500">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-0.5">{children}</div>
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
  onKeepRatioChange,
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
    keepRatio: boolean,
  ) => void;
  onKeepRatioChange?: (id: string, keepRatio: boolean) => void;
}) {
  const [localKeepRatio, setLocalKeepRatio] = useState(true);
  const keepRatio =
    layer.type === "image" || layer.type === "text"
      ? (layer.keepRatio ?? true)
      : localKeepRatio;
  const bounds = getLayerInspectorCmRect(layer);
  const displayName = getObjectDisplayName(layer, allLayers);
  const typeLabel = getLayerTypeLabel(layer.type);

  const commitSize = (patch: { width_cm?: number; height_cm?: number }) => {
    const { width_cm, height_cm } = coupleInspectorDimensions(
      bounds,
      patch,
      keepRatio,
    );

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
      keepRatio,
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
      className={`cursor-pointer rounded border px-1 py-0.5 transition-colors ${
        isSelected
          ? "border-sky-400 bg-sky-50/60 ring-1 ring-sky-200"
          : "border-zinc-200 bg-zinc-50/40 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
      aria-label={`${displayName} object card`}
      aria-pressed={isSelected}
    >
      <header className="mb-0.5 flex items-center justify-between gap-0.5 leading-none">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold leading-tight text-zinc-800">
            {displayName}
          </p>
          <p className="truncate text-[8px] leading-tight text-zinc-400">
            {layer.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="text-[8px] font-medium uppercase text-zinc-400">
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
            className="rounded px-0.5 text-[10px] leading-none text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            aria-label={`刪除 ${displayName}`}
          >
            ×
          </button>
        </div>
      </header>

      <div
        className="space-y-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <CompactSizeRow label="寬">
          <InspectorNumberInput
            compact
            value={bounds.width_cm}
            decimals={1}
            dimensionDisplay
            disabled={disabled}
            ariaLabel={`${displayName} 寬度 cm`}
            className="w-[3.25rem] shrink-0"
            onCommit={(width_cm) => commitSize({ width_cm })}
          />
          <span className="shrink-0 text-[8px] text-zinc-400">cm</span>
        </CompactSizeRow>
        <CompactSizeRow label="高">
          <InspectorNumberInput
            compact
            value={bounds.height_cm}
            decimals={1}
            dimensionDisplay
            disabled={disabled}
            ariaLabel={`${displayName} 高度 cm`}
            className="w-[3.25rem] shrink-0"
            onCommit={(height_cm) => commitSize({ height_cm })}
          />
          <span className="shrink-0 text-[8px] text-zinc-400">cm</span>
        </CompactSizeRow>
        <label className="flex cursor-pointer items-center gap-1 text-[9px] leading-none text-zinc-600">
          <input
            type="checkbox"
            className="h-2.5 w-2.5 rounded border-zinc-300"
            checked={keepRatio}
            disabled={disabled}
            onChange={(e) => {
              const next = e.target.checked;
              if (layer.type === "image" || layer.type === "text") {
                onKeepRatioChange?.(layer.id, next);
              } else {
                setLocalKeepRatio(next);
              }
            }}
          />
          保持比例
        </label>
        <InspectorProofDetails layer={layer} compact />
      </div>
    </article>
  );
}
