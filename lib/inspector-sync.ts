/**
 * Inspector ↔ Canvas 雙向同步 — cm 為唯一真實單位。
 */

import { getLayerInspectorCmRect } from "./design-inspector";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "./types";

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
  return getScalableLayerInspectorValues(layer);
}

export function getScalableLayerInspectorValues(
  layer: ImageDesignLayer | ShapeDesignLayer,
): ImageInspectorValues {
  const rect = getLayerInspectorCmRect(layer);
  return {
    width_cm: rect.width_cm,
    height_cm: rect.height_cm,
    x_cm: rect.x_cm,
    y_cm: rect.y_cm,
    scale: layer.scale,
    rotation: layer.rotation,
  };
}

export function formatInspectorInputValue(
  value: number,
  decimals?: number,
): string {
  if (decimals !== undefined) return value.toFixed(decimals);
  return String(value);
}

/** 友善尺寸：四捨五入至 0.1 cm（僅 Inspector 顯示層） */
export function roundInspectorDimensionCm(cm: number): number {
  return Math.round(cm * 10) / 10;
}

export function formatInspectorDimensionDisplay(cm: number): string {
  return roundInspectorDimensionCm(cm).toFixed(1);
}

/** Tooltip / 校稿明細用的內部精確值 */
export function formatInspectorDimensionPrecise(cm: number): string {
  return `${cm} cm`;
}

/** 使用者 commit 後，內部微調（fitText 等）若小於此差值則維持顯示 */
export const INSPECTOR_DIMENSION_STICKY_TOLERANCE_CM = 0.5;

export function shouldClearInspectorDimensionAnchor(
  modelCm: number,
  committedCm: number,
): boolean {
  return (
    Math.abs(modelCm - committedCm) >= INSPECTOR_DIMENSION_STICKY_TOLERANCE_CM
  );
}

export function getInspectorDimensionDisplay(
  modelCm: number,
  anchor: { committedCm: number; display: string } | null,
): string {
  if (
    anchor &&
    !shouldClearInspectorDimensionAnchor(modelCm, anchor.committedCm)
  ) {
    return anchor.display;
  }
  return formatInspectorDimensionDisplay(modelCm);
}

/** 允許多位數、小數與輸入中的空字串／負號／小數點 */
export function isInspectorNumberDraft(value: string): boolean {
  return (
    value === "" ||
    value === "-" ||
    value === "." ||
    value === "-." ||
    /^-?\d*\.?\d*$/.test(value)
  );
}

export function parseInspectorNumber(value: string, fallback: number): number {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed === "-" ||
    trimmed === "." ||
    trimmed === "-."
  ) {
    return fallback;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}
