/**
 * Designer Geometry V2 — Shadow Runtime (audit + integration foundation).
 *
 * Synchronizes V1 (active render) with Product Master V2 (shadow compare only).
 * Never participates in Designer / Photo Bridge / Export render paths.
 */

import type { Side } from "@/lib/constants";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  getActiveDesignerGeometryVersion,
} from "./geometry-version";
import {
  GEOMETRY_V1_REFERENCE,
  resolveGeometryV1ArtworkStagePx,
  resolveGeometryV1CollarAnchor,
} from "./geometry-v1-reference";
import { GEOMETRY_V2_FACTORY_SAFE_AREA_CM } from "./constants";
import { UA35001_PRODUCT_MASTER_SNAPSHOT } from "./product-master-snapshot";
import { productMasterGeometryToRuntimeSnapshot } from "./product-factory-anchor";
import type { ProductMasterGeometry } from "./product-master-profile";
import type {
  GeometryRuntimeSnapshot,
  GeometryShadowComparison,
  GeometryShadowMetricDelta,
  GeometryShadowOverallSummary,
  GeometryShadowRuntimeState,
} from "./shadow-runtime-types";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

const SHADOW_ENV_KEY = "NEXT_PUBLIC_GEOMETRY_SHADOW_ENABLED";

/** Shadow compare enabled in development by default; never in production. */
export function isGeometryShadowEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return false;
  }
  const flag =
    typeof process !== "undefined" ? process.env[SHADOW_ENV_KEY] : undefined;
  if (flag === "false" || flag === "0") return false;
  return true;
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

/** V1 runtime snapshot — mirrors active render geometry (frozen reference). */
export function resolveGeometryV1RuntimeSnapshot(
  side: Side,
): GeometryRuntimeSnapshot {
  const collar = resolveGeometryV1CollarAnchor(side);
  const artworkStage = resolveGeometryV1ArtworkStagePx(side);
  const safeArea = resolveGeometryV1SafeArea(side);
  const bbox = GEOMETRY_V1_REFERENCE.templateAlphaBBox[side];

  return {
    version: "v1",
    side,
    collar: { ...collar },
    factoryOrigin: { x: collar.x, y: collar.y },
    artworkStage: { ...artworkStage },
    safeArea: { ...safeArea },
    garmentWidth: bbox.width,
    garmentHeight: bbox.height,
    center: {
      x: GEOMETRY_V1_REFERENCE.centerX,
      y: GEOMETRY_V1_REFERENCE.centerY,
    },
    hem: {
      x: GEOMETRY_V1_REFERENCE.centerX,
      y: GEOMETRY_V1_REFERENCE.hemBottomPx,
    },
  };
}

/** Product Master V2 snapshot for shadow compare (not render). */
export function resolveProductMasterRuntimeSnapshot(
  side: Side,
  master: ProductMasterGeometry = UA35001_PRODUCT_MASTER_SNAPSHOT,
): GeometryRuntimeSnapshot {
  return productMasterGeometryToRuntimeSnapshot(side, master);
}

function pctDelta(delta: number, reference: number): number | null {
  if (reference === 0) return null;
  return +((delta / reference) * 100).toFixed(2);
}

function comparePoint(
  label: string,
  v1: GeometryV2Point,
  v2: GeometryV2Point,
): GeometryShadowMetricDelta {
  const deltaX = +(v2.x - v1.x).toFixed(2);
  const deltaY = +(v2.y - v1.y).toFixed(2);
  return {
    label,
    v1: `(${v1.x}, ${v1.y})`,
    v2: `(${v2.x}, ${v2.y})`,
    deltaX,
    deltaY,
    deltaWidth: 0,
    deltaHeight: 0,
    percentDelta: pctDelta(deltaY, v1.y),
  };
}

function compareRect(
  label: string,
  v1: GeometryV2Rect,
  v2: GeometryV2Rect,
): GeometryShadowMetricDelta {
  const deltaX = +(v2.left - v1.left).toFixed(2);
  const deltaY = +(v2.top - v1.top).toFixed(2);
  const deltaWidth = +(v2.width - v1.width).toFixed(2);
  const deltaHeight = +(v2.height - v1.height).toFixed(2);
  return {
    label,
    v1: `top=${v1.top} left=${v1.left} ${v1.width}×${v1.height}`,
    v2: `top=${v2.top} left=${v2.left} ${v2.width}×${v2.height}`,
    deltaX,
    deltaY,
    deltaWidth,
    deltaHeight,
    percentDelta: pctDelta(deltaHeight, v1.height),
  };
}

function compareScalar(
  label: string,
  v1: number,
  v2: number,
): GeometryShadowMetricDelta {
  const deltaY = +(v2 - v1).toFixed(2);
  return {
    label,
    v1,
    v2,
    deltaX: 0,
    deltaY,
    deltaWidth: 0,
    deltaHeight: 0,
    percentDelta: pctDelta(deltaY, v1),
  };
}

