/**
 * Geometry Runtime — export orchestration (download entry points).
 * Pipeline context resolution delegated to runtime-download-forward.ts (Phase 73.1).
 */

import {
  downloadArtworkExport,
  downloadProductExport,
  type ProductExportInput,
} from "@/lib/export/product-export";
import { resolveExportGeometryVersionFromToggle } from "./export-runtime-snapshot";
import { downloadZipExportRuntimeBundle } from "./export-zip-runtime";
import type { DesignerGeometryVersion } from "./geometry-version";
import type { GeometryExportSurface } from "./geometry-runtime-types";
import {
  applyRuntimeDownloadForward,
  resolveArtworkRuntimeForwardFromEffectiveVersion,
  resolveProductMockupRuntimeForwardFromEffectiveVersion,
  resolveZipRuntimeForwardFromEffectiveVersion,
} from "./runtime-download-forward";

export function resolveExportGeometryVersion(
  requested: DesignerGeometryVersion,
  exportSurface: GeometryExportSurface,
  exportToggleEnabled: boolean,
  productionLocked: boolean,
): DesignerGeometryVersion {
  void exportSurface;
  return resolveExportGeometryVersionFromToggle(requested, exportToggleEnabled, {
    productionLocked,
  });
}

export async function downloadArtworkExportWithGeometryRuntime(
  input: ProductExportInput,
  geometryVersion: DesignerGeometryVersion,
): Promise<void> {
  const forward = resolveArtworkRuntimeForwardFromEffectiveVersion(
    input,
    geometryVersion,
  );
  await downloadArtworkExport(applyRuntimeDownloadForward(input, forward));
}

export async function downloadProductExportWithGeometryRuntime(
  input: ProductExportInput,
  geometryVersion: DesignerGeometryVersion,
): Promise<void> {
  const forward = resolveProductMockupRuntimeForwardFromEffectiveVersion(
    input,
    geometryVersion,
  );
  await downloadProductExport(applyRuntimeDownloadForward(input, forward));
}

export async function downloadProductExportBundleWithGeometryRuntime(
  input: ProductExportInput,
  geometryVersion: DesignerGeometryVersion,
): Promise<import("@/lib/export/product-export").ProductExportFiles> {
  const forward = resolveZipRuntimeForwardFromEffectiveVersion(
    input,
    geometryVersion,
  );
  return downloadZipExportRuntimeBundle(input, forward.pipelineContext);
}
