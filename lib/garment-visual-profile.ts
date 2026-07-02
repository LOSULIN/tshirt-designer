/**
 * Garment Visual Profile — Designer 衣服剪影視覺基準
 * ─────────────────────────────────────────────────────────────
 * Step 11.6-3：ShirtVisualScale 衣服 Render。
 * Step 11.6-4：Blue / Orange Designer 視覺 DOM 比例。
 * Layer / Export / Production 不接此模組。
 *
 * 量測來源：
 * - public/guides/template-calibration-report.json
 *   · templates[0] adult-tshirt-white-front.png · pngMeasurement
 * - lib/template-profile/adult-white-front.ts（garment / measurement 同源）
 *
 * 基準：成人 M · 模板 PNG @ 1024×1536 · scale = 1
 */

import {
  getDesignerBluePrintArea,
  getDesignerRecommendedPrintArea,
} from "./designer-print-area-config";
import { findProductSizeRow } from "./product-size-config";
import type { ApparelSize } from "./sizes";
import { BASELINE_CHEST_CM, getShirtScale } from "./shirtScale";

export interface GarmentVisualProfile {
  /** 腋下胸寬（px）— armpit.chestWidthPx / garment.armpitChestWidthPx */
  visualChestPx: number;
  /** 衣長 HPS → 下擺（px）— garment.bodyLengthPx */
  visualBodyHeightPx: number;
  /** 肩點 HPS Y（px）— pngMeasurement.hps.y；衣長量測上端 */
  collarTopPx: number;
  /** 下擺中心 Y（px）— pngMeasurement.hem.y */
  hemBottomPx: number;
}

/**
 * 目前設計器模板（adult-white-front）@ 官方 M 尺碼剪影量測。
 * visualBodyHeightPx = hemBottomPx − collarTopPx（903 = 1215 − 312）
 */
export const DEFAULT_GARMENT_VISUAL_PROFILE: GarmentVisualProfile = {
  visualChestPx: 550,
  visualBodyHeightPx: 903,
  collarTopPx: 312,
  hemBottomPx: 1215,
} as const;

/**
 * 印刷胸寬標定 / 剪影胸寬 @ baseline M（612/550）。
 * 維持遷移前 ShirtVisualScale 與 template silhouetteScale 相同畫面。
 */
export const BASELINE_VISUAL_CHEST_PRINT_ALIGN_RATIO = 612 / 550;

/** 衣服 Render 統一 scale（與遷移前 getShirtScale × silhouetteScale 等價） */
export function getGarmentVisualRenderScale(
  size: ApparelSize | string,
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): number {
  void profile;
  return getShirtScale(size) * BASELINE_VISUAL_CHEST_PRINT_ALIGN_RATIO;
}

/** 尺碼縮放後衣服 Render 胸寬（px @ 1024 模板空間） */
export function getGarmentVisualRenderWidthPx(
  size: ApparelSize | string,
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): number {
  return (
    profile.visualChestPx * getGarmentVisualRenderScale(size, profile)
  );
}

/** 尺碼縮放後衣服 Render 衣長（px @ 1024 模板空間） */
export function getGarmentVisualRenderHeightPx(
  size: ApparelSize | string,
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): number {
  return (
    profile.visualBodyHeightPx * getGarmentVisualRenderScale(size, profile)
  );
}

/** 官方 M 衣長（cm）— 與 visualBodyHeightPx 配對 */
function getBaselineBodyLengthCm(): number {
  return findProductSizeRow("M")?.length ?? 69;
}

function resolveGarmentSizeCm(size: ApparelSize | string): {
  chestCm: number;
  lengthCm: number;
} {
  const row = findProductSizeRow(size);
  if (row) {
    return { chestCm: row.chest, lengthCm: row.length };
  }
  return {
    chestCm: BASELINE_CHEST_CM,
    lengthCm: getBaselineBodyLengthCm(),
  };
}

/** 胸寬方向：cm → 模板 px（@ baseline M，不含尺碼 render scale） */
export function getGarmentVisualChestPxPerCm(
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): number {
  return profile.visualChestPx / BASELINE_CHEST_CM;
}

/** 衣長方向：cm → 模板 px（@ baseline M，不含尺碼 render scale） */
export function getGarmentVisualBodyPxPerCm(
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): number {
  return profile.visualBodyHeightPx / getBaselineBodyLengthCm();
}

/** Blue 框 render px（與衣服剪影同一 Garment Visual scale） */
export function getDesignerBlueVisualRenderSizePx(
  size: ApparelSize | string,
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): { widthPx: number; heightPx: number } {
  const blue = getDesignerBluePrintArea(size);
  const { chestCm, lengthCm } = resolveGarmentSizeCm(size);
  const garmentWidthPx = getGarmentVisualRenderWidthPx(size, profile);
  const garmentHeightPx = getGarmentVisualRenderHeightPx(size, profile);
  return {
    widthPx: (blue.widthCm / chestCm) * garmentWidthPx,
    heightPx: (blue.heightCm / lengthCm) * garmentHeightPx,
  };
}

/** Orange 建議區 render px（與 Blue 同源 Garment Visual） */
export function getDesignerOrangeVisualRenderSizePx(
  size: ApparelSize | string,
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): { widthPx: number; heightPx: number } {
  const recommended = getDesignerRecommendedPrintArea(size);
  const { chestCm, lengthCm } = resolveGarmentSizeCm(size);
  const garmentWidthPx = getGarmentVisualRenderWidthPx(size, profile);
  const garmentHeightPx = getGarmentVisualRenderHeightPx(size, profile);
  return {
    widthPx: (recommended.widthCm / chestCm) * garmentWidthPx,
    heightPx: (recommended.heightCm / lengthCm) * garmentHeightPx,
  };
}

/** Blue 框佔模板畫布 %（已含 Garment Visual Render scale） */
export function getDesignerBlueVisualContainerPct(
  size: ApparelSize | string,
  canvasWidth: number,
  canvasHeight: number,
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): { widthPct: number; heightPct: number } {
  const { widthPx, heightPx } = getDesignerBlueVisualRenderSizePx(
    size,
    profile,
  );
  return {
    widthPct: widthPx / canvasWidth,
    heightPct: heightPx / canvasHeight,
  };
}

/** Blue 寬度 / 衣服胸寬 render px — 各尺碼應與 Config blue.widthCm / chestCm 一致 */
export function getDesignerBlueToGarmentChestRatio(
  size: ApparelSize | string,
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): number {
  const { widthPx: blueWidthPx } = getDesignerBlueVisualRenderSizePx(
    size,
    profile,
  );
  const garmentChestPx = getGarmentVisualRenderWidthPx(size, profile);
  return blueWidthPx / garmentChestPx;
}

/** Orange 寬度 / Blue 寬度 render px — 各尺碼應與 Config recommended/blue 一致 */
export function getDesignerOrangeToBlueWidthRatio(
  size: ApparelSize | string,
  profile: GarmentVisualProfile = DEFAULT_GARMENT_VISUAL_PROFILE,
): number {
  const { widthPx: blueWidthPx } = getDesignerBlueVisualRenderSizePx(
    size,
    profile,
  );
  const { widthPx: orangeWidthPx } = getDesignerOrangeVisualRenderSizePx(
    size,
    profile,
  );
  return orangeWidthPx / blueWidthPx;
}
