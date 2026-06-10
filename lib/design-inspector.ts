/**
 * Design Inspector：layer cm 度量與印刷區／安全區邊界檢查。
 * 不修改 print area 或 shirt scale 系統。
 */

import { DESIGN_SAFE_MARGIN } from "./constants";
import {
  getLayerEffectiveCmRect,
  getPrintAreaCmBounds,
  type LayerCmRect,
  type PrintAreaCmBounds,
} from "./design-cm";
import { getRotatedAabb } from "./geometry";
import { measureTextBoundsCm } from "./text-layer";
import type { DesignLayer } from "./types";

export const DESIGN_SAFE_ZONE_SCALE = 1 - DESIGN_SAFE_MARGIN * 2;

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

export function getDesignSafeZoneCm(
  printArea: PrintAreaCmBounds = getPrintAreaCmBounds(),
): LayerCmRect {
  const insetX = printArea.width * DESIGN_SAFE_MARGIN;
  const insetY = printArea.height * DESIGN_SAFE_MARGIN;
  return {
    x_cm: insetX,
    y_cm: insetY,
    width_cm: printArea.width * DESIGN_SAFE_ZONE_SCALE,
    height_cm: printArea.height * DESIGN_SAFE_ZONE_SCALE,
  };
}

export function getLayerInspectorCmRect(layer: DesignLayer): LayerCmRect {
  if (layer.type === "text") {
    const fontSize_cm = layer.fontSize_cm * layer.scale;
    const { width_cm, height_cm } = measureTextBoundsCm(
      layer.text,
      fontSize_cm,
      layer.fontFamily,
      layer.fontWeight,
    );
    return {
      x_cm: layer.x_cm,
      y_cm: layer.y_cm,
      width_cm,
      height_cm,
    };
  }
  return getLayerEffectiveCmRect(layer);
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
  printArea: PrintAreaCmBounds = getPrintAreaCmBounds(),
): LayerInspectorReport {
  const rect = getLayerInspectorCmRect(layer);
  const aabb = getLayerOrientedAabbCm(rect, layer.rotation);
  const printBounds: LayerCmRect = {
    x_cm: 0,
    y_cm: 0,
    width_cm: printArea.width,
    height_cm: printArea.height,
  };
  const safeZone = getDesignSafeZoneCm(printArea);

  const exceedsPrintArea = aabbExceedsBounds(aabb, printBounds);
  const exceedsSafeZone = aabbExceedsBounds(aabb, safeZone);

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
    aabb,
  };
}

export function inspectDesignLayers(
  layers: DesignLayer[],
  printArea: PrintAreaCmBounds = getPrintAreaCmBounds(),
): LayerInspectorReport[] {
  return layers.map((layer) => inspectDesignLayer(layer, printArea));
}

export function formatInspectorCm(value: number, digits = 1): string {
  return `${value.toFixed(digits)} cm`;
}
