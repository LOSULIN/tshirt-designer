/**
 * Export Pipeline Context — Pre-71.1 version-aware adapter (plumbing only).
 *
 * Single injection point for export geometry version + runtime snapshot.
 * Export engines accept but do not read context until Phase 71.1+.
 */

import type { Side } from "@/lib/constants";
import type { PhotoArtworkStageBridge } from "@/lib/presentation/product-photo-bridge";
import {
  resolveRuntimeVisualCompensation,
  type ProductPreviewVisualCompensationAxis,
} from "@/lib/presentation/visual-compensation";
import {
  resolveEffectiveExportGeometryVersion,
  resolveExportGeometryVersionFromToggle,
  resolveExportRuntimeGeometry,
  resolveExportRuntimeSnapshot,
  type ExportRuntimeGeometry,
  type ExportRuntimeSnapshot,
} from "./export-runtime-snapshot";
import { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";
import {
  isGeometryRuntimeProductionLocked,
  resolveProductionGeometryVersion,
} from "./geometry-runtime-state";
import type {
  GeometryExportSurface,
  GeometryRuntimeState,
} from "./geometry-runtime-types";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";

/** Visual compensation axis resolved for the active geometry version. */
export type RuntimeVisualCompensation = ProductPreviewVisualCompensationAxis;

/** Photo bridge output for mockup / presentation surfaces. */
export type GeometryRuntimePhotoBridge = PhotoArtworkStageBridge;

export interface ExportPipelineContext {
  geometryVersion: DesignerGeometryVersion;
  snapshot?: ExportRuntimeSnapshot;
  geometry?: ExportRuntimeGeometry;
  visualCompensation: RuntimeVisualCompensation;
  photoBridge?: GeometryRuntimePhotoBridge;
}

export interface ResolveExportPipelineContextInput {
  side: Side;
  size?: string;
  surface: GeometryExportSurface;
  requestedVersion?: DesignerGeometryVersion;
  productionLocked?: boolean;
  /** Pre-resolved effective version (e.g. from getEffectiveGeometryVersion). */
  geometryVersion?: DesignerGeometryVersion;
  /** Full runtime state — resolves via resolveEffectiveExportGeometryVersion. */
  state?: GeometryRuntimeState;
}

function resolveEffectiveVersion(
  input: ResolveExportPipelineContextInput,
): DesignerGeometryVersion {
  if (input.geometryVersion != null) {
    return input.geometryVersion;
  }

  if (input.state != null) {
    return resolveEffectiveExportGeometryVersion(input.state, input.surface, {
      productionLocked: input.productionLocked,
    });
  }

  const productionLocked =
    input.productionLocked ?? isGeometryRuntimeProductionLocked();
  if (productionLocked) {
    return resolveProductionGeometryVersion();
  }

  const requested =
    input.requestedVersion ?? DESIGNER_GEOMETRY_VERSION.V1;
  const exportToggleEnabled = requested === DESIGNER_GEOMETRY_VERSION.V2;
  return resolveExportGeometryVersionFromToggle(requested, exportToggleEnabled, {
    productionLocked,
  });
}

/**
 * Resolve export pipeline context — delegates only; no geometry recomputation.
 */
export function resolveExportPipelineContext(
  input: ResolveExportPipelineContextInput,
): ExportPipelineContext {
  const { side } = input;
  const size = input.size ?? "M";
  const geometryVersion = resolveEffectiveVersion(input);

  const visualCompensation = resolveRuntimeVisualCompensation({
    side,
    geometryVersion,
    surface: "export",
  });

  if (geometryVersion === DESIGNER_GEOMETRY_VERSION.V2) {
    const snapshot = resolveExportRuntimeSnapshot(side, geometryVersion);
    const geometry = resolveExportRuntimeGeometry(side, geometryVersion);
    const photoBridge = resolveGeometryRuntimePhotoBridge({
      side,
      size,
      geometryVersion,
    });

    return {
      geometryVersion,
      snapshot,
      geometry,
      visualCompensation,
      photoBridge,
    };
  }

  return {
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
    snapshot: undefined,
    geometry: undefined,
    visualCompensation,
    photoBridge: undefined,
  };
}
