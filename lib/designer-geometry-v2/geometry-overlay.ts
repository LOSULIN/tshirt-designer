/**
 * Designer Geometry V2 — overlay geometry layers (V1 red / V2 blue).
 */

import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V2_FACTORY_SAFE_AREA_CM,
} from "./constants";
import {
  GEOMETRY_V1_REFERENCE,
  resolveGeometryV1ArtworkStagePx,
  resolveGeometryV1CollarAnchor,
} from "./geometry-v1-reference";
import type { GeometryProfileV2 } from "./geometry-profile";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export interface GeometryOverlayRects {
  alphaBoundingBox: GeometryV2Rect;
  collarPoint: GeometryV2Point;
  factoryOrigin: GeometryV2Point;
  artworkStage: GeometryV2Rect;
  safeArea: GeometryV2Rect;
}

export interface GeometryOverlayDelta {
  collarY: number;
  factoryOriginY: number;
  factoryOriginX: number;
  artworkStageTop: number;
  artworkStageLeft: number;
  safeAreaTop: number;
  safeAreaLeft: number;
}

export interface GeometryOverlayComparison {
  side: Side;
  colorSlug: string;
  v1: GeometryOverlayRects;
  v2: GeometryOverlayRects;
  delta: GeometryOverlayDelta;
}

function resolveGeometryV1SafeArea(side: Side): GeometryV2Rect {
  const collar = resolveGeometryV1CollarAnchor(side);
  const { widthCm, heightCm } = GEOMETRY_V2_FACTORY_SAFE_AREA_CM[side];
  const pxPerCm = GEOMETRY_V1_REFERENCE.pxPerCm;
  const width = widthCm * pxPerCm;
  const height = heightCm * pxPerCm;
  const top =
    collar.y + GEOMETRY_V1_REFERENCE.printTopOffsetCm[side] * pxPerCm;
  const left = GEOMETRY_V1_REFERENCE.centerX - width / 2;
  return { left, top, width, height };
}

/** V1 overlay geometry (template baseline — red). */
export function resolveGeometryV1OverlayRects(side: Side): GeometryOverlayRects {
  const collar = resolveGeometryV1CollarAnchor(side);
  const artworkStage = resolveGeometryV1ArtworkStagePx(side);
  const alphaBoundingBox = GEOMETRY_V1_REFERENCE.templateAlphaBBox[side];
  return {
    alphaBoundingBox: { ...alphaBoundingBox },
    collarPoint: { ...collar },
    factoryOrigin: { x: collar.x, y: collar.y },
    artworkStage: { ...artworkStage },
    safeArea: resolveGeometryV1SafeArea(side),
  };
}

/** V2 overlay geometry from Builder profile (blue). */
export function resolveGeometryV2OverlayRects(
  profile: GeometryProfileV2,
): GeometryOverlayRects {
  return {
    alphaBoundingBox: { ...profile.alphaBoundingBox },
    collarPoint: {
      x: profile.collarBottom.x,
      y: profile.collarBottom.y,
    },
    factoryOrigin: {
      x: profile.factoryOrigin.x,
      y: profile.factoryOrigin.y,
    },
    artworkStage: { ...profile.artworkStage },
    safeArea: { ...profile.safeArea },
  };
}

export function compareGeometryOverlayV1V2(
  side: Side,
  colorSlug: string,
  v2Profile: GeometryProfileV2,
): GeometryOverlayComparison {
  const v1 = resolveGeometryV1OverlayRects(side);
  const v2 = resolveGeometryV2OverlayRects(v2Profile);
  return {
    side,
    colorSlug,
    v1,
    v2,
    delta: {
      collarY: +(v2.collarPoint.y - v1.collarPoint.y).toFixed(2),
      factoryOriginY: +(v2.factoryOrigin.y - v1.factoryOrigin.y).toFixed(2),
      factoryOriginX: +(v2.factoryOrigin.x - v1.factoryOrigin.x).toFixed(2),
      artworkStageTop: +(v2.artworkStage.top - v1.artworkStage.top).toFixed(2),
      artworkStageLeft: +(v2.artworkStage.left - v1.artworkStage.left).toFixed(
        2,
      ),
      safeAreaTop: +(v2.safeArea.top - v1.safeArea.top).toFixed(2),
      safeAreaLeft: +(v2.safeArea.left - v1.safeArea.left).toFixed(2),
    },
  };
}

export function formatGeometryOverlayDeltaReport(
  comparison: GeometryOverlayComparison,
): string {
  const { colorSlug, side, v1, v2, delta } = comparison;
  return [
    `=== ${colorSlug}/${side} Geometry Delta ===`,
    `Collar (V1 anchor → V2 bottom): ${v1.collarPoint.y} → ${v2.collarPoint.y}  Δ ${delta.collarY}px`,
    `Factory Origin: (${v1.factoryOrigin.x},${v1.factoryOrigin.y}) → (${v2.factoryOrigin.x},${v2.factoryOrigin.y})  Δy ${delta.factoryOriginY}px`,
    `Artwork Stage top: ${v1.artworkStage.top.toFixed(2)} → ${v2.artworkStage.top.toFixed(2)}  Δ ${delta.artworkStageTop}px`,
    `Artwork Stage left: ${v1.artworkStage.left.toFixed(2)} → ${v2.artworkStage.left.toFixed(2)}  Δ ${delta.artworkStageLeft}px`,
    `Safe Area top: ${v1.safeArea.top.toFixed(2)} → ${v2.safeArea.top.toFixed(2)}  Δ ${delta.safeAreaTop}px`,
    `Safe Area left: ${v1.safeArea.left.toFixed(2)} → ${v2.safeArea.left.toFixed(2)}  Δ ${delta.safeAreaLeft}px`,
  ].join("\n");
}

/** Verify overlay V2 rects match Builder profile (audit consistency). */
export function overlayMatchesBuilderProfile(
  overlay: GeometryOverlayRects,
  profile: GeometryProfileV2,
  tolerancePx = 0.01,
): boolean {
  const close = (a: number, b: number) => Math.abs(a - b) <= tolerancePx;
  return (
    close(overlay.collarPoint.y, profile.collarBottom.y) &&
    close(overlay.factoryOrigin.y, profile.factoryOrigin.y) &&
    close(overlay.artworkStage.top, profile.artworkStage.top) &&
    close(overlay.safeArea.top, profile.safeArea.top)
  );
}
