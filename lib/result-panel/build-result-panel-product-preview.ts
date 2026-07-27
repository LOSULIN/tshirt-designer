/**
 * ResultPanel product preview — standard compose + reality calibration display.
 * Export compose unchanged; presentation uses split garment + artwork layers.
 */

import type { Side, Size } from "@/lib/constants";
import { hasExportablePrintableDesign } from "@/lib/print-export";
import type { ProductSide } from "@/lib/render/render-types";
import {
  buildArtworkFileName,
  buildProductExportFileName,
  exportArtworkPng,
  resolveExportProductCode,
  resolveRegistryColorSlug,
  type ProductExportInput,
} from "@/lib/export/product-export";
import { renderMockupArtworkPng } from "@/lib/export/mockup-artwork-export";
import {
  fetchMockupVisualCompensationFile,
  fetchProductCalibrationFile,
  resolveRegistryGarmentAssetUrl,
} from "@/lib/products/product-loader";
import { getProductProfile } from "@/lib/products/product-registry";
import { renderProductMockupOnProduct } from "@/components/render/ProductMockupEngine";
import {
  REALITY_CALIBRATION_BASELINE_SIZE,
  REALITY_MOCKUP_CANVAS,
  resolveRealityCalibrationFromPlacement,
} from "./reality-calibration";
import { resolveResultPanelArtworkPlacement } from "./resolve-result-panel-artwork-placement";
import type { ResultPanelDisplayPreview } from "./result-panel-display-preview";

const PREVIEW_QUALITY = "preview" as const;

async function artworkBlobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("artworkBlobToCanvas: 2d context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

async function resolveResultPanelPreviewContext(input: ProductExportInput) {
  const productCode = await resolveExportProductCode(input.productCode);
  const profile = await getProductProfile(productCode);
  const availableSlugs = profile.availableColors.map((color) => color.slug);
  const color = resolveRegistryColorSlug(input.shirtColor, availableSlugs);

  if (!profile.availableSides.includes(input.side)) {
    throw new Error(`${productCode} 不支援 ${input.side} 面匯出`);
  }

  return { productCode, color };
}

async function renderResultPanelProductPreviewFromArtwork(input: {
  productCode: string;
  color: string;
  side: Side;
  artworkBlob: Blob;
  garmentSize: Size;
  pipelineContext?: ProductExportInput["pipelineContext"];
}): Promise<string> {
  const artworkCanvas = await artworkBlobToCanvas(input.artworkBlob);
  const result = await renderProductMockupOnProduct({
    productCode: input.productCode,
    color: input.color,
    side: input.side as ProductSide,
    artwork: artworkCanvas,
    artworkWidth: artworkCanvas.width,
    artworkHeight: artworkCanvas.height,
    quality: PREVIEW_QUALITY,
    garmentSize: input.garmentSize,
    pipelineContext: input.pipelineContext,
  });
  return result.dataUrl;
}

/** ResultPanel hero preview — composeProductMockup + reality calibration display. */
export async function buildResultPanelProductPreview(
  input: ProductExportInput,
): Promise<ResultPanelDisplayPreview | null> {
  if (!hasExportablePrintableDesign(input.layers)) return null;

  const ctx = await resolveResultPanelPreviewContext(input);
  const [artworkBlob, mockupArtwork, calibration, visualCompensation, garmentAssetUrl] =
    await Promise.all([
      exportArtworkPng(input, PREVIEW_QUALITY),
      renderMockupArtworkPng(input.layers, {
        side: input.side,
        size: input.size,
        quality: PREVIEW_QUALITY,
        pixelScale: 1,
        pipelineContext: input.pipelineContext,
      }),
      fetchProductCalibrationFile(ctx.productCode),
      fetchMockupVisualCompensationFile(ctx.productCode),
      resolveRegistryGarmentAssetUrl(
        ctx.productCode,
        input.side as ProductSide,
        ctx.color,
      ),
    ]);

  const mockupVisualScale = visualCompensation.mockupVisualScale;
  const baselinePlacement = resolveResultPanelArtworkPlacement(
    calibration,
    input.side,
    REALITY_CALIBRATION_BASELINE_SIZE,
    mockupVisualScale,
  );
  const artworkPlacement = resolveResultPanelArtworkPlacement(
    calibration,
    input.side,
    input.size,
    mockupVisualScale,
  );
  const reality = resolveRealityCalibrationFromPlacement(
    input.size,
    input.side,
    artworkPlacement,
    baselinePlacement,
  );

  const artworkUrl = URL.createObjectURL(artworkBlob);
  const mockupArtworkUrl = URL.createObjectURL(mockupArtwork);
  const productUrl = await renderResultPanelProductPreviewFromArtwork({
    productCode: ctx.productCode,
    color: ctx.color,
    side: input.side,
    artworkBlob: mockupArtwork,
    garmentSize: input.size,
    pipelineContext: input.pipelineContext,
  });

  return {
    productCode: ctx.productCode,
    color: ctx.color,
    side: input.side,
    artworkUrl,
    productUrl,
    artworkFileName: buildArtworkFileName(),
    productFileName: buildProductExportFileName(
      ctx.productCode,
      input.side,
      ctx.color,
    ),
    display: {
      garmentAssetUrl,
      mockupArtworkUrl,
      artworkPlacement,
      reality,
      canvasWidth: REALITY_MOCKUP_CANVAS.width,
      canvasHeight: REALITY_MOCKUP_CANVAS.height,
    },
  };
}
