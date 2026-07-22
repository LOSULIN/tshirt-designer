/**
 * Photo Bridge — Designer Artwork Stage → UA Product Photo Artwork Stage.
 *
 * Presentation-only coordinate adapter. Does not render, draw, or touch DOM/React.
 * Layer CSS % inside the stage remain Designer Display Projection (unchanged).
 *
 * Designer projection: photoArtworkStage mirrors designerArtworkStage (M factory overlay).
 */

import type { Side } from "@/lib/constants";
import { getCollarAnchorYPx, getPrintAreaOffsetPx } from "@/lib/coordinates/print-area-offset";
import {
  createDesignerDisplayContext,
  type DesignerCoordinateContext,
} from "@/lib/designer-display-projection";
import { DESIGNER_WORKSPACE_REFERENCE_SIZE } from "@/lib/designer-workspace";
import { resolveFactoryCenterTemplateXPx } from "@/lib/factory-anatomy-runtime";
import { resolveFactoryOverlayRectCm } from "@/lib/factory-overlay-runtime";
import {
  PHOTO_BASELINE_PRINT_BEFORE_COMPENSATION_PREVIEW,
} from "@/lib/garment-calibration/constants";
import {
  METRICS_TEMPLATE_HEIGHT_PX,
  METRICS_TEMPLATE_WIDTH_PX,
} from "@/lib/garment-metrics/constants";
import type { ProductCalibration } from "@/lib/products/product-types";
import {
  PRODUCT_PLACEMENT_BASELINE_SIZE,
  resolveGarmentBluePrintAreaCm,
  resolveProductMockupPlacementForGarmentSize,
  scalePlacementRectForGarmentSize,
} from "@/lib/render/product-placement-scale";
import type { CalibrationRect } from "@/lib/render/render-types";
import { getRuntimeTemplatePxPerCm } from "@/lib/template-profile/runtime";

