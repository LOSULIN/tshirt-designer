/**
 * Garment-Relative Print Positioning
 * ──────────────────────────────────
 * UI 專用：印刷區上緣 = 領口下緣（隨尺碼 scale）+ PRINT_AREA_OFFSET_CM（隨尺碼 scale）。
 * 常數與公式單一來源：`print-area-offset.ts`
 * 不寫入 layer state、不影響 Production / 工廠匯出。
 */

import type { Side } from "../constants";
import type { ApparelSize } from "../sizes";
import { getShirtScale } from "../shirtScale";
import { getTemplatePxPerCm } from "../shirt-template";
import {
  getDesignerPrintAreaCmBounds,
} from "../design-cm";
import {
  getGarmentMaxPrintAreaCm,
  getGarmentPrintSafeZoneCmForSize,
} from "../garment-print-config";
import {
  COLLAR_ANCHOR_Y_PX_BY_SIDE,
  getPrintAreaOffsetCm,
  getPrintAreaOffsetPx,
  PRINT_AREA_OFFSET_CM,
} from "./print-area-offset";
import type { UiPrintReference } from "./ui-print-offset";

/** 與 Preview 畫布一致（僅用於 UI 換算） */
export const GARMENT_UI_CONTAINER = {
  width: 1024,
  height: 1536,
} as const;

/** @deprecated 請用 COLLAR_ANCHOR_Y_PX_BY_SIDE */
export const GARMENT_COLLAR_LOW_Y_PX_BY_SIDE = COLLAR_ANCHOR_Y_PX_BY_SIDE;

/** @deprecated 請用 PRINT_AREA_OFFSET_CM.front */
export const GARMENT_PRINT_TOP_OFFSET_CM = PRINT_AREA_OFFSET_CM.front;

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

/** Preview overlay 高度（px @ M）：面別最大印刷區高度 × templatePxPerCm */
export function getGarmentPrintHeightPx(side: Side): number {
  const maxPrint = getGarmentMaxPrintAreaCm(side);
  return maxPrint.heightCm * getTemplatePxPerCm();
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
  const collarBaselineY = COLLAR_ANCHOR_Y_PX_BY_SIDE[params.side];
  const scaledCollarLowYPx = scaleGarmentY(
    collarBaselineY,
    garmentScale,
    containerHeight,
  );
  const pxPerCm = getGarmentUiPxPerCm();
  const printTopOffsetCm = getPrintAreaOffsetCm(params.side);
  const printHeightPx = getGarmentPrintHeightPx(params.side);
  const printTopPx = getPrintAreaOffsetPx(
    params.side,
    pxPerCm,
    scaledCollarLowYPx,
    garmentScale,
  );
  const scaledPrintTopOffsetPx =
    printTopOffsetCm * pxPerCm * garmentScale;

  return {
    side: params.side,
    size: params.size,
    garmentScale,
    collarLowYPx: collarBaselineY,
    scaledCollarLowYPx,
    printTopOffsetCm,
    scaledPrintTopOffsetPx,
    printTopPx,
    printCenterPx: printTopPx + printHeightPx / 2,
    printHeightPx,
    ref: {
      x: 0.5,
      y: (printTopPx + printHeightPx / 2) / containerHeight,
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

export interface GarmentPrintSafeZoneLayoutPct {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

/**
 * 建議安全區（橘框）在藍框印刷區內的 % 定位。
 * 上緣 = 領口下緣 + PRINT_AREA_OFFSET_CM（正面 7cm、背面 5cm），
 * 經 template pxPerCm × 尺碼 scale 換算，與藍框上緣同一基準。
 */
export function getGarmentPrintSafeZonePctInPrintArea(params: {
  side: Side;
  size: ApparelSize | string;
  containerWidth?: number;
  containerHeight?: number;
}): GarmentPrintSafeZoneLayoutPct {
  const containerWidth =
    params.containerWidth ?? GARMENT_UI_CONTAINER.width;
  const containerHeight =
    params.containerHeight ?? GARMENT_UI_CONTAINER.height;
  const metrics = getGarmentPrintMetrics({
    side: params.side,
    size: params.size,
    containerHeight,
  });
  const printArea = getDesignerPrintAreaCmBounds(params.side);
  const safe = getGarmentPrintSafeZoneCmForSize(params.side, params.size);
  const pxPerCm = getGarmentUiPxPerCm();

  const printWidthPx = printArea.width * pxPerCm;
  const printHeightPx = printArea.height * pxPerCm;
  const printLeftPx = (containerWidth - printWidthPx) / 2;
  const printTopPx = metrics.printTopPx;

  const safeWidthPx = safe.safeWidthCm * pxPerCm;
  const safeHeightPx = safe.safeHeightCm * pxPerCm;
  const safeLeftPx = (containerWidth - safeWidthPx) / 2;
  const safeTopPx = metrics.printTopPx;

  return {
    leftPct: ((safeLeftPx - printLeftPx) / printWidthPx) * 100,
    topPct: ((safeTopPx - printTopPx) / printHeightPx) * 100,
    widthPct: (safeWidthPx / printWidthPx) * 100,
    heightPct: (safeHeightPx / printHeightPx) * 100,
  };
}

/** 安全區上緣距領口下緣（cm）— 供驗證／debug */
export function getGarmentPrintSafeZoneTopOffsetCmFromCollar(
  side: Side,
  size: ApparelSize | string,
  containerHeight?: number,
): number {
  const metrics = getGarmentPrintMetrics({
    side,
    size,
    containerHeight,
  });
  const pxPerCm = getGarmentUiPxPerCm();
  const offsetPx = metrics.printTopPx - metrics.scaledCollarLowYPx;
  return offsetPx / (pxPerCm * metrics.garmentScale);
}
