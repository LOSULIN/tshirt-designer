/**
 * Visual Calibration Validation — Calibration Tool only.
 */

import { resolveFinalArtworkPlacement } from "./fine-calibration";
import { resolveDesignerArtworkPlacement } from "./visual-compare";
import type { CalibrationRect, ProductCalibration, ProductSide } from "./render-types";

export const VISUAL_CALIBRATION_TOLERANCE_PX = 1;
export const PRINT_AREA_ASPECT_35_50 = 35 / 50;

export interface VisualCalibrationMetrics {
  designerPlacement: CalibrationRect;
  productPlacement: CalibrationRect;
  centerDeviationPx: { x: number; y: number };
  verticalDeviationPx: number;
  aspectDeviation: number;
  widthDeviationPx: number;
  heightDeviationPx: number;
}

export interface VisualCalibrationResult {
  passed: boolean;
  metrics: VisualCalibrationMetrics;
  details: string[];
}

function rectCenter(rect: CalibrationRect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function validateVisualCalibration(
  calibration: ProductCalibration,
  side: ProductSide,
  tolerancePx = VISUAL_CALIBRATION_TOLERANCE_PX,
): VisualCalibrationResult {
  const designerPlacement = resolveDesignerArtworkPlacement(calibration, side);
  const productPlacement = resolveFinalArtworkPlacement(calibration, side);

  if (!productPlacement) {
    return {
      passed: false,
      metrics: {
        designerPlacement,
        productPlacement: { x: 0, y: 0, width: 0, height: 0 },
        centerDeviationPx: { x: Infinity, y: Infinity },
        verticalDeviationPx: Infinity,
        aspectDeviation: Infinity,
        widthDeviationPx: Infinity,
        heightDeviationPx: Infinity,
      },
      details: ["Product placement unavailable"],
    };
  }

  const designerCenter = rectCenter(designerPlacement);
  const productCenter = rectCenter(productPlacement);
  const centerDeviationPx = {
    x: Math.abs(designerCenter.x - productCenter.x),
    y: Math.abs(designerCenter.y - productCenter.y),
  };
  const verticalDeviationPx = Math.abs(designerPlacement.y - productPlacement.y);
  const productAspect = productPlacement.width / productPlacement.height;
  const aspectDeviation = Math.abs(productAspect - PRINT_AREA_ASPECT_35_50);
  const widthDeviationPx = Math.abs(designerPlacement.width - productPlacement.width);
  const heightDeviationPx = Math.abs(designerPlacement.height - productPlacement.height);

  const details = [
    `Center Δx=${centerDeviationPx.x.toFixed(2)}px Δy=${centerDeviationPx.y.toFixed(2)}px`,
    `Top Y Δ=${verticalDeviationPx}px`,
    `Aspect ${productAspect.toFixed(4)} (target ${PRINT_AREA_ASPECT_35_50.toFixed(4)}, Δ=${aspectDeviation.toFixed(4)})`,
    `Size Δw=${widthDeviationPx}px Δh=${heightDeviationPx}px`,
  ];

  const passed =
    centerDeviationPx.x <= tolerancePx &&
    centerDeviationPx.y <= tolerancePx &&
    verticalDeviationPx <= tolerancePx &&
    aspectDeviation <= 0.001 &&
    widthDeviationPx <= tolerancePx &&
    heightDeviationPx <= tolerancePx;

  return {
    passed,
    metrics: {
      designerPlacement,
      productPlacement,
      centerDeviationPx,
      verticalDeviationPx,
      aspectDeviation,
      widthDeviationPx,
      heightDeviationPx,
    },
    details,
  };
}
