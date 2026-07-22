import { renderFactoryArtworkExportPng } from "@/lib/export-artwork-factory";
import type { ExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import type { Side } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import type { RenderQuality } from "./render-quality";
import { isExportRenderQuality } from "./render-quality";

export interface ProductFactoryArtworkExportOptions {
  side: Side;
  size: string;
  quality: RenderQuality;
  pixelScale: number;
  pipelineContext?: ExportPipelineContext;
}

/**
 * Factory artwork for Product Export — re-renders at higher pixel density on export.
 * Smart DPI / BBox / placement unchanged; pixelScale multiplies canvas output only.
 */
export async function renderProductFactoryArtworkPng(
  layers: DesignLayer[],
  options: ProductFactoryArtworkExportOptions,
): Promise<Blob> {
  const pixelScale = isExportRenderQuality(options.quality)
    ? Math.max(1, options.pixelScale)
    : 1;

  return renderFactoryArtworkExportPng(layers, {
    side: options.side,
    size: options.size,
    pixelScale,
    pipelineContext: options.pipelineContext,
  });
}
