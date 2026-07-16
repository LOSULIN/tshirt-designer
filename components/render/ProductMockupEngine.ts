import { loadAsset } from "@/lib/render/asset-loader";
import { composeProductMockup } from "@/lib/render/product-mockup-compose";
import type {
  ProductCalibration,
  RenderEngineInput,
  RenderResult,
} from "@/lib/render/render-types";

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/**
 * Product Mockup Engine — Artwork → Product Reference → Visual Adjustment.
 * Separate from RenderEngine.composeArtwork (factory path, no visual adjustment).
 */
export async function renderProductMockupOnProduct(
  input: RenderEngineInput,
): Promise<RenderResult> {
  const asset = await loadAsset(input.productCode, input.color, input.side);

  const { canvas, width, height } = composeProductMockup({
    asset,
    artwork: input.artwork,
    artworkWidth: input.artworkWidth,
    artworkHeight: input.artworkHeight,
  });

  return {
    productCode: input.productCode,
    color: input.color,
    side: input.side,
    canvas,
    dataUrl: canvasToDataUrl(canvas),
    width,
    height,
  };
}

export interface RenderProductMockupWithCalibrationInput extends RenderEngineInput {
  calibration: ProductCalibration;
}

/** Calibration tool preview with draft calibration (includes visualAdjustment). */
export async function renderProductMockupWithCalibration(
  input: RenderProductMockupWithCalibrationInput,
): Promise<RenderResult> {
  const asset = await loadAsset(input.productCode, input.color, input.side);
  const assetWithCalibration = { ...asset, calibration: input.calibration };

  const { canvas, width, height } = composeProductMockup({
    asset: assetWithCalibration,
    artwork: input.artwork,
    artworkWidth: input.artworkWidth,
    artworkHeight: input.artworkHeight,
  });

  return {
    productCode: input.productCode,
    color: input.color,
    side: input.side,
    canvas,
    dataUrl: canvasToDataUrl(canvas),
    width,
    height,
  };
}
