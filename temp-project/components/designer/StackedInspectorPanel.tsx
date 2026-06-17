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
  onKeepRatioChange,
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
    keepRatio: boolean,
  ) => void;
  onKeepRatioChange?: (id: string, keepRatio: boolean) => void;
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
    <div className="flex flex-col gap-0.5 pb-1" aria-label="Object manager">
      <div className="flex shrink-0 items-baseline justify-between px-0.5 pt-0.5">
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
          onKeepRatioChange={onKeepRatioChange}
        />
      ))}
    </div>
  );
}
