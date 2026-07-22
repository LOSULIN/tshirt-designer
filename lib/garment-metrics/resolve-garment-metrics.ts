/**
 * Garment Metrics Layer — read-only resolver.
 *
 * Inputs: product-size-config, designer-print-area-config only.
 * Does not mutate Designer, Factory, Placement, or Calibration.
 */

import type { Side } from "@/lib/constants";
import {
  getDesignerBackBluePrintArea,
  getDesignerBluePrintArea,
} from "@/lib/designer-print-area-config";
import { findProductSizeRow } from "@/lib/product-size-config";
import {
  METRICS_BASELINE_CHEST_CM,
  METRICS_BASELINE_CENTER_X_PX,
  METRICS_BASELINE_LENGTH_CM,
  METRICS_BASELINE_SIZE,
  METRICS_BASELINE_VISUAL_BODY_HEIGHT_PX,
  METRICS_BASELINE_VISUAL_CHEST_PX,
  METRICS_CHEST_PRINT_ALIGN_RATIO,
  METRICS_COLLAR_ANCHOR_Y_PX,
  METRICS_PRINT_TOP_OFFSET_CM,
  METRICS_TEMPLATE_CENTER_Y_PX,
  METRICS_TEMPLATE_PX_PER_CM,
} from "./constants";
import type {
  GarmentMetrics,
  GarmentMetricsRect,
  ResolveGarmentMetricsInput,
} from "./types";

function resolveBodyCm(size: string): { chestCm: number; lengthCm: number } {
  const row = findProductSizeRow(size);
  if (row) {
    return { chestCm: row.chest, lengthCm: row.length };
  }
  return {
    chestCm: METRICS_BASELINE_CHEST_CM,
    lengthCm: METRICS_BASELINE_LENGTH_CM,
  };
}

function resolvePrintCm(size: string, side: Side) {
  const area =
    side === "back"
      ? getDesignerBackBluePrintArea(size)
      : getDesignerBluePrintArea(size);
  return { widthCm: area.widthCm, heightCm: area.heightCm };
}

function resolveGarmentRenderScale(chestCm: number): number {
  return (
    (chestCm / METRICS_BASELINE_CHEST_CM) * METRICS_CHEST_PRINT_ALIGN_RATIO
  );
}

function centerRect(
  width: number,
  height: number,
  centerX: number,
  centerY: number,
): GarmentMetricsRect {
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

/**
 * Resolve canonical garment metrics for a size @ template coordinate space.
 */
export function resolveGarmentMetrics(
  input: ResolveGarmentMetricsInput,
): GarmentMetrics {
  const side: Side = input.side ?? "front";
  const { chestCm, lengthCm } = resolveBodyCm(input.size);
  const { widthCm: printWidthCm, heightCm: printHeightCm } = resolvePrintCm(
    input.size,
    side,
  );

  const garmentRenderScale = resolveGarmentRenderScale(chestCm);
  const bodyWidthPx = METRICS_BASELINE_VISUAL_CHEST_PX * garmentRenderScale;
  const bodyHeightPx =
    METRICS_BASELINE_VISUAL_BODY_HEIGHT_PX * garmentRenderScale;

  const printWidthPx = (printWidthCm / chestCm) * bodyWidthPx;
  const printHeightPx = (printHeightCm / lengthCm) * bodyHeightPx;

  const garmentBounds = centerRect(
    bodyWidthPx,
    bodyHeightPx,
    METRICS_BASELINE_CENTER_X_PX,
    METRICS_TEMPLATE_CENTER_Y_PX,
  );

  const printTopPx =
    METRICS_COLLAR_ANCHOR_Y_PX[side] +
    METRICS_PRINT_TOP_OFFSET_CM[side] * METRICS_TEMPLATE_PX_PER_CM;

  const printBounds: GarmentMetricsRect = {
    x: METRICS_BASELINE_CENTER_X_PX - printWidthPx / 2,
    y: printTopPx,
    width: printWidthPx,
    height: printHeightPx,
  };

  const collarAnchor = {
    x: METRICS_BASELINE_CENTER_X_PX,
    y: METRICS_COLLAR_ANCHOR_Y_PX[side],
  };

  return {
    sizeCode: findProductSizeRow(input.size)?.size ?? input.size,
    side,
    bodyWidthCm: chestCm,
    bodyHeightCm: lengthCm,
    bodyWidthPx,
    bodyHeightPx,
    printWidthCm,
    printHeightCm,
    printWidthPx,
    printHeightPx,
    garmentBounds,
    printBounds,
    collarAnchor,
    centerLine: { x: METRICS_BASELINE_CENTER_X_PX },
    hemLine: { y: garmentBounds.y + bodyHeightPx },
    ratios: {
      printWidthToBodyWidth: printWidthCm / chestCm,
      printHeightToBodyHeight: printHeightCm / lengthCm,
    },
  };
}

/** M baseline metrics — identity reference for mockup regression. */
export function resolveBaselineGarmentMetrics(
  side: Side = "front",
): GarmentMetrics {
  return resolveGarmentMetrics({ size: METRICS_BASELINE_SIZE, side });
}
