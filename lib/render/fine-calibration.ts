/**
 * Fine Calibration — post-mapping visual tune (offset / scale).
 * Applied as the last render step; does not alter coordinate mapping math.
 */

import { isCalibrationSideMapping, resolveMappedArtworkPlacement } from "./coordinate-mapping";
import type {
  CalibrationRect,
  FineCalibrationMapping,
  ProductCalibration,
  ProductSide,
} from "./render-types";

export const DEFAULT_FINE_CALIBRATION: FineCalibrationMapping = {
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
};

export function parseFineCalibrationMapping(
  value: unknown,
): FineCalibrationMapping | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    offsetX: Number(record.offsetX ?? 0),
    offsetY: Number(record.offsetY ?? 0),
    scaleX: Number(record.scaleX ?? 1),
    scaleY: Number(record.scaleY ?? 1),
  };
}

export function normalizeFineCalibrationMapping(
  value: FineCalibrationMapping | undefined,
): FineCalibrationMapping {
  if (!value) return { ...DEFAULT_FINE_CALIBRATION };
  return {
    offsetX: Number.isFinite(value.offsetX) ? value.offsetX : 0,
    offsetY: Number.isFinite(value.offsetY) ? value.offsetY : 0,
    scaleX: Number.isFinite(value.scaleX) && value.scaleX !== 0 ? value.scaleX : 1,
    scaleY: Number.isFinite(value.scaleY) && value.scaleY !== 0 ? value.scaleY : 1,
  };
}

export function getFineCalibrationForSide(
  calibration: ProductCalibration,
  side: ProductSide,
): FineCalibrationMapping {
  const sideData = side === "front" ? calibration.front : calibration.back;
  if (isCalibrationSideMapping(sideData) && sideData.mapping) {
    return normalizeFineCalibrationMapping(sideData.mapping);
  }
  return { ...DEFAULT_FINE_CALIBRATION };
}

/** Apply fine tune after coordinate mapping placement. */
export function applyFineCalibration(
  rect: CalibrationRect,
  fine: FineCalibrationMapping,
): CalibrationRect {
  const normalized = normalizeFineCalibrationMapping(fine);
  return {
    x: Math.round(rect.x + normalized.offsetX),
    y: Math.round(rect.y + normalized.offsetY),
    width: Math.round(rect.width * normalized.scaleX),
    height: Math.round(rect.height * normalized.scaleY),
  };
}

/** Mapped product placement + fine calibration (final render rect). */
export function resolveFinalArtworkPlacement(
  calibration: ProductCalibration,
  side: ProductSide,
): CalibrationRect | null {
  const mapped = resolveMappedArtworkPlacement(calibration, side);
  if (!mapped) return null;
  const fine = getFineCalibrationForSide(calibration, side);
  return applyFineCalibration(mapped.placement, fine);
}

export function mergeFineCalibrationSide(
  calibration: ProductCalibration,
  side: ProductSide,
  fine: FineCalibrationMapping,
): ProductCalibration {
  const sideData = side === "front" ? calibration.front : calibration.back;
  if (!isCalibrationSideMapping(sideData)) {
    return calibration;
  }
  const nextSide = {
    ...sideData,
    mapping: normalizeFineCalibrationMapping(fine),
  };
  if (side === "front") {
    return { ...calibration, front: nextSide };
  }
  return { ...calibration, back: nextSide };
}
