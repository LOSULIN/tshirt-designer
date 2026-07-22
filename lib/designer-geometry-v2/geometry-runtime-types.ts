/**
 * Geometry Runtime Switch — types (Phase 69.6).
 */

import type { DesignerGeometryVersion } from "./geometry-version";
import type { GeometryDebugLayerToggles } from "./geometry-debug-types";

export type GeometryExportSurface = "png" | "zip" | "pdf" | "email";

export interface GeometryExportRuntimeToggles {
  png: boolean;
  zip: boolean;
  pdf: boolean;
  email: boolean;
}

export interface GeometryPreviewToggles {
  designer: boolean;
  resultPanel: boolean;
}

export interface GeometryRuntimeState {
  geometryVersion: DesignerGeometryVersion;
  preview: GeometryPreviewToggles;
  exportRuntime: GeometryExportRuntimeToggles;
  debugLayers: GeometryDebugLayerToggles;
}

export interface GeometryRuntimeContextValue extends GeometryRuntimeState {
  isDevConsoleAvailable: boolean;
  isProductionLocked: boolean;
  setGeometryVersion: (version: DesignerGeometryVersion) => void;
  setPreviewToggle: (key: keyof GeometryPreviewToggles, enabled: boolean) => void;
  setExportRuntimeToggle: (key: GeometryExportSurface, enabled: boolean) => void;
  setDebugLayerToggle: (
    key: keyof GeometryDebugLayerToggles,
    enabled: boolean,
  ) => void;
  getEffectiveGeometryVersion: (
    surface: "designer" | "resultPanel" | GeometryExportSurface,
  ) => DesignerGeometryVersion;
}
