/**
 * Visual Adjustment — post-mockup pixel offset for product display only.
 * Applied after Product Reference + Fine Calibration; does not affect Artwork Export.
 */

import { isCalibrationSideMapping } from "./coordinate-mapping";
import { resolveFinalArtworkPlacement } from "./fine-calibration";
import type {
  CalibrationRect,
  ProductCalibration,
  ProductSide,
  VisualAdjustment,
} from "./render-types";

export const DEFAULT_VISUAL_ADJUSTMENT: VisualAdjustment = {
  offsetX: 0,
  offsetY: 0,
};

export function parseVisualAdjustment(value: unknown): VisualAdjustment | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    offsetX: Number(record.offsetX ?? 0),
    offsetY: Number(record.offsetY ?? 0),
  };
}

export function normalizeVisualAdjustment(
  value: VisualAdjustment | undefined,
): VisualAdjustment {
  if (!value) return { ...DEFAULT_VISUAL_ADJUSTMENT };
  return {
    offsetX: Number.isFinite(value.offsetX) ? value.offsetX : 0,
    offsetY: Number.isFinite(value.offsetY) ? value.offsetY : 0,
  };
}

export function getVisualAdjustmentForSide(
  calibration: ProductCalibration,
  side: ProductSide,
): VisualAdjustment {
  const sideData = side === "front" ? calibration.front : calibration.back;
  if (isCalibrationSideMapping(sideData) && sideData.visualAdjustment) {
    return normalizeVisualAdjustment(sideData.visualAdjustment);
  }
  return { ...DEFAULT_VISUAL_ADJUSTMENT };
}

/** Apply mockup-only offset after factory/product placement. */
export function applyVisualAdjustment(
  rect: CalibrationRect,
  adjustment: VisualAdjustment,
): CalibrationRect {
  const normalized = normalizeVisualAdjustment(adjustment);
  return {
    x: Math.round(rect.x + normalized.offsetX),
    y: Math.round(rect.y + normalized.offsetY),
    width: rect.width,
    height: rect.height,
  };
}

/** Product mockup placement = mapping + fine + visual adjustment (last step). */
export function resolveProductMockupPlacement(
  calibration: ProductCalibration,
  side: ProductSide,
): CalibrationRect | null {
  const base = resolveFinalArtworkPlacement(calibration, side);
  if (!base) return null;
  return applyVisualAdjustment(base, getVisualAdjustmentForSide(calibration, side));
}

/** Preview helper — apply explicit mockup offset without mutating calibration. */
export function resolveProductMockupPlacementWithOffset(
  calibration: ProductCalibration,
  side: ProductSide,
  adjustment: VisualAdjustment,
): CalibrationRect | null {
  const base = resolveFinalArtworkPlacement(calibration, side);
  if (!base) return null;
  return applyVisualAdjustment(base, adjustment);
}

export function mergeVisualAdjustmentSide(
  calibration: ProductCalibration,
  side: ProductSide,
  adjustment: VisualAdjustment,
): ProductCalibration {
  const sideData = side === "front" ? calibration.front : calibration.back;
  if (!isCalibrationSideMapping(sideData)) {
    return calibration;
  }
  const nextSide = {
    ...sideData,
    visualAdjustment: normalizeVisualAdjustment(adjustment),
  };
  if (side === "front") {
    return { ...calibration, front: nextSide };
  }
  return { ...calibration, back: nextSide };
}
