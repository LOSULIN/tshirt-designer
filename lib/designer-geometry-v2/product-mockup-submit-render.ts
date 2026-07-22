/**
 * Proof submit product mockup render — Phase 72.4.
 * Separated from forward resolver to keep regression imports lean.
 */

import type { ShirtColor, Side, Size } from "@/lib/constants";
import { renderProductMockupOnProduct } from "@/components/render/ProductMockupEngine";
import {
  resolveExportProductCode,
  resolveRegistryColorSlug,
} from "@/lib/export/product-export";
import { renderMockupArtworkPng } from "@/lib/export/mockup-artwork-export";
import {
  artworkBlobToCanvas,
  canvasToPngBlob,
} from "@/lib/export/render-export";
import { getProductProfile } from "@/lib/products/product-registry";
import type { DesignLayer } from "@/lib/types";
import type { ProductSide } from "@/lib/render/render-types";
import { loadAsset } from "@/lib/render/asset-loader";
import type { ExportPipelineContext } from "./export-pipeline-context";
import type { ProductMockupRuntimeProductInput } from "./product-mockup-runtime";
import { buildProductMockupRuntimeCompareLogForTest } from "./product-mockup-runtime";

const PROOF_MOCKUP_PREVIEW_QUALITY = "preview" as const;

function isSubmitMockupRuntimeCompareEnabled(): boolean {
  return process.env.EXPORT_PRODUCT_RUNTIME_COMPARE === "true";
}

export function maybeLogProofSubmitMockupRuntimeCompare(params: {
  side: Side;
  size: string;
  pipelineContext?: ExportPipelineContext;
  product: ProductMockupRuntimeProductInput;
}): void {
  if (!isSubmitMockupRuntimeCompareEnabled()) return;

  const log = buildProductMockupRuntimeCompareLogForTest(
    params.pipelineContext,
    params.product,
    params.size,
  );

  console.info("[EXPORT_PRODUCT_RUNTIME_COMPARE] Submit Mockup Runtime", {
    path: "submit",
    side: params.side,
    size: params.size,
    geometryVersion: params.pipelineContext?.geometryVersion ?? "v1",
    legacyPlacement: log.legacyPlacement,
    runtimePlacement: log.runtimePlacement,
    delta: log.delta,
    visualCompensation: log.visualCompensation,
    photoBridgeStage: log.photoBridge?.photoArtworkStage,
  });
}

export interface RenderProofSubmitProductMockupInput {
  side: Side;
  shirtColor: ShirtColor;
  layers: DesignLayer[];
  size?: string;
  pipelineContext?: ExportPipelineContext;
}

/**
 * Proof submit product mockup — delegates renderProductMockupOnProduct + composeProductMockup.
 */
export async function renderProofSubmitProductMockupPng(
  input: RenderProofSubmitProductMockupInput,
): Promise<Blob> {
  const garmentSize = (input.size ?? "M") as Size;
  const productCode = await resolveExportProductCode();
  const profile = await getProductProfile(productCode);
  const color = resolveRegistryColorSlug(
    input.shirtColor,
    profile.colors.map((item) => item.slug),
  );

  const artworkBlob = await renderMockupArtworkPng(input.layers, {
    side: input.side,
    size: garmentSize,
    quality: PROOF_MOCKUP_PREVIEW_QUALITY,
    pixelScale: 1,
    pipelineContext: input.pipelineContext,
  });

  if (isSubmitMockupRuntimeCompareEnabled()) {
    const asset = await loadAsset(productCode, color, input.side as ProductSide, {
      quality: PROOF_MOCKUP_PREVIEW_QUALITY,
    });
    maybeLogProofSubmitMockupRuntimeCompare({
      side: input.side,
      size: garmentSize,
      pipelineContext: input.pipelineContext,
      product: {
        calibration: asset.calibration,
        side: input.side as ProductSide,
        mockupVisualScale: asset.mockupVisualScale,
        canvasWidth: asset.naturalWidth,
        canvasHeight: asset.naturalHeight,
      },
    });
  }

  const artworkCanvas = await artworkBlobToCanvas(artworkBlob);
  const result = await renderProductMockupOnProduct({
    productCode,
    color,
    side: input.side as ProductSide,
    artwork: artworkCanvas,
    artworkWidth: artworkCanvas.width,
    artworkHeight: artworkCanvas.height,
    quality: PROOF_MOCKUP_PREVIEW_QUALITY,
    garmentSize,
    pipelineContext: input.pipelineContext,
  });

  return canvasToPngBlob(result.canvas);
}
