/**
 * Export artifact fingerprint cache — reuse mockup/print PNGs when design is unchanged.
 */

import { DESIGN_GENDERS, DESIGN_SIDES } from "../design-state";
import type { ProofArtifactsInput, ProofOrder } from "../proof-engine/types";
import type {
  DesignLayer,
  DesignLayersByTemplate,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "../types";

const artifactCache = new Map<string, ProofArtifactsInput>();

function sortLayersForFingerprint(layers: DesignLayer[]): DesignLayer[] {
  return [...layers].sort((a, b) => {
    if (a.zIndex !== b.zIndex) {
      return a.zIndex - b.zIndex;
    }
    return a.type.localeCompare(b.type);
  });
}

function serializeImageLayer(layer: ImageDesignLayer) {
  return {
    type: layer.type,
    visible: layer.visible,
    zIndex: layer.zIndex,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm: layer.width_cm,
    height_cm: layer.height_cm,
    scale: layer.scale,
    rotation: layer.rotation,
    keepRatio: layer.keepRatio ?? true,
    originalUrl: layer.image.originalUrl,
    previewUrl: layer.image.previewUrl,
  };
}

function serializeTextLayer(layer: TextDesignLayer) {
  return {
    type: layer.type,
    visible: layer.visible,
    zIndex: layer.zIndex,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm: layer.width_cm,
    height_cm: layer.height_cm,
    scale: layer.scale,
    rotation: layer.rotation,
    keepRatio: layer.keepRatio ?? true,
    text: layer.text,
    fontSize_cm: layer.fontSize_cm,
    fontFamily: layer.fontFamily,
    color: layer.color,
    opacity: layer.opacity,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle ?? "normal",
    letterSpacing_cm: layer.letterSpacing_cm ?? 0,
    lineHeight: layer.lineHeight ?? 1.2,
    textAlign: layer.textAlign ?? "center",
    stroke: layer.stroke ?? null,
    shadow: layer.shadow ?? null,
  };
}

function serializeShapeLayer(layer: ShapeDesignLayer) {
  return {
    type: layer.type,
    visible: layer.visible,
    zIndex: layer.zIndex,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm: layer.width_cm,
    height_cm: layer.height_cm,
    scale: layer.scale,
    rotation: layer.rotation,
    shapeKind: layer.shapeKind,
    fill: layer.fill,
    stroke: layer.stroke,
    strokeWidth_cm: layer.strokeWidth_cm,
    opacity: layer.opacity,
  };
}

function serializeLayer(layer: DesignLayer) {
  switch (layer.type) {
    case "image":
      return serializeImageLayer(layer);
    case "text":
      return serializeTextLayer(layer);
    case "shape":
      return serializeShapeLayer(layer);
  }
}

function serializeLayersByTemplate(
  layersByTemplate: DesignLayersByTemplate,
): Record<string, Record<string, ReturnType<typeof serializeLayer>[]>> {
  const out: Record<string, Record<string, ReturnType<typeof serializeLayer>[]>> =
    {};

  for (const gender of DESIGN_GENDERS) {
    out[gender] = {};
    for (const side of DESIGN_SIDES) {
      out[gender][side] = sortLayersForFingerprint(
        layersByTemplate[gender]?.[side] ?? [],
      ).map(serializeLayer);
    }
  }

  return out;
}

export function computeExportFingerprint(order: ProofOrder): string {
  const payload = {
    gender: order.gender,
    shirtColor: order.shirt_color,
    size: order.size,
    layersByTemplate: serializeLayersByTemplate(order.layers_by_template),
  };

  return JSON.stringify(payload);
}

export function getCachedArtifacts(
  fingerprint: string,
): ProofArtifactsInput | undefined {
  return artifactCache.get(fingerprint);
}

export function setCachedArtifacts(
  fingerprint: string,
  artifacts: ProofArtifactsInput,
): void {
  artifactCache.set(fingerprint, artifacts);
}

export function clearArtifactCache(): void {
  artifactCache.clear();
}
