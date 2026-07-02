/**
 * Design Inspector：layer cm 度量與印刷區／安全區邊界檢查。
 * 不修改 print area 或 shirt scale 系統。
 */

import type { Side } from "./constants";
import {
  getLayerEffectiveCmRect,
  type LayerCmRect,
  type PrintAreaCmBounds,
} from "./design-cm";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";
import {
  getWorkspaceGarmentLayerOverflowState,
} from "./layer-overflow";
import { mapWorkspaceLayerCmRectToGarmentPrintArea } from "./placement-presets";
import { getPrintSafeAreaCm, PRINT_SAFE_AREA_SPEC } from "./printArea";
import { getRotatedAabb } from "./geometry";
import { getTextLayerPlacementCmRect } from "./text-layer";
import type { DesignLayer } from "./types";

export type { LayerOverflowAmountsCm, LayerOverflowState } from "./layer-overflow";
export {
  buildWorkspaceGarmentLayerOverflowMap,
  getBluePrintAreaBoundsForSize,
  getLayerOverflowState,
  getLayerOverflowStateForSize,
  getRectOverflowState,
  getWorkspaceGarmentLayerOverflowState,
} from "./layer-overflow";

export const DESIGN_SAFE_ZONE_SCALE = 1 - PRINT_SAFE_AREA_SPEC.marginRatio * 2;

export type LayerInspectorStatus = "ok" | "warning";

export interface LayerInspectorAabbCm {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width_cm: number;
  height_cm: number;
}

export interface LayerInspectorReport {
  layerId: string;
  name: string;
  type: DesignLayer["type"];
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  status: LayerInspectorStatus;
  exceedsPrintArea: boolean;
  exceedsSafeZone: boolean;
  warnings: string[];
  aabb: LayerInspectorAabbCm;
}

export interface InspectDesignLayerContext {
  side: Side;
  size: string;
}

export function getDesignSafeZoneCm(
  printArea: PrintAreaCmBounds,
): LayerCmRect {
  return getPrintSafeAreaCm(printArea);
}

function readLayerModelCmRect(layer: DesignLayer): LayerCmRect {
  if (layer.type === "text") {
    return getTextLayerPlacementCmRect(layer);
  }
  return getLayerEffectiveCmRect(layer);
}

/** Object Panel 顯示用印刷尺寸（cm），與模板 overlay 比例一致 */
export function getLayerInspectorCmRect(layer: DesignLayer): LayerCmRect {
  const rect = readLayerModelCmRect(layer);
  if (layer.rotation !== 0) {
    const aabb = getLayerOrientedAabbCm(rect, layer.rotation);
    return {
      x_cm: aabb.left,
      y_cm: aabb.top,
      width_cm: aabb.width_cm,
      height_cm: aabb.height_cm,
    };
  }
  return rect;
}

export function getLayerOrientedAabbCm(
  rect: LayerCmRect,
  rotation: number,
): LayerInspectorAabbCm {
  const aabb = getRotatedAabb(rect.width_cm, rect.height_cm, rotation);
  const centerX = rect.x_cm + rect.width_cm / 2;
  const centerY = rect.y_cm + rect.height_cm / 2;
  const left = centerX - aabb.width / 2;
  const top = centerY - aabb.height / 2;
  return {
    left,
    top,
    right: left + aabb.width,
    bottom: top + aabb.height,
    width_cm: aabb.width,
    height_cm: aabb.height,
  };
}

function aabbExceedsBounds(
  aabb: LayerInspectorAabbCm,
  bounds: LayerCmRect,
  epsilon = 0.01,
): boolean {
  return (
    aabb.left < bounds.x_cm - epsilon ||
    aabb.top < bounds.y_cm - epsilon ||
    aabb.right > bounds.x_cm + bounds.width_cm + epsilon ||
    aabb.bottom > bounds.y_cm + bounds.height_cm + epsilon
  );
}

export function inspectDesignLayer(
  layer: DesignLayer,
  context: InspectDesignLayerContext,
): LayerInspectorReport {
  const { side, size } = context;
  const rect = readLayerModelCmRect(layer);
  const mappedRect = mapWorkspaceLayerCmRectToGarmentPrintArea(rect, side, size);
  const garmentPrintArea = resolveGarmentPrintAreaCm(size, side);
  const mappedAabb = getLayerOrientedAabbCm(mappedRect, layer.rotation);
  const safeZone = getDesignSafeZoneCm(garmentPrintArea);

  const overflow = getWorkspaceGarmentLayerOverflowState(layer, side, size);
  const exceedsPrintArea = overflow.exceedsPrintArea;
  const exceedsSafeZone = aabbExceedsBounds(mappedAabb, safeZone);

  const warnings: string[] = [];
  if (exceedsPrintArea) {
    warnings.push("超出可印刷範圍");
  } else if (exceedsSafeZone) {
    warnings.push("超出安全區域");
  }

  const status: LayerInspectorStatus =
    exceedsPrintArea || exceedsSafeZone ? "warning" : "ok";

  return {
    layerId: layer.id,
    name: layer.name,
    type: layer.type,
    x_cm: rect.x_cm,
    y_cm: rect.y_cm,
    width_cm: rect.width_cm,
    height_cm: rect.height_cm,
    status,
    exceedsPrintArea,
    exceedsSafeZone,
    warnings,
    aabb: mappedAabb,
  };
}

export function inspectDesignLayers(
  layers: DesignLayer[],
  context: InspectDesignLayerContext,
): LayerInspectorReport[] {
  return layers.map((layer) => inspectDesignLayer(layer, context));
}

export function formatInspectorCm(value: number, digits = 1): string {
  return `${value.toFixed(digits)} cm`;
}
