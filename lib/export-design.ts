import {
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  PRINT_AREA,
  TEMPLATES,
} from "./constants";
import { sortLayersByZIndex } from "./layers";
import {
  ensureTextFontsLoaded,
  resolveFontFamily,
  serializeTextLayer,
} from "./text-layer";
import type {
  DesignConfig,
  DesignLayer,
  TextDesignLayer,
  UploadedDesignImage,
} from "./types";

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
) {
  const centerX = PRINT_AREA.x + layer.x + (layer.width * layer.scale) / 2;
  const centerY = PRINT_AREA.y + layer.y + (layer.height * layer.scale) / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.scale, layer.scale);
  ctx.drawImage(
    img,
    -layer.width / 2,
    -layer.height / 2,
    layer.width,
    layer.height,
  );
  ctx.restore();
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: TextDesignLayer) {
  const scaledW = layer.width * layer.scale;
  const scaledH = layer.height * layer.scale;
  const centerX = PRINT_AREA.x + layer.x + scaledW / 2;
  const centerY = PRINT_AREA.y + layer.y + scaledH / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.globalAlpha = layer.opacity;
  ctx.fillStyle = layer.color;
  ctx.font = `${layer.fontWeight} ${layer.fontSize * layer.scale}px ${resolveFontFamily(layer.fontFamily)}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(layer.text, 0, 0);
  ctx.restore();
}

export async function renderCompletedDesignPng(
  templateType: DesignConfig["templateType"],
  side: DesignConfig["side"],
  layers: DesignLayer[],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立畫布");

  const templateSrc = TEMPLATES[templateType][side];
  const templateImg = await loadImage(templateSrc);

  ctx.drawImage(templateImg, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  ctx.save();
  ctx.beginPath();
  ctx.rect(PRINT_AREA.x, PRINT_AREA.y, PRINT_AREA.width, PRINT_AREA.height);
  ctx.clip();

  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);
  const textLayers = visibleLayers.filter(
    (l): l is TextDesignLayer => l.type === "text",
  );
  if (textLayers.length > 0) {
    await ensureTextFontsLoaded(
      textLayers.map((t) => ({
        ...t,
        type: "text" as const,
      })),
    );
  }

  const imageCache = new Map<string, HTMLImageElement>();

  for (const layer of visibleLayers) {
    if (layer.type === "image") {
      let img = imageCache.get(layer.id);
      if (!img) {
        img = await loadImage(layer.image.originalUrl);
        imageCache.set(layer.id, img);
      }
      drawImageLayer(ctx, layer, img);
    } else {
      drawTextLayer(ctx, layer);
    }
  }

  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("無法匯出設計圖"));
        else resolve(blob);
      },
      "image/png",
    );
  });
}

/** 向後相容 */
export async function renderCompletedDesignPngLegacy(
  config: DesignConfig,
  designImage: UploadedDesignImage | null,
  textLayers: TextDesignLayer[],
): Promise<Blob> {
  const layers: DesignLayer[] = [];
  if (designImage) {
    layers.push({
      id: "legacy-image",
      name: "Image",
      type: "image",
      visible: true,
      locked: false,
      zIndex: 0,
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      scale: config.scale,
      rotation: config.rotation,
      image: designImage,
    });
  }
  textLayers.forEach((t, i) => {
    layers.push({
      ...t,
      name: `Text ${i + 1}`,
      visible: true,
      locked: false,
      zIndex: layers.length + i,
    });
  });
  return renderCompletedDesignPng(config.templateType, config.side, layers);
}

export function buildDesignJson(
  templateType: DesignConfig["templateType"],
  side: DesignConfig["side"],
  layers: DesignLayer[],
): string {
  const firstImage = layers.find((l) => l.type === "image");

  return JSON.stringify(
    {
      templateType,
      side,
      layers: layers.map((layer) => {
        const meta = {
          id: layer.id,
          name: layer.name,
          type: layer.type,
          visible: layer.visible,
          locked: layer.locked,
          zIndex: layer.zIndex,
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          scale: layer.scale,
          rotation: layer.rotation,
        };
        if (layer.type === "image") {
          return {
            ...meta,
            fileName: layer.image.fileName,
            mimeType: layer.image.mimeType,
          };
        }
        return {
          ...meta,
          text: layer.text,
          fontSize: layer.fontSize,
          fontFamily: layer.fontFamily,
          color: layer.color,
          opacity: layer.opacity,
          fontWeight: layer.fontWeight,
        };
      }),
      x: firstImage?.x ?? 0,
      y: firstImage?.y ?? 0,
      width: firstImage?.width ?? 0,
      height: firstImage?.height ?? 0,
      scale: firstImage?.scale ?? 1,
      rotation: firstImage?.rotation ?? 0,
    },
    null,
    2,
  );
}

export function buildTextJson(layers: DesignLayer[]): string {
  const texts = layers
    .filter((l): l is TextDesignLayer => l.type === "text")
    .map((layer) =>
      serializeTextLayer({
        id: layer.id,
        type: "text",
        text: layer.text,
        fontSize: layer.fontSize,
        fontFamily: layer.fontFamily,
        color: layer.color,
        opacity: layer.opacity,
        fontWeight: layer.fontWeight,
        rotation: layer.rotation,
        scale: layer.scale,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
      }),
    );
  return JSON.stringify(texts, null, 2);
}
