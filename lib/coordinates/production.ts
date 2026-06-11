/**
 * Production Coordinate System
 * ─────────────────────────────
 * 唯一物理真相：毫米（mm）。工廠 PNG / PDF / 驗證僅讀此系統。
 * 圖層 state 仍以 `_cm` 欄位儲存時，數值 = mm ÷ 10（1 cm = 10 mm）。
 */

export const MM_PER_CM = 10;

/** 圖層 `_cm` 欄位在 overlay 內的 UI 單位換算（1 cm 欄位 = 10 units） */
export const PRODUCTION_LEGACY_UI_UNITS_PER_CM = MM_PER_CM;

/** 工廠輸出 DPI（與 constants.EXPORT_DPI 一致，避免模組循環依賴） */
export const PRODUCTION_DPI = 300;

/** 真實可印刷區（成人 Unisex T 恤） */
export const PRODUCTION_PRINT_AREA_MM = {
  width_mm: 350,
  height_mm: 500,
} as const;

export const PRODUCTION_SAFE_MARGIN_RATIO = 0.05;

export interface ProductionRectMm {
  x_mm: number;
  y_mm: number;
  width_mm: number;
  height_mm: number;
}

export interface ProductionPrintAreaMm {
  width_mm: number;
  height_mm: number;
}

export interface ProductionSafeAreaMm {
  x_mm: number;
  y_mm: number;
  width_mm: number;
  height_mm: number;
}

/** 1 mm → px @ PRODUCTION_DPI */
export const MM_TO_EXPORT_PX = PRODUCTION_DPI / 25.4;

export function mmToExportPx(mm: number): number {
  return Math.round(mm * MM_TO_EXPORT_PX);
}

export function exportPxToMm(px: number): number {
  return px / MM_TO_EXPORT_PX;
}

/** 圖層 `_cm` 欄位 → production mm */
export function legacyCmFieldToMm(cmField: number): number {
  return cmField * MM_PER_CM;
}

/** production mm → 圖層 `_cm` 欄位 */
export function mmToLegacyCmField(mm: number): number {
  return mm / MM_PER_CM;
}

export function getProductionPrintAreaMm(): ProductionPrintAreaMm {
  return { ...PRODUCTION_PRINT_AREA_MM };
}

export function getProductionPrintAreaCm(): {
  width: number;
  height: number;
} {
  return {
    width: mmToLegacyCmField(PRODUCTION_PRINT_AREA_MM.width_mm),
    height: mmToLegacyCmField(PRODUCTION_PRINT_AREA_MM.height_mm),
  };
}

export function getProductionSafeAreaMm(
  printArea: ProductionPrintAreaMm = PRODUCTION_PRINT_AREA_MM,
): ProductionSafeAreaMm {
  const ratio = PRODUCTION_SAFE_MARGIN_RATIO;
  const insetX = printArea.width_mm * ratio;
  const insetY = printArea.height_mm * ratio;

  return {
    x_mm: insetX,
    y_mm: insetY,
    width_mm: printArea.width_mm * (1 - ratio * 2),
    height_mm: printArea.height_mm * (1 - ratio * 2),
  };
}

export function getProductionExportDimensionsPx(): {
  widthPx: number;
  heightPx: number;
} {
  return {
    widthPx: mmToExportPx(PRODUCTION_PRINT_AREA_MM.width_mm),
    heightPx: mmToExportPx(PRODUCTION_PRINT_AREA_MM.height_mm),
  };
}
