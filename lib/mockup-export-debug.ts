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
  layerType: DesignLayer["type"];
  label: string;
  keepRatio?: boolean;
  widthCm: number;
  heightCm: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pxPerCmX: number;
  pxPerCmY: number;
  widthCmToPrintAreaRatio: number;
  mappedWidthToPrintRectRatio: number;
}

export interface MockupLayerCmPxMappingLog {
  layerType: DesignLayer["type"];
  layerId: string;
  label: string;
  keepRatio?: boolean;
  printAreaCm: PrintAreaCmBounds;
  printRect: MockupContainerRectPx;
  cmRect: ReturnType<typeof getLayerExportCmRect>;
  mapped: ReturnType<typeof mapLayerCmRectToMockupPx>;
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
  size: string = "M",
): MockupOverlayDebugReport {
  const canvasWidthPx = MOCKUP_FLAT_CONTAINER.width * exportScale;
  const canvasHeightPx = MOCKUP_FLAT_CONTAINER.height * exportScale;
  const printAreaCm = getDesignerPrintAreaCmBounds(side, size);
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
      layerType: layer.type,
      label: layerLabel(layer),
      keepRatio: layer.type === "text" ? layer.keepRatio : layer.type === "image" ? layer.keepRatio : undefined,
      widthCm: cmRect.width_cm,
      heightCm: cmRect.height_cm,
      x: Math.round((mapped.centerX - mapped.width / 2) * 100) / 100,
      y: Math.round((mapped.centerY - mapped.height / 2) * 100) / 100,
      width: Math.round(mapped.width * 100) / 100,
      height: Math.round(mapped.height * 100) / 100,
      pxPerCmX: Math.round(mapped.pxPerCmX * 1000) / 1000,
      pxPerCmY: Math.round(mapped.pxPerCmY * 1000) / 1000,
      widthCmToPrintAreaRatio:
        Math.round((cmRect.width_cm / printAreaCm.width) * 10000) / 10000,
      mappedWidthToPrintRectRatio:
        Math.round((mapped.width / mockupExportPrintArea.width) * 10000) /
        10000,
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
  console.log("Print Area (cm):", {
    width_cm: report.printAreaCm.width,
    height_cm: report.printAreaCm.height,
  });
  console.log("pxPerCm (export print rect):", {
    x:
      Math.round(
        (report.mockupExportPrintArea.widthPx / report.printAreaCm.width) *
          1000,
      ) / 1000,
    y:
      Math.round(
        (report.mockupExportPrintArea.heightPx / report.printAreaCm.height) *
          1000,
      ) / 1000,
  });

  for (const obj of report.objects) {
    console.log("Object:", {
      type: obj.layerType,
      label: obj.label,
      keepRatio: obj.keepRatio,
      cmRect: {
        width_cm: obj.widthCm,
        height_cm: obj.heightCm,
      },
      mapped: {
        x: obj.x,
        y: obj.y,
        width_px: obj.width,
        height_px: obj.height,
      },
      pxPerCm: { x: obj.pxPerCmX, y: obj.pxPerCmY },
      ratios: {
        width_cm_over_printAreaWidth: obj.widthCmToPrintAreaRatio,
        mappedWidth_px_over_printRectWidth: obj.mappedWidthToPrintRectRatio,
        ratiosMatch:
          Math.abs(
            obj.widthCmToPrintAreaRatio - obj.mappedWidthToPrintRectRatio,
          ) < 0.001,
      },
    });
  }
  console.groupEnd();
}

/** Mockup draw 前：比對 cm 外框與 px 映射（image / text 共用） */
export function logMockupLayerCmPxMapping(log: MockupLayerCmPxMappingLog): void {
  if (typeof console === "undefined") return;

  const { printAreaCm, printRect, cmRect, mapped } = log;
  const widthCmToPrintRatio = cmRect.width_cm / printAreaCm.width;
  const mappedWidthToPrintRectRatio = mapped.width / printRect.width;
  const pxPerCmFromMapped = mapped.width / cmRect.width_cm;

  console.log("[Mockup Debug Rect]", {
    layerType: log.layerType,
    label: log.label,
    keepRatio: log.keepRatio,
    cm: {
      width_cm: roundDebug(cmRect.width_cm),
      height_cm: roundDebug(cmRect.height_cm),
    },
    px: {
      "mapped.width": roundDebug(mapped.width),
      "mapped.height": roundDebug(mapped.height),
    },
    pxPerCmX: roundDebug(mapped.pxPerCmX),
    pxPerCmY: roundDebug(mapped.pxPerCmY),
  });

  console.log("[Mockup cm→px]", {
    type: log.layerType,
    label: log.label,
    keepRatio: log.keepRatio,
    printAreaCm: {
      width_cm: printAreaCm.width,
      height_cm: printAreaCm.height,
    },
    printRect: {
      width_px: Math.round(printRect.width * 100) / 100,
      height_px: Math.round(printRect.height * 100) / 100,
    },
    getLayerExportCmRect: {
      width_cm: cmRect.width_cm,
      height_cm: cmRect.height_cm,
      x_cm: cmRect.x_cm,
      y_cm: cmRect.y_cm,
    },
    mapped: {
      width_px: Math.round(mapped.width * 100) / 100,
      height_px: Math.round(mapped.height * 100) / 100,
      pxPerCmX: Math.round(mapped.pxPerCmX * 1000) / 1000,
      pxPerCmY: Math.round(mapped.pxPerCmY * 1000) / 1000,
    },
    verify: {
      "10cm→px width (if 10cm)":
        Math.round(10 * mapped.pxPerCmX * 100) / 100,
      width_cm_to_printArea_ratio: Math.round(widthCmToPrintRatio * 10000) / 10000,
      mappedWidth_to_printRect_ratio:
        Math.round(mappedWidthToPrintRectRatio * 10000) / 10000,
      ratiosMatch:
        Math.abs(widthCmToPrintRatio - mappedWidthToPrintRectRatio) < 0.001,
      pxPerCm_matches_mapped:
        Math.abs(pxPerCmFromMapped - mapped.pxPerCmX) < 0.001,
    },
  });
}

function roundDebug(value: number): number {
  return Math.round(value * 1000) / 1000;
}
