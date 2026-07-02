/**
 * Garment Anchor Runtime — Step 12.5B
 * ───────────────────────────────────
 * 統一 Preset / Designer / Mockup / Export 印刷區 cm 座標系。
 * 原點：Blue 印刷區左上角（size 查表）。
 * 分母：getDesignerBluePrintArea(size) 寬高。
 */

import type { Side } from "./constants";
import { PRINT_AREA_OFFSET_CM } from "./coordinates/print-area-offset";
import type { PrintAreaCmBounds } from "./design-cm";
import {
  getDesignerBackBluePrintArea,
  getDesignerBluePrintArea,
} from "./designer-print-area-config";
import {
  resolveFactoryCenterFrontCm,
  resolveFactoryCollarLowestCm,
} from "./factory-anatomy-runtime";

/** @deprecated 左胸已改 Factory Anatomy；保留供舊校準腳本參考 */
export const GARMENT_LEFT_CHEST_ANCHOR_X_RATIO = 0.72;

/** 工廠左胸：前領最低點 → Logo 中心（cm） */
export const LEFT_CHEST_FROM_COLLAR_CM = 9;

/** 工廠左胸：前中線 → Logo 中心，朝著用者左胸方向（cm） */
export const LEFT_CHEST_FROM_CENTER_FRONT_CM = 8;

/** @deprecated 左胸 Logo 改用工廠定位；保留常數供校準 */
export const GARMENT_LEFT_CHEST_COLLAR_TO_TOP_CM = LEFT_CHEST_FROM_COLLAR_CM;

/** @deprecated 6/8/10 Logo 共用中心；尺寸僅影響外框 */
export const GARMENT_LEFT_CHEST_LOGO_REFERENCE_HEIGHT_CM = 10;

/** 左胸文字：Logo 下方 */
export const GARMENT_LEFT_CHEST_TEXT_COLLAR_TO_TOP_CM = 15;

/** 胸前置中：設計上緣 = 印刷區上緣 */
export const GARMENT_FRONT_CENTER_COLLAR_TO_TOP_CM = PRINT_AREA_OFFSET_CM.front;

/** 背面大圖：後領下 6~8cm，取中值 */
export const GARMENT_BACK_UPPER_DESIGN_COLLAR_TO_TOP_CM = 7;

/** Garment 印刷區（Blue）cm 邊界 — Designer / Mockup / Export 共用分母 */
export function resolveGarmentPrintAreaCm(
  size: string,
  side: Side = "front",
): PrintAreaCmBounds {
  const { widthCm, heightCm } =
    side === "back"
      ? getDesignerBackBluePrintArea(size)
      : getDesignerBluePrintArea(size);
  return { width: widthCm, height: heightCm };
}

/** 印刷區水平中心（Garment Blue width / 2） */
export function resolveGarmentCenterAnchorXCm(size: string): number {
  return resolveGarmentPrintAreaCm(size).width / 2;
}

/** 左胸錨點 X（委派工廠解剖定位） */
export function resolveGarmentLeftChestAnchorXCm(size: string): number {
  return resolveFactoryLeftChestAnchorCm(size).anchorX_cm;
}

/**
 * 工廠左胸錨點（設計中心 @ Blue 印刷區 cm）。
 * Anatomy Point + Factory Offset → Placement Anchor
 */
export function resolveFactoryLeftChestAnchorCm(size: string): {
  anchorX_cm: number;
  anchorY_cm: number;
} {
  const centerFront = resolveFactoryCenterFrontCm(size);
  const collarLowest = resolveFactoryCollarLowestCm(size);

  return {
    anchorX_cm: centerFront.xCm + LEFT_CHEST_FROM_CENTER_FRONT_CM,
    anchorY_cm: collarLowest.yCm + LEFT_CHEST_FROM_COLLAR_CM,
  };
}

/**
 * 領口下緣至設計上緣 (cm) → 印刷區內 anchorY（設計中心）。
 * 印刷區上緣 = 領口 + PRINT_AREA_OFFSET_CM[side]。
 */
export function resolveGarmentAnchorYFromCollarCm(
  side: Side,
  collarToDesignTopCm: number,
  designHeightCm: number,
): number {
  const yTopInPrintArea =
    collarToDesignTopCm - PRINT_AREA_OFFSET_CM[side];
  return yTopInPrintArea + designHeightCm / 2;
}

/** 左胸 Logo 系列共用錨點（設計中心） */
export function resolveGarmentLeftChestLogoAnchorCm(size: string): {
  anchorX_cm: number;
  anchorY_cm: number;
} {
  return resolveFactoryLeftChestAnchorCm(size);
}

/** 背面上方設計錨點 Y（設計中心） */
export function resolveGarmentBackUpperAnchorYCm(heightCm: number): number {
  return resolveGarmentAnchorYFromCollarCm(
    "back",
    GARMENT_BACK_UPPER_DESIGN_COLLAR_TO_TOP_CM,
    heightCm,
  );
}
