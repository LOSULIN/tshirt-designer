/**
 * Layer Overflow Warning Runtime — 唯一印刷區超出判斷來源。
 * 僅計算與回報；不得修改 layer cm / scale / rotation。
 */

import type { Side } from "./constants";
import {
  getLayerEffectiveCmRect,
  type LayerCmRect,
  type PrintAreaCmBounds,
} from "./design-cm";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";
import { getRotatedAabb } from "./geometry";
import { mapWorkspaceLayerCmRectToGarmentPrintArea } from "./placement-presets";
import { getTextLayerPlacementCmRect } from "./text-layer";
import type { DesignLayer } from "./types";

export type LayerOverflowEdge = "left" | "right" | "top" | "bottom";

export interface LayerOverflowAmountsCm {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface LayerOverflowAabbCm {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width_cm: number;
  height_cm: number;
}

export interface LayerOverflowState {
  exceedsLeft: boolean;
  exceedsRight: boolean;
  exceedsTop: boolean;
  exceedsBottom: boolean;
  exceedsPrintArea: boolean;
  overflowAmountCm: LayerOverflowAmountsCm;
  overflowEdges: LayerOverflowEdge[];
}

const OVERFLOW_EPSILON_CM = 0.01;

function readLayerModelCmRect(layer: DesignLayer): LayerCmRect {
  if (layer.type === "text") {
    return getTextLayerPlacementCmRect(layer);
  }
  return getLayerEffectiveCmRect(layer);
}

function getLayerOrientedAabbCm(
  rect: LayerCmRect,
  rotation: number,
): LayerOverflowAabbCm {
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

/** Blue Print Area bounds for the selected garment size (designer UI reference). */
export function getBluePrintAreaBoundsForSize(
  size: string,
  side: Side = "front",
): PrintAreaCmBounds {
  return resolveGarmentPrintAreaCm(size, side);
}

/** 純幾何：cm rect + rotation vs print area bounds */
export function getRectOverflowState(
  rect: LayerCmRect,
  rotation: number,
  printArea: PrintAreaCmBounds,
): LayerOverflowState {
  const aabb = getLayerOrientedAabbCm(rect, rotation);
  const bounds: LayerCmRect = {
    x_cm: 0,
    y_cm: 0,
    width_cm: printArea.width,
    height_cm: printArea.height,
  };

  const leftAmount = Math.max(0, bounds.x_cm - aabb.left);
  const topAmount = Math.max(0, bounds.y_cm - aabb.top);
  const rightAmount = Math.max(
    0,
    aabb.right - (bounds.x_cm + bounds.width_cm),
  );
  const bottomAmount = Math.max(
    0,
    aabb.bottom - (bounds.y_cm + bounds.height_cm),
  );

  const exceedsLeft = aabb.left < bounds.x_cm - OVERFLOW_EPSILON_CM;
  const exceedsTop = aabb.top < bounds.y_cm - OVERFLOW_EPSILON_CM;
  const exceedsRight =
    aabb.right > bounds.x_cm + bounds.width_cm + OVERFLOW_EPSILON_CM;
  const exceedsBottom =
    aabb.bottom > bounds.y_cm + bounds.height_cm + OVERFLOW_EPSILON_CM;

  const overflowAmountCm: LayerOverflowAmountsCm = {
    left: exceedsLeft ? leftAmount : 0,
    right: exceedsRight ? rightAmount : 0,
    top: exceedsTop ? topAmount : 0,
    bottom: exceedsBottom ? bottomAmount : 0,
  };

  const overflowEdges: LayerOverflowEdge[] = [];
  if (exceedsLeft) overflowEdges.push("left");
  if (exceedsRight) overflowEdges.push("right");
  if (exceedsTop) overflowEdges.push("top");
  if (exceedsBottom) overflowEdges.push("bottom");

  return {
    exceedsLeft,
    exceedsRight,
    exceedsTop,
    exceedsBottom,
    exceedsPrintArea:
      exceedsLeft || exceedsRight || exceedsTop || exceedsBottom,
    overflowAmountCm,
    overflowEdges,
  };
}

/** @deprecated 向下相容：假設 layer rect 與 printArea 同一座標系 */
export function getLayerOverflowState(
  layer: DesignLayer,
  printArea: PrintAreaCmBounds,
): LayerOverflowState {
  const rect = readLayerModelCmRect(layer);
  return getRectOverflowState(rect, layer.rotation, printArea);
}

/**
 * Workspace Canonical → Garment size-aware Overflow（Designer / Inspector / Proof 共用）。
 */
export function getWorkspaceGarmentLayerOverflowState(
  layer: DesignLayer,
  side: Side,
  size: string,
): LayerOverflowState {
  const workspaceRect = readLayerModelCmRect(layer);
  const mappedRect = mapWorkspaceLayerCmRectToGarmentPrintArea(
    workspaceRect,
    side,
    size,
  );
  const garmentPrintArea = resolveGarmentPrintAreaCm(size, side);
  return getRectOverflowState(mappedRect, layer.rotation, garmentPrintArea);
}

export function getLayerOverflowStateForSize(
  layer: DesignLayer,
  size: string,
  side: Side = "front",
): LayerOverflowState {
  return getWorkspaceGarmentLayerOverflowState(layer, side, size);
}

/** @deprecated 向下相容：假設 layer rect 與 printArea 同一座標系 */
export function buildLayerOverflowMap(
  layers: DesignLayer[],
  printArea: PrintAreaCmBounds,
): Map<string, LayerOverflowState> {
  const map = new Map<string, LayerOverflowState>();
  for (const layer of layers) {
    map.set(layer.id, getLayerOverflowState(layer, printArea));
  }
  return map;
}

export function buildWorkspaceGarmentLayerOverflowMap(
  layers: DesignLayer[],
  side: Side,
  size: string,
): Map<string, LayerOverflowState> {
  const map = new Map<string, LayerOverflowState>();
  for (const layer of layers) {
    map.set(
      layer.id,
      getWorkspaceGarmentLayerOverflowState(layer, side, size),
    );
  }
  return map;
}
