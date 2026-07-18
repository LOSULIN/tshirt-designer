/**
 * Product Export — size-aware mockup placement scaling.
 * Baseline calibration (M) print area → current garment blue print area (cm → px).
 * Product Export mockup only; does not affect Designer / Factory / Print Export.
 */

import {
  getDesignerBackBluePrintArea,
  getDesignerBluePrintArea,
} from "@/lib/designer-print-area-config";
import type { CalibrationRect, ProductCalibration, ProductSide } from "./render-types";
import { resolveProductMockupPlacement } from "./visual-adjustment";

/** Calibration.json productReference is anchored to adult M blue print area. */
export const PRODUCT_PLACEMENT_BASELINE_SIZE = "M";

export interface GarmentBluePrintAreaCm {
  widthCm: number;
  heightCm: number;
}

export function resolveGarmentBluePrintAreaCm(
  garmentSize: string,
  side: ProductSide,
): GarmentBluePrintAreaCm {
  const area =
    side === "back"
      ? getDesignerBackBluePrintArea(garmentSize)
      : getDesignerBluePrintArea(garmentSize);
  return { widthCm: area.widthCm, heightCm: area.heightCm };
}

/**
 * Scale baseline placement to match current garment print area (Designer px/cm).
 * Width / height: baseline × (currentCm / baselineCm).
 * Horizontal: preserve placement center X (matches centered blue overlay).
 * Vertical: top-anchored (matches factory overlay top on template).
 */
export function scalePlacementRectForGarmentSize(
  rect: CalibrationRect,
  baseline: GarmentBluePrintAreaCm,
  current: GarmentBluePrintAreaCm,
): CalibrationRect {
  const scaleW = current.widthCm / baseline.widthCm;
  const scaleH = current.heightCm / baseline.heightCm;
  const centerX = rect.x + rect.width / 2;
  const width = Math.round(rect.width * scaleW);
  const height = Math.round(rect.height * scaleH);

  return {
    x: Math.round(centerX - width / 2),
    y: rect.y,
    width,
    height,
  };
}

/** Baseline (M) mockup placement scaled to the active garment size. */
export function resolveProductMockupPlacementForGarmentSize(
  calibration: ProductCalibration,
  side: ProductSide,
  garmentSize: string,
): CalibrationRect | null {
  const baseline = resolveProductMockupPlacement(calibration, side);
  if (!baseline) return null;

  const baselinePrint = resolveGarmentBluePrintAreaCm(
    PRODUCT_PLACEMENT_BASELINE_SIZE,
    side,
  );
  const currentPrint = resolveGarmentBluePrintAreaCm(garmentSize, side);

  return scalePlacementRectForGarmentSize(baseline, baselinePrint, currentPrint);
}
