/**
 * Preview Runtime — Phase 15.0A / 15.0B
 * ────────────────────────────────────────
 * Workspace Storage → Facade (read-only) → Physical Garment cm → Preview Display
 *
 * Layer CSS % delegates to Designer Display (Phase 15.3.4). Artwork stage anchor
 * unchanged (Phase 15.3.2). physicalReferencePrintable is for inner content scaling only.
 */

import type { Side } from "./constants";
import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import { getLayerEffectiveCmRect } from "./design-cm";
import {
  createDesignerDisplayContext,
  getLayerDesignerDisplayCssPercent,
} from "./designer-display-projection";
import {
  createDesignerCoordinateContext,
  workspaceRectToDesignerRect,
} from "./designer-coordinate-facade";
import {
  getDesignerBackBluePrintArea,
  getDesignerBluePrintArea,
} from "./designer-print-area-config";
import { DESIGNER_WORKSPACE_REFERENCE_SIZE } from "./designer-workspace";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";
import {
  getDesignerBlueVisualContainerPct,
  getGarmentVisualRenderScale,
} from "./garment-visual-profile";
import { getRuntimeTemplateCanvas } from "./template-profile/runtime";
import { getTextLayerCmRect } from "./text-layer";
import type { DesignLayer } from "./types";
import {
  getDesignerFactoryOverlayContainerStyle,
  getPreviewPrintReference,
  PREVIEW_REFERENCE_TRANSFORM,
  type PreviewPrintPositionOptions,
} from "./coordinates/preview";
import {
  buildUiPrintAreaContainerStyle,
  type UiPrintContainerStyle,
} from "./coordinates/ui-print-offset";

/** Fixed garment silhouette reference — all preview sizes share the same shirt visual height. */
export const PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE =
  DESIGNER_WORKSPACE_REFERENCE_SIZE;

export interface PreviewRuntimeContext {
  side: Side;
  size: string;
  /** Current garment printable cm — overflow detection only; not used for artwork sizing. */
  garmentPrintable: PrintAreaCmBounds;
  /** Fixed M-reference printable cm — artwork coordinate frame denominator. */
  physicalReferencePrintable: PrintAreaCmBounds;
}

export interface PreviewPhysicalStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

/** Workspace read path aligned with Designer display (text uses measured bounds). */
function readPreviewWorkspaceLayerCmRect(layer: DesignLayer): LayerCmRect {
  if (layer.type === "text") {
    return getTextLayerCmRect(layer);
  }
  return getLayerEffectiveCmRect(layer);
}

export function createPreviewRuntimeContext(
  side: Side,
  size: string,
): PreviewRuntimeContext {
  return {
    side,
    size,
    garmentPrintable: resolveGarmentPrintAreaCm(size, side),
    physicalReferencePrintable: resolveGarmentPrintAreaCm(
      PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE,
      side,
    ),
  };
}

/** Workspace M storage → physical garment cm via Facade (read-only). */
export function projectWorkspaceRectToPreviewGarment(
  workspaceRect: LayerCmRect,
  ctx: PreviewRuntimeContext,
): LayerCmRect {
  const facadeCtx = createDesignerCoordinateContext(ctx.side, ctx.size);
  return workspaceRectToDesignerRect(workspaceRect, facadeCtx);
}

export function projectPreviewLayerToGarment(
  layer: DesignLayer,
  ctx: PreviewRuntimeContext,
): LayerCmRect {
  const workspaceRect = readPreviewWorkspaceLayerCmRect(layer);
  return projectWorkspaceRectToPreviewGarment(workspaceRect, ctx);
}

/**
 * Preview layer CSS % — delegates to Designer Display (single mapping, no Preview-specific %).
 * Artwork Stage anchor unchanged (Phase 15.3.2).
 */
