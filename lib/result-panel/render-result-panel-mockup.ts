import { loadAsset } from "@/lib/render/asset-loader";
import type {
  ProductCalibration,
  RenderEngineInput,
  RenderResult,
} from "@/lib/render/render-types";
import { composeResultPanelMockup } from "./compose-result-panel-mockup";

export interface ResultPanelMockupEngineInput extends RenderEngineInput {
  garmentSize?: string;
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/** ResultPanel-only mockup render — silhouette compensation, frozen placement. */
export async function renderResultPanelMockupOnProduct(
  input: ResultPanelMockupEngineInput,
): Promise<RenderResult> {
  const asset = await loadAsset(input.productCode, input.color, input.side, {
    quality: input.quality ?? "preview",
  });

  const { canvas, width, height } = composeResultPanelMockup({
    asset,
    artwork: input.artwork,
    artworkWidth: input.artworkWidth,
    artworkHeight: input.artworkHeight,
    garmentSize: input.garmentSize,
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

export interface RenderResultPanelMockupWithCalibrationInput
  extends ResultPanelMockupEngineInput {
  calibration: ProductCalibration;
}

export async function renderResultPanelMockupWithCalibration(
  input: RenderResultPanelMockupWithCalibrationInput,
): Promise<RenderResult> {
  const asset = await loadAsset(input.productCode, input.color, input.side);
  const assetWithCalibration = { ...asset, calibration: input.calibration };

  const { canvas, width, height } = composeResultPanelMockup({
    asset: assetWithCalibration,
    artwork: input.artwork,
    artworkWidth: input.artworkWidth,
    artworkHeight: input.artworkHeight,
    garmentSize: input.garmentSize,
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
