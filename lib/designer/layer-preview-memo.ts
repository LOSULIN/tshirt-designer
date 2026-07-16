/**
 * LayerPreviewContent memo helpers — Phase 28-2E render isolation.
 */

import type { PrintAreaCmBounds } from "@/lib/design-cm";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
  TextShadowStyle,
  TextStrokeStyle,
} from "@/lib/types";

export interface LayerPreviewContentProps {
  layer: DesignLayer;
  printArea: PrintAreaCmBounds;
  /** 文字編輯中時由父層傳入；預設 false */
  isEditing?: boolean;
  /** 選取狀態；預設 false */
  isSelected?: boolean;
}

function textStrokeEqual(
  a: TextStrokeStyle | null | undefined,
  b: TextStrokeStyle | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.color === b.color && a.width_cm === b.width_cm;
}

function textShadowEqual(
  a: TextShadowStyle | null | undefined,
  b: TextShadowStyle | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.color === b.color &&
    a.blur_cm === b.blur_cm &&
    a.offsetX_cm === b.offsetX_cm &&
    a.offsetY_cm === b.offsetY_cm
  );
}

export function textLayerPreviewVisualEqual(
  a: TextDesignLayer,
  b: TextDesignLayer,
): boolean {
  return (
    a.visible === b.visible &&
    a.locked === b.locked &&
    a.rotation === b.rotation &&
    a.opacity === b.opacity &&
    a.scale === b.scale &&
    a.text === b.text &&
    a.fontSize_cm === b.fontSize_cm &&
    a.fontFamily === b.fontFamily &&
    a.color === b.color &&
    a.fontWeight === b.fontWeight &&
    a.fontStyle === b.fontStyle &&
    a.letterSpacing_cm === b.letterSpacing_cm &&
    a.lineHeight === b.lineHeight &&
    a.textAlign === b.textAlign &&
    a.width_cm === b.width_cm &&
    textStrokeEqual(a.stroke, b.stroke) &&
    textShadowEqual(a.shadow, b.shadow)
  );
}

export function imageLayerPreviewVisualEqual(
  a: ImageDesignLayer,
  b: ImageDesignLayer,
): boolean {
  return (
    a.visible === b.visible &&
    a.locked === b.locked &&
    a.rotation === b.rotation &&
    a.scale === b.scale &&
    a.width_cm === b.width_cm &&
    a.height_cm === b.height_cm &&
    a.image.previewUrl === b.image.previewUrl &&
    a.name === b.name
  );
}

export function shapeLayerPreviewVisualEqual(
  a: ShapeDesignLayer,
  b: ShapeDesignLayer,
): boolean {
  return (
    a.visible === b.visible &&
    a.locked === b.locked &&
    a.rotation === b.rotation &&
    a.opacity === b.opacity &&
    a.scale === b.scale &&
    a.width_cm === b.width_cm &&
    a.height_cm === b.height_cm &&
    a.shapeKind === b.shapeKind &&
    a.fill === b.fill &&
    a.stroke === b.stroke &&
    a.strokeWidth_cm === b.strokeWidth_cm
  );
}

export function layerPreviewVisualEqual(
  a: DesignLayer,
  b: DesignLayer,
): boolean {
  if (a.type !== b.type) return false;

  if (a.type === "image" && b.type === "image") {
    return imageLayerPreviewVisualEqual(a, b);
  }
  if (a.type === "text" && b.type === "text") {
    return textLayerPreviewVisualEqual(a, b);
  }
  if (a.type === "shape" && b.type === "shape") {
    return shapeLayerPreviewVisualEqual(a, b);
  }
  return false;
}

/** Bail out when preview-relevant layer fields are unchanged. */
export function areLayerPreviewContentPropsEqual(
  prev: LayerPreviewContentProps,
  next: LayerPreviewContentProps,
): boolean {
  if (prev.layer === next.layer) return true;

  if (prev.isEditing !== next.isEditing) return false;
  if (prev.isSelected !== next.isSelected) return false;

  if (prev.layer.type === "text" || next.layer.type === "text") {
    if (prev.printArea.height !== next.printArea.height) return false;
  }

  return layerPreviewVisualEqual(prev.layer, next.layer);
}
