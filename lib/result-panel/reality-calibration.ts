/**
 * ResultPanel Reality Calibration — artwork relative garment ratio (preview only).
 *
 * Same philosophy as Designer: one garment template, official print/cm ratios per size.
 * Does NOT modify compose, placement, export, calibration, or garment pixels.
 */

import type { Side } from "@/lib/constants";
import {
  getDesignerBackBluePrintArea,
  getDesignerBluePrintArea,
} from "@/lib/designer-print-area-config";
import { findProductSizeRow } from "@/lib/product-size-config";
import type { CalibrationRect } from "@/lib/render/render-types";
import { UA35001_SILHOUETTE_ANCHORS } from "./garment-silhouette-anchors";

export const REALITY_CALIBRATION_BASELINE_SIZE = "M" as const;

/** Max visual compensation — preview display only. */
export const REALITY_WIDTH_CLAMP = 0.08;
export const REALITY_HEIGHT_CLAMP = 0.08;
export const REALITY_AREA_CLAMP = 0.1;

const GARMENT_CHEST_PX = UA35001_SILHOUETTE_ANCHORS.bodyHalfWidth * 2;
const GARMENT_BODY_HEIGHT_PX =
  UA35001_SILHOUETTE_ANCHORS.hemY - UA35001_SILHOUETTE_ANCHORS.collarY;

