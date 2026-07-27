/**
 * Runtime Effective Version Policy — Phase 74.3.
 *
 * Single authoritative resolver for user-facing runtime decisions.
 * Preview, Submit, and Download must derive the same effective geometry version
 * from the same GeometryRuntimeState.
 *
 * Does not compute geometry, placement, or pipeline context.
 */

import type {
  GeometryExportSurface,
  GeometryRuntimeState,
} from "./geometry-runtime-types";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";

export type UserFacingRuntimeSurface =
  | "designer"
  | "resultPanel"
  | Extract<GeometryExportSurface, "png" | "zip" | "pdf">;

const USER_FACING_RUNTIME_SURFACES = new Set<UserFacingRuntimeSurface>([
  "designer",
  "resultPanel",
  "png",
  "zip",
  "pdf",
]);

export function isUserFacingRuntimeSurface(
  surface: "designer" | "resultPanel" | GeometryExportSurface,
): surface is UserFacingRuntimeSurface {
  return USER_FACING_RUNTIME_SURFACES.has(surface as UserFacingRuntimeSurface);
}

/**
 * Canonical user-facing effective geometry version.
 *
 * Phase 78: defaults to state.geometryVersion (V2). Debug console may set V1 legacy.
 * Production no longer forces V1. exportRuntime.* toggles do not gate user-facing surfaces.
 */
export function resolveRuntimePolicyEffectiveGeometryVersion(
  state: GeometryRuntimeState,
  options?: { productionLocked?: boolean },
): DesignerGeometryVersion {
  void options;
  return state.geometryVersion;
}
