/**
 * UI Print Area — CSS 組裝與舊版 canvas 偏移工具
 * ───────────────────────────────────────────────
 * 印刷區 Y 基準請改 `print-area-offset.ts`（COLLAR_ANCHOR + PRINT_AREA_OFFSET_CM）。
 * 此檔僅負責 ref → % style；不再作為永久定位旋鈕。
 */

/** @deprecated 僅供舊 canvas 校準腳本參考；定位已改 print-area-offset */
export const UI_PRINT_REF_BASE_Y = 0.53;

/** @deprecated 不再套用於 Designer / Preview / Mockup 定位 */
export const UI_GLOBAL_PRINT_OFFSET_Y_PX = 0;

export interface UiPrintReference {
  x: number;
  y: number;
}

export interface UiPrintContainerStyle {
  left: string;
  top: string;
  transform: string;
  width: string;
  height: string;
}

/** 將 px 偏移換算為 ref.y 增量（套用在錨點中心） */
export function pxOffsetToRefYDelta(
  offsetPx: number,
  containerHeight: number,
): number {
  return offsetPx / containerHeight;
}

/**
 * 計算 UI 印刷區錨點 ref.y
 * @param localOffsetPx 各子系統額外微調（Preview / Mockup flat / model）
 * @param containerHeight 畫布高度 px
 * @param baseY 該視圖基準中心 Y（0~1）
 */
export function resolveUiPrintRefY(
  localOffsetPx: number,
  containerHeight: number,
  baseY: number = UI_PRINT_REF_BASE_Y,
): number {
  const totalOffsetPx = localOffsetPx + UI_GLOBAL_PRINT_OFFSET_Y_PX;
  return baseY + pxOffsetToRefYDelta(totalOffsetPx, containerHeight);
}

export function resolveUiPrintReference(
  localOffsetPx: number,
  containerHeight: number,
  baseY: number = UI_PRINT_REF_BASE_Y,
  x = 0.5,
): UiPrintReference {
  return { x, y: resolveUiPrintRefY(localOffsetPx, containerHeight, baseY) };
}

export function buildUiPrintAreaContainerStyle(
  ref: UiPrintReference,
  widthPct: number,
  heightPct: number,
  transform: string,
): UiPrintContainerStyle {
  return {
    left: `${ref.x * 100}%`,
    top: `${ref.y * 100}%`,
    transform,
    width: `${widthPct * 100}%`,
    height: `${heightPct * 100}%`,
  };
}
