import type {
  DesignConfig,
  DesignLayer,
  ImageDesignLayer,
  LayerMeta,
  TextDesignLayer,
  TextLayer,
  UploadedDesignImage,
} from "./types";
import { nanoid } from "nanoid";

export function sortLayersByZIndex(layers: DesignLayer[]): DesignLayer[] {
  return [...layers].sort((a, b) => a.zIndex - b.zIndex);
}

export function sortLayersForPanel(layers: DesignLayer[]): DesignLayer[] {
  return [...layers].sort((a, b) => b.zIndex - a.zIndex);
}

export function getNextZIndex(layers: DesignLayer[]): number {
  if (layers.length === 0) return 0;
  return Math.max(...layers.map((l) => l.zIndex)) + 1;
}

export function countLayersByType(layers: DesignLayer[], type: "image" | "text") {
  return layers.filter((l) => l.type === type).length;
}

export function defaultLayerName(layers: DesignLayer[], type: "image" | "text") {
  const n = countLayersByType(layers, type) + 1;
  return type === "image" ? `Image ${n}` : `Text ${n}`;
}

export function reindexLayers(ordered: DesignLayer[]): DesignLayer[] {
  return ordered.map((layer, index) => ({ ...layer, zIndex: index }));
}

export function moveLayerZIndex(
  layers: DesignLayer[],
  layerId: string,
  action: "top" | "up" | "down" | "bottom",
): DesignLayer[] {
  const sorted = sortLayersByZIndex(layers);
  const index = sorted.findIndex((l) => l.id === layerId);
  if (index < 0) return layers;

  const next = [...sorted];
  const [item] = next.splice(index, 1);

  let insertAt = index;
  switch (action) {
    case "top":
      insertAt = next.length;
      break;
    case "up":
      insertAt = Math.min(index + 1, next.length);
      break;
    case "down":
      insertAt = Math.max(index - 1, 0);
      break;
    case "bottom":
      insertAt = 0;
      break;
  }

  next.splice(insertAt, 0, item);
  return reindexLayers(next);
}

export function duplicateTextLayer(
  layers: DesignLayer[],
  layerId: string,
): TextDesignLayer | null {
  const source = layers.find(
    (l): l is TextDesignLayer => l.id === layerId && l.type === "text",
  );
  if (!source) return null;

  return {
    ...source,
    id: nanoid(),
    name: `${source.name} 複本`,
    zIndex: getNextZIndex(layers),
    x: source.x + 12,
    y: source.y + 12,
  };
}

export async function duplicateImageLayerAsync(
  layers: DesignLayer[],
  layerId: string,
): Promise<DesignLayer | null> {
  const source = layers.find((l) => l.id === layerId && l.type === "image");
  if (!source || source.type !== "image") return null;

  const previewBlob = await fetch(source.image.previewUrl).then((r) => r.blob());
  const id = nanoid();
  const image: UploadedDesignImage = {
    ...source.image,
    originalUrl: URL.createObjectURL(source.image.originalBlob),
    previewUrl: URL.createObjectURL(previewBlob),
  };

  return {
    ...source,
    id,
    name: `${source.name} 複本`,
    zIndex: getNextZIndex(layers),
    x: source.x + 12,
    y: source.y + 12,
    image,
  };
}

export function createImageLayer(
  layers: DesignLayer[],
  image: UploadedDesignImage,
  placement: { x: number; y: number; width: number; height: number },
): ImageDesignLayer {
  return {
    id: nanoid(),
    name: defaultLayerName(layers, "image"),
    type: "image",
    visible: true,
    locked: false,
    zIndex: getNextZIndex(layers),
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
    scale: 1,
    rotation: 0,
    image,
  };
}

export function textLayerToDesignLayer(
  layer: TextLayer,
  meta?: Partial<LayerMeta>,
): TextDesignLayer {
  return {
    id: layer.id,
    name: meta?.name ?? "Text",
    type: "text",
    visible: meta?.visible ?? true,
    locked: meta?.locked ?? false,
    zIndex: meta?.zIndex ?? 0,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    scale: layer.scale,
    rotation: layer.rotation,
    text: layer.text,
    fontSize: layer.fontSize,
    fontFamily: layer.fontFamily,
    color: layer.color,
    opacity: layer.opacity,
    fontWeight: layer.fontWeight,
  };
}

export function migrateLegacyToLayers(
  config: DesignConfig,
  image: UploadedDesignImage | null,
  textLayers: TextLayer[],
): DesignLayer[] {
  const layers: DesignLayer[] = [];
  let z = 0;

  if (image) {
    layers.push({
      id: nanoid(),
      name: "Image 1",
      type: "image",
      visible: true,
      locked: false,
      zIndex: z++,
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      scale: config.scale,
      rotation: config.rotation,
      image,
    });
  }

  for (const t of textLayers) {
    layers.push(
      textLayerToDesignLayer(t, {
        zIndex: z++,
        name: defaultLayerName(layers, "text"),
      }),
    );
  }

  return layers;
}

export function getTextLayersFromDesign(layers: DesignLayer[]): TextDesignLayer[] {
  return layers.filter((l): l is TextDesignLayer => l.type === "text");
}

export function reorderLayersByDrag(
  layers: DesignLayer[],
  dragId: string,
  targetId: string,
): DesignLayer[] {
  if (dragId === targetId) return layers;
  const sorted = sortLayersForPanel(layers);
  const from = sorted.findIndex((l) => l.id === dragId);
  const to = sorted.findIndex((l) => l.id === targetId);
  if (from < 0 || to < 0) return layers;

  const next = [...sorted];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return reindexLayers([...next].reverse());
}

export function revokeLayerAssets(layer: DesignLayer) {
  if (layer.type === "image") {
    URL.revokeObjectURL(layer.image.originalUrl);
    URL.revokeObjectURL(layer.image.previewUrl);
  }
}

/** 寫入 localStorage 用（不含 blob / object URL） */
export function layersToDraftSnapshot(layers: DesignLayer[]): DesignLayer[] {
  return layers.map((layer) => {
    if (layer.type !== "image") return layer;
    return {
      ...layer,
      image: {
        originalBlob: new Blob(),
        originalUrl: "",
        previewUrl: "",
        fileName: layer.image.fileName,
        mimeType: layer.image.mimeType,
        previewWidth: layer.image.previewWidth,
        previewHeight: layer.image.previewHeight,
        naturalWidth: layer.image.naturalWidth,
        naturalHeight: layer.image.naturalHeight,
      },
    };
  });
}

export function serializeLayerMeta(layer: DesignLayer) {
  return {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    visible: layer.visible,
    locked: layer.locked,
    zIndex: layer.zIndex,
  };
}
