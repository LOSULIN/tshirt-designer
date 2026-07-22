/**
 * Runtime Download Forward — Phase 73.1 canonical download entry resolvers.
 *
 * Single forward per download surface. Owns effective version + pipeline context only.
 * Does not render or recompute geometry.
 */

import type { ProductExportInput } from "@/lib/export/product-export";
import type { ExportPipelineContext } from "./export-pipeline-context";
import { resolveExportPipelineContext } from "./export-pipeline-context";
import { resolveZipExportPipelineContext } from "./export-zip-runtime";
import { isGeometryRuntimeProductionLocked } from "./geometry-runtime-state";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";

const PNG_EXPORT_SURFACE = "png" as const;

export interface RuntimeDownloadForward {
  geometryVersion: DesignerGeometryVersion;
  pipelineContext: ExportPipelineContext;
}

export function resolveEffectiveDownloadGeometryVersion(
  geometryVersion: DesignerGeometryVersion,
  options?: { productionLocked?: boolean },
): DesignerGeometryVersion {
  const productionLocked =
    options?.productionLocked ?? isGeometryRuntimeProductionLocked();
  if (productionLocked) {
    return DESIGNER_GEOMETRY_VERSION.V1;
  }
  return geometryVersion;
}

function resolvePngDownloadForward(
  input: Pick<ProductExportInput, "side" | "size">,
  geometryVersion: DesignerGeometryVersion,
  options?: { productionLocked?: boolean },
): RuntimeDownloadForward {
  const effectiveVersion = resolveEffectiveDownloadGeometryVersion(
    geometryVersion,
    options,
  );
  const pipelineContext = resolveExportPipelineContext({
    side: input.side,
    size: input.size,
    surface: PNG_EXPORT_SURFACE,
    geometryVersion: effectiveVersion,
  });

  return {
    geometryVersion: pipelineContext.geometryVersion,
    pipelineContext,
  };
}

/**
 * Download artwork — canonical forward from effective png geometry version.
 */
export function resolveArtworkRuntimeForwardFromEffectiveVersion(
  input: Pick<ProductExportInput, "side" | "size">,
  geometryVersion: DesignerGeometryVersion,
  options?: { productionLocked?: boolean },
): RuntimeDownloadForward {
  return resolvePngDownloadForward(input, geometryVersion, options);
}

/**
 * Download product mockup — canonical forward from effective png geometry version.
 */
export function resolveProductMockupRuntimeForwardFromEffectiveVersion(
  input: Pick<ProductExportInput, "side" | "size">,
  geometryVersion: DesignerGeometryVersion,
  options?: { productionLocked?: boolean },
): RuntimeDownloadForward {
  return resolvePngDownloadForward(input, geometryVersion, options);
}

/**
 * Download ZIP bundle — canonical forward from effective zip geometry version.
 */
export function resolveZipRuntimeForwardFromEffectiveVersion(
  input: Pick<ProductExportInput, "side" | "size">,
  geometryVersion: DesignerGeometryVersion,
  options?: { productionLocked?: boolean },
): RuntimeDownloadForward {
  const effectiveVersion = resolveEffectiveDownloadGeometryVersion(
    geometryVersion,
    options,
  );
  const pipelineContext = resolveZipExportPipelineContext(
    input,
    effectiveVersion,
  );

  return {
    geometryVersion: pipelineContext.geometryVersion,
    pipelineContext,
  };
}

export function applyRuntimeDownloadForward(
  input: ProductExportInput,
  forward: RuntimeDownloadForward,
): ProductExportInput {
  return {
    ...input,
    geometryVersion: forward.geometryVersion,
    pipelineContext: forward.pipelineContext,
  };
}

/**
 * Legacy inline path — used by regression to prove byte-identical pipeline context.
 * @internal
 */
export function resolveLegacyInlineDownloadPipelineContext(
  input: Pick<ProductExportInput, "side" | "size">,
  geometryVersion: DesignerGeometryVersion,
  surface: "png" | "zip",
  options?: { productionLocked?: boolean },
): ExportPipelineContext {
  const effectiveVersion = resolveEffectiveDownloadGeometryVersion(
    geometryVersion,
    options,
  );

  if (surface === "zip") {
    return resolveZipExportPipelineContext(input, effectiveVersion);
  }

  return resolveExportPipelineContext({
    side: input.side,
    size: input.size,
    surface: PNG_EXPORT_SURFACE,
    geometryVersion: effectiveVersion,
  });
}

function pipelineContextsEquivalent(
  left: ExportPipelineContext,
  right: ExportPipelineContext,
): boolean {
  if (left.geometryVersion !== right.geometryVersion) return false;
  if (
    left.photoBridge?.photoArtworkStage?.topPercent !==
    right.photoBridge?.photoArtworkStage?.topPercent
  ) {
    return false;
  }
  if (
    left.visualCompensation.offsetYPercent !==
    right.visualCompensation.offsetYPercent
  ) {
    return false;
  }
  if (left.snapshot?.artworkStage.top !== right.snapshot?.artworkStage.top) {
    return false;
  }
  return true;
}

export function runtimeDownloadForwardsMatch(
  left: RuntimeDownloadForward,
  right: RuntimeDownloadForward,
): boolean {
  return pipelineContextsEquivalent(left.pipelineContext, right.pipelineContext);
}
