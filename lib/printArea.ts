/**
 * 印刷區與 shirt container（固定 mockup）分離。
 *
 * - 印刷規格：固定 35×50 cm（與尺碼無關）
 * - UI 視覺：cm × UI_SCALE → 對應 shirt container 固定 %
 * - 定位：PRINT_REFERENCE + translate(-50%, -50%)
 *
 * 不修改：shirt container、template image、sizes data。
 */

import { APPAREL_SIZES, type ApparelSize } from "./sizes";

/** 固定印刷規格（物理／設計／匯出） */
export const PRINT_AREA = {
  widthCm: 35,
  heightCm: 50,
} as const;

export const PRINT_AREA_WIDTH_CM = PRINT_AREA.widthCm;
export const PRINT_AREA_HEIGHT_CM = PRINT_AREA.heightCm;

export const PRINT_AREA_CM = {
  widthCm: PRINT_AREA.widthCm,
  heightCm: PRINT_AREA.heightCm,
} as const;

export const PRINT_COLLAR_OFFSET_CM = {
  front: 10,
  back: 10,
} as const;

/**
 * 印刷區固定錨點（相對 shirt container 0~1，為 print area 中心）。
 * 搭配 translate(-50%, -50%) 定位。
 */
export const PRINT_REFERENCE = {
  x: 0.5,
  y: 0.53,
} as const;

export const PRINT_REFERENCE_TRANSFORM = "translate(-50%, -50%)" as const;

/** UI 視覺縮放：px（邏輯單位）= cm × UI_SCALE */
export const UI_SCALE = 10 as const;

/** 固定 shirt container（模板 PNG 比例，不依尺碼） */
export const SHIRT_CONTAINER_WIDTH = 1024;
export const SHIRT_CONTAINER_HEIGHT = 1536;

export interface PrintAreaContainerStyle {
  left: string;
  top: string;
  transform: string;
  width: string;
  height: string;
}

export interface PrintScale {
  widthPct: number;
  heightPct: number;
}

export function cmToUiUnits(cm: number): number {
  return cm * UI_SCALE;
}

export function getFixedPrintAreaUiSize(): { width: number; height: number } {
  return {
    width: cmToUiUnits(PRINT_AREA.widthCm),
    height: cmToUiUnits(PRINT_AREA.heightCm),
  };
}

/** 固定 UI 比例（相對 shirt container，與尺碼無關） */
export function getFixedPrintAreaContainerPct(): PrintScale {
  const ui = getFixedPrintAreaUiSize();
  return {
    widthPct: ui.width / SHIRT_CONTAINER_WIDTH,
    heightPct: ui.height / SHIRT_CONTAINER_HEIGHT,
  };
}

export function getShirtContainerAspectRatio(): string {
  return `${SHIRT_CONTAINER_WIDTH} / ${SHIRT_CONTAINER_HEIGHT}`;
}

export function getShirtContainerWidthOverHeight(): number {
  return SHIRT_CONTAINER_WIDTH / SHIRT_CONTAINER_HEIGHT;
}

/**
 * print area 樣式：固定 35×50 cm 視覺尺寸 + PRINT_REFERENCE 定位。
 * size / side 保留參數以相容既有呼叫，不影響結果。
 */
export function getPrintAreaContainerStyle(
  _side: "front" | "back" = "front",
): PrintAreaContainerStyle {
  const { widthPct, heightPct } = getFixedPrintAreaContainerPct();

  return {
    left: `${PRINT_REFERENCE.x * 100}%`,
    top: `${PRINT_REFERENCE.y * 100}%`,
    transform: PRINT_REFERENCE_TRANSFORM,
    width: `${widthPct * 100}%`,
    height: `${heightPct * 100}%`,
  };
}

/** @deprecated 尺碼不再影響印刷區；回傳固定 UI 比例 */
export function getVisualPrintScale(_size?: ApparelSize): PrintScale {
  return getFixedPrintAreaContainerPct();
}

/** @deprecated 尺碼不再影響印刷區 */
export function getPrintScale(_size?: ApparelSize): PrintScale {
  return getFixedPrintAreaContainerPct();
}

/** @deprecated 尺碼不再影響印刷區 */
export function getBaselineNaturalPrintScale(): PrintScale {
  return getFixedPrintAreaContainerPct();
}

/** @deprecated 尺碼不再影響印刷區 */
export function getPrintAreaVisualAreaRatio(_size?: ApparelSize): number {
  const { widthPct, heightPct } = getFixedPrintAreaContainerPct();
  return widthPct * heightPct;
}

/** @deprecated 各尺碼印刷區面積相同 */
export function getPrintScaleRankOrder(): ApparelSize[] {
  return [...APPAREL_SIZES];
}

/** @deprecated 請用 getShirtContainerAspectRatio */
export function getUiMockupAspectRatio(): string {
  return getShirtContainerAspectRatio();
}

/** @deprecated 請用 getShirtContainerWidthOverHeight */
export function getUiMockupWidthOverHeight(): number {
  return getShirtContainerWidthOverHeight();
}

/** @deprecated 請用 getPrintAreaContainerStyle() */
export function getPrintAreaUiContainerStyle(): PrintAreaContainerStyle {
  return getPrintAreaContainerStyle();
}
