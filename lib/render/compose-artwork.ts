import { isCalibrationRectActive } from "./calibration";
import { resolveFinalArtworkPlacement } from "./fine-calibration";
import type { ComposeArtworkInput, ComposeArtworkResult } from "./render-types";

/**
 * Composite garment asset + artwork PNG onto an offscreen canvas.
 * Artwork placement uses Designer Print Area → Product Print Area mapping,
 * then Fine Calibration as the final step.
 */
export function composeArtwork(input: ComposeArtworkInput): ComposeArtworkResult {
  const { asset, artwork, artworkWidth, artworkHeight } = input;
  const canvas = document.createElement("canvas");
  canvas.width = asset.naturalWidth;
  canvas.height = asset.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("composeArtwork: 2d context unavailable");
  }

  ctx.drawImage(asset.image, 0, 0, asset.naturalWidth, asset.naturalHeight);

  const rect = resolveFinalArtworkPlacement(asset.calibration, asset.side);
  if (rect && isCalibrationRectActive(rect)) {
    ctx.drawImage(artwork, rect.x, rect.y, rect.width, rect.height);
  } else if (artworkWidth > 0 && artworkHeight > 0) {
    // Calibration pending — draw artwork at natural size from origin (test placeholder).
    ctx.drawImage(artwork, 0, 0, artworkWidth, artworkHeight);
  }

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}
