/**
 * Garment-Relative Print Positioning
 * ──────────────────────────────────
 * UI 專用：印刷區上緣 = 領口下緣（隨尺碼 scale）+ top offset cm（隨尺碼 scale）。
 * 不寫入 layer state、不影響 Production / 工廠匯出。
 */

import type { Side } from "../constants";
import type { ApparelSize } from "../sizes";
import { getShirtScale } from "../shirtScale";
import { getTemplatePxPerCm } from "../shirt-template";
import { getProductionPrintAreaMm } from "./production";
import type { UiPrintReference } from "./ui-print-offset";

/** 與 Preview 畫布一致（僅用於 UI 換算） */
export const GARMENT_UI_CONTAINER = {
  width: 1024,
  height: 1536,
} as const;

/**
 * 領口下緣 Y（px @ M 尺碼、scale=1、transform-origin:center）
 * 來源：adult-tshirt black/white front 模板量測
 */
export const GARMENT_COLLAR_LOW_Y_PX_BY_SIDE = {
  front: 449,
  back: 449,
} as const;

/** 印刷區上緣距領口下緣（cm，會隨 garment scale 縮放） */
export const GARMENT_PRINT_TOP_OFFSET_CM = 8;

export interface GarmentPrintMetrics {
  side: Side;
  size: ApparelSize | string;
  garmentScale: number;
  collarLowYPx: number;
  scaledCollarLowYPx: number;
  printTopOffsetCm: number;
  scaledPrintTopOffsetPx: number;
  printTopPx: number;
  printCenterPx: number;
  printHeightPx: number;
  ref: UiPrintReference;
}

/** Preview overlay 高度（px @ M）：50 cm × templatePxPerCm */
export function getGarmentPrintHeightPx(): number {
  const printArea = getProductionPrintAreaMm();
  return (printArea.height_mm / 10) * getTemplatePxPerCm();
}

/** Preview 模板視覺比例（與 adult-tshirt 胸寬校準一致） */
export function getGarmentUiPxPerCm(): number {
  return getTemplatePxPerCm();
}

/**
 * 模擬 ShirtVisualScale（transform-origin: center center）對 Y 的影響
 */
export function scaleGarmentY(
  yPx: number,
  garmentScale: number,
  containerHeight: number = GARMENT_UI_CONTAINER.height,
): number {
  const centerY = containerHeight / 2;
  return centerY + (yPx - centerY) * garmentScale;
}

export function getGarmentPrintMetrics(params: {
  side: Side;
  size: ApparelSize | string;
  containerHeight?: number;
}): GarmentPrintMetrics {
  const containerHeight =
    params.containerHeight ?? GARMENT_UI_CONTAINER.height;
  const garmentScale = getShirtScale(params.size);
  const collarBaselineY = GARMENT_COLLAR_LOW_Y_PX_BY_SIDE[params.side];
  const scaledCollarLowYPx = scaleGarmentY(
    collarBaselineY,
    garmentScale,
    containerHeight,
  );
  const pxPerCm = getGarmentUiPxPerCm();
  const scaledPrintTopOffsetPx =
    GARMENT_PRINT_TOP_OFFSET_CM * pxPerCm * garmentScale;
  const printHeightPx = getGarmentPrintHeightPx();
  const printTopPx = scaledCollarLowYPx + scaledPrintTopOffsetPx;
  const printCenterPx = printTopPx + printHeightPx / 2;

  return {
    side: params.side,
    size: params.size,
    garmentScale,
    collarLowYPx: collarBaselineY,
    scaledCollarLowYPx,
    printTopOffsetCm: GARMENT_PRINT_TOP_OFFSET_CM,
    scaledPrintTopOffsetPx,
    printTopPx,
    printCenterPx,
    printHeightPx,
    ref: {
      x: 0.5,
      y: printCenterPx / containerHeight,
    },
  };
}

/** Garment-relative 印刷區錨點（中心點 ref，供 overlay translate(-50%,-50%)） */
export function getGarmentPrintReference(params: {
  side: Side;
  size: ApparelSize | string;
  containerHeight?: number;
}): UiPrintReference {
  return getGarmentPrintMetrics(params).ref;
}
