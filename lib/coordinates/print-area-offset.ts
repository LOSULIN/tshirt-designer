/**
 * 印刷區起印位置 — 單一來源
 * ─────────────────────────
 * 領口錨點 + 面別 offset（cm）→ Preview / Mockup / Proof 共用。
 * 不寫入 layer 座標；不影響 Production mm 設計空間。
 */

import type { Side } from "../constants";
import { ADULT_TSHIRT_TEMPLATE_PX_PER_CM } from "../template-metrics";
import { getProductionPrintAreaMm } from "./production";

/** 領口下緣至印刷區上緣（cm） */
export const PRINT_AREA_OFFSET_CM = {
  front: 7,
  back: 5,
} as const;

/** @deprecated 請用 PRINT_AREA_OFFSET_CM */
export const PRINT_COLLAR_OFFSET_CM = PRINT_AREA_OFFSET_CM;

/**
 * 模板領口下緣 Y（px @ M 尺碼、scale=1、1024×1536）
 * 來源：scripts/measure-collar-anchor.mjs（中心線領口下緣 scanline）
 * black-front / white-front / white-back 量測 ≈ 386（舊 449 偏低 63px）
 */
export const COLLAR_ANCHOR_Y_PX_BY_SIDE = {
  front: 386,
  back: 386,
} as const;

export function getCollarAnchorYPx(side: Side): number {
  return COLLAR_ANCHOR_Y_PX_BY_SIDE[side];
}

/**
 * 印刷區上緣 Y（px）
 * offsetY = collarAnchorY + PRINT_AREA_OFFSET_CM[side] × previewPxPerCm × scale
 */
export function getPrintAreaOffsetPx(
  side: Side,
  previewPxPerCm: number,
  collarAnchorY: number,
  scale = 1,
): number {
  return (
    collarAnchorY + PRINT_AREA_OFFSET_CM[side] * previewPxPerCm * scale
  );
}

/** 印刷區高度（px @ preview 比例） */
export function getPrintAreaHeightPx(previewPxPerCm?: number): number {
  const pxPerCm = previewPxPerCm ?? ADULT_TSHIRT_TEMPLATE_PX_PER_CM;
  const printArea = getProductionPrintAreaMm();
  return (printArea.height_mm / 10) * pxPerCm;
}

/** 印刷區中心 Y（px）— 供 translate(-50%,-50%) 錨點 */
export function getPrintAreaCenterPx(
  side: Side,
  collarAnchorY: number,
  previewPxPerCm: number,
  scale = 1,
): number {
  const topPx = getPrintAreaOffsetPx(
    side,
    previewPxPerCm,
    collarAnchorY,
    scale,
  );
  return topPx + getPrintAreaHeightPx(previewPxPerCm) / 2;
}

/** 印刷區中心 ref（0~1） */
export function getPrintAreaCenterRef(
  side: Side,
  containerHeight: number,
  collarAnchorY: number,
  previewPxPerCm: number,
  scale = 1,
): { x: number; y: number } {
  return {
    x: 0.5,
    y:
      getPrintAreaCenterPx(side, collarAnchorY, previewPxPerCm, scale) /
      containerHeight,
  };
}

/** 領口下緣至印刷區上緣的實際 cm（metadata / proof） */
export function getPrintAreaOffsetCm(side: Side): number {
  return PRINT_AREA_OFFSET_CM[side];
}
