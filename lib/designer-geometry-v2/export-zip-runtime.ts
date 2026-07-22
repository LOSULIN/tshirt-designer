/**
 * ZIP Bundle Export Runtime Adapter — Phase 71.3.
 *
 * Delegates product export bundle to buildProductExportFiles with resolved
 * ExportPipelineContext. Does not recompute geometry or render artifacts.
 */

import type { Side } from "@/lib/constants";
import type {
  ProductExportFiles,
  ProductExportInput,
} from "@/lib/export/product-export";
import type { ExportPipelineContext } from "./export-pipeline-context";
import { resolveExportPipelineContext } from "./export-pipeline-context";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";
import type { GeometryExportSurface } from "./geometry-runtime-types";
import type { ProductMockupRuntimeCompareLog } from "./product-mockup-runtime";

export interface ZipExportRuntimeDescriptor {
  geometryVersion: DesignerGeometryVersion;
  pipelineContext: ExportPipelineContext;
  side: Side;
  size: string;
}

export interface ZipExportRuntimeCompareLog {
  v1: ZipExportRuntimeDescriptor;
  v2: ZipExportRuntimeDescriptor;
  geometryVersionChanged: boolean;
  photoStageTopPercentDelta: number | null;
  visualCompensationDeltaY: number;
  productMockupPlacement?: ProductMockupRuntimeCompareLog | null;
}

const ZIP_EXPORT_SURFACE: GeometryExportSurface = "zip";

/**
 * Resolve pipeline context for ZIP export surface (delegate only).
 */
export function resolveZipExportPipelineContext(
  input: Pick<ProductExportInput, "side" | "size">,
  geometryVersion?: DesignerGeometryVersion,
): ExportPipelineContext {
  return resolveExportPipelineContext({
    side: input.side,
    size: input.size,
    surface: ZIP_EXPORT_SURFACE,
    geometryVersion,
  });
}

/**
 * Merge pipeline context into product export input — passthrough fields preserved.
 */
export function resolveZipExportRuntimeInput(
  input: ProductExportInput,
  pipelineContext?: ExportPipelineContext,
): ProductExportInput {
  const context =
    pipelineContext ??
    resolveZipExportPipelineContext(input, input.geometryVersion);

  return {
    ...input,
    geometryVersion: context.geometryVersion,
    pipelineContext: context,
  };
}

function buildZipExportRuntimeDescriptor(
  input: ProductExportInput,
  pipelineContext: ExportPipelineContext,
): ZipExportRuntimeDescriptor {
  return {
    geometryVersion: pipelineContext.geometryVersion,
    pipelineContext,
    side: input.side,
    size: input.size,
  };
}

function isZipRuntimeCompareEnabled(): boolean {
  return process.env.EXPORT_PRODUCT_RUNTIME_COMPARE === "true";
}

export function buildZipExportRuntimeCompareLog(
  input: ProductExportInput,
  v1Context: ExportPipelineContext,
  v2Context: ExportPipelineContext,
  productMockupPlacement?: ProductMockupRuntimeCompareLog | null,
): ZipExportRuntimeCompareLog {
  const v1 = buildZipExportRuntimeDescriptor(input, v1Context);
  const v2 = buildZipExportRuntimeDescriptor(input, v2Context);

  const v1Stage = v1Context.photoBridge?.photoArtworkStage;
  const v2Stage = v2Context.photoBridge?.photoArtworkStage;
  const photoStageTopPercentDelta =
    v1Stage && v2Stage
      ? v2Stage.topPercent - v1Stage.topPercent
      : null;

  return {
    v1,
    v2,
    geometryVersionChanged:
      v1.geometryVersion !== v2.geometryVersion,
    photoStageTopPercentDelta,
    visualCompensationDeltaY:
      v2Context.visualCompensation.offsetYPercent -
      v1Context.visualCompensation.offsetYPercent,
    productMockupPlacement,
  };
}

/**
 * Shadow runtime — V1 vs V2 ZIP context when EXPORT_PRODUCT_RUNTIME_COMPARE=true.
 * Does not affect bundle output.
 */
export function maybeLogZipExportRuntimeCompare(
  input: ProductExportInput,
  pipelineContext?: ExportPipelineContext,
  productMockupPlacement?: ProductMockupRuntimeCompareLog | null,
): void {
  if (!isZipRuntimeCompareEnabled()) return;

  const v1Context = resolveZipExportPipelineContext(
    input,
    DESIGNER_GEOMETRY_VERSION.V1,
  );
  const v2Context = resolveZipExportPipelineContext(
    input,
    DESIGNER_GEOMETRY_VERSION.V2,
  );

  const log = buildZipExportRuntimeCompareLog(
    input,
    v1Context,
    v2Context,
    productMockupPlacement,
  );

  console.info("[EXPORT_PRODUCT_RUNTIME_COMPARE] ZIP Bundle Runtime", {
    side: input.side,
    size: input.size,
    activeVersion: pipelineContext?.geometryVersion ?? v1Context.geometryVersion,
    geometryVersionChanged: log.geometryVersionChanged,
    photoStageTopPercentDelta: log.photoStageTopPercentDelta,
    visualCompensationDeltaY: log.visualCompensationDeltaY,
    productMockupPlacementDelta: log.productMockupPlacement?.delta ?? null,
  });
}

/**
 * Build product export bundle files — delegates to buildProductExportFiles only.
 */
export async function buildZipExportRuntimeBundle(
  input: ProductExportInput,
  pipelineContext?: ExportPipelineContext,
): Promise<ProductExportFiles> {
  const resolvedInput = resolveZipExportRuntimeInput(input, pipelineContext);
  maybeLogZipExportRuntimeCompare(input, resolvedInput.pipelineContext);
  const { buildProductExportFiles } = await import("@/lib/export/product-export");
  return buildProductExportFiles(resolvedInput);
}

/**
 * Download artwork + product PNGs as bundle — delegates to downloadProductExportBundle.
 */
export async function downloadZipExportRuntimeBundle(
  input: ProductExportInput,
  pipelineContext?: ExportPipelineContext,
): Promise<ProductExportFiles> {
  const resolvedInput = resolveZipExportRuntimeInput(input, pipelineContext);
  maybeLogZipExportRuntimeCompare(input, resolvedInput.pipelineContext);
  const { downloadProductExportBundle } = await import(
    "@/lib/export/product-export"
  );
  return downloadProductExportBundle(resolvedInput);
}
