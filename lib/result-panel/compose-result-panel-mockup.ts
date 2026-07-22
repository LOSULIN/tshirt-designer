/**
 * ResultPanel mockup compose — garment silhouette compensation + frozen placement.
 *
 * Does NOT replace composeProductMockup (export/download path unchanged).
 */

import { isCalibrationRectActive } from "@/lib/render/calibration";
import {
  PRODUCT_PLACEMENT_BASELINE_SIZE,
  resolveProductMockupPlacementForGarmentSize,
} from "@/lib/render/product-placement-scale";
import type { ComposeArtworkInput, ComposeArtworkResult } from "@/lib/render/render-types";
import { applyMockupVisualCompensation } from "@/lib/render/visual-compensation";
import { applyProductPreviewVisualCompensationToRect } from "@/lib/presentation/visual-compensation";
import { UA35001_SILHOUETTE_ANCHORS } from "./garment-silhouette-anchors";
import {
  isSilhouetteCompensationIdentity,
  resolveGarmentSilhouetteCompensation,
} from "./garment-silhouette-compensation";
import { warpGarmentSilhouetteOnCanvas } from "./garment-silhouette-warp";

export interface ResultPanelMockupComposeInput extends ComposeArtworkInput {
  garmentSize?: string;
}

function drawGarmentFillCanvas(
  asset: ComposeArtworkInput["asset"],
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = asset.naturalWidth;
  canvas.height = asset.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("composeResultPanelMockup: garment 2d context unavailable");
  }
  ctx.drawImage(asset.image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function resolveWarpedGarmentCanvas(
  asset: ComposeArtworkInput["asset"],
  garmentSize: string,
): HTMLCanvasElement {
  const filled = drawGarmentFillCanvas(asset);
  const compensation = resolveGarmentSilhouetteCompensation(garmentSize);
  if (isSilhouetteCompensationIdentity(compensation)) {
    return filled;
  }
  return warpGarmentSilhouetteOnCanvas(
    filled,
    compensation,
    UA35001_SILHOUETTE_ANCHORS,
  );
}

/**
 * ResultPanel preview composite:
 * 1. UA garment fill canvas (fixed 1024×1536)
 * 2. Localized silhouette warp (official cm axes, bounded)
 * 3. Artwork at frozen placement (same as composeProductMockup)
 */
export function composeResultPanelMockup(
  input: ResultPanelMockupComposeInput,
): ComposeArtworkResult {
  const { asset, artwork, artworkWidth, artworkHeight, garmentSize } = input;
  const resolvedSize = garmentSize ?? PRODUCT_PLACEMENT_BASELINE_SIZE;

  const garmentCanvas = resolveWarpedGarmentCanvas(asset, resolvedSize);
  const canvas = document.createElement("canvas");
  canvas.width = garmentCanvas.width;
  canvas.height = garmentCanvas.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("composeResultPanelMockup: 2d context unavailable");
  }

  ctx.drawImage(garmentCanvas, 0, 0, canvas.width, canvas.height);

  const rect = resolveProductMockupPlacementForGarmentSize(
    asset.calibration,
    asset.side,
    resolvedSize,
  );
  if (rect && isCalibrationRectActive(rect)) {
    const scaledRect = applyMockupVisualCompensation(
      rect,
      asset.mockupVisualScale,
    );
    const artworkDestRect = applyProductPreviewVisualCompensationToRect(
      scaledRect,
      asset.side,
      canvas.width,
      canvas.height,
    );
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
