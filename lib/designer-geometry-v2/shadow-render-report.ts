/**
 * Designer Geometry V2 — Shadow Render compare & pixel diff reports.
 */

import type {
  ShadowPixelDifferenceReport,
  ShadowRenderGeometryCompare,
  ShadowRenderLayerCompare,
} from "./shadow-render-types";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export function formatShadowRenderGeometryCompare(
  compare: ShadowRenderGeometryCompare,
): string {
  const lines = [
    `=== Shadow Render Compare (${compare.colorSlug}/${compare.side}) — ${compare.verdict} ===`,
    "",
    "Artwork Stage:",
    `  V1 top=${compare.artworkStage.v1.top} left=${compare.artworkStage.v1.left}`,
    `  V2 top=${compare.artworkStage.v2.top} left=${compare.artworkStage.v2.left}`,
    `  ΔY=${compare.artworkStage.deltaY}px`,
    "",
    "Safe Area:",
    `  V1 top=${compare.safeArea.v1.top} left=${compare.safeArea.v1.left}`,
    `  V2 top=${compare.safeArea.v2.top} left=${compare.safeArea.v2.left}`,
    `  ΔY=${compare.safeArea.deltaY}px`,
    "",
    "Factory Origin:",
    `  V1 (${compare.factoryOrigin.v1.x}, ${compare.factoryOrigin.v1.y})`,
    `  V2 (${compare.factoryOrigin.v2.x}, ${compare.factoryOrigin.v2.y})`,
    `  ΔY=${compare.factoryOrigin.deltaY}px`,
    "",
    "Designer Layers:",
  ];

  for (const layer of compare.layers) {
    lines.push(
      `  ${layer.layerId}: pos V1(${layer.v1Position.x.toFixed(1)},${layer.v1Position.y.toFixed(1)}) → V2(${layer.v2Position.x.toFixed(1)},${layer.v2Position.y.toFixed(1)}) Δ(${layer.positionDeltaX},${layer.positionDeltaY}) scale ${layer.v1Scale}→${layer.v2Scale} rot ${layer.v1RotationDeg}°→${layer.v2RotationDeg}°`,
    );
  }

  return lines.join("\n");
}

export function formatShadowPixelDifferenceReport(
  report: ShadowPixelDifferenceReport,
): string {
  const bbox = report.boundingDifference;
  const center = report.centerDifference;
  return [
    "=== Pixel Difference Summary ===",
    `Differing pixels: ${report.differingPixels} / ${report.totalPixels} (${report.diffPercent.toFixed(3)}%)`,
    `Max channel delta: ${report.maxChannelDelta}`,
    "",
    `Bounding Difference: ${
      bbox
        ? `left=${bbox.left} top=${bbox.top} ${bbox.width}×${bbox.height}`
        : "none (identical)"
    }`,
    `Center Difference: ${
      center ? `(${center.x.toFixed(1)}, ${center.y.toFixed(1)})` : "n/a"
    }`,
    `Top Difference: ${report.topDifference ?? "n/a"}px`,
    `Bottom Difference: ${report.bottomDifference ?? "n/a"}px`,
  ].join("\n");
}

export function formatShadowRenderLayerCompareTable(
  layers: ShadowRenderLayerCompare[],
): string {
  const header =
    "Layer | V1 Position | V2 Position | ΔPos | V1 Scale | V2 Scale | V1 Rot | V2 Rot";
  const rows = layers.map(
    (l) =>
      `${l.layerId} | (${l.v1Position.x.toFixed(0)},${l.v1Position.y.toFixed(0)}) | (${l.v2Position.x.toFixed(0)},${l.v2Position.y.toFixed(0)}) | (${l.positionDeltaX},${l.positionDeltaY}) | ${l.v1Scale} | ${l.v2Scale} | ${l.v1RotationDeg}° | ${l.v2RotationDeg}°`,
  );
  return [header, ...rows].join("\n");
}

export function buildShadowRenderCompareSummary(
  front: ShadowRenderGeometryCompare,
  frontPixel: ShadowPixelDifferenceReport,
  back: ShadowRenderGeometryCompare,
  backPixel: ShadowPixelDifferenceReport,
): string {
  return [
    "=== Shadow Render Compare Summary ===",
    "",
    formatShadowRenderGeometryCompare(front),
    "",
    formatShadowPixelDifferenceReport(frontPixel),
    "",
    formatShadowRenderGeometryCompare(back),
    "",
    formatShadowPixelDifferenceReport(backPixel),
    "",
    `Overall: Compare ${front.verdict === "PASS" && back.verdict === "PASS" ? "PASS" : "WARNING"} (geometry delta expected during shadow phase)`,
  ].join("\n");
}

export function rectCenter(rect: GeometryV2Rect): GeometryV2Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}