export interface RealityCalibrationMetrics {
  sizeCode: string;
  chestCm: number;
  lengthCm: number;
  printWidthCm: number;
  printHeightCm: number;
  printToChestRatio: number;
  printToLengthRatio: number;
  /** Composed artwork width / garment chest (before reality comp). */
  currentArtToGarmentWidthRatio: number;
  /** Target width ratio from official print/chest anchored to M baseline. */
  targetArtToGarmentWidthRatio: number;
  /** Composed artwork height / garment body height (before reality comp). */
  currentArtToGarmentHeightRatio: number;
  targetArtToGarmentHeightRatio: number;
  widthCompensation: number;
  heightCompensation: number;
  areaCompensation: number;
  widthCompensationPercent: number;
  heightCompensationPercent: number;
  areaCompensationPercent: number;
  exceedsWidthLimit: boolean;
  exceedsHeightLimit: boolean;
  exceedsAreaLimit: boolean;
  idealWidthCompensation: number;
  idealHeightCompensation: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolvePrintArea(size: string, side: Side) {
  return side === "back"
    ? getDesignerBackBluePrintArea(size)
    : getDesignerBluePrintArea(size);
}

function clampAreaCompensation(
  widthComp: number,
  heightComp: number,
): { width: number; height: number; area: number } {
  let w = widthComp;
  let h = heightComp;
  let area = w * h;
  const minArea = 1 - REALITY_AREA_CLAMP;
  const maxArea = 1 + REALITY_AREA_CLAMP;
  if (area < minArea || area > maxArea) {
    const target = clamp(area, minArea, maxArea);
    const factor = Math.sqrt(target / area);
    w *= factor;
    h *= factor;
    area = w * h;
  }
  return { width: w, height: h, area };
}

/**
 * Reality compensation from composed placement rects (read-only, same as export compose).
 * M baseline → identity compensation (1, 1).
 */
export function resolveRealityCalibrationFromPlacement(
  size: string,
  side: Side,
  placement: CalibrationRect,
  baselinePlacement: CalibrationRect,
): RealityCalibrationMetrics {
  const row = findProductSizeRow(size);
  const baselineRow = findProductSizeRow(REALITY_CALIBRATION_BASELINE_SIZE);
  if (!row || !baselineRow) {
    return identityMetrics(size);
  }

  const print = resolvePrintArea(size, side);
  const baselinePrint = resolvePrintArea(REALITY_CALIBRATION_BASELINE_SIZE, side);

  const printToChestRatio = print.widthCm / row.chest;
  const printToLengthRatio = print.heightCm / row.length;
  const baselinePrintToChest = baselinePrint.widthCm / baselineRow.chest;
  const baselinePrintToLength = baselinePrint.heightCm / baselineRow.length;

  const currentArtToGarmentWidthRatio = placement.width / GARMENT_CHEST_PX;
  const baselineArtToGarmentWidthRatio =
    baselinePlacement.width / GARMENT_CHEST_PX;
  const targetArtToGarmentWidthRatio =
    baselineArtToGarmentWidthRatio *
    (printToChestRatio / baselinePrintToChest);

  const currentArtToGarmentHeightRatio = placement.height / GARMENT_BODY_HEIGHT_PX;
  const baselineArtToGarmentHeightRatio =
    baselinePlacement.height / GARMENT_BODY_HEIGHT_PX;
  const targetArtToGarmentHeightRatio =
    baselineArtToGarmentHeightRatio *
    (printToLengthRatio / baselinePrintToLength);

  const idealWidthCompensation =
    currentArtToGarmentWidthRatio > 0
      ? targetArtToGarmentWidthRatio / currentArtToGarmentWidthRatio
      : 1;
  const idealHeightCompensation =
    currentArtToGarmentHeightRatio > 0
      ? targetArtToGarmentHeightRatio / currentArtToGarmentHeightRatio
      : 1;

  const widthCompensation = clamp(
    idealWidthCompensation,
    1 - REALITY_WIDTH_CLAMP,
    1 + REALITY_WIDTH_CLAMP,
  );
  const heightCompensation = clamp(
    idealHeightCompensation,
    1 - REALITY_HEIGHT_CLAMP,
    1 + REALITY_HEIGHT_CLAMP,
  );
  const areaAdjusted = clampAreaCompensation(
    widthCompensation,
    heightCompensation,
  );

  return {
    sizeCode: row.size,
    chestCm: row.chest,
    lengthCm: row.length,
    printWidthCm: print.widthCm,
    printHeightCm: print.heightCm,
    printToChestRatio,
    printToLengthRatio,
    currentArtToGarmentWidthRatio,
    targetArtToGarmentWidthRatio,
    currentArtToGarmentHeightRatio,
    targetArtToGarmentHeightRatio,
    widthCompensation: areaAdjusted.width,
    heightCompensation: areaAdjusted.height,
    areaCompensation: areaAdjusted.area,
    widthCompensationPercent: (areaAdjusted.width - 1) * 100,
    heightCompensationPercent: (areaAdjusted.height - 1) * 100,
    areaCompensationPercent: (areaAdjusted.area - 1) * 100,
    exceedsWidthLimit:
      Math.abs(idealWidthCompensation - widthCompensation) > 1e-6,
    exceedsHeightLimit:
      Math.abs(idealHeightCompensation - heightCompensation) > 1e-6,
    exceedsAreaLimit:
      Math.abs(
        widthCompensation * heightCompensation - areaAdjusted.area,
      ) > 1e-6,
    idealWidthCompensation,
    idealHeightCompensation,
  };
}

function identityMetrics(sizeCode: string): RealityCalibrationMetrics {
  return {
    sizeCode,
    chestCm: 0,
    lengthCm: 0,
    printWidthCm: 0,
    printHeightCm: 0,
    printToChestRatio: 0,
    printToLengthRatio: 0,
    currentArtToGarmentWidthRatio: 0,
    targetArtToGarmentWidthRatio: 0,
    currentArtToGarmentHeightRatio: 0,
    targetArtToGarmentHeightRatio: 0,
    widthCompensation: 1,
    heightCompensation: 1,
    areaCompensation: 1,
    widthCompensationPercent: 0,
    heightCompensationPercent: 0,
    areaCompensationPercent: 0,
    exceedsWidthLimit: false,
    exceedsHeightLimit: false,
    exceedsAreaLimit: false,
    idealWidthCompensation: 1,
    idealHeightCompensation: 1,
  };
}

export const REALITY_MOCKUP_CANVAS = {
  width: UA35001_SILHOUETTE_ANCHORS.canvasWidth,
  height: UA35001_SILHOUETTE_ANCHORS.canvasHeight,
  garmentChestPx: GARMENT_CHEST_PX,
  garmentBodyHeightPx: GARMENT_BODY_HEIGHT_PX,
} as const;
