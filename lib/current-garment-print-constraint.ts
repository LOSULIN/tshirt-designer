/**
 * Current Garment Print Constraint Runtime — Step 12.9A
 * ─────────────────────────────────────────────────────
 * Workspace Canonical layer → Garment mapping → 目前尺碼可印 bounds → 約束狀態。
 * 僅計算與回報；不得修改 layer cm / scale / rotation。
 *
 * 與 Overflow Runtime 分離；本模組供後續 clamp / validation 消費者使用。
 */

import type { Side } from "./constants";
import {
  getLayerEffectiveCmRect,
  type LayerCmRect,
  type PrintAreaCmBounds,
} from "./design-cm";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";
import { getRotatedAabb } from "./geometry";
import { getRectOverflowState } from "./layer-overflow";
import { mapWorkspaceLayerCmRectToGarmentPrintArea } from "./placement-presets";
import { getTextLayerPlacementCmRect } from "./text-layer";
import type { DesignLayer } from "./types";

export type GarmentConstraintEdge = "left" | "right" | "top" | "bottom";

export interface GarmentConstraintViolationCm {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface GarmentConstraintAabbCm {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width_cm: number;
  height_cm: number;
}

export interface CurrentGarmentConstraintContext {
  side: Side;
  size: string;
  workspaceRect: LayerCmRect;
  garmentRect: LayerCmRect;
  garmentPrintArea: PrintAreaCmBounds;
}

export interface CurrentGarmentConstraintState {
  context: CurrentGarmentConstraintContext;
  garmentAabb: GarmentConstraintAabbCm;
  withinGarmentPrintArea: boolean;
  exceedsGarmentPrintArea: boolean;
  exceedsLeft: boolean;
  exceedsRight: boolean;
  exceedsTop: boolean;
  exceedsBottom: boolean;
  violationAmountCm: GarmentConstraintViolationCm;
  violationEdges: GarmentConstraintEdge[];
}

function readWorkspaceLayerCmRect(layer: DesignLayer): LayerCmRect {
  if (layer.type === "text") {
    return getTextLayerPlacementCmRect(layer);
  }
  return getLayerEffectiveCmRect(layer);
}

function getGarmentOrientedAabbCm(
  rect: LayerCmRect,
  rotation: number,
): GarmentConstraintAabbCm {
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

function overflowToConstraintState(
  context: CurrentGarmentConstraintContext,
  garmentAabb: GarmentConstraintAabbCm,
  overflow: ReturnType<typeof getRectOverflowState>,
): CurrentGarmentConstraintState {
  const exceedsGarmentPrintArea = overflow.exceedsPrintArea;
  return {
    context,
    garmentAabb,
    withinGarmentPrintArea: !exceedsGarmentPrintArea,
    exceedsGarmentPrintArea,
    exceedsLeft: overflow.exceedsLeft,
    exceedsRight: overflow.exceedsRight,
    exceedsTop: overflow.exceedsTop,
    exceedsBottom: overflow.exceedsBottom,
    violationAmountCm: { ...overflow.overflowAmountCm },
    violationEdges: [...overflow.overflowEdges],
  };
}

/**
 * 單一圖層：Workspace → Garment mapping → 目前尺碼可印 bounds → 約束狀態。
 */
export function getCurrentGarmentConstraintState(
  layer: DesignLayer,
  side: Side,
  size: string,
): CurrentGarmentConstraintState {
  const workspaceRect = readWorkspaceLayerCmRect(layer);
  const garmentRect = mapWorkspaceLayerCmRectToGarmentPrintArea(
    workspaceRect,
    side,
    size,
  );
  const garmentPrintArea = resolveGarmentPrintAreaCm(size, side);
  const garmentAabb = getGarmentOrientedAabbCm(garmentRect, layer.rotation);
  const overflow = getRectOverflowState(
    garmentRect,
    layer.rotation,
    garmentPrintArea,
  );

  return overflowToConstraintState(
    { side, size, workspaceRect, garmentRect, garmentPrintArea },
    garmentAabb,
    overflow,
  );
}

/** 批次：圖層 id → Current Garment Constraint State */
export function buildCurrentGarmentConstraintMap(
  layers: DesignLayer[],
  side: Side,
  size: string,
): Map<string, CurrentGarmentConstraintState> {
  const map = new Map<string, CurrentGarmentConstraintState>();
  for (const layer of layers) {
    map.set(layer.id, getCurrentGarmentConstraintState(layer, side, size));
  }
  return map;
}
