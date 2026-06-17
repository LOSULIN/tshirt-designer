import { normalizeRichTextFields, normalizeTextDesignLayer } from "./text-style";
import { normalizeShapeDesignLayer } from "./shape-layer";
import type { DesignLayer, TextDesignLayer } from "./types";

export function normalizeDesignLayer(layer: DesignLayer): DesignLayer {
  if (layer.type === "text") {
    return normalizeTextDesignLayer(layer as TextDesignLayer);
  }
  if (layer.type === "shape") {
    return normalizeShapeDesignLayer(layer);
  }
  return layer;
}

export function normalizeDesignLayers(layers: DesignLayer[]): DesignLayer[] {
  return layers.map(normalizeDesignLayer);
}

export { normalizeRichTextFields, normalizeTextDesignLayer };
