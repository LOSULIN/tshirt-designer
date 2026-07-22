/**
 * Designer Runtime Workspace — Geometry Runtime Snapshot → canvas CSS rects.
 *
 * Phase 70.2: Designer blue/orange overlays driven by resolveGeometryRuntimeSnapshot().
 * Does not modify Projection, Coordinate, or Photo Bridge engines.
 */

import type { Side } from "@/lib/constants";
import { buildUiPrintAreaContainerStyleFromPx } from "@/lib/coordinates/ui-print-offset";
import {
  METRICS_TEMPLATE_HEIGHT_PX,
  METRICS_TEMPLATE_WIDTH_PX,
} from "@/lib/garment-metrics/constants";
import type { DesignerGeometryVersion } from "./geometry-version";
import { resolveGeometryRuntimeSnapshot } from "./resolve-geometry-runtime";
import type { GeometryRuntimeSnapshot } from "./shadow-runtime-types";
import type { GeometryV2Rect } from "./types";

export interface DesignerRuntimeWorkspaceRects {
  snapshot: GeometryRuntimeSnapshot;
  artworkStage: GeometryV2Rect;
  safeArea: GeometryV2Rect;
  workspaceStyle: ReturnType<typeof buildUiPrintAreaContainerStyleFromPx>;
  safeAreaStyle: ReturnType<typeof buildUiPrintAreaContainerStyleFromPx>;
}

function geometryRectToContainerStyle(rect: GeometryV2Rect) {
  return buildUiPrintAreaContainerStyleFromPx(
    {
      leftPx: rect.left,
      topPx: rect.top,
      widthPx: rect.width,
      heightPx: rect.height,
    },
    METRICS_TEMPLATE_WIDTH_PX,
    METRICS_TEMPLATE_HEIGHT_PX,
  );
}

/**
 * Resolve Designer workspace + safe area from Geometry Runtime Snapshot.
 * Single source of truth — same snapshot as ResultPanel photo bridge (V2).
 */
export function resolveDesignerRuntimeWorkspace(
  side: Side,
  geometryVersion: DesignerGeometryVersion,
): DesignerRuntimeWorkspaceRects {
  const snapshot = resolveGeometryRuntimeSnapshot(side, geometryVersion);
  return {
    snapshot,
    artworkStage: snapshot.artworkStage,
    safeArea: snapshot.safeArea,
    workspaceStyle: geometryRectToContainerStyle(snapshot.artworkStage),
    safeAreaStyle: geometryRectToContainerStyle(snapshot.safeArea),
  };
}
