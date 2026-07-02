/**
 * Factory Anatomy Runtime — Step 12.6D / 12.7B-1 / 12.7C-1 / 12.7C-4 / 12.7C-6
 * ───────────────────────────────────────────────────────────
 * 成衣解剖 → 模板／印刷區 cm（依面別）。
 *
 * X（模板）：baseline ratio × PrintAreaWidth
 * Y（Overlay 模板 px）：Factory Calibration 凍結領口 Y + offset cm
 * Placement cm API：保留 printTop 基準換算（與 Garment Anchor 相容）
 */

import type { Side } from "./constants";
import {
  getDesignerBackBluePrintArea,
  getDesignerBluePrintArea,
} from "./designer-print-area-config";
import {
  getFactoryAnatomyPrintBaseline,
  getFactoryAnatomyProfile,
  getFactoryCollarLowestTemplateYPx,
} from "./factory-anatomy-reference";
import { findProductSizeRow } from "./product-size-config";

const M_BASELINE_CHEST_CM = 52;
const M_BASELINE_LENGTH_CM = 69;

function resolveGarmentMeasurements(size: string): {
  chestCm: number;
  lengthCm: number;
} {
  const row = findProductSizeRow(size);
  if (row) {
    return { chestCm: row.chest, lengthCm: row.length };
  }
  return { chestCm: M_BASELINE_CHEST_CM, lengthCm: M_BASELINE_LENGTH_CM };
}

function resolveFactoryPrintAreaWidthCm(size: string, side: Side): number {
  if (side === "back") {
    return getDesignerBackBluePrintArea(size).widthCm;
  }
  return getDesignerBluePrintArea(size).widthCm;
}

/** M baseline：解剖點 X 於 Blue 框寬度比例 */
function anatomyPxToXRatio(xPx: number, side: Side): number {
  const { blueBoxLeftPx, blueBoxWidthPx } = getFactoryAnatomyPrintBaseline(side);
  return (xPx - blueBoxLeftPx) / blueBoxWidthPx;
}

/**
 * 印刷區 placement cm（Y）— 保留與 Garment Anchor 相容的數值。
 * @deprecated 內部仍用 calibration printTop 基準換算；Overlay 改走 template px API
 */
function anatomyPxToPlacementPrintYCm(
  yPx: number,
  lengthCm: number,
  side: Side,
): number {
  const anatomy = getFactoryAnatomyProfile(side);
  const offsetPx = yPx - getFactoryAnatomyPrintBaseline(side).printTopPx;
  return (offsetPx / anatomy.bodyLengthPx) * lengthCm;
}

function anatomyXRatioToPrintCm(
  ratio: number,
  size: string,
  side: Side,
): number {
  return ratio * resolveFactoryPrintAreaWidthCm(size, side);
}

/** 尺碼胸寬（cm，平量） */
export function resolveFactoryChestWidthCm(size: string): number {
  return resolveGarmentMeasurements(size).chestCm;
}

/** 尺碼衣長（cm） */
export function resolveFactoryBodyLengthCm(size: string): number {
  return resolveGarmentMeasurements(size).lengthCm;
}

/** M baseline 前中／背中線 X ratio（@ blueBoxWidth） */
export function getFactoryCenterTemplateXRatio(side: Side = "front"): number {
  const anatomy = getFactoryAnatomyProfile(side);
  return anatomyPxToXRatio(anatomy.centerFront, side);
}

/** @deprecated 請用 getFactoryCenterTemplateXRatio("front") */
export function getFactoryCenterFrontXRatio(): number {
  return getFactoryCenterTemplateXRatio("front");
}

/** M baseline 左肩縫 X ratio */
export function getFactoryLeftShoulderXRatio(side: Side = "front"): number {
  const anatomy = getFactoryAnatomyProfile(side);
  return anatomyPxToXRatio(anatomy.leftShoulder.x, side);
}

/** 領最低點 @ 模板 Y（px）— Factory Calibration 凍結；不依衣長縮放 */
export function resolveFactoryCollarLowestTemplateYPx(
  side: Side,
  size: string,
): number {
  void size;
  return getFactoryCollarLowestTemplateYPx(side);
}

/** 前中／背中線 @ 模板 X（px） */
export function resolveFactoryCenterTemplateXPx(
  side: Side,
  size: string,
): number {
  void size;
  return getFactoryAnatomyProfile(side).centerFront;
}

/** @deprecated 請用 resolveFactoryCenterTemplateXPx("front", size) */
export function resolveFactoryCenterFrontTemplateXPx(size: string): number {
  return resolveFactoryCenterTemplateXPx("front", size);
}

/** 前中線 @ 印刷區 cm（Blue 原點、水平）— 正面 placement */
export function resolveFactoryCenterFrontCm(size: string): { xCm: number } {
  const anatomy = getFactoryAnatomyProfile("front");
  return {
    xCm: anatomyXRatioToPrintCm(
      anatomyPxToXRatio(anatomy.centerFront, "front"),
      size,
      "front",
    ),
  };
}

/** 前領最低點 @ 印刷區 cm（placement 相容）— 正面 */
export function resolveFactoryCollarLowestCm(size: string): { yCm: number } {
  const { lengthCm } = resolveGarmentMeasurements(size);
  const anatomy = getFactoryAnatomyProfile("front");
  return {
    yCm: anatomyPxToPlacementPrintYCm(anatomy.collarLowest.y, lengthCm, "front"),
  };
}

/** 左肩縫 @ 印刷區 cm — 正面 */
export function resolveFactoryLeftShoulderCm(size: string): {
  xCm: number;
  yCm: number;
} {
  const { lengthCm } = resolveGarmentMeasurements(size);
  const anatomy = getFactoryAnatomyProfile("front");
  return {
    xCm: anatomyXRatioToPrintCm(
      anatomyPxToXRatio(anatomy.leftShoulder.x, "front"),
      size,
      "front",
    ),
    yCm: anatomyPxToPlacementPrintYCm(anatomy.leftShoulder.y, lengthCm, "front"),
  };
}
