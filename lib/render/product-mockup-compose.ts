/**
 * Product Mockup Compose — factory placement + visual adjustment (mockup only).
 * Does not modify composeArtwork(); Artwork Export uses separate pipeline.
 */

import { isCalibrationRectActive } from "./calibration";
import type { ExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import {
  DESIGNER_GEOMETRY_VERSION,
} from "@/lib/designer-geometry-v2/geometry-version";
import {
  applyRuntimeVisualCompensationToRect,
  maybeLogProductMockupRuntimeCompare,
  resolveProductMockupRuntimePlacement,
} from "@/lib/designer-geometry-v2/product-mockup-runtime";
import {
  PRODUCT_PLACEMENT_BASELINE_SIZE,
} from "./product-placement-scale";
import type { ComposeArtworkInput, ComposeArtworkResult } from "./render-types";
import { applyMockupVisualCompensation } from "./visual-compensation";
import { applyProductPreviewVisualCompensationToRect } from "@/lib/presentation/visual-compensation";

export interface ProductMockupComposeInput extends ComposeArtworkInput {
  /** Garment size for size-aware placement (Product Export). */
  garmentSize?: string;
  pipelineContext?: ExportPipelineContext;
}

/**
 * Composite garment + artwork for product preview / export.
 * Visual adjustment is the final placement step (after Product Reference + mapping).
 */
export function composeProductMockup(
  input: ProductMockupComposeInput,
): ComposeArtworkResult {
  const { asset, artwork, artworkWidth, artworkHeight, garmentSize, pipelineContext } =
    input;
  const resolvedSize = garmentSize ?? PRODUCT_PLACEMENT_BASELINE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = asset.naturalWidth;
  canvas.height = asset.naturalHeight;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    throw new Error("composeProductMockup: 2d context unavailable");
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(asset.image, 0, 0, canvas.width, canvas.height);

  const productInput = {
    calibration: asset.calibration,
    side: asset.side,
    mockupVisualScale: asset.mockupVisualScale,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  };

  maybeLogProductMockupRuntimeCompare({
    pipelineContext,
    product: productInput,
    size: resolvedSize,
  });

  const runtimePlacement = resolveProductMockupRuntimePlacement(
    pipelineContext,
    productInput,
    resolvedSize,
  );

  const rect = runtimePlacement.placementRect;
  if (rect && isCalibrationRectActive(rect)) {
    let artworkDestRect = rect;

    if (runtimePlacement.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1) {
      const scaledRect = applyMockupVisualCompensation(
        rect,
        runtimePlacement.scale,
      );
      artworkDestRect = applyProductPreviewVisualCompensationToRect(
        scaledRect,
        asset.side,
        canvas.width,
        canvas.height,
      );
    } else {
      artworkDestRect = applyRuntimeVisualCompensationToRect(
        rect,
        runtimePlacement.visualCompensation,
        canvas.width,
        canvas.height,
      );
    }

    ctx.drawImage(
      artwork,
      artworkDestRect.x,
      artworkDestRect.y,
      artworkDestRect.width,
      artworkDestRect.height,
    );
  } else if (artworkWidth > 0 && artworkHeight > 0) {
    ctx.drawImage(artwork, 0, 0, artworkWidth, artworkHeight);
  }

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}