/** UA product photo artwork stage bounds as canvas percentages (0–100). */
export interface PhotoBridgeRect {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export interface PhotoArtworkStageBridge {
  side: Side;
  size: string;
  canvasWidth: number;
  canvasHeight: number;
  /**
   * Fixed M-reference Designer artwork stage — same anchor as PreviewGarmentView
   * (`getPreviewArtworkStageStyle` / factory overlay on template canvas).
   */
  designerArtworkStage: PhotoBridgeRect;
  /**
   * Artwork stage on the UA product photo canvas.
   * Designer projection: identical to `designerArtworkStage` (M factory overlay).
   * Host for Designer Display Projection layer CSS % at render time.
   */
  photoArtworkStage: PhotoBridgeRect;
  /**
   * Read-only Designer Display context — layer CSS % denominator only.
   * Does not compute per-layer artwork positions in this module.
   */
  designerDisplayContext: DesignerCoordinateContext;
}

export interface ResolvePhotoArtworkStageBridgeInput {
  side: Side;
  size: string;
  canvasWidth?: number;
  canvasHeight?: number;
  /**
   * Optional read-only calibration snapshot.
   * When omitted, photo stage is derived from frozen photo baseline constants.
   */
  calibration?: ProductCalibration;
}

export interface PxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectPxToPhotoBridgeRect(
  rect: PxRect,
  canvasWidth: number,
  canvasHeight: number,
): PhotoBridgeRect {
  return {
    leftPercent: (rect.x / canvasWidth) * 100,
    topPercent: (rect.y / canvasHeight) * 100,
    widthPercent: (rect.width / canvasWidth) * 100,
    heightPercent: (rect.height / canvasHeight) * 100,
  };
}

/** Designer Preview artwork stage @ M — read-only factory overlay on template canvas. */
export function resolveDesignerArtworkStageRect(
  side: Side,
  canvasWidth: number = METRICS_TEMPLATE_WIDTH_PX,
  canvasHeight: number = METRICS_TEMPLATE_HEIGHT_PX,
): PhotoBridgeRect {
  const rectPx = resolveDesignerFactoryOverlayStagePx(
    side,
    DESIGNER_WORKSPACE_REFERENCE_SIZE,
  );
  return rectPxToPhotoBridgeRect(rectPx, canvasWidth, canvasHeight);
}

/**
 * Factory overlay cm → template px (mirrors coordinates/preview.ts, read-only).
 * Avoids importing preview runtime to keep this module standalone.
 */
function resolveDesignerFactoryOverlayStagePx(
  side: Side,
  size: string,
): PxRect {
  const pxPerCm = getRuntimeTemplatePxPerCm();
  const overlay = resolveFactoryOverlayRectCm(side, size);
  const centerTemplateX = resolveFactoryCenterTemplateXPx(side, size);
  const widthPx = overlay.widthCm * pxPerCm;
  const heightPx = overlay.heightCm * pxPerCm;
  const topPx = getPrintAreaOffsetPx(
    side,
    pxPerCm,
    getCollarAnchorYPx(side),
    1,
  );
  const leftPx =
    centerTemplateX + overlay.centerOffsetXCm * pxPerCm - widthPx / 2;

  return {
    x: leftPx,
    y: topPx,
    width: widthPx,
    height: heightPx,
  };
}

function resolvePhotoBaselinePlacementRectPx(
  side: Side,
  size: string,
  calibration?: ProductCalibration,
): PxRect {
  if (calibration) {
    const placement = resolveProductMockupPlacementForGarmentSize(
      calibration,
      side,
      size,
    );
    if (!placement) {
      throw new Error(
        `Photo Bridge: placement unavailable for ${side}/${size}`,
      );
    }
    return calibrationRectToPxRect(placement);
  }

  const baselineRect = calibrationRectToPxRect(
    PHOTO_BASELINE_PRINT_BEFORE_COMPENSATION_PREVIEW,
  );
  if (size === PRODUCT_PLACEMENT_BASELINE_SIZE) {
    return baselineRect;
  }

  const baselinePrint = resolveGarmentBluePrintAreaCm(
    PRODUCT_PLACEMENT_BASELINE_SIZE,
    side,
  );
  const currentPrint = resolveGarmentBluePrintAreaCm(size, side);
  const scaled = scalePlacementRectForGarmentSize(
    {
      x: baselineRect.x,
      y: baselineRect.y,
      width: baselineRect.width,
      height: baselineRect.height,
    },
    baselinePrint,
    currentPrint,
  );
  return calibrationRectToPxRect(scaled);
}

function calibrationRectToPxRect(rect: CalibrationRect): PxRect {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Designer projection artwork stage on UA photo — mirrors Designer Preview stage exactly.
 * M-fixed factory overlay; size only affects layer CSS % inside the stage.
 */
export function resolveDesignerProjectionArtworkStageRect(
  side: Side,
  canvasWidth: number = METRICS_TEMPLATE_WIDTH_PX,
  canvasHeight: number = METRICS_TEMPLATE_HEIGHT_PX,
): PhotoBridgeRect {
  return resolveDesignerArtworkStageRect(side, canvasWidth, canvasHeight);
}

/** Size-aware UA photo artwork stage — calibration baseline (legacy reference only). */
export function resolvePhotoArtworkStageRect(
  input: ResolvePhotoArtworkStageBridgeInput,
): PhotoBridgeRect {
  const canvasWidth = input.canvasWidth ?? METRICS_TEMPLATE_WIDTH_PX;
  const canvasHeight = input.canvasHeight ?? METRICS_TEMPLATE_HEIGHT_PX;
  const rectPx = resolvePhotoBaselinePlacementRectPx(
    input.side,
    input.size,
    input.calibration,
  );
  return rectPxToPhotoBridgeRect(rectPx, canvasWidth, canvasHeight);
}

/**
 * Photo Bridge — maps Designer Artwork Stage to UA Photo Artwork Stage.
 *
 * Data flow:
 *   Workspace Layer (storage)
 *     → Designer Display Projection (layer CSS % — not computed here)
 *     → Designer Artwork Stage (M factory overlay)
 *     → Photo Bridge (this module)
 *     → Photo Artwork Stage (UA product photo — same rect as Designer stage)
 */
export function resolvePhotoArtworkStageBridge(
  input: ResolvePhotoArtworkStageBridgeInput,
): PhotoArtworkStageBridge {
  const canvasWidth = input.canvasWidth ?? METRICS_TEMPLATE_WIDTH_PX;
  const canvasHeight = input.canvasHeight ?? METRICS_TEMPLATE_HEIGHT_PX;
  const designerArtworkStage = resolveDesignerArtworkStageRect(
    input.side,
    canvasWidth,
    canvasHeight,
  );
  const designerDisplayContext = createDesignerDisplayContext(
    input.side,
    input.size,
  );

  return {
    side: input.side,
    size: input.size,
    canvasWidth,
    canvasHeight,
    designerArtworkStage,
    photoArtworkStage: resolveDesignerProjectionArtworkStageRect(
      input.side,
      canvasWidth,
      canvasHeight,
    ),
    designerDisplayContext,
  };
}
