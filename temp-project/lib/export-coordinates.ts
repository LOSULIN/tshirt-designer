/**
 * 匯出座標 — 與 Designer / Flat Preview 相同比例：
 *   left% = x_cm / printArea.width
 *   width% = width_cm / printArea.width
 * 再依實際印刷尺寸 (cm) → 輸出解析度 (px) 換算。
 */

import type { Side } from "./constants";
import { PRODUCTION_DPI } from "./coordinates/production";
import {
  getDesignerPrintAreaCmBounds,
  getLayerEffectiveCmRect,
  getPrintAreaCmBounds,
  type LayerCmRect,
  type PrintAreaCmBounds,
} from "./design-cm";
import { getTextLayerExportCmRect, getTextLayerPlacementCmRect } from "./text-layer";
import type { DesignLayer } from "./types";

export const EXPORT_DPI = PRODUCTION_DPI;

/** 物理 cm → px（cm ÷ 2.54 × dpi） */
export function cmToPhysicalExportPx(
  cm: number,
  dpi: number = EXPORT_DPI,
): number {
  return Math.round((cm / 2.54) * dpi);
}

export interface ExportCanvasSpec {
  side: Side;
  printAreaCm: PrintAreaCmBounds;
  dpi: number;
  widthPx: number;
  heightPx: number;
}

/** 匯出畫布規格：與 Designer 藍框相同之印刷區 @ 300 DPI */
export function getExportCanvasSpec(side: Side): ExportCanvasSpec {
  const printAreaCm = getDesignerPrintAreaCmBounds(side);
  const dpi = EXPORT_DPI;
  return {
    side,
    printAreaCm,
    dpi,
    widthPx: cmToPhysicalExportPx(printAreaCm.width, dpi),
    heightPx: cmToPhysicalExportPx(printAreaCm.height, dpi),
  };
}

export interface MockupContainerRectPx {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MockupLayerRectPx {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  pxPerCmX: number;
  pxPerCmY: number;
}

export interface ExportCanvasSizePx {
  widthPx: number;
  heightPx: number;
}

/** 與 DesignCanvas / FlatShirtDesignView 相同的圖層 cm 外框 */
export function getLayerExportCmRect(layer: DesignLayer): LayerCmRect {
  if (layer.type === "text") {
    return getTextLayerExportCmRect(layer);
  }
  return getLayerEffectiveCmRect(layer);
}

export function resolveExportPrintAreaCm(side?: Side): PrintAreaCmBounds {
  if (side) {
    return getDesignerPrintAreaCmBounds(side);
  }
  return getPrintAreaCmBounds();
}

export interface ExportLayerRectPx {
  x: number;
  y: number;
  width: number;
  height: number;
  pxPerCmX: number;
  pxPerCmY: number;
}

/** cm 外框 → 匯出畫布 px（依 print area 比例，非圖片原始 px） */
export function mapLayerCmRectToExportPx(
  rect: LayerCmRect,
  printAreaCm: PrintAreaCmBounds,
  canvasSizePx: ExportCanvasSizePx,
): ExportLayerRectPx {
  const pxPerCmX = canvasSizePx.widthPx / printAreaCm.width;
  const pxPerCmY = canvasSizePx.heightPx / printAreaCm.height;

  return {
    x: rect.x_cm * pxPerCmX,
    y: rect.y_cm * pxPerCmY,
    width: rect.width_cm * pxPerCmX,
    height: rect.height_cm * pxPerCmY,
    pxPerCmX,
    pxPerCmY,
  };
}

export function mapLayerToExportPx(
  layer: DesignLayer,
  printAreaCm: PrintAreaCmBounds,
  canvasSizePx: ExportCanvasSizePx,
): ExportLayerRectPx {
  return mapLayerCmRectToExportPx(
    getLayerExportCmRect(layer),
    printAreaCm,
    canvasSizePx,
  );
}

/** cm 外框 → mockup 模板上的印刷區像素座標 */
export function mapLayerCmRectToMockupPx(
  rect: LayerCmRect,
  printAreaCm: PrintAreaCmBounds,
  printRect: MockupContainerRectPx,
): MockupLayerRectPx {
  const pxPerCmX = printRect.width / printAreaCm.width;
  const pxPerCmY = printRect.height / printAreaCm.height;
  const width = rect.width_cm * pxPerCmX;
  const height = rect.height_cm * pxPerCmY;

  return {
    centerX: printRect.left + (rect.x_cm + rect.width_cm / 2) * pxPerCmX,
    centerY: printRect.top + (rect.y_cm + rect.height_cm / 2) * pxPerCmY,
    width,
    height,
    pxPerCmX,
    pxPerCmY,
  };
}

export function mapLayerToMockupPx(
  layer: DesignLayer,
  printAreaCm: PrintAreaCmBounds,
  printRect: MockupContainerRectPx,
): MockupLayerRectPx {
  return mapLayerCmRectToMockupPx(
    getLayerExportCmRect(layer),
    printAreaCm,
    printRect,
  );
}
