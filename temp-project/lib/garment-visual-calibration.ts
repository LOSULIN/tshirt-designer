/**
 * Garment Visual Calibration — Preview 印刷視覺比例。
 * 僅供 T-shirt Preview 圖層；不影響 DesignLayer、藍框 cm、匯出。
 */

import {
  ADULT_TSHIRT_TEMPLATE_CHEST_PX,
  ADULT_TSHIRT_TEMPLATE_PX_PER_CM,
} from "./template-metrics";

/** 衣服 PNG 可視胸寬參考（px）— 僅供對照，Preview 不直接套用 */
export const GARMENT_VISUAL_CHEST_WIDTH_PX = 900;

/** M 號胸寬（cm）— 僅供對照 */
export const GARMENT_CHEST_WIDTH_CM = 50;

/** Preview 專用：相對 overlay（12.24 px/cm）的印刷視覺放大係數 */
export const GARMENT_PREVIEW_PRINT_SCALE = 1.15;

/** Preview 圖層視覺比例（固定；不沿用胸寬 900/50 換算） */
export function getGarmentPreviewScaleFactor(): number {
  return GARMENT_PREVIEW_PRINT_SCALE;
}

/**
 * 衣服 PNG 胸寬參考比例（px/cm）— 僅供對照／debug。
 * Preview 尺寸請用 getGarmentPreviewScaleFactor()。
 */
export function getGarmentVisualScale(): number {
  return GARMENT_VISUAL_CHEST_WIDTH_PX / GARMENT_CHEST_WIDTH_CM;
}

/** @deprecated 請用 getGarmentPreviewScaleFactor() */
export function getGarmentPreviewLayerScaleFactor(): number {
  return getGarmentPreviewScaleFactor();
}

export interface GarmentPreviewLayerCmRect {
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
}

export interface GarmentPreviewLayerBoxStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

/** cm → Preview 印刷區 overlay px（12.24 × preview scale） */
export function cmToGarmentPreviewPrintPx(cm: number): number {
  return cm * ADULT_TSHIRT_TEMPLATE_PX_PER_CM * getGarmentPreviewScaleFactor();
}

/** @deprecated 請用 cmToGarmentPreviewPrintPx */
export function cmToGarmentVisualWidthPx(cm: number): number {
  return cmToGarmentPreviewPrintPx(cm);
}

/** @deprecated 請用 cmToGarmentPreviewPrintPx */
export function cmToGarmentVisualHeightPx(cm: number): number {
  return cmToGarmentPreviewPrintPx(cm);
}

/**
 * Preview 圖層 box（相對印刷區容器 %）。
 * 以原始 x_cm/y_cm/width_cm/height_cm 的印刷中心為錨點，視覺放大後反推 left/top。
 */
export function getGarmentPreviewLayerBoxStyle(
  rect: GarmentPreviewLayerCmRect,
  printArea: { width: number; height: number },
): GarmentPreviewLayerBoxStyle {
  const pxPerCm = ADULT_TSHIRT_TEMPLATE_PX_PER_CM;
  const printAreaWidthPx = printArea.width * pxPerCm;
  const printAreaHeightPx = printArea.height * pxPerCm;
  const previewScale = getGarmentPreviewScaleFactor();

  const centerX_cm = rect.x_cm + rect.width_cm / 2;
  const centerY_cm = rect.y_cm + rect.height_cm / 2;

  const scaledWidth_cm = rect.width_cm * previewScale;
  const scaledHeight_cm = rect.height_cm * previewScale;

  const left_cm = centerX_cm - scaledWidth_cm / 2;
  const top_cm = centerY_cm - scaledHeight_cm / 2;

  const widthPx = cmToGarmentPreviewPrintPx(rect.width_cm);
  const heightPx = cmToGarmentPreviewPrintPx(rect.height_cm);

  return {
    left: `${(left_cm / printArea.width) * 100}%`,
    top: `${(top_cm / printArea.height) * 100}%`,
    width: `${(widthPx / printAreaWidthPx) * 100}%`,
    height: `${(heightPx / printAreaHeightPx) * 100}%`,
  };
}

/** 設計座標系胸寬 px（612 @ 50cm）— 供對照 */
export function getGarmentReferenceChestWidthPx(): number {
  return ADULT_TSHIRT_TEMPLATE_CHEST_PX;
}
