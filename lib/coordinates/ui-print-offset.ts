/**
 * UI Print Area Vertical Offset
 * ─────────────────────────────
 * 全站預覽／mockup 印刷區框線的 Y 校準（不影響 Production mm 或工廠匯出）。
 *
 * 調整 `UI_GLOBAL_PRINT_OFFSET_Y_PX` 即可讓 Editor / Flat Shirt / Model 預覽
 * 的框線整體上下移動（負值＝向上）。
 */

export const UI_PRINT_REF_BASE_Y = 0.53;

/**
 * 全域 UI 垂直偏移（px @ 1536 容器高度）。
 * 這是控制預覽框線上下位置的主要旋鈕。
 */
export const UI_GLOBAL_PRINT_OFFSET_Y_PX = -25;

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
