/**
 * Designer Geometry V2 — Product Master Geometry builder (audit only).
 *
 * Cross-validates Builder + Overlay + Measurement across all colors,
 * then derives a single UA35001 master geometry (averaged factory anchors).
 */

import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V2_CANVAS_HEIGHT_PX,
  GEOMETRY_V2_CANVAS_WIDTH_PX,
  GEOMETRY_V2_FACTORY_PRINT_AREA_CM,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_FACTORY_SAFE_AREA_CM,
  GEOMETRY_V2_PRINT_PX_PER_CM,
  GEOMETRY_V2_PRODUCT_CODE,
} from "./constants";
import type { GeometryProfileV2 } from "./geometry-profile";
import {
  overlayMatchesBuilderProfile,
  resolveGeometryV2OverlayRects,
} from "./geometry-overlay";
import type {
  GeometryMetricStats,
  ProductMasterGeometry,
  ProductMasterGeometrySide,
  ProductMasterStabilityMetric,
  ProductMasterStabilityReport,
} from "./product-master-profile";
import { PRODUCT_MASTER_PRODUCT_CODE } from "./product-master-profile";
import {
  GEOMETRY_V2_PRODUCT_MASTER_USE_MEDIAN_COLLAR,
  GEOMETRY_V2_PRODUCT_MASTER_VISUAL_BIAS_PX,
} from "./geometry-builder-calibration";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export const PRODUCT_MASTER_OUTPUT_DIR =
  "debug/product-master-geometry" as const;

