/**
 * Product Preview Visual Compensation — presentation-only offset after Photo Bridge.
 *
 * Geometry V2 ResultPanel aligns to resolveGeometryRuntimeSnapshot(); DOM
 * translate is disabled for both sides. Legacy V1 export / mockup / PDF keep frozen offsets.
 */

import type { CSSProperties } from "react";
import type { Side } from "@/lib/constants";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "@/lib/designer-geometry-v2/geometry-version";
import type { CalibrationRect } from "@/lib/render/render-types";

export interface ProductPreviewVisualCompensationAxis {
  offsetXPercent: number;
  /** Screen coordinates: positive = down, negative = up. */
  offsetYPercent: number;
}

export type ProductPreviewVisualCompensation = Record<
  Side,
  ProductPreviewVisualCompensationAxis
>;

export type ProductPreviewVisualCompensationSurface =
  | "designer"
  | "resultPanel"
  | "export";

/**
 * Geometry V2 SSOT — both sides use runtime snapshot only (no translate).
 */
export const PRODUCT_PREVIEW_VISUAL_COMPENSATION: ProductPreviewVisualCompensation =
  {
    front: {
      offsetXPercent: 0,
      offsetYPercent: 0,
    },
    back: {
      offsetXPercent: 0,
      offsetYPercent: 0,
    },
  };

/** Frozen V1 offsets — export, mockup compose, PDF (unchanged). */
const LEGACY_V1_PRODUCT_PREVIEW_VISUAL_COMPENSATION: ProductPreviewVisualCompensation =
  {
    front: {
      offsetXPercent: 0,
      offsetYPercent: 8,
    },
    back: {
      offsetXPercent: 0,
      offsetYPercent: -8,
    },
  };

export interface ResolveRuntimeVisualCompensationInput {
  side: Side;
  geometryVersion: DesignerGeometryVersion;
  surface?: ProductPreviewVisualCompensationSurface;
}

/**
 * Runtime resolver — Geometry V2 ResultPanel uses PRODUCT_PREVIEW_VISUAL_COMPENSATION.
 * V1 paths retain legacy offsets so production export / mockup are unchanged.
 */
export function resolveRuntimeVisualCompensation(
  input: ResolveRuntimeVisualCompensationInput,
): ProductPreviewVisualCompensationAxis {
  if (input.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2) {
    return PRODUCT_PREVIEW_VISUAL_COMPENSATION[input.side];
  }
  return LEGACY_V1_PRODUCT_PREVIEW_VISUAL_COMPENSATION[input.side];
}

/** Legacy V1 resolver — export / mockup / PDF only. */
export function resolveProductPreviewVisualCompensation(
  side: Side,
): ProductPreviewVisualCompensationAxis {
  return LEGACY_V1_PRODUCT_PREVIEW_VISUAL_COMPENSATION[side];
}

export function hasRuntimeVisualCompensation(
  axis: ProductPreviewVisualCompensationAxis,
): boolean {
  return axis.offsetXPercent !== 0 || axis.offsetYPercent !== 0;
}

export function hasProductPreviewVisualCompensation(side: Side): boolean {
  const axis = resolveProductPreviewVisualCompensation(side);
  return hasRuntimeVisualCompensation(axis);
}

/** Shift artwork draw rect on product-photo canvas (legacy V1 export path). */
export function applyProductPreviewVisualCompensationToRect(
  rect: CalibrationRect,
  side: Side,
  referenceWidth: number,
  referenceHeight: number,
): CalibrationRect {
  const { offsetXPercent, offsetYPercent } =
    resolveProductPreviewVisualCompensation(side);
  if (offsetXPercent === 0 && offsetYPercent === 0) {
    return rect;
  }

  const dx = (offsetXPercent / 100) * referenceWidth;
  const dy = (offsetYPercent / 100) * referenceHeight;

  return {
    x: rect.x + dx,
    y: rect.y + dy,
    width: rect.width,
    height: rect.height,
  };
}

export function runtimeVisualCompensationLayerStyle(
  axis: ProductPreviewVisualCompensationAxis,
): CSSProperties {
  const style: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
  };

  if (hasRuntimeVisualCompensation(axis)) {
    style.transform = `translate(${axis.offsetXPercent}%, ${axis.offsetYPercent}%)`;
  }

  return style;
}

/**
 * @deprecated Use resolveRuntimeVisualCompensation + runtimeVisualCompensationLayerStyle.
 */
export function productPreviewVisualCompensationLayerStyle(
  side: Side,
): CSSProperties {
  return runtimeVisualCompensationLayerStyle(
    resolveProductPreviewVisualCompensation(side),
  );
}

/** PDF bottom-origin pt; positive = up (inverse of screen Y). Legacy V1 path. */
export function resolveProductPreviewVisualCompensationPdfOffsetY(
  side: Side,
  referenceHeightPt: number,
): number {
  const { offsetYPercent } = resolveProductPreviewVisualCompensation(side);
  return -(offsetYPercent / 100) * referenceHeightPt;
}
