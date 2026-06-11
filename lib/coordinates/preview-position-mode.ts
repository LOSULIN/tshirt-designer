/**
 * Preview 印刷區定位模式
 * ─────────────────────
 * - canvas：固定 ref.y / UI offset（既有邏輯，預設）
 * - garment：領口下緣 + 尺碼縮放後 8cm（僅 UI 框線）
 *
 * 不影響 Production mm、工廠匯出、mockup PNG 匯出。
 */

import type { ApparelSize } from "../sizes";

export type PreviewPrintPositionMode = "canvas" | "garment";

/** 系統預設：garment-relative（領口下 8cm · 隨尺碼 scale） */
export const DEFAULT_PRINT_MODE: PreviewPrintPositionMode = "garment";

/** @deprecated 請用 DEFAULT_PRINT_MODE */
export const DEFAULT_PREVIEW_PRINT_POSITION_MODE = DEFAULT_PRINT_MODE;

export interface PreviewPrintPositionOptions {
  mode?: PreviewPrintPositionMode;
  size?: ApparelSize | string;
}

/** 僅在明確傳入 canvas / garment 時覆寫；否則用 DEFAULT_PRINT_MODE */
export function parsePreviewPrintPositionMode(
  value: string | null | undefined,
): PreviewPrintPositionMode {
  if (value === "canvas" || value === "garment") {
    return value;
  }
  return DEFAULT_PRINT_MODE;
}

export function resolvePreviewPrintPositionMode(
  mode?: PreviewPrintPositionMode,
): PreviewPrintPositionMode {
  return mode ?? DEFAULT_PREVIEW_PRINT_POSITION_MODE;
}

export function isGarmentPreviewPositionMode(
  mode: PreviewPrintPositionMode,
): mode is "garment" {
  return mode === "garment";
}
