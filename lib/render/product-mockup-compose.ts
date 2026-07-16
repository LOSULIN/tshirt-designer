/**
 * Product Mockup Compose — factory placement + visual adjustment (mockup only).
 * Does not modify composeArtwork(); Artwork Export uses separate pipeline.
 */

import { isCalibrationRectActive } from "./calibration";
import { resolveProductMockupPlacement } from "./visual-adjustment";
import type { ComposeArtworkInput, ComposeArtworkResult } from "./render-types";

/**
 * Composite garment + artwork for product preview / export.
 * Visual adjustment is the final placement step (after Product Reference + mapping).
 */
export function composeProductMockup(input: ComposeArtworkInput): ComposeArtworkResult {
  const { asset, artwork, artworkWidth, artworkHeight } = input;
  const canvas = document.createElement("canvas");
  canvas.width = asset.naturalWidth;
  canvas.height = asset.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("composeProductMockup: 2d context unavailable");
  }

  ctx.drawImage(asset.image, 0, 0, asset.naturalWidth, asset.naturalHeight);

  const rect = resolveProductMockupPlacement(asset.calibration, asset.side);
  if (rect && isCalibrationRectActive(rect)) {
    ctx.drawImage(artwork, rect.x, rect.y, rect.width, rect.height);
  } else if (artworkWidth > 0 && artworkHeight > 0) {
    ctx.drawImage(artwork, 0, 0, artworkWidth, artworkHeight);
  }

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}
