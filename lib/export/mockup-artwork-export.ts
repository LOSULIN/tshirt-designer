import { renderPrintExportPng } from "@/lib/print-export-system";
import type { ExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import type { Side, Size } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import type { RenderQuality } from "./render-quality";
import { isExportRenderQuality } from "./render-quality";

export interface MockupArtworkExportOptions {
  side: Side;
  size: Size;
  quality: RenderQuality;
  pixelScale: number;
  pipelineContext?: ExportPipelineContext;
}

/**
 * Print-area artwork for product mockup compose — re-rendered (never upscaled from preview).
 */
export async function renderMockupArtworkPng(
  layers: DesignLayer[],
  options: MockupArtworkExportOptions,
): Promise<Blob> {
  const pixelScale = isExportRenderQuality(options.quality)
    ? Math.max(1, options.pixelScale)
    : 1;

  return renderPrintExportPng(layers, {
    side: options.side,
    size: options.size,
    pixelScale,
    pipelineContext: options.pipelineContext,
  });
}