export function compareGeometryShadow(
  side: Side,
  options?: { colorSlug?: string; master?: ProductMasterGeometry },
): GeometryShadowComparison {
  const v1 = resolveGeometryV1RuntimeSnapshot(side);
  const v2 = resolveProductMasterRuntimeSnapshot(side, options?.master);

  const metrics: GeometryShadowMetricDelta[] = [
    comparePoint("Collar", v1.collar, v2.collar),
    comparePoint("Factory Origin", v1.factoryOrigin, v2.factoryOrigin),
    compareRect("Artwork Stage", v1.artworkStage, v2.artworkStage),
    compareRect("Safe Area", v1.safeArea, v2.safeArea),
    compareScalar("Garment Width", v1.garmentWidth, v2.garmentWidth),
    compareScalar("Garment Height", v1.garmentHeight, v2.garmentHeight),
    comparePoint("Center", v1.center, v2.center),
    comparePoint("Hem", v1.hem, v2.hem),
  ];

  const absDeltaYs = metrics.map((m) => Math.abs(m.deltaY));
  const maxAbsDeltaY = Math.max(...absDeltaYs);
  const averageAbsDeltaY = +(
    absDeltaYs.reduce((s, v) => s + v, 0) / absDeltaYs.length
  ).toFixed(2);

  const verdict = maxAbsDeltaY > 50 ? "WARNING" : "PASS";

  return {
    side,
    colorSlug: options?.colorSlug,
    activeVersion: "v1",
    shadowVersion: "v2",
    v1,
    v2,
    metrics,
    maxAbsDeltaY,
    averageAbsDeltaY,
    verdict,
  };
}

export function getGeometryShadowRuntimeState(): GeometryShadowRuntimeState {
  return {
    enabled: isGeometryShadowEnabled(),
    activeGeometryVersion: "v1",
    shadowGeometryVersion: "v2",
    productMasterLoaded: true,
  };
}

export function assertGeometryShadowSafeForProduction(): void {
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    isGeometryShadowEnabled()
  ) {
    throw new Error(
      "Geometry Shadow Runtime must not be enabled in production",
    );
  }
}

export function assertActiveGeometryRemainsV1(): void {
  if (ACTIVE_DESIGNER_GEOMETRY_VERSION !== DESIGNER_GEOMETRY_VERSION.V1) {
    throw new Error("ACTIVE_DESIGNER_GEOMETRY_VERSION must remain v1");
  }
  if (getActiveDesignerGeometryVersion() !== DESIGNER_GEOMETRY_VERSION.V1) {
    throw new Error("getActiveDesignerGeometryVersion() must return v1");
  }
}

export function buildGeometryShadowOverallSummary(
  comparisons: GeometryShadowComparison[],
): GeometryShadowOverallSummary {
  const passCount = comparisons.filter((c) => c.verdict === "PASS").length;
  const warningCount = comparisons.length - passCount;
  const allDeltaYs = comparisons.flatMap((c) =>
    c.metrics.map((m) => Math.abs(m.deltaY)),
  );
  const averageDeltaY = +(
    allDeltaYs.reduce((s, v) => s + v, 0) / allDeltaYs.length
  ).toFixed(2);
  const maximumDeltaY = Math.max(...allDeltaYs);

  return {
    assetCount: comparisons.length,
    passCount,
    warningCount,
    averageDeltaY,
    maximumDeltaY,
    verdict: warningCount > 0 ? "WARNING" : "PASS",
  };
}

/**
 * Geometry Shadow Runtime entry — compare V1 vs Product Master V2.
 * Returns null when shadow is disabled (production).
 */
export class GeometryShadowRuntime {
  private readonly master: ProductMasterGeometry;

  constructor(master: ProductMasterGeometry = UA35001_PRODUCT_MASTER_SNAPSHOT) {
    this.master = master;
    assertActiveGeometryRemainsV1();
    assertGeometryShadowSafeForProduction();
  }

  isEnabled(): boolean {
    return isGeometryShadowEnabled();
  }

  compare(
    side: Side,
    colorSlug?: string,
  ): GeometryShadowComparison | null {
    if (!this.isEnabled()) return null;
    return compareGeometryShadow(side, {
      colorSlug,
      master: this.master,
    });
  }

  compareBothSides(colorSlug?: string): {
    front: GeometryShadowComparison | null;
    back: GeometryShadowComparison | null;
  } {
    return {
      front: this.compare("front", colorSlug),
      back: this.compare("back", colorSlug),
    };
  }

  getState(): GeometryShadowRuntimeState {
    return getGeometryShadowRuntimeState();
  }
}

export function createGeometryShadowRuntime(): GeometryShadowRuntime | null {
  if (!isGeometryShadowEnabled()) return null;
  return new GeometryShadowRuntime();
}
