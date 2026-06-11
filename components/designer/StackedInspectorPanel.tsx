"use client";

import { useMemo } from "react";
import { sortLayersForPanel } from "@/lib/layers";
import type { DesignLayer } from "@/lib/types";
import { InspectorObjectCard } from "./InspectorObjectCard";

/** Figma-like object manager：列出當前面所有 text / image，每物件一張 card */
export function StackedInspectorPanel({
  layers,
  selectedLayerIds,
  readOnly = false,
  isBusy = false,
  onSelectLayer,
  onDeleteLayer,
  onLayerResize,
  className = "",
}: {
  layers: DesignLayer[];
  selectedLayerIds: string[];
  readOnly?: boolean;
  isBusy?: boolean;
  onSelectLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onLayerResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
  ) => void;
  className?: string;
}) {
  const managedLayers = useMemo(
    () => sortLayersForPanel(layers),
    [layers],
  );

  if (managedLayers.length === 0) {
    return null;
  }

  const inspectorDisabled = readOnly || isBusy;
  const selectedSet = useMemo(
    () => new Set(selectedLayerIds),
    [selectedLayerIds],
  );

  return (
    <div
      className={`flex flex-col gap-1 overflow-y-auto ${className}`}
      aria-label="Object manager"
    >
      <div className="flex items-baseline justify-between px-0.5">
        <h3 className="text-[10px] font-semibold text-zinc-800">Objects</h3>
        <span className="text-[9px] text-zinc-400">{managedLayers.length}</span>
      </div>
      {readOnly && (
        <p className="px-0.5 text-[9px] leading-tight text-zinc-500">
          已鎖定 · 僅供檢視
        </p>
      )}
      {managedLayers.map((layer) => (
        <InspectorObjectCard
          key={layer.id}
          layer={layer}
          allLayers={layers}
          disabled={inspectorDisabled}
          isSelected={selectedSet.has(layer.id)}
          onSelect={onSelectLayer}
          onDelete={onDeleteLayer}
          onResize={onLayerResize}
        />
      ))}
    </div>
  );
}
