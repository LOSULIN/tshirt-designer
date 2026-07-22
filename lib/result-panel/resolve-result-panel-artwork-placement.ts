/**
 * Read-only placement rect for ResultPanel display overlay (same path as compose).
 */

import type { Side } from "@/lib/constants";
import type { ProductCalibration } from "@/lib/products/product-types";
import { resolveProductMockupPlacementForGarmentSize } from "@/lib/render/product-placement-scale";
import type { CalibrationRect } from "@/lib/render/render-types";
import { applyMockupVisualCompensation } from "@/lib/render/visual-compensation";

export function resolveResultPanelArtworkPlacement(
  calibration: ProductCalibration,
  side: Side,
  size: string,
  mockupVisualScale: number,
): CalibrationRect {
  const rect = resolveProductMockupPlacementForGarmentSize(
    calibration,
    side,
    size,
  );
  if (!rect) {
    throw new Error(
      `ResultPanel placement unavailable for ${side}/${size}`,
    );
  }
  return applyMockupVisualCompensation(rect, mockupVisualScale);
}
