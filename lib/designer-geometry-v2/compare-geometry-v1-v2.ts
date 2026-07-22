/**
 * Designer Geometry V1 vs V2 comparison utilities.
 */

import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V1_REFERENCE,
  resolveGeometryV1ArtworkStagePx,
  resolveGeometryV1CollarAnchor,
} from "./geometry-v1-reference";
import type { DesignerGeometryV2Profile, GeometryV1V2Diff } from "./types";

function pctDelta(delta: number, reference: number): number | null {
  if (reference === 0) return null;
  return +((delta / reference) * 100).toFixed(3);
}

function diffRow(
  metric: string,
  v1: number,
  v2: number,
): GeometryV1V2Diff {
  const deltaPx = +(v2 - v1).toFixed(3);
  return {
    metric,
    v1,
    v2,
    deltaPx,
    deltaPercent: pctDelta(deltaPx, v1),
  };
}

export function compareGeometryV1V2Baseline(
  side: Side,
  v2: DesignerGeometryV2Profile,
): GeometryV1V2Diff[] {
  const v1Collar = resolveGeometryV1CollarAnchor(side);
  const v1Stage = resolveGeometryV1ArtworkStagePx(side);
  const v1BBox = GEOMETRY_V1_REFERENCE.templateAlphaBBox[side];
  const v2Stage = v2.printAreaRects.artworkStage;
  const v2BBox = v2.alphaBoundingBox;

  return [
    diffRow("collarAnchor.y", v1Collar.y, v2.collarAnchor.y),
    diffRow("collarAnchor.x", v1Collar.x, v2.collarAnchor.x),
    diffRow("alphaBBox.left", v1BBox.left, v2BBox.left),
    diffRow("alphaBBox.top", v1BBox.top, v2BBox.top),
    diffRow("alphaBBox.width", v1BBox.width, v2BBox.width),
    diffRow("alphaBBox.height", v1BBox.height, v2BBox.height),
    diffRow("garmentWidthPx", v1BBox.width, v2.garmentWidthPx),
    diffRow("garmentHeightPx", v1BBox.height, v2.garmentHeightPx),
    diffRow("centerPoint.x", GEOMETRY_V1_REFERENCE.centerX, v2.centerPoint.x),
    diffRow("centerPoint.y", GEOMETRY_V1_REFERENCE.centerY, v2.centerPoint.y),
    diffRow("hem.y", GEOMETRY_V1_REFERENCE.hemBottomPx, v2.hem.y),
    diffRow("pxPerCm", GEOMETRY_V1_REFERENCE.pxPerCm, v2.pxPerCm),
    diffRow("artworkStage.top", v1Stage.top, v2Stage.top),
    diffRow("artworkStage.left", v1Stage.left, v2Stage.left),
    diffRow("artworkStage.width", v1Stage.width, v2Stage.width),
    diffRow("artworkStage.height", v1Stage.height, v2Stage.height),
    diffRow(
      "printArea.top",
      v1Stage.top,
      v2.printAreaRects.printArea.top,
    ),
  ];
}

export function formatGeometryV1V2Report(
  side: Side,
  diffs: GeometryV1V2Diff[],
): string {
  const lines = [
    `=== Geometry V1 vs V2 (${side}) ===`,
    "metric | v1 | v2 | Δpx | Δ%",
    ...diffs.map(
      (d) =>
        `${d.metric} | ${d.v1} | ${d.v2} | ${d.deltaPx} | ${d.deltaPercent ?? "—"}`,
    ),
  ];
  return lines.join("\n");
}
