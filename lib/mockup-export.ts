/**
 * Mockup Preview 輸出 — 模板 + cm-based elements overlay（非 DOM 截圖）。
 */

import type { ShirtColor, Side } from "./constants";
import { getLayersForCanvasRender } from "./layer-system";
import {
  getFlatMockupPrintAreaRectPx,
  MOCKUP_EXPORT_SCALE,
  MOCKUP_FLAT_CONTAINER,
  productionRectToMockupCanvasPx,
} from "./coordinates/mockup";
import { readLayerProductionRectMm } from "./design-cm";
import {
  getProductionPrintAreaCm,
  getProductionPrintAreaMm,
  legacyCmFieldToMm,
} from "./coordinates/production";
import { getLayerInspectorCmRect } from "./design-inspector";
import { getAdultTshirtTemplateSrc } from "./shirt-template";
import { drawRichTextOnCanvas } from "./text-style";
import { drawShapeOnCanvas } from "./shape-layer";
import { ensureTextFontsLoaded } from "./text-layer";
import type { DesignLayer, ShapeDesignLayer, TextDesignLayer } from "./types";

export { MOCKUP_EXPORT_SCALE };

export type MockupContainerRect = ReturnType<
  typeof getFlatMockupPrintAreaRectPx
>;

/** @deprecated 請用 getFlatMockupPrintAreaRectPx */
export function getPrintAreaRectInContainerPx(
  containerWidth: number,
  containerHeight: number,
  side: Side = "front",
): MockupContainerRect {
  return getFlatMockupPrintAreaRectPx(containerWidth, containerHeight, side);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法載入模板圖片"));
    img.src = src;
  });
}

function drawImageLayerOnMockup(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: "image" }>,
  img: HTMLImageElement,
  printRect: MockupContainerRect,
) {
  const rectMm = readLayerProductionRectMm(layer);
  const { centerX, centerY, width: drawW, height: drawH } =
    productionRectToMockupCanvasPx(rectMm, printRect);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function drawDesignLayerOnMockup(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  printRect: MockupContainerRect,
) {
  const printCm = getProductionPrintAreaCm();
  const pxPerCm = printRect.width / printCm.width;
  const rect = getLayerInspectorCmRect(layer);

  ctx.save();
  ctx.translate(printRect.left, printRect.top);
  if (layer.type === "shape") {
    drawShapeOnCanvas(ctx, layer as ShapeDesignLayer, pxPerCm, rect);
  } else if (layer.type === "text" && layer.text.trim().length > 0) {
    drawRichTextOnCanvas(ctx, layer, pxPerCm, rect);
  }
  ctx.restore();
}

export function buildMockupExportFileName(side: Side): string {
  return `mockup-${side}-preview.png`;
}

/**
 * 渲染 Mockup Preview PNG：T-shirt 模板 + 設計元素（依 cm 比例疊加）。
 */
export async function renderMockupPreviewPng(params: {
  shirtColor: ShirtColor;
  side: Side;
  layers: DesignLayer[];
  scale?: number;
}): Promise<Blob> {
  const { shirtColor, side, layers, scale = MOCKUP_EXPORT_SCALE } = params;
  const canvasWidth = MOCKUP_FLAT_CONTAINER.width * scale;
  const canvasHeight = MOCKUP_FLAT_CONTAINER.height * scale;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立 mockup 畫布");

  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const templateSrc = getAdultTshirtTemplateSrc(shirtColor, side);
  try {
    const template = await loadImage(templateSrc);
    ctx.drawImage(template, 0, 0, canvasWidth, canvasHeight);
  } catch {
    ctx.fillStyle = "#e4e4e7";
    ctx.fillRect(canvasWidth * 0.15, canvasHeight * 0.1, canvasWidth * 0.7, canvasHeight * 0.8);
  }

  const printRect = getFlatMockupPrintAreaRectPx(
    canvasWidth,
    canvasHeight,
    side,
  );
  const visibleLayers = getLayersForCanvasRender(layers).filter((l) => l.visible);

  const textLayers = visibleLayers.filter(
    (l): l is TextDesignLayer => l.type === "text",
  );
  if (textLayers.length > 0) {
    await ensureTextFontsLoaded(
      textLayers.map((t) => ({ ...t, type: "text" as const })),
    );
  }

  const imageCache = new Map<string, HTMLImageElement>();
  for (const layer of visibleLayers) {
    if (layer.type === "image") {
      let img = imageCache.get(layer.id);
      if (!img) {
        img = await loadImage(layer.image.previewUrl || layer.image.originalUrl);
        imageCache.set(layer.id, img);
      }
      drawImageLayerOnMockup(ctx, layer, img, printRect);
    } else if (layer.type === "text" || layer.type === "shape") {
      drawDesignLayerOnMockup(ctx, layer, printRect);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("無法匯出 mockup PNG"));
        else resolve(blob);
      },
      "image/png",
    );
  });
}
