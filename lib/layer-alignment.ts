import type { PrintAreaCmBounds } from "./design-cm";
import {
  fitImageLayer,
  fitShapeLayer,
  fitTextLayer,
} from "./layer-constraints";
import {
  getLayerInspectorCmRect,
  getLayerOrientedAabbCm,
  type LayerInspectorAabbCm,
} from "./design-inspector";
import type { ElementAlignmentGuides } from "./element-snap";
import type { DesignLayer } from "./types";

export type LayerAlignmentAxis =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export const LAYER_ALIGNMENT_OPTIONS: {
  id: LayerAlignmentAxis;
  label: string;
  title: string;
}[] = [
  { id: "left", label: "左", title: "靠左對齊" },
  { id: "center", label: "中", title: "水平置中" },
  { id: "right", label: "右", title: "靠右對齊" },
  { id: "top", label: "上", title: "靠上對齊" },
  { id: "middle", label: "中", title: "垂直置中" },
  { id: "bottom", label: "下", title: "靠下對齊" },
];

function unionAabbs(aabbs: LayerInspectorAabbCm[]): LayerInspectorAabbCm {
  const left = Math.min(...aabbs.map((a) => a.left));
  const top = Math.min(...aabbs.map((a) => a.top));
  const right = Math.max(...aabbs.map((a) => a.right));
  const bottom = Math.max(...aabbs.map((a) => a.bottom));
  return {
    left,
    top,
    right,
    bottom,
    width_cm: right - left,
    height_cm: bottom - top,
  };
}

function getAlignableLayers(
  layers: DesignLayer[],
  selectedIds: string[],
): DesignLayer[] {
  const idSet = new Set(selectedIds);
  return layers.filter(
    (layer) =>
      idSet.has(layer.id) && layer.visible && !layer.locked,
  );
}

/** 單選：印刷區；多選：選取群組 union AABB */
export function getAlignmentReferenceBounds(
  layers: DesignLayer[],
  selectedIds: string[],
  printArea: PrintAreaCmBounds,
): LayerInspectorAabbCm | null {
  const selected = getAlignableLayers(layers, selectedIds);
  if (selected.length === 0) return null;

  if (selected.length === 1) {
    return {
      left: 0,
      top: 0,
      right: printArea.width,
      bottom: printArea.height,
      width_cm: printArea.width,
      height_cm: printArea.height,
    };
  }

  const aabbs = selected.map((layer) => {
    const rect = getLayerInspectorCmRect(layer);
    return getLayerOrientedAabbCm(rect, layer.rotation);
  });
  return unionAabbs(aabbs);
}

export function getAlignmentGuideLines(
  axis: LayerAlignmentAxis,
  reference: LayerInspectorAabbCm,
): ElementAlignmentGuides {
  const centerX = (reference.left + reference.right) / 2;
  const centerY = (reference.top + reference.bottom) / 2;

  switch (axis) {
    case "left":
      return { vertical: [reference.left], horizontal: [] };
    case "center":
      return { vertical: [centerX], horizontal: [] };
    case "right":
      return { vertical: [reference.right], horizontal: [] };
    case "top":
      return { vertical: [], horizontal: [reference.top] };
    case "middle":
      return { vertical: [], horizontal: [centerY] };
    case "bottom":
      return { vertical: [], horizontal: [reference.bottom] };
  }
}

export function getAlignmentGuidesForSelection(
  layers: DesignLayer[],
  selectedIds: string[],
  axis: LayerAlignmentAxis,
  printArea: PrintAreaCmBounds,
): ElementAlignmentGuides | null {
  const reference = getAlignmentReferenceBounds(
    layers,
    selectedIds,
    printArea,
  );
  if (!reference) return null;
  return getAlignmentGuideLines(axis, reference);
}

function fitAlignedLayer(
  layer: DesignLayer,
  printArea: PrintAreaCmBounds,
): DesignLayer {
  if (layer.type === "text") return fitTextLayer(layer, printArea);
  if (layer.type === "shape") return fitShapeLayer(layer, printArea);
  return fitImageLayer(layer, printArea);
}

export function alignDesignLayers(
  layers: DesignLayer[],
  selectedIds: string[],
  axis: LayerAlignmentAxis,
  printArea: PrintAreaCmBounds,
): DesignLayer[] {
  const selected = getAlignableLayers(layers, selectedIds);
  if (selected.length === 0) return layers;

  const reference = getAlignmentReferenceBounds(
    layers,
    selectedIds,
    printArea,
  );
  if (!reference) return layers;

  const selectedIdsSet = new Set(selected.map((layer) => layer.id));
  const refCenterX = (reference.left + reference.right) / 2;
  const refCenterY = (reference.top + reference.bottom) / 2;

  return layers.map((layer) => {
    if (!selectedIdsSet.has(layer.id)) return layer;

    const rect = getLayerInspectorCmRect(layer);
    const aabb = getLayerOrientedAabbCm(rect, layer.rotation);
    const layerCenterX = (aabb.left + aabb.right) / 2;
    const layerCenterY = (aabb.top + aabb.bottom) / 2;

    let dx = 0;
    let dy = 0;

    switch (axis) {
      case "left":
        dx = reference.left - aabb.left;
        break;
      case "center":
        dx = refCenterX - layerCenterX;
        break;
      case "right":
        dx = reference.right - aabb.right;
        break;
      case "top":
        dy = reference.top - aabb.top;
        break;
      case "middle":
        dy = refCenterY - layerCenterY;
        break;
      case "bottom":
        dy = reference.bottom - aabb.bottom;
        break;
    }

    if (dx === 0 && dy === 0) return layer;

    return fitAlignedLayer(
      {
        ...layer,
        x_cm: layer.x_cm + dx,
        y_cm: layer.y_cm + dy,
      },
      printArea,
    );
  });
}

export function countAlignableLayers(
  layers: DesignLayer[],
  selectedIds: string[],
): number {
  return getAlignableLayers(layers, selectedIds).length;
}
