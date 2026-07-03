/**
 * 匯出前尺寸除錯資訊 — 確認 cm → px 換算與 Designer 一致。
 */

import type { Side } from "./constants";
import {
  getExportCanvasSpec,
  getLayerExportGarmentCmRect,
  mapLayerToExportPx,
} from "./export-coordinates";
import { sortLayersByZIndex } from "./layers";
import type { DesignLayer } from "./types";

export interface ExportObjectDebugEntry {
  layerId: string;
  layerType: DesignLayer["type"];
  label: string;
  widthCm: number;
  heightCm: number;
  xCm: number;
  yCm: number;
  rotation: number;
  exportWidthPx: number;
  exportHeightPx: number;
}

export interface ExportDebugReport {
  side: Side;
  printAreaWidthCm: number;
  printAreaHeightCm: number;
  exportWidthPx: number;
  exportHeightPx: number;
  dpi: number;
  objects: ExportObjectDebugEntry[];
}

function layerLabel(layer: DesignLayer): string {
  if (layer.type === "text") {
    const text = layer.text.trim();
    return text.length > 24 ? `${text.slice(0, 24)}…` : text || "文字";
  }
  if (layer.type === "shape") {
    return layer.shapeKind;
  }
  return layer.image.fileName || "圖片";
}

export function buildExportDebugReport(
  layers: DesignLayer[],
  side: Side,
  size: string = "M",
): ExportDebugReport {
  const spec = getExportCanvasSpec(side, size);
  const canvasSize = { widthPx: spec.widthPx, heightPx: spec.heightPx };
  const objects: ExportObjectDebugEntry[] = [];

  for (const layer of sortLayersByZIndex(layers)) {
    if (!layer.visible) continue;
    if (layer.type === "text" && layer.text.trim().length === 0) continue;

    const cmRect = getLayerExportGarmentCmRect(layer, side, size);
    const exportRect = mapLayerToExportPx(
      layer,
      spec.printAreaCm,
      canvasSize,
      side,
      size,
    );

    objects.push({
      layerId: layer.id,
      layerType: layer.type,
      label: layerLabel(layer),
      widthCm: cmRect.width_cm,
      heightCm: cmRect.height_cm,
      xCm: cmRect.x_cm,
      yCm: cmRect.y_cm,
      rotation: layer.rotation,
      exportWidthPx: Math.round(exportRect.width),
      exportHeightPx: Math.round(exportRect.height),
    });
  }

  return {
    side,
    printAreaWidthCm: spec.printAreaCm.width,
    printAreaHeightCm: spec.printAreaCm.height,
    exportWidthPx: spec.widthPx,
    exportHeightPx: spec.heightPx,
    dpi: spec.dpi,
    objects,
  };
}

export function formatExportDebugReport(report: ExportDebugReport): string {
  const lines: string[] = [
    `Export canvas: ${report.printAreaWidthCm}×${report.printAreaHeightCm} cm → ${report.exportWidthPx}×${report.exportHeightPx} px @ ${report.dpi} DPI`,
  ];

  for (const obj of report.objects) {
    lines.push(
      `Object (${obj.label}): ${obj.widthCm}×${obj.heightCm} cm @ (${obj.xCm}, ${obj.yCm}) → ${obj.exportWidthPx}×${obj.exportHeightPx} px`,
    );
  }

  return lines.join("\n");
}

export function logExportDebugReport(report: ExportDebugReport): void {
  if (typeof console === "undefined") return;
  console.group("[Export Debug]");
  console.log(formatExportDebugReport(report));
  for (const obj of report.objects) {
    console.log("Object:", {
      label: obj.label,
      widthCm: obj.widthCm,
      heightCm: obj.heightCm,
      xCm: obj.xCm,
      yCm: obj.yCm,
      rotation: obj.rotation,
      exportWidthPx: obj.exportWidthPx,
      exportHeightPx: obj.exportHeightPx,
    });
  }
  console.log("Export:", {
    widthPx: report.exportWidthPx,
    heightPx: report.exportHeightPx,
    dpi: report.dpi,
  });
  console.groupEnd();
}
