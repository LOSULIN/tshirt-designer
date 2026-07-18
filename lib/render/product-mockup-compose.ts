/**
 * Product Mockup Compose — factory placement + visual adjustment (mockup only).
 * Does not modify composeArtwork(); Artwork Export uses separate pipeline.
 */

import { isCalibrationRectActive } from "./calibration";
import {
  PRODUCT_PLACEMENT_BASELINE_SIZE,
  resolveProductMockupPlacementForGarmentSize,
} from "./product-placement-scale";
import type { ComposeArtworkInput, ComposeArtworkResult } from "./render-types";
import { applyMockupVisualCompensation } from "./visual-compensation";

export interface ProductMockupComposeInput extends ComposeArtworkInput {
  /** Garment size for size-aware placement (Product Export). */
  garmentSize?: string;
}

/**
 * Composite garment + artwork for product preview / export.
 * Visual adjustment is the final placement step (after Product Reference + mapping).
 */
export function composeProductMockup(
  input: ProductMockupComposeInput,
): ComposeArtworkResult {
  const { asset, artwork, artworkWidth, artworkHeight, garmentSize } = input;
  const canvas = document.createElement("canvas");
  canvas.width = asset.naturalWidth;
  canvas.height = asset.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("composeProductMockup: 2d context unavailable");
  }

  ctx.drawImage(asset.image, 0, 0, asset.naturalWidth, asset.naturalHeight);

  const rect = resolveProductMockupPlacementForGarmentSize(
    asset.calibration,
    asset.side,
    garmentSize ?? PRODUCT_PLACEMENT_BASELINE_SIZE,
  );
  if (rect && isCalibrationRectActive(rect)) {
    const destRect = applyMockupVisualCompensation(
      rect,
      asset.mockupVisualScale,
    );
    ctx.drawImage(
      artwork,
      destRect.x,
      destRect.y,
      destRect.width,
      destRect.height,
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
