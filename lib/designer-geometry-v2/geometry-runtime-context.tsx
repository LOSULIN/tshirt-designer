"use client";

/**
 * Geometry Runtime Context — React state (Phase 69.6).
 *
 * Development: instant V1/V2 legacy switch via debug console.
 * Production: V2 default; console hidden (no runtime mutation).
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GeometryDebugLayerToggles } from "./geometry-debug-types";
import type { DesignerGeometryVersion } from "./geometry-version";
import {
  createDefaultGeometryRuntimeState,
  isGeometryRuntimeDevConsoleAvailable,
  isGeometryRuntimeProductionLocked,
  resolveEffectiveGeometryVersion,
} from "./geometry-runtime-state";
import type {
  GeometryExportSurface,
  GeometryPreviewToggles,
  GeometryRuntimeContextValue,
  GeometryRuntimeState,
} from "./geometry-runtime-types";

const GeometryRuntimeContext =
  createContext<GeometryRuntimeContextValue | null>(null);

export function GeometryRuntimeProvider({ children }: { children: ReactNode }) {
  const productionLocked = isGeometryRuntimeProductionLocked();
  const devConsoleAvailable = isGeometryRuntimeDevConsoleAvailable();

  const [state, setState] = useState<GeometryRuntimeState>(() =>
    createDefaultGeometryRuntimeState(),
  );

  const setGeometryVersion = useCallback(
    (version: DesignerGeometryVersion) => {
      if (productionLocked) return;
      setState((prev) => ({ ...prev, geometryVersion: version }));
    },
    [productionLocked],
  );

  const setPreviewToggle = useCallback(
    (key: keyof GeometryPreviewToggles, enabled: boolean) => {
      if (productionLocked) return;
      setState((prev) => ({
        ...prev,
        preview: { ...prev.preview, [key]: enabled },
      }));
    },
    [productionLocked],
  );

  const setExportRuntimeToggle = useCallback(
    (key: GeometryExportSurface, enabled: boolean) => {
      if (productionLocked) return;
      setState((prev) => ({
        ...prev,
        exportRuntime: { ...prev.exportRuntime, [key]: enabled },
      }));
    },
    [productionLocked],
  );

  const setDebugLayerToggle = useCallback(
    (key: keyof GeometryDebugLayerToggles, enabled: boolean) => {
      if (productionLocked) return;
      setState((prev) => ({
        ...prev,
        debugLayers: { ...prev.debugLayers, [key]: enabled },
      }));
    },
    [productionLocked],
  );

  const getEffectiveGeometryVersion = useCallback(
    (surface: "designer" | "resultPanel" | GeometryExportSurface) =>
      resolveEffectiveGeometryVersion(state, surface, { productionLocked }),
    [state, productionLocked],
  );

  const value = useMemo<GeometryRuntimeContextValue>(
    () => ({
      ...state,
      geometryVersion: state.geometryVersion,
      isDevConsoleAvailable: devConsoleAvailable && !productionLocked,
      isProductionLocked: productionLocked,
      setGeometryVersion,
      setPreviewToggle,
      setExportRuntimeToggle,
      setDebugLayerToggle,
      getEffectiveGeometryVersion,
    }),
    [
      state,
      productionLocked,
      devConsoleAvailable,
      setGeometryVersion,
      setPreviewToggle,
      setExportRuntimeToggle,
      setDebugLayerToggle,
      getEffectiveGeometryVersion,
    ],
  );

  return (
    <GeometryRuntimeContext.Provider value={value}>
      {children}
    </GeometryRuntimeContext.Provider>
  );
}

export function useGeometryRuntime(): GeometryRuntimeContextValue {
  const context = useContext(GeometryRuntimeContext);
  if (!context) {
    throw new Error(
      "useGeometryRuntime must be used within GeometryRuntimeProvider",
    );
  }
  return context;
}

export function useGeometryRuntimeOptional():
  | GeometryRuntimeContextValue
  | null {
  return useContext(GeometryRuntimeContext);
}
