"use client";

import { useMemo } from "react";
import type { Side } from "@/lib/constants";
import {
  GEOMETRY_DEBUG_V1_COLOR,
  GEOMETRY_DEBUG_V2_COLOR,
} from "@/lib/designer-geometry-v2/geometry-debug-types";
import { useGeometryRuntime } from "@/lib/designer-geometry-v2/geometry-runtime-context";
import {
  resolveGeometryRuntime,
  resolveGeometryRuntimeSnapshot,
} from "@/lib/designer-geometry-v2/resolve-geometry-runtime";
import { DESIGNER_GEOMETRY_VERSION } from "@/lib/designer-geometry-v2/geometry-version";
import type { GeometryDebugOverlayShapes } from "@/lib/designer-geometry-v2/geometry-debug-types";

function shapesToSvg(
  shapes: GeometryDebugOverlayShapes,
  color: string,
  toggles: ReturnType<typeof useGeometryRuntime>["debugLayers"],
): string {
  const parts: string[] = [];

  if (toggles.alphaBoundingBox) {
    const b = shapes.alphaBoundingBox;
    parts.push(
      `<rect x="${b.left}" y="${b.top}" width="${b.width}" height="${b.height}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.8"/>`,
    );
  }
  if (toggles.collar) {
    parts.push(
      `<circle cx="${shapes.collar.x}" cy="${shapes.collar.y}" r="6" fill="none" stroke="${color}" stroke-width="2"/>`,
    );
  }
  if (toggles.factoryOrigin) {
    parts.push(
      `<line x1="${shapes.factoryOrigin.x - 8}" y1="${shapes.factoryOrigin.y}" x2="${shapes.factoryOrigin.x + 8}" y2="${shapes.factoryOrigin.y}" stroke="${color}" stroke-width="2"/>`,
      `<line x1="${shapes.factoryOrigin.x}" y1="${shapes.factoryOrigin.y - 8}" x2="${shapes.factoryOrigin.x}" y2="${shapes.factoryOrigin.y + 8}" stroke="${color}" stroke-width="2"/>`,
    );
  }
  if (toggles.artworkStage) {
    const s = shapes.artworkStage;
    parts.push(
      `<rect x="${s.left}" y="${s.top}" width="${s.width}" height="${s.height}" fill="none" stroke="${color}" stroke-width="2"/>`,
    );
  }
  if (toggles.safeArea) {
    const s = shapes.safeArea;
    parts.push(
      `<rect x="${s.left}" y="${s.top}" width="${s.width}" height="${s.height}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.85"/>`,
    );
  }
  if (toggles.center) {
    parts.push(
      `<circle cx="${shapes.center.x}" cy="${shapes.center.y}" r="4" fill="${color}"/>`,
    );
  }
  if (toggles.hem) {
    parts.push(
      `<line x1="${shapes.hem.x - 12}" y1="${shapes.hem.y}" x2="${shapes.hem.x + 12}" y2="${shapes.hem.y}" stroke="${color}" stroke-width="2"/>`,
    );
  }
  if (toggles.shoulder) {
    const sh = shapes.shoulder;
    parts.push(
      `<line x1="${sh.left}" y1="${sh.scanY}" x2="${sh.right}" y2="${sh.scanY}" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 4"/>`,
    );
  }

  return parts.join("");
}

export function GeometryRuntimeDebugOverlay({ side }: { side: Side }) {
  const runtime = useGeometryRuntime();

  const svg = useMemo(() => {
    if (!runtime.isDevConsoleAvailable) return "";

    const resolvedVersion = runtime.getEffectiveGeometryVersion("designer");
    const activeSnapshot = resolveGeometryRuntimeSnapshot(side, resolvedVersion);

    const v1Shapes = resolveGeometryRuntime(side, DESIGNER_GEOMETRY_VERSION.V1)
      .debugShapes;
    const v2Shapes = resolveGeometryRuntime(side, DESIGNER_GEOMETRY_VERSION.V2)
      .debugShapes;

    const v1Part = runtime.debugLayers.v1
      ? shapesToSvg(v1Shapes, GEOMETRY_DEBUG_V1_COLOR, runtime.debugLayers)
      : "";
    const v2Part = runtime.debugLayers.v2
      ? shapesToSvg(v2Shapes, GEOMETRY_DEBUG_V2_COLOR, runtime.debugLayers)
      : "";

    if (!v1Part && !v2Part) return "";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1536" preserveAspectRatio="none" style="width:100%;height:100%;pointer-events:none"><g data-geometry-runtime-version="${resolvedVersion}" data-artwork-stage-top="${activeSnapshot.artworkStage.top}">${v1Part}${v2Part}</g></svg>`;
  }, [runtime, side]);

  if (!svg || (!runtime.debugLayers.v1 && !runtime.debugLayers.v2)) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      data-geometry-runtime-overlay
      data-geometry-version={runtime.getEffectiveGeometryVersion("designer")}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
