/**
 * Garment Frame Calibration — M product photo baseline.
 *
 * Traced from public/products/UA35001/calibration.json (front):
 *   productReference.printArea + visualAdjustment.offsetY
 *   → placement y = 350 + 150 = 500 @ 1024 preview asset
 *
 * File is frozen; these constants are read-only calibration anchors.
 */

import type { Side } from "@/lib/constants";
import {
  METRICS_TEMPLATE_HEIGHT_PX,
  METRICS_TEMPLATE_WIDTH_PX,
} from "@/lib/garment-metrics/constants";

export const PHOTO_CALIBRATION_BASELINE_SIZE = "M" as const;

/** M garment on product photo fills the asset canvas (preview + export). */
export const PHOTO_BASELINE_GARMENT_BOUNDS_PREVIEW = {
  x: 0,
  y: 0,
  width: METRICS_TEMPLATE_WIDTH_PX,
  height: METRICS_TEMPLATE_HEIGHT_PX,
} as const;

/**
 * M print region on product photo before mockupVisualScale compensation.
 * calibration.json front productReference + visualAdjustment.
 */
export const PHOTO_BASELINE_PRINT_BEFORE_COMPENSATION_PREVIEW = {
  x: 298,
  y: 500,
  width: 428,
  height: 612,
} as const;

export function scalePhotoRect(
  rect: { x: number; y: number; width: number; height: number },
  assetWidth: number,
  assetHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scaleX = assetWidth / METRICS_TEMPLATE_WIDTH_PX;
  const scaleY = assetHeight / METRICS_TEMPLATE_HEIGHT_PX;
  return {
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

/** Photo space collar anchor scales with asset dimensions (M baseline Y). */
export function resolvePhotoBaselineCollarY(
  side: Side,
  assetHeight: number,
): number {
  void side;
  const scaleY = assetHeight / METRICS_TEMPLATE_HEIGHT_PX;
  return 386 * scaleY;
}
