/**
 * Export Runtime Snapshot Adapter — Phase 71.0 (infrastructure only).
 *
 * Provides the same Geometry Runtime Snapshot as Designer / ResultPanel for future
 * PNG / ZIP / PDF / Email wiring. Does not modify export engines.
 */

import type { Side } from "@/lib/constants";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";
import {
  resolveEffectiveGeometryVersion,
} from "./geometry-runtime-state";
import type {
  GeometryExportSurface,
  GeometryRuntimeState,
} from "./geometry-runtime-types";
import { resolveGeometryRuntimeSnapshot } from "./resolve-geometry-runtime";
import type { GeometryRuntimeSnapshot } from "./shadow-runtime-types";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

/** Export adapter snapshot — byte-identical to GeometryRuntimeSnapshot (no recompute). */
export type ExportRuntimeSnapshot = GeometryRuntimeSnapshot;

export interface ExportRuntimeGeometry {
  artworkStage: GeometryV2Rect;
  safeArea: GeometryV2Rect;
  factoryOrigin: GeometryV2Point;
  collarBottom: GeometryV2Point;
  /** Artwork stage top edge (px) — same as snapshot.artworkStage.top. */
  printTop: number;
}

/**
 * Export Runtime Snapshot — delegates to resolveGeometryRuntimeSnapshot() only.
 * No Builder, calibration, or Product Master rebuild.
 */
export function resolveExportRuntimeSnapshot(
  side: Side,
  geometryVersion: DesignerGeometryVersion,
): ExportRuntimeSnapshot {
  return resolveGeometryRuntimeSnapshot(side, geometryVersion);
}

/**
 * Export Runtime Geometry view — all fields from snapshot; no derivation.
 */
export function resolveExportRuntimeGeometry(
  side: Side,
  geometryVersion: DesignerGeometryVersion,
): ExportRuntimeGeometry {
  const snapshot = resolveExportRuntimeSnapshot(side, geometryVersion);
  return {
    artworkStage: snapshot.artworkStage,
    safeArea: snapshot.safeArea,
    factoryOrigin: { ...snapshot.factoryOrigin },
    collarBottom: { ...snapshot.collar },
    printTop: snapshot.artworkStage.top,
  };
}

/**
 * Effective geometry version for export surfaces.
 *
 * Delegates to resolveEffectiveGeometryVersion (Phase 74.3 policy):
 * user-facing png/zip/pdf follow runtime policy; email uses exportRuntime.email.
 */
export function resolveEffectiveExportGeometryVersion(
  state: GeometryRuntimeState,
  exportSurface: GeometryExportSurface,
  options?: { productionLocked?: boolean },
): DesignerGeometryVersion {
  return resolveEffectiveGeometryVersion(state, exportSurface, options);
}

/**
 * Resolve export geometry version from toggle (email surface only).
 */
export function resolveExportGeometryVersionFromToggle(
  requested: DesignerGeometryVersion,
  exportToggleEnabled: boolean,
  options?: { productionLocked?: boolean },
): DesignerGeometryVersion {
  void options;
  if (!exportToggleEnabled) {
    return DESIGNER_GEOMETRY_VERSION.V1;
  }
  return requested;
}
