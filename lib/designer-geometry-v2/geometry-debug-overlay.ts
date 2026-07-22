/**
 * Designer Geometry V2 — Geometry Debug Overlay (visual V1/V2 compare).
 *
 * Debug-only. Does not participate in Projection, Placement, or Export.
 */

import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V2_SHOULDER_SCAN_RATIO,
} from "./constants";
import {
  GEOMETRY_V1_REFERENCE,
  resolveGeometryV1ArtworkStagePx,
  resolveGeometryV1CollarAnchor,
} from "./geometry-v1-reference";
import { resolveGeometryV1OverlayRects } from "./geometry-overlay";
import { UA35001_PRODUCT_MASTER_SNAPSHOT } from "./product-master-snapshot";
import type { ProductMasterGeometrySide } from "./product-master-profile";
import {
  resolveGeometryV1RuntimeSnapshot,
  resolveProductMasterRuntimeSnapshot,
} from "./shadow-runtime";
import type {
  GeometryDebugOverlayBundle,
  GeometryDebugOverlayDescription,
  GeometryDebugOverlayShapes,
  GeometryDebugShoulderLine,
  GeometryDebugLayerToggles,
} from "./geometry-debug-types";
import {
  assertGeometryDebugSafeForProduction,
  isGeometryDebugEnabled,
} from "./geometry-debug-toggle";
import type { GeometryV2Rect } from "./types";

function resolveV1ShoulderLine(side: Side): GeometryDebugShoulderLine {
  const bbox = GEOMETRY_V1_REFERENCE.templateAlphaBBox[side];
  const scanY =
    bbox.top + Math.round(bbox.height * GEOMETRY_V2_SHOULDER_SCAN_RATIO);
  const half = GEOMETRY_V1_REFERENCE.visualChestPx / 2;
  const cx = GEOMETRY_V1_REFERENCE.centerX;
  return {
    scanY,
    left: cx - half,
    right: cx + half,
    widthPx: GEOMETRY_V1_REFERENCE.visualChestPx,
  };
}

function resolveV2ShoulderLine(
  master: ProductMasterGeometrySide,
): GeometryDebugShoulderLine {
  const bbox = master.alphaBoundingBox;
  const scanY =
    bbox.top + Math.round(bbox.height * GEOMETRY_V2_SHOULDER_SCAN_RATIO);
  const half = master.shoulderWidthPx / 2;
  const cx = master.centerPoint.x;
  return {
    scanY,
    left: cx - half,
    right: cx + half,
    widthPx: master.shoulderWidthPx,
  };
}

export function resolveGeometryDebugV1Shapes(
  side: Side,
): GeometryDebugOverlayShapes {
  const overlay = resolveGeometryV1OverlayRects(side);
  const runtime = resolveGeometryV1RuntimeSnapshot(side);
  return {
    version: "v1",
    side,
    alphaBoundingBox: { ...overlay.alphaBoundingBox },
    collar: { ...overlay.collarPoint },
    factoryOrigin: { ...overlay.factoryOrigin },
    artworkStage: { ...overlay.artworkStage },
    safeArea: { ...overlay.safeArea },
    center: { ...runtime.center },
    hem: { ...runtime.hem },
    shoulder: resolveV1ShoulderLine(side),
  };
}

export function resolveGeometryDebugV2Shapes(
  side: Side,
): GeometryDebugOverlayShapes {
  const master =
    side === "front"
      ? UA35001_PRODUCT_MASTER_SNAPSHOT.front
      : UA35001_PRODUCT_MASTER_SNAPSHOT.back;
  const runtime = resolveProductMasterRuntimeSnapshot(side);

  return {
    version: "v2",
    side,
    alphaBoundingBox: { ...master.alphaBoundingBox },
    collar: { x: master.collarBottom.x, y: master.collarBottom.y },
    factoryOrigin: {
      x: master.factoryOrigin.x,
      y: master.factoryOrigin.y,
    },
    artworkStage: { ...runtime.artworkStage },
    safeArea: { ...runtime.safeArea },
    center: { ...runtime.center },
    hem: { ...runtime.hem },
    shoulder: resolveV2ShoulderLine(master),
  };
}

export function buildGeometryDebugOverlayBundle(
  side: Side,
  colorSlug = "white",
): GeometryDebugOverlayBundle {
  return {
    side,
    colorSlug,
    label: `${colorSlug} / ${side}`,
    v1: resolveGeometryDebugV1Shapes(side),
    v2: resolveGeometryDebugV2Shapes(side),
  };
}

export function formatGeometryDebugOverlayDescription(
  bundle: GeometryDebugOverlayBundle,
): GeometryDebugOverlayDescription {
  const { v1, v2, side, colorSlug } = bundle;
  const fmtPoint = (p: { x: number; y: number }) => `(${p.x}, ${p.y})`;
  const fmtRect = (r: GeometryV2Rect) =>
    `top=${r.top.toFixed(1)} left=${r.left.toFixed(1)} ${r.width.toFixed(1)}×${r.height.toFixed(1)}`;

  return {
    side,
    colorSlug,
    v1: {
      collar: `Collar Anchor ${fmtPoint(v1.collar)} — red circle`,
      factoryOrigin: `Factory Origin ${fmtPoint(v1.factoryOrigin)} — red cross`,
      artworkStage: `Artwork Stage ${fmtRect(v1.artworkStage)} — red solid rect`,
      safeArea: `Safe Area ${fmtRect(v1.safeArea)} — red dashed rect`,
    },
    v2: {
      collar: `Collar Bottom ${fmtPoint(v2.collar)} — blue circle`,
      factoryOrigin: `Factory Origin ${fmtPoint(v2.factoryOrigin)} — blue cross`,
      artworkStage: `Artwork Stage ${fmtRect(v2.artworkStage)} — blue solid rect`,
      safeArea: `Safe Area ${fmtRect(v2.safeArea)} — blue dashed rect`,
    },
    compareNote:
      "V1 (template baseline, red) vs V2 Product Master (UA35001, blue). " +
      "Optional: center dot, hem marker, shoulder scan line.",
  };
}

/**
 * GeometryDebugOverlay — builds toggleable V1/V2 visual overlay data.
 * Does not render to Designer canvas; use geometry-debug-render for PNG/SVG export.
 */
export class GeometryDebugOverlay {
  readonly bundle: GeometryDebugOverlayBundle;

  constructor(side: Side, colorSlug = "white") {
    assertGeometryDebugSafeForProduction();
    this.bundle = buildGeometryDebugOverlayBundle(side, colorSlug);
  }

  getV1Shapes(): GeometryDebugOverlayShapes {
    return this.bundle.v1;
  }

  getV2Shapes(): GeometryDebugOverlayShapes {
    return this.bundle.v2;
  }

  getDescription(): GeometryDebugOverlayDescription {
    return formatGeometryDebugOverlayDescription(this.bundle);
  }

  /** Returns whether any layer would be visible under current toggles. */
  hasVisibleLayers(toggles: GeometryDebugLayerToggles): boolean {
    return toggles.v1 || toggles.v2;
  }
}

export function createGeometryDebugOverlay(
  side: Side,
  colorSlug?: string,
): GeometryDebugOverlay | null {
  if (!isGeometryDebugEnabled()) return null;
  return new GeometryDebugOverlay(side, colorSlug);
}
