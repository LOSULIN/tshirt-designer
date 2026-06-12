/**
 * Mockup Export vs Designer Preview — 印刷區 overlay 除錯。
 */

import type { Side } from "./constants";
import {
  getFlatMockupPrintAreaRectPx,
  MOCKUP_FLAT_CONTAINER,
} from "./coordinates/mockup";
import {
  getDesignerPrintAreaCmBounds,
  type PrintAreaCmBounds,
} from "./design-cm";
import {
  getLayerExportCmRect,
  mapLayerCmRectToMockupPx,
  type MockupContainerRectPx,
} from "./export-coordinates";
import type { DesignLayer } from "./types";

export interface MockupPrintAreaRectDebug {
  widthPx: number;
  heightPx: number;
  leftPx: number;
  topPx: number;
}

export interface MockupObjectMappingDebug {
  layerId: string;
  label: string;
  widthCm: number;
  heightCm: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MockupOverlayDebugReport {
  side: Side;
  exportScale: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  printAreaCm: PrintAreaCmBounds;
  designerPrintArea: MockupPrintAreaRectDebug;
  mockupExportPrintArea: MockupPrintAreaRectDebug;
  objects: MockupObjectMappingDebug[];
}

function layerLabel(layer: DesignLayer): string {
  if (layer.type === "text") {
    const text = layer.text.trim();
    return text.length > 24 ? `${text.slice(0, 24)}…` : text || "文字";
  }
  if (layer.type === "shape") return layer.shapeKind;
  return layer.image.fileName || "圖片";
}

function toRectDebug(rect: MockupContainerRectPx): MockupPrintAreaRectDebug {
  return {
    widthPx: Math.round(rect.width * 100) / 100,
    heightPx: Math.round(rect.height * 100) / 100,
    leftPx: Math.round(rect.left * 100) / 100,
    topPx: Math.round(rect.top * 100) / 100,
  };
}

/** Designer Preview 基準（1024×1536）上的印刷區像素外框 */
export function getDesignerPreviewPrintAreaRectPx(
  side: Side,
): MockupContainerRectPx {
  return getFlatMockupPrintAreaRectPx(
    MOCKUP_FLAT_CONTAINER.width,
    MOCKUP_FLAT_CONTAINER.height,
    side,
  );
}

/** 匯出畫布上與 Designer Preview 相同視覺比例的印刷區外框 */
export function getMockupExportPrintAreaRectPx(
  side: Side,
  exportScale: number,
): MockupContainerRectPx {
  const base = getDesignerPreviewPrintAreaRectPx(side);
  return {
    left: base.left * exportScale,
    top: base.top * exportScale,
    width: base.width * exportScale,
    height: base.height * exportScale,
  };
}

export function buildMockupOverlayDebugReport(
  layers: DesignLayer[],
  side: Side,
  exportScale: number,
): MockupOverlayDebugReport {
  const canvasWidthPx = MOCKUP_FLAT_CONTAINER.width * exportScale;
  const canvasHeightPx = MOCKUP_FLAT_CONTAINER.height * exportScale;
  const printAreaCm = getDesignerPrintAreaCmBounds(side);
  const designerPrintArea = getDesignerPreviewPrintAreaRectPx(side);
  const mockupExportPrintArea = getMockupExportPrintAreaRectPx(side, exportScale);

  const objects: MockupObjectMappingDebug[] = [];
  for (const layer of layers) {
    if (!layer.visible) continue;
    if (layer.type === "text" && layer.text.trim().length === 0) continue;

    const cmRect = getLayerExportCmRect(layer);
    const mapped = mapLayerCmRectToMockupPx(
      cmRect,
      printAreaCm,
      mockupExportPrintArea,
    );

    objects.push({
      layerId: layer.id,
      label: layerLabel(layer),
      widthCm: cmRect.width_cm,
      heightCm: cmRect.height_cm,
      x: Math.round((mapped.centerX - mapped.width / 2) * 100) / 100,
      y: Math.round((mapped.centerY - mapped.height / 2) * 100) / 100,
      width: Math.round(mapped.width * 100) / 100,
      height: Math.round(mapped.height * 100) / 100,
    });
  }

  return {
    side,
    exportScale,
    canvasWidthPx,
    canvasHeightPx,
    printAreaCm,
    designerPrintArea: toRectDebug(designerPrintArea),
    mockupExportPrintArea: toRectDebug(mockupExportPrintArea),
    objects,
  };
}

export function logMockupOverlayDebugReport(report: MockupOverlayDebugReport): void {
  if (typeof console === "undefined") return;

  console.group(`[Mockup Overlay Debug] ${report.side}`);
  console.log("Designer Print Area:", {
    width_px: report.designerPrintArea.widthPx,
    height_px: report.designerPrintArea.heightPx,
    left_px: report.designerPrintArea.leftPx,
    top_px: report.designerPrintArea.topPx,
  });
  console.log("Mockup Export Print Area:", {
    width_px: report.mockupExportPrintArea.widthPx,
    height_px: report.mockupExportPrintArea.heightPx,
    left_px: report.mockupExportPrintArea.leftPx,
    top_px: report.mockupExportPrintArea.topPx,
  });
  console.log("Canvas:", {
    width_px: report.canvasWidthPx,
    height_px: report.canvasHeightPx,
    exportScale: report.exportScale,
  });

  for (const obj of report.objects) {
    console.log("Object:", {
      label: obj.label,
      width_cm: obj.widthCm,
      height_cm: obj.heightCm,
      mapped: {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
      },
    });
  }
  console.groupEnd();
}
