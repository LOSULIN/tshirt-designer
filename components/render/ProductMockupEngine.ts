import { loadAsset } from "@/lib/render/asset-loader";
import { composeProductMockup } from "@/lib/render/product-mockup-compose";
import type { ExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import type {
  ProductCalibration,
  RenderEngineInput,
  RenderResult,
} from "@/lib/render/render-types";

export interface ProductMockupEngineInput extends RenderEngineInput {
  /** Active garment size — scales mockup placement to match Designer blue print area. */
  garmentSize?: string;
  pipelineContext?: ExportPipelineContext;
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/**
 * Product Mockup Engine — Artwork → Product Reference → Visual Adjustment.
 * Separate from RenderEngine.composeArtwork (factory path, no visual adjustment).
 */
export async function renderProductMockupOnProduct(
  input: ProductMockupEngineInput,
): Promise<RenderResult> {
  const asset = await loadAsset(input.productCode, input.color, input.side, {
    quality: input.quality ?? "preview",
  });

  const { canvas, width, height } = composeProductMockup({
    asset,
    artwork: input.artwork,
    artworkWidth: input.artworkWidth,
    artworkHeight: input.artworkHeight,
    garmentSize: input.garmentSize,
    pipelineContext: input.pipelineContext,
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

export interface RenderProductMockupWithCalibrationInput
  extends ProductMockupEngineInput {
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
    garmentSize: input.garmentSize,
    pipelineContext: input.pipelineContext,
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
