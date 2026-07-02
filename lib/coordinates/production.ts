/**
 * Production Coordinate System
 * ─────────────────────────────
 * 唯一物理真相：毫米（mm）。工廠 PNG / PDF / 驗證僅讀此系統。
 * 圖層 state 仍以 `_cm` 欄位儲存時，數值 = mm ÷ 10（1 cm = 10 mm）。
 */

import { resolveLayerCmRect, resolvePrintAreaCm } from "../coordinate-runtime";
import type { DesignLayer } from "../types";
import {
  legacyCmFieldToMm,
  MM_PER_CM,
  MM_TO_EXPORT_PX,
  mmToExportPx,
  mmToLegacyCmField,
  PRODUCTION_DPI,
  PRODUCTION_PRINT_AREA_MM,
} from "./production-constants";

export {
  legacyCmFieldToMm,
  MM_PER_CM,
  MM_TO_EXPORT_PX,
  mmToExportPx,
  mmToLegacyCmField,
  PRODUCTION_DPI,
  PRODUCTION_PRINT_AREA_MM,
};

/** 圖層 `_cm` 欄位在 overlay 內的 UI 單位換算（1 cm 欄位 = 10 units） */
export const PRODUCTION_LEGACY_UI_UNITS_PER_CM = MM_PER_CM;

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

export function exportPxToMm(px: number): number {
  return px / MM_TO_EXPORT_PX;
}

export function getProductionPrintAreaMm(): ProductionPrintAreaMm {
  return { ...PRODUCTION_PRINT_AREA_MM };
}

export function getProductionPrintAreaCm(): {
  width: number;
  height: number;
} {
  return resolvePrintAreaCm({ runtime: "production" });
}

/** Production layer cm rect（與 export 路徑一致；工廠層經 Export Pipeline 渲染） */
export function resolveProductionLayerCmRect(layer: DesignLayer) {
  return resolveLayerCmRect(layer, { purpose: "production" });
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