export function previewGarmentRectToPhysicalStyle(
  layer: DesignLayer,
  ctx: PreviewRuntimeContext,
): PreviewPhysicalStyle {
  return getPreviewLayerDisplayCssPercent(layer, ctx);
}

/** Workspace layer → Designer Display CSS % (same path as DesignCanvas). */
export function getPreviewLayerDisplayCssPercent(
  layer: DesignLayer,
  ctx: PreviewRuntimeContext,
): PreviewPhysicalStyle {
  const workspaceRect = readPreviewWorkspaceLayerCmRect(layer);
  const designerCtx = createDesignerDisplayContext(ctx.side, ctx.size);
  return getLayerDesignerDisplayCssPercent(workspaceRect, designerCtx);
}

/** M-reference printable used for text / image preview content scaling. */
export function getPreviewPhysicalReferencePrintArea(
  side: Side,
): PrintAreaCmBounds {
  return resolveGarmentPrintAreaCm(PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE, side);
}

function resolveGarmentBluePrintAreaCm(side: Side, size: string) {
  return side === "back"
    ? getDesignerBackBluePrintArea(size)
    : getDesignerBluePrintArea(size);
}

/**
 * Size-varying printable region on fixed garment — overflow boundary reference only.
 * Does not contain artwork and must not affect artwork dimensions.
 */
export function getPreviewPrintableBoundaryContainerPct(
  side: Side,
  size: string,
): { widthPct: number; heightPct: number } {
  const canvas = getRuntimeTemplateCanvas();
  const referenceSize = PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE;
  const mPct = getDesignerBlueVisualContainerPct(
    referenceSize,
    canvas.widthPx,
    canvas.heightPx,
  );
  const mBlue = resolveGarmentBluePrintAreaCm(side, referenceSize);
  const garmentBlue = resolveGarmentBluePrintAreaCm(side, size);
  return {
    widthPct: mPct.widthPct * (garmentBlue.widthCm / mBlue.widthCm),
    heightPct: mPct.heightPct * (garmentBlue.heightCm / mBlue.heightCm),
  };
}

export function getPreviewPrintableBoundaryStyle(
  side: Side,
  size: string,
  options?: PreviewPrintPositionOptions,
): UiPrintContainerStyle {
  const { widthPct, heightPct } = getPreviewPrintableBoundaryContainerPct(
    side,
    size,
  );
  const ref = getPreviewPrintReference(side, {
    ...options,
    size: PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE,
  });
  return buildUiPrintAreaContainerStyle(
    ref,
    widthPct,
    heightPct,
    PREVIEW_REFERENCE_TRANSFORM,
  );
}

/** Fixed M-reference artwork stage — same Garment Anchor as Designer blue print area. */
export function getPreviewArtworkStageStyle(
  side: Side,
  _options?: PreviewPrintPositionOptions,
): UiPrintContainerStyle {
  void _options;
  return getDesignerFactoryOverlayContainerStyle(
    side,
    PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE,
  );
}

/** @deprecated Use getPreviewArtworkStageStyle / getPreviewPrintableBoundaryStyle */
export function getPreviewGarmentPrintAreaContainerStyle(
  side: Side,
  size: string,
  options?: PreviewPrintPositionOptions,
): UiPrintContainerStyle {
  return getPreviewPrintableBoundaryStyle(side, size, options);
}

/** @deprecated Use getPreviewPrintableBoundaryContainerPct */
export function getPreviewGarmentPrintAreaContainerPct(
  side: Side,
  size: string,
): { widthPct: number; heightPct: number } {
  return getPreviewPrintableBoundaryContainerPct(side, size);
}

/** Uniform shirt PNG scale — independent of selected garment size. */
export function getPreviewGarmentVisualScale(): number {
  return getGarmentVisualRenderScale(PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE);
}

/** Physical artwork width as fraction of M-reference printable (for validation). */
export function getPreviewPhysicalArtworkWidthFraction(
  physicalWidthCm: number,
  side: Side,
): number {
  const ref = getPreviewPhysicalReferencePrintArea(side);
  return physicalWidthCm / ref.width;
}

