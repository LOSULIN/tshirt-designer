/**
 * Inspector ↔ Canvas 雙向同步 — cm 為唯一真實單位。
 */

import { getLayerEffectiveCmRect } from "./design-cm";
import type { DesignLayer, ImageDesignLayer, TextDesignLayer } from "./types";

export interface TextInspectorValues {
  content: string;
  fontSize_cm: number;
  x_cm: number;
  y_cm: number;
  rotation: number;
}

export interface ImageInspectorValues {
  width_cm: number;
  height_cm: number;
  x_cm: number;
  y_cm: number;
  scale: number;
  rotation: number;
}

export function getTextInspectorValues(layer: TextDesignLayer): TextInspectorValues {
  return {
    content: layer.text,
    fontSize_cm: layer.fontSize_cm * layer.scale,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    rotation: layer.rotation,
  };
}

export function getImageInspectorValues(layer: ImageDesignLayer): ImageInspectorValues {
  const rect = getLayerEffectiveCmRect(layer);
  return {
    width_cm: rect.width_cm,
    height_cm: rect.height_cm,
    x_cm: rect.x_cm,
    y_cm: rect.y_cm,
    scale: layer.scale,
    rotation: layer.rotation,
  };
}

export function parseInspectorNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
