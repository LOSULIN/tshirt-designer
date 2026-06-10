/**
 * MVP Layer System — 層級排序與選取輔助。
 * 僅影響 render order；不修改 cm 計算或 inspector 邏輯。
 */

import { sortLayersByZIndex, sortLayersForPanel } from "./layers";
import type { DesignLayer } from "./types";

export interface MvpLayerListItem {
  id: string;
  name: string;
  type: "text" | "image";
  zIndex: number;
  isSelected: boolean;
}

export function getMvpLayerListItems(
  layers: DesignLayer[],
  selectedLayerId: string | null,
): MvpLayerListItem[] {
  return sortLayersForPanel(layers).map((layer) => ({
    id: layer.id,
    name: layer.name,
    type: layer.type,
    zIndex: layer.zIndex,
    isSelected: layer.id === selectedLayerId,
  }));
}

/** Canvas render：zIndex 小 → 大，越大越在上層 */
export function getLayersForCanvasRender(layers: DesignLayer[]): DesignLayer[] {
  return sortLayersByZIndex(layers);
}

export function canMoveLayerZIndex(
  layers: DesignLayer[],
  layerId: string,
  direction: "up" | "down",
): boolean {
  const sorted = sortLayersByZIndex(layers);
  const index = sorted.findIndex((layer) => layer.id === layerId);
  if (index < 0) return false;
  if (direction === "up") {
    return index < sorted.length - 1;
  }
  return index > 0;
}

export function getLayerTypeLabel(type: "text" | "image"): string {
  return type === "text" ? "Text" : "Image";
}
