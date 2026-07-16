import { loadAsset } from "@/lib/render/asset-loader";
import { composeArtwork } from "@/lib/render/compose-artwork";
import type {
  ProductCalibration,
  RenderEngineInput,
  RenderResult,
} from "@/lib/render/render-types";

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/**
 * Render Engine — Artwork PNG → calibration → garment asset → composite.
 * Second pipeline alongside Designer export; does not replace export runtime.
 */
export async function renderArtworkOnProduct(
  input: RenderEngineInput,
): Promise<RenderResult> {
  const asset = await loadAsset(input.productCode, input.color, input.side);

  const { canvas, width, height } = composeArtwork({
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

export interface RenderWithCalibrationInput extends RenderEngineInput {
  calibration: ProductCalibration;
}

/** Render preview using in-memory calibration (calibration tool draft). */
export async function renderArtworkWithCalibration(
  input: RenderWithCalibrationInput,
): Promise<RenderResult> {
  const asset = await loadAsset(input.productCode, input.color, input.side);
  const assetWithCalibration = { ...asset, calibration: input.calibration };

  const { canvas, width, height } = composeArtwork({
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

export async function loadArtworkFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load artwork: ${url}`));
    img.src = url;
  });
}

export async function loadArtworkFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await loadArtworkFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
