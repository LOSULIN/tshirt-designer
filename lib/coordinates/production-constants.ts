/**
 * Production 常數與純函式 — 無 Runtime 相依，供 Coordinate Runtime / Export 安全 import。
 */

export const MM_PER_CM = 10;

/** 工廠輸出 DPI（與 constants.EXPORT_DPI 一致，避免模組循環依賴） */
export const PRODUCTION_DPI = 300;

/** 真實可印刷區（成人 Unisex T 恤） */
export const PRODUCTION_PRINT_AREA_MM = {
  width_mm: 350,
  height_mm: 500,
} as const;

/** 1 mm → px @ PRODUCTION_DPI */
export const MM_TO_EXPORT_PX = PRODUCTION_DPI / 25.4;

export function mmToExportPx(mm: number): number {
  return Math.round(mm * MM_TO_EXPORT_PX);
}

/** 圖層 `_cm` 欄位 → production mm */
export function legacyCmFieldToMm(cmField: number): number {
  return cmField * MM_PER_CM;
}

/** production mm → 圖層 `_cm` 欄位 */
export function mmToLegacyCmField(mm: number): number {
  return mm / MM_PER_CM;
}
