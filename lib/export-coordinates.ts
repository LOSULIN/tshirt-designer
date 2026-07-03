/**
 * 匯出座標 — 與 Designer / Flat Preview 相同比例：
 *   left% = x_cm / printArea.width
 *   width% = width_cm / printArea.width
 * 再依實際印刷尺寸 (cm) → 輸出解析度 (px) 換算。
 */

import type { Side } from "./constants";
import { PRODUCTION_DPI } from "./coordinates/production-constants";
import {
  exportCanvasSizeToTargetRect,
  mapLayerCmRect,
  resolveLayerCmRect,
  resolvePrintAreaCm,
} from "./coordinate-runtime";
import {
  getPrintAreaCmBounds,
  type LayerCmRect,
  type PrintAreaCmBounds,
} from "./design-cm";
import { resolveExportGarmentLayerCmRect } from "./export-runtime";
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

/** 匯出畫布規格：Garment Blue 印刷區 @ 300 DPI */
export function getExportCanvasSpec(
  side: Side,
  size: string = "M",
): ExportCanvasSpec {
  const printAreaCm = resolvePrintAreaCm({ runtime: "export", side, size });
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

/** Workspace storage cm rect（未投影；Export 渲染請用 getLayerExportGarmentCmRect） */
export function getLayerExportCmRect(layer: DesignLayer): LayerCmRect {
  return resolveLayerCmRect(layer, { purpose: "export" });
}

/** Garment physical cm rect for Export / Mockup（Facade 投影後） */
export function getLayerExportGarmentCmRect(
  layer: DesignLayer,
  side: Side,
  size: string,
): LayerCmRect {
  return resolveExportGarmentLayerCmRect(layer, side, size);
}

export function resolveExportPrintAreaCm(
  side?: Side,
  size: string = "M",
): PrintAreaCmBounds {
  if (side) {
    return resolvePrintAreaCm({ runtime: "export", side, size });
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
  const mapped = mapLayerCmRect({
    layerRect: rect,
    printArea: printAreaCm,
    targetRect: exportCanvasSizeToTargetRect(canvasSizePx),
  });

  return {
    x: mapped.x,
    y: mapped.y,
    width: mapped.width,
    height: mapped.height,
    pxPerCmX: mapped.pxPerCmX,
    pxPerCmY: mapped.pxPerCmY,
  };
}

export function mapLayerToExportPx(
  layer: DesignLayer,
  printAreaCm: PrintAreaCmBounds,
  canvasSizePx: ExportCanvasSizePx,
  side: Side,
  size: string,
): ExportLayerRectPx {
  return mapLayerCmRectToExportPx(
    getLayerExportGarmentCmRect(layer, side, size),
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
  side: Side,
  size: string,
): MockupLayerRectPx {
  return mapLayerCmRectToMockupPx(
    getLayerExportGarmentCmRect(layer, side, size),
    printAreaCm,
    printRect,
  );
}
