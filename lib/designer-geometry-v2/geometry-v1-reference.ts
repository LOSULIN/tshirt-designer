/**
 * Geometry V1 reference snapshot — read-only comparison baseline.
 * Mirrors garment-metrics / template-profile / print-area-offset values.
 * Does NOT import V1 runtime modules (isolation for audit).
 */

import type { Side } from "@/lib/constants";

export const GEOMETRY_V1_REFERENCE = {
  canvas: { width: 1024, height: 1536 },
  collarAnchorY: { front: 386, back: 386 } as Record<Side, number>,
  centerX: 512,
  centerY: 768,
  visualChestPx: 550,
  visualBodyHeightPx: 903,
  collarTopPx: 312,
  hemBottomPx: 1215,
  pxPerCm: 12.24,
  printTopOffsetCm: { front: 7, back: 5 } as Record<Side, number>,
  printAreaCm: {
    front: { widthCm: 35, heightCm: 50 },
    back: { widthCm: 38, heightCm: 45 },
  },
  /** Template white front alpha bbox (Phase 69.0 audit representative). */
  templateAlphaBBox: {
    front: { left: 28, top: 292, width: 969, height: 924 },
    back: { left: 30, top: 291, width: 966, height: 926 },
  },
} as const;

export function resolveGeometryV1ArtworkStagePx(side: Side): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const collarY = GEOMETRY_V1_REFERENCE.collarAnchorY[side];
  const offsetCm = GEOMETRY_V1_REFERENCE.printTopOffsetCm[side];
  const { widthCm, heightCm } = GEOMETRY_V1_REFERENCE.printAreaCm[side];
  const pxPerCm = GEOMETRY_V1_REFERENCE.pxPerCm;
  const width = widthCm * pxPerCm;
  const height = heightCm * pxPerCm;
  const top = collarY + offsetCm * pxPerCm;
  const left = GEOMETRY_V1_REFERENCE.centerX - width / 2;
  return { left, top, width, height };
}

export function resolveGeometryV1CollarAnchor(side: Side): {
  x: number;
  y: number;
} {
  return {
    x: GEOMETRY_V1_REFERENCE.centerX,
    y: GEOMETRY_V1_REFERENCE.collarAnchorY[side],
  };
}
