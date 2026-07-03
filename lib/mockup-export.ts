/**
 * Mockup Preview 輸出 — 模板 + cm-based elements overlay（非 DOM 截圖）。
 * 座標與 Designer / Flat Preview 相同（designer print area）。
 * 輸出 PNG 保留透明背景（alpha）；預覽區底色僅由 UI CSS 提供。
 */

import type { ShirtColor, Side } from "./constants";
import { getLayersForCanvasRender } from "./layer-system";
import {
  getFlatMockupPrintAreaRectPx,
  MOCKUP_EXPORT_SCALE,
  MOCKUP_FLAT_CONTAINER,
} from "./coordinates/mockup";
import {
  mapLayerCmRect,
  mockupPrintRectToTargetRect,
  resolvePrintAreaCm,
} from "./coordinate-runtime";
import { resolveExportGarmentLayerCmRect } from "./export-runtime";
import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import {
  buildMockupOverlayDebugReport,
  getMockupExportPrintAreaRectPx,
  logMockupLayerCmPxMapping,
  logMockupOverlayDebugReport,
} from "./mockup-export-debug";
import { drawImageArtworkOnCanvas } from "./image-artwork-render";
import { getAdultTshirtTemplateSrc } from "./shirt-template";
import { drawRichTextOnCanvas, getRichTextRenderMetrics, serializeCanvasTransform } from "./text-style";
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

function mapLayerRectToMockupPx(
  cmRect: LayerCmRect,
  printAreaCm: PrintAreaCmBounds,
  printRect: MockupContainerRect,
) {
  return mapLayerCmRect({
    layerRect: cmRect,
    printArea: printAreaCm,
    targetRect: mockupPrintRectToTargetRect(printRect),
  });
}

function logAndMapLayerToMockupPx(
  layer: DesignLayer,
  side: Side,
  printRect: MockupContainerRect,
  size: string,
) {
  const printAreaCm = resolvePrintAreaCm({ runtime: "mockup", side, size });
  const cmRect = resolveExportGarmentLayerCmRect(layer, side, size);
  const mapped = mapLayerRectToMockupPx(cmRect, printAreaCm, printRect);

  logMockupLayerCmPxMapping({
    layerType: layer.type,
    layerId: layer.id,
    label:
      layer.type === "text"
        ? layer.text.trim() || "文字"
        : layer.type === "image"
          ? layer.image.fileName || "圖片"
          : layer.shapeKind,
    keepRatio:
      layer.type === "text" || layer.type === "image"
        ? layer.keepRatio
        : undefined,
    printAreaCm,
    printRect,
    cmRect,
    mapped,
  });

  return { printAreaCm, cmRect, mapped };
}

function drawImageLayerOnMockup(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: "image" }>,
  img: HTMLImageElement,
  printRect: MockupContainerRect,
  side: Side,
  size: string,
) {
  const { mapped } = logAndMapLayerToMockupPx(layer, side, printRect, size);

  ctx.save();
  ctx.translate(mapped.centerX, mapped.centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  drawImageArtworkOnCanvas(
    ctx,
    img,
    layer.image,
    img.naturalWidth,
    img.naturalHeight,
    -mapped.width / 2,
    -mapped.height / 2,
    mapped.width,
    mapped.height,
  );
  ctx.restore();
}

function drawTextLayerOnMockup(
  ctx: CanvasRenderingContext2D,
  layer: TextDesignLayer,
  printRect: MockupContainerRect,
  side: Side,
  size: string,
) {
  const { cmRect, mapped } = logAndMapLayerToMockupPx(
    layer,
    side,
    printRect,
    size,
  );

  const localRect = {
    x_cm: -cmRect.width_cm / 2,
    y_cm: -cmRect.height_cm / 2,
    width_cm: cmRect.width_cm,
    height_cm: cmRect.height_cm,
  };

  ctx.save();
  ctx.translate(mapped.centerX, mapped.centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  if (typeof console !== "undefined") {
    console.log("[drawRichTextOnCanvas pre-call]", {
      layerId: layer.id,
      text: layer.text,
      rect: localRect,
      pxPerCm: mapped.pxPerCmX,
      pxPerCmY: mapped.pxPerCmY,
      placementRect: {
        width_cm: cmRect.width_cm,
        height_cm: cmRect.height_cm,
      },
      cmRect,
      mapped: {
        width: mapped.width,
        height: mapped.height,
        centerX: mapped.centerX,
        centerY: mapped.centerY,
      },
      ctxTransform: serializeCanvasTransform(ctx),
    });
  }
  drawRichTextOnCanvas(
    ctx,
    layer,
    mapped.pxPerCmX,
    localRect,
    mapped.pxPerCmY,
    {
      skipRotation: true,
      placementRect: {
        width_cm: cmRect.width_cm,
        height_cm: cmRect.height_cm,
      },
    },
  );
  ctx.restore();
}

function drawDesignLayerOnMockup(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  printRect: MockupContainerRect,
  side: Side,
  size: string,
) {
  if (layer.type === "shape") {
    const { cmRect, mapped } = logAndMapLayerToMockupPx(
      layer,
      side,
      printRect,
      size,
    );
    ctx.save();
    ctx.translate(printRect.left, printRect.top);
    drawShapeOnCanvas(ctx, layer as ShapeDesignLayer, mapped.pxPerCmX, cmRect);
    ctx.restore();
    return;
  }

  if (layer.type === "text" && layer.text.trim().length > 0) {
    drawTextLayerOnMockup(ctx, layer, printRect, side, size);
  }
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
  size?: string;
}): Promise<Blob> {
  const { shirtColor, side, layers, scale = MOCKUP_EXPORT_SCALE, size = "M" } =
    params;
  const canvasWidth = MOCKUP_FLAT_CONTAINER.width * scale;
  const canvasHeight = MOCKUP_FLAT_CONTAINER.height * scale;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立 mockup 畫布");

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const templateSrc = getAdultTshirtTemplateSrc(shirtColor, side);
  try {
    const template = await loadImage(templateSrc);
    ctx.drawImage(template, 0, 0, canvasWidth, canvasHeight);
  } catch {
    // 模板載入失敗時維持透明畫布，不填入底色
  }

  // 模板隨 exportScale 放大；印刷區須同比例放大（非 getPrintAreaCmToTemplateContainerPct 的固定 px）
  const printRect = getMockupExportPrintAreaRectPx(side, scale);
  const printAreaCm = resolvePrintAreaCm({ runtime: "mockup", side, size });
  const visibleLayers = getLayersForCanvasRender(layers).filter((l) => l.visible);

  const overlayDebug = buildMockupOverlayDebugReport(
    visibleLayers,
    side,
    scale,
    size,
  );
  logMockupOverlayDebugReport(overlayDebug);

  const textLayers = visibleLayers.filter(
    (l): l is TextDesignLayer => l.type === "text",
  );
  if (textLayers.length > 0) {
    await ensureTextFontsLoaded(
      textLayers.map((t) => ({ ...t, type: "text" as const })),
      {
        getRenderFontSize_cm: (layer) => {
          const rect = resolveExportGarmentLayerCmRect(layer, side, size);
          const mapped = mapLayerRectToMockupPx(rect, printAreaCm, printRect);
          return getRichTextRenderMetrics(
            layer,
            rect,
            mapped.pxPerCmX,
          ).fontSize_cm;
        },
      },
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
      drawImageLayerOnMockup(ctx, layer, img, printRect, side, size);
    } else if (layer.type === "text" || layer.type === "shape") {
      drawDesignLayerOnMockup(ctx, layer, printRect, side, size);
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
