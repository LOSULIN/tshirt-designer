/**
 * Preview 印刷區定位模式
 * ─────────────────────
 * - canvas / garment：皆走 print-area-offset（領口錨點 + PRINT_AREA_OFFSET_CM）
 *
 * 不影響 Production mm、工廠匯出、mockup PNG 匯出。
 */

import type { ApparelSize } from "../sizes";

export type PreviewPrintPositionMode = "canvas" | "garment";

/** 系統預設：garment-relative（領口 + offset cm · 隨尺碼 scale） */
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
