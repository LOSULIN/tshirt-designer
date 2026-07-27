/**
 * Geometry Runtime Switch — default state & production lock.
 */

import { DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES } from "./geometry-debug-types";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";
import type {
  GeometryExportRuntimeToggles,
  GeometryExportSurface,
  GeometryPreviewToggles,
  GeometryRuntimeState,
} from "./geometry-runtime-types";
import {
  isUserFacingRuntimeSurface,
  resolveRuntimePolicyEffectiveGeometryVersion,
} from "./runtime-effective-version-policy";

export const DEFAULT_GEOMETRY_PREVIEW_TOGGLES: GeometryPreviewToggles = {
  designer: true,
  resultPanel: true,
};

export const DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES: GeometryExportRuntimeToggles =
  {
    png: false,
    zip: false,
    pdf: false,
    email: false,
  };

export function createDefaultGeometryRuntimeState(): GeometryRuntimeState {
  return {
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    preview: { ...DEFAULT_GEOMETRY_PREVIEW_TOGGLES },
    exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES },
    debugLayers: {
      ...DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
      v1: true,
      v2: true,
    },
  };
}

export function isGeometryRuntimeDevConsoleAvailable(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isGeometryRuntimeProductionLocked(): boolean {
  return process.env.NODE_ENV === "production";
}

export function resolveProductionGeometryVersion(): DesignerGeometryVersion {
  return ACTIVE_DESIGNER_GEOMETRY_VERSION;
}

export function resolveEffectiveGeometryVersion(
  state: GeometryRuntimeState,
  surface: "designer" | "resultPanel" | GeometryExportSurface,
  options?: { productionLocked?: boolean },
): DesignerGeometryVersion {
  if (isUserFacingRuntimeSurface(surface)) {
    return resolveRuntimePolicyEffectiveGeometryVersion(state, options);
  }

  // Email — unchanged; gated by exportRuntime.email only.
  if (options?.productionLocked ?? isGeometryRuntimeProductionLocked()) {
    return resolveProductionGeometryVersion();
  }

  if (!state.exportRuntime.email) {
    return DESIGNER_GEOMETRY_VERSION.V1;
  }

  return state.geometryVersion;
}
