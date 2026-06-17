"use client";

import { useMemo } from "react";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "@/lib/types";
import { PropertiesPanel } from "./properties/PropertiesPanel";
import { StackedInspectorPanel } from "./StackedInspectorPanel";

/** 預覽畫布左側 — object manager + 選取物件屬性面板 */
export function CanvasInfoPanel({
  layers,
  selectedLayerIds,
  isBusy,
  readOnly = false,
  largePrintModeEnabled,
  onSelectLayer,
  onDeleteLayer,
  onLayerResize,
  onKeepRatioChange,
  onTextPatch,
  onImagePatch,
  onShapePatch,
}: {
  layers: DesignLayer[];
  selectedLayerIds: string[];
  isBusy: boolean;
  readOnly?: boolean;
  largePrintModeEnabled: boolean;
  onSelectLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onLayerResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
    keepRatio: boolean,
  ) => void;
  onKeepRatioChange?: (id: string, keepRatio: boolean) => void;
  onTextPatch: (id: string, patch: Partial<TextDesignLayer>) => void;
  onImagePatch: (id: string, patch: Partial<ImageDesignLayer>) => void;
  onShapePatch: (id: string, patch: Partial<ShapeDesignLayer>) => void;
}) {
  const primaryLayer = useMemo(() => {
    if (selectedLayerIds.length === 0) return null;
    const id = selectedLayerIds[selectedLayerIds.length - 1];
    return layers.find((layer) => layer.id === id) ?? null;
  }, [layers, selectedLayerIds]);

  if (layers.length === 0) {
    return null;
  }

  const inspectorDisabled = readOnly || isBusy;

  return (
    <aside
      className="flex h-full min-h-0 w-auto max-w-[15rem] shrink-0 flex-col overflow-y-auto border-r border-zinc-200 bg-white px-1 py-0.5"
      aria-label="Object manager"
    >
      <StackedInspectorPanel
        layers={layers}
        selectedLayerIds={selectedLayerIds}
        readOnly={readOnly}
        isBusy={isBusy}
        onSelectLayer={onSelectLayer}
        onDeleteLayer={onDeleteLayer}
        onLayerResize={onLayerResize}
        onKeepRatioChange={onKeepRatioChange}
      />
      {primaryLayer && (
        <PropertiesPanel
          layer={primaryLayer}
          disabled={inspectorDisabled}
          largePrintModeEnabled={largePrintModeEnabled}
          onTextPatch={(patch) => onTextPatch(primaryLayer.id, patch)}
          onImagePatch={(patch) => onImagePatch(primaryLayer.id, patch)}
          onShapePatch={(patch) => onShapePatch(primaryLayer.id, patch)}
        />
      )}
    </aside>
  );
}
