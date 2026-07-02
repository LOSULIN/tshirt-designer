/**
 * 印刷輸出系統（Export Pipeline）
 * - 座標：Designer 儲存之 width_cm / height_cm / x_cm / y_cm
 * - 換算：與 Preview 相同之 print area 比例 → 實際印刷尺寸 px
 * - 輸出：面別印刷區 @ 300 DPI · PNG / PDF
 */

import type { Side } from "./constants";
import {
  legacyCmFieldToMm,
  MM_TO_EXPORT_PX,
  PRODUCTION_DPI,
} from "./coordinates/production";
import {
  getExportCanvasSpec,
  type ExportLayerRectPx,
} from "./export-coordinates";
import {
  exportCanvasSizeToTargetRect,
  mapLayerCmRect,
  resolveLayerCmRect,
} from "./coordinate-runtime";
import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import { drawImageArtworkOnCanvas } from "./image-artwork-render";
import { embedPngDpi } from "./png-dpi";
import { sortLayersByZIndex } from "./layers";
import { drawRichTextOnCanvas, getRichTextRenderMetrics } from "./text-style";
import { drawShapeOnCanvas } from "./shape-layer";
import { ensureTextFontsLoaded } from "./text-layer";
import type { DesignLayer, ShapeDesignLayer, TextDesignLayer } from "./types";

export const PRINT_EXPORT_DPI = PRODUCTION_DPI;

/** 1 legacy cm 欄位（=10mm）→ px @ 300 DPI */
export const CM_TO_EXPORT_PX = MM_TO_EXPORT_PX * 10;

export function cmToExportPx(cm: number): number {
  return Math.round(legacyCmFieldToMm(cm) * MM_TO_EXPORT_PX);
}

export function exportPxToCm(px: number): number {
  return px / CM_TO_EXPORT_PX;
}

export interface PrintExportDimensionsPx {
  widthPx: number;
  heightPx: number;
}

export interface PrintExportSpec {
  widthCm: number;
  heightCm: number;
  dpi: number;
  widthPx: number;
  heightPx: number;
  cmToPx: number;
  background: "transparent";
}

export function getPrintExportDimensionsPx(
  side: Side = "front",
  size: string = "M",
): PrintExportDimensionsPx {
  const spec = getExportCanvasSpec(side, size);
  return { widthPx: spec.widthPx, heightPx: spec.heightPx };
}

export function getPrintExportSpec(
  side: Side = "front",
  size: string = "M",
): PrintExportSpec {
  const canvasSpec = getExportCanvasSpec(side, size);
  return {
    widthCm: canvasSpec.printAreaCm.width,
    heightCm: canvasSpec.printAreaCm.height,
    dpi: canvasSpec.dpi,
    widthPx: canvasSpec.widthPx,
    heightPx: canvasSpec.heightPx,
    cmToPx: canvasSpec.widthPx / canvasSpec.printAreaCm.width,
    background: "transparent",
  };
}

function mapLayerRectToExportPx(
  cmRect: LayerCmRect,
  printAreaCm: PrintAreaCmBounds,
  canvasSize: { widthPx: number; heightPx: number },
): ExportLayerRectPx {
  const mapped = mapLayerCmRect({
    layerRect: cmRect,
    printArea: printAreaCm,
    targetRect: exportCanvasSizeToTargetRect(canvasSize),
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法載入圖片"));
    img.src = src;
  });
}

function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: "image" }>,
  img: HTMLImageElement,
  exportRect: ExportLayerRectPx,
) {
  const centerX = exportRect.x + exportRect.width / 2;
  const centerY = exportRect.y + exportRect.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  drawImageArtworkOnCanvas(
    ctx,
    img,
    layer.image,
    img.naturalWidth,
    img.naturalHeight,
    -exportRect.width / 2,
    -exportRect.height / 2,
    exportRect.width,
    exportRect.height,
  );
  ctx.restore();
}

export interface RenderPrintExportOptions {
  /** 與 Designer / Preview 一致之 Garment 印刷區 */
  side?: Side;
  size?: string;
}

/**
 * 將 cm-based design layers 渲染為可送印 PNG（透明背景）。
 */
export async function renderPrintExportPng(
  layers: DesignLayer[],
  options?: RenderPrintExportOptions,
): Promise<Blob> {
  const side = options?.side ?? "front";
  const size = options?.size ?? "M";
  const canvasSpec = getExportCanvasSpec(side, size);
  const { widthPx, heightPx } = canvasSpec;
  const printAreaCm = canvasSpec.printAreaCm;

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立匯出畫布");

  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);

  ctx.clearRect(0, 0, widthPx, heightPx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, widthPx, heightPx);
  ctx.clip();

  const textLayers = visibleLayers.filter(
    (l): l is TextDesignLayer => l.type === "text",
  );
  const imageCache = new Map<string, HTMLImageElement>();
  const canvasSize = { widthPx, heightPx };

  if (textLayers.length > 0) {
    await ensureTextFontsLoaded(
      textLayers.map((t) => ({ ...t, type: "text" as const })),
      {
        getRenderFontSize_cm: (layer) => {
          const rect = resolveLayerCmRect(layer, { purpose: "export" });
          const exportRect = mapLayerRectToExportPx(
            rect,
            printAreaCm,
            canvasSize,
          );
          return getRichTextRenderMetrics(
            layer,
            rect,
            exportRect.pxPerCmX,
          ).fontSize_cm;
        },
      },
    );
  }

  for (const layer of visibleLayers) {
    const cmRect = resolveLayerCmRect(layer, { purpose: "export" });
    const exportRect = mapLayerRectToExportPx(cmRect, printAreaCm, canvasSize);

    if (layer.type === "image") {
      let img = imageCache.get(layer.id);
      if (!img) {
        img = await loadImage(layer.image.originalUrl);
        imageCache.set(layer.id, img);
      }
      drawImageLayer(ctx, layer, img, exportRect);
    } else if (layer.type === "shape") {
      drawShapeOnCanvas(
        ctx,
        layer as ShapeDesignLayer,
        exportRect.pxPerCmX,
        cmRect,
      );
    } else if (layer.text.trim().length > 0) {
      drawRichTextOnCanvas(
        ctx,
        layer,
        exportRect.pxPerCmX,
        cmRect,
        exportRect.pxPerCmY,
      );
    }
  }

  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error("無法匯出 PNG"));
        else resolve(result);
      },
      "image/png",
    );
  });

  return embedPngDpi(blob, PRINT_EXPORT_DPI);
}
