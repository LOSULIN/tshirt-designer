/**
 * Geometry Runtime Switch — unified geometry resolver entry.
 *
 * Dispatches V1 → frozen runtime snapshots; V2 → Product Master snapshot.
 * Does not modify Builder, Measurement, or Projection algorithms.
 */

import type { Side } from "@/lib/constants";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";
import {
  resolveGeometryDebugV1Shapes,
  resolveGeometryDebugV2Shapes,
} from "./geometry-debug-overlay";
import type { GeometryDebugOverlayShapes } from "./geometry-debug-types";
import { resolveFactoryAnchorRuntimeSnapshot } from "./product-factory-anchor";
import { resolveGeometryV1RuntimeSnapshot } from "./shadow-runtime";
import type { GeometryRuntimeSnapshot } from "./shadow-runtime-types";
import { resolveEffectiveGeometryVersion } from "./geometry-runtime-state";
import type { GeometryRuntimeState } from "./geometry-runtime-types";

export interface GeometryRuntimeResolved {
  version: DesignerGeometryVersion;
  side: Side;
  snapshot: GeometryRuntimeSnapshot;
  debugShapes: GeometryDebugOverlayShapes;
}

export function resolveGeometryRuntimeSnapshot(
  side: Side,
  version: DesignerGeometryVersion,
): GeometryRuntimeSnapshot {
  if (version === DESIGNER_GEOMETRY_VERSION.V2) {
    return resolveFactoryAnchorRuntimeSnapshot(side);
  }
  return resolveGeometryV1RuntimeSnapshot(side);
}

export function resolveGeometryRuntimeDebugShapes(
  side: Side,
  version: DesignerGeometryVersion,
): GeometryDebugOverlayShapes {
  if (version === DESIGNER_GEOMETRY_VERSION.V2) {
    return resolveGeometryDebugV2Shapes(side);
  }
  return resolveGeometryDebugV1Shapes(side);
}

/** Unified resolver — single entry for Designer + ResultPanel + Debug. */
export function resolveGeometryRuntime(
  side: Side,
  version: DesignerGeometryVersion,
): GeometryRuntimeResolved {
  return {
    version,
    side,
    snapshot: resolveGeometryRuntimeSnapshot(side, version),
    debugShapes: resolveGeometryRuntimeDebugShapes(side, version),
  };
}

export function resolveGeometryRuntimeForSurface(
  state: GeometryRuntimeState,
  side: Side,
  surface: "designer" | "resultPanel",
  options?: { productionLocked?: boolean },
): GeometryRuntimeResolved {
  const version = resolveEffectiveGeometryVersion(state, surface, options);
  return resolveGeometryRuntime(side, version);
}