export const PRODUCT_MASTER_COLOR_DISPLAY_NAMES: Record<string, string> = {
  white: "White",
  black: "Black",
  heathergray: "Heather Gray",
  pink: "Pink",
  hotpink: "Hot Pink",
  yellow: "Yellow",
  mint: "Mint",
  skyblue: "Sky Blue",
  lightblue: "Royal Blue",
  indigo: "Navy",
};

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeGeometryMetricStats(
  values: number[],
): GeometryMetricStats {
  const average = mean(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sd = stdDev(values);
  return {
    average,
    min,
    max,
    maxError: max - average,
    minError: min - average,
    stdDev: sd,
    samples: values.length,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export interface BuildProductMasterOptions {
  useMedianCollar?: boolean;
  visualBiasPx?: number;
}

function aggregateCollarYWithOptions(
  values: number[],
  useMedian: boolean,
): number {
  const base = useMedian ? median(values) : mean(values);
  return Math.round(base);
}

function roundPx(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildStageRectFromFactoryOrigin(
  side: Side,
  factoryOrigin: GeometryV2Point,
  areaCm: { widthCm: number; heightCm: number },
): GeometryV2Rect {
  const pxPerCm = GEOMETRY_V2_PRINT_PX_PER_CM;
  const width = areaCm.widthCm * pxPerCm;
  const height = areaCm.heightCm * pxPerCm;
  const top =
    factoryOrigin.y +
    GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side] * pxPerCm;
  const left = factoryOrigin.x - width / 2;
  return {
    left: roundPx(left),
    top: roundPx(top),
    width: roundPx(width),
    height: roundPx(height),
  };
}

function resolveHemFromProfile(profile: GeometryProfileV2): GeometryV2Point {
  const bounds = profile.garmentBounds;
  return {
    x: profile.garmentCenter.x,
    y: bounds.top + bounds.height - 1,
  };
}

function averageRect(rects: GeometryV2Rect[]): GeometryV2Rect {
  return {
    left: roundPx(mean(rects.map((r) => r.left))),
    top: roundPx(mean(rects.map((r) => r.top))),
    width: roundPx(mean(rects.map((r) => r.width))),
    height: roundPx(mean(rects.map((r) => r.height))),
  };
}

/** Assert overlay ↔ builder consistency before master derivation. */
export function assertCrossValidationForProfiles(
  profiles: GeometryProfileV2[],
): void {
  for (const profile of profiles) {
    const overlay = resolveGeometryV2OverlayRects(profile);
    if (!overlayMatchesBuilderProfile(overlay, profile)) {
      throw new Error(
        `Cross-validation failed: overlay ≠ builder for ${profile.colorSlug}/${profile.side}`,
      );
    }
  }
}

export function buildProductMasterGeometrySide(
  side: Side,
  profiles: GeometryProfileV2[],
  options?: BuildProductMasterOptions,
): ProductMasterGeometrySide {
  const sideProfiles = profiles.filter((p) => p.side === side);
  if (sideProfiles.length === 0) {
    throw new Error(`No profiles for side ${side}`);
  }

  assertCrossValidationForProfiles(sideProfiles);

  const useMedian =
    options?.useMedianCollar ?? GEOMETRY_V2_PRODUCT_MASTER_USE_MEDIAN_COLLAR;
  const visualBias =
    options?.visualBiasPx ?? GEOMETRY_V2_PRODUCT_MASTER_VISUAL_BIAS_PX[side];

  const collarX = Math.round(mean(sideProfiles.map((p) => p.collarBottom.x)));
  const collarY =
    aggregateCollarYWithOptions(
      sideProfiles.map((p) => p.collarBottom.y),
      useMedian,
    ) + visualBias;
  const neckWidthPx = Math.round(
    mean(sideProfiles.map((p) => p.collarBottom.neckWidthPx)),
  );

  const offsetCm = GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side];
  const pxPerCm = GEOMETRY_V2_PRINT_PX_PER_CM;

  const factoryOrigin: ProductMasterGeometrySide["factoryOrigin"] = {
    x: collarX,
    y: collarY,
    side,
    offsetCm,
    pxPerCm,
  };

  const artworkStage = buildStageRectFromFactoryOrigin(
    side,
    factoryOrigin,
    GEOMETRY_V2_FACTORY_PRINT_AREA_CM[side],
  );
  const safeArea = buildStageRectFromFactoryOrigin(
    side,
    factoryOrigin,
    GEOMETRY_V2_FACTORY_SAFE_AREA_CM[side],
  );

  const garmentWidths = sideProfiles.map((p) => p.garmentBounds.width);
  const garmentHeights = sideProfiles.map((p) => p.garmentBounds.height);
  const shoulderWidths = sideProfiles.map((p) => p.shoulder.widthPx);
  const centers = sideProfiles.map((p) => p.garmentCenter);
  const hems = sideProfiles.map((p) => resolveHemFromProfile(p));
  const alphaBoxes = sideProfiles.map((p) => p.alphaBoundingBox);

  const avgCenter: GeometryV2Point = {
    x: roundPx(mean(centers.map((c) => c.x))),
    y: roundPx(mean(centers.map((c) => c.y))),
  };
  const avgHem: GeometryV2Point = {
    x: roundPx(mean(hems.map((h) => h.x))),
    y: roundPx(mean(hems.map((h) => h.y))),
  };

  return {
    productCode: PRODUCT_MASTER_PRODUCT_CODE,
    side,
    canvas: {
      width: GEOMETRY_V2_CANVAS_WIDTH_PX,
      height: GEOMETRY_V2_CANVAS_HEIGHT_PX,
    },
    collarBottom: { x: collarX, y: collarY, neckWidthPx },
    factoryOrigin,
    artworkStage,
    safeArea,
    garmentWidthPx: roundPx(mean(garmentWidths)),
    garmentHeightPx: roundPx(mean(garmentHeights)),
    shoulderWidthPx: roundPx(mean(shoulderWidths)),
    centerPoint: avgCenter,
    hem: avgHem,
    alphaBoundingBox: averageRect(alphaBoxes),
  };
}

export function buildProductMasterGeometry(
  profiles: GeometryProfileV2[],
  options?: BuildProductMasterOptions,
): ProductMasterGeometry {
  if (GEOMETRY_V2_PRODUCT_CODE !== PRODUCT_MASTER_PRODUCT_CODE) {
    throw new Error("Product master only supports UA35001");
  }

  return {
    productCode: PRODUCT_MASTER_PRODUCT_CODE,
    version: 1,
    derivation: "averaged-factory-cross-validation-calibrated",
    front: buildProductMasterGeometrySide("front", profiles, options),
    back: buildProductMasterGeometrySide("back", profiles, options),
  };
}

export function buildProductMasterStabilityReport(
  master: ProductMasterGeometrySide,
  profiles: GeometryProfileV2[],
): ProductMasterStabilityReport {
  const sideProfiles = profiles.filter((p) => p.side === master.side);

  const collarYs = sideProfiles.map((p) => p.collarBottom.y);
  const shoulderWidths = sideProfiles.map((p) => p.shoulder.widthPx);
  const hemYs = sideProfiles.map((p) => resolveHemFromProfile(p).y);

  const collarStats = computeGeometryMetricStats(collarYs);
  const shoulderStats = computeGeometryMetricStats(shoulderWidths);
  const hemStats = computeGeometryMetricStats(hemYs);

  const metrics: ProductMasterStabilityMetric[] = [
    {
      metric: "Collar",
      stats: collarStats,
      varianceLabel: `±${collarStats.stdDev.toFixed(1)}px`,
    },
    {
      metric: "Shoulder",
      stats: shoulderStats,
      varianceLabel: `±${shoulderStats.stdDev.toFixed(1)}px`,
    },
    {
      metric: "Hem",
      stats: hemStats,
      varianceLabel: `±${hemStats.stdDev.toFixed(1)}px`,
    },
  ];

  const maxStdDev = Math.max(
    collarStats.stdDev,
    shoulderStats.stdDev,
    hemStats.stdDev,
  );
  const verdict = maxStdDev <= 6 ? "PASS" : "WARNING";

  const recommendation =
    "建議使用單一 Product Master Geometry，所有顏色共用；不要為每個顏色建立獨立 Geometry。" +
    " 跨色差異主要來自光影、抗鋸齒、陰影與布料紋理，而非結構性衣身差異。";

  return { side: master.side, metrics, recommendation, verdict };
}

export function formatProductMasterGeometryReport(
  master: ProductMasterGeometrySide,
): string {
  return [
    `=== ${master.productCode} ${master.side.toUpperCase()} Master Geometry ===`,
    `Canvas: ${master.canvas.width}×${master.canvas.height}`,
    `Collar Bottom: (${master.collarBottom.x}, ${master.collarBottom.y}) neckW=${master.collarBottom.neckWidthPx}px`,
    `Factory Origin: (${master.factoryOrigin.x}, ${master.factoryOrigin.y}) offset=${master.factoryOrigin.offsetCm}cm pxPerCm=${master.factoryOrigin.pxPerCm}`,
    `Artwork Stage: top=${master.artworkStage.top} left=${master.artworkStage.left} ${master.artworkStage.width}×${master.artworkStage.height}`,
    `Safe Area: top=${master.safeArea.top} left=${master.safeArea.left} ${master.safeArea.width}×${master.safeArea.height}`,
    `Garment Width: ${master.garmentWidthPx}px`,
    `Garment Height: ${master.garmentHeightPx}px`,
    `Shoulder Width: ${master.shoulderWidthPx}px`,
    `Center Point: (${master.centerPoint.x}, ${master.centerPoint.y})`,
    `Hem: (${master.hem.x}, ${master.hem.y})`,
    `Alpha BBox (avg): top=${master.alphaBoundingBox.top.toFixed(1)} ${master.alphaBoundingBox.width.toFixed(1)}×${master.alphaBoundingBox.height.toFixed(1)}`,
  ].join("\n");
}

export function formatProductMasterStabilityReport(
  report: ProductMasterStabilityReport,
): string {
  const lines = [
    `=== Geometry Stability (${report.side}) — ${report.verdict} ===`,
    ...report.metrics.map(
      (m) =>
        `${m.metric} Variance: ${m.varianceLabel} (avg=${m.stats.average.toFixed(1)} min=${m.stats.min.toFixed(1)} max=${m.stats.max.toFixed(1)} maxErr=${m.stats.maxError.toFixed(1)} minErr=${m.stats.minError.toFixed(1)})`,
    ),
    report.recommendation,
  ];
  return lines.join("\n");
}