/** Preview position fingerprint — Designer-aligned display + physical cm. */
export interface PreviewPositionFingerprint {
  physicalXCm: number;
  physicalYCm: number;
  physicalWidthCm: number;
  physicalHeightCm: number;
  displayLeftPct: number;
  displayTopPct: number;
}

/** Designer display position mapping (garment printable denominator). */
export function computeDesignerPositionFingerprint(
  garmentRect: LayerCmRect,
  garmentPrintable: PrintAreaCmBounds,
): PreviewPositionFingerprint {
  return {
    physicalXCm: garmentRect.x_cm,
    physicalYCm: garmentRect.y_cm,
    physicalWidthCm: garmentRect.width_cm,
    physicalHeightCm: garmentRect.height_cm,
    displayLeftPct: (garmentRect.x_cm / garmentPrintable.width) * 100,
    displayTopPct: (garmentRect.y_cm / garmentPrintable.height) * 100,
  };
}

/** Preview position mapping after Phase 15.3 alignment. */
export function computePreviewPositionFingerprint(
  garmentRect: LayerCmRect,
  garmentPrintable: PrintAreaCmBounds,
): PreviewPositionFingerprint {
  return computeDesignerPositionFingerprint(garmentRect, garmentPrintable);
}

export function previewPositionFingerprintsEqual(
  a: PreviewPositionFingerprint,
  b: PreviewPositionFingerprint,
  epsilonCm = 0.01,
): boolean {
  return (
    Math.abs(a.physicalXCm - b.physicalXCm) <= epsilonCm &&
    Math.abs(a.physicalYCm - b.physicalYCm) <= epsilonCm &&
    Math.abs(a.physicalWidthCm - b.physicalWidthCm) <= epsilonCm &&
    Math.abs(a.physicalHeightCm - b.physicalHeightCm) <= epsilonCm &&
    Math.abs(a.displayLeftPct - b.displayLeftPct) <= epsilonCm &&
    Math.abs(a.displayTopPct - b.displayTopPct) <= epsilonCm
  );
}

/** @deprecated Use computePreviewPositionFingerprint for position alignment checks */
export interface PreviewPhysicalFingerprint {
  physicalWidthCm: number;
  physicalHeightCm: number;
  styleLeftPct: number;
  styleTopPct: number;
  styleWidthPct: number;
  styleHeightPct: number;
}

export function computePreviewPhysicalFingerprint(
  garmentRect: LayerCmRect,
  side: Side,
): PreviewPhysicalFingerprint {
  const ref = getPreviewPhysicalReferencePrintArea(side);
  return {
    physicalWidthCm: garmentRect.width_cm,
    physicalHeightCm: garmentRect.height_cm,
    styleLeftPct: (garmentRect.x_cm / ref.width) * 100,
    styleTopPct: (garmentRect.y_cm / ref.height) * 100,
    styleWidthPct: (garmentRect.width_cm / ref.width) * 100,
    styleHeightPct: (garmentRect.height_cm / ref.height) * 100,
  };
}

export function previewPhysicalFingerprintsEqual(
  a: PreviewPhysicalFingerprint,
  b: PreviewPhysicalFingerprint,
  epsilon = 1e-6,
): boolean {
  return (
    Math.abs(a.physicalWidthCm - b.physicalWidthCm) <= epsilon &&
    Math.abs(a.physicalHeightCm - b.physicalHeightCm) <= epsilon &&
    Math.abs(a.styleLeftPct - b.styleLeftPct) <= epsilon &&
    Math.abs(a.styleTopPct - b.styleTopPct) <= epsilon &&
    Math.abs(a.styleWidthPct - b.styleWidthPct) <= epsilon &&
    Math.abs(a.styleHeightPct - b.styleHeightPct) <= epsilon
  );
}
