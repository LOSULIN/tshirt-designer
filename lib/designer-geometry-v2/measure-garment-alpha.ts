/**
 * Designer Geometry V2 — alpha silhouette measurement from UA product PNG.
 */

import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V2_ALPHA_THRESHOLD,
  GEOMETRY_V2_CANVAS_HEIGHT_PX,
  GEOMETRY_V2_CANVAS_WIDTH_PX,
  GEOMETRY_V2_FACTORY_PRINT_AREA_CM,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_BASELINE_CHEST_CM,
  GEOMETRY_V2_PRINT_PX_PER_CM,
  GEOMETRY_V2_SHOULDER_SCAN_RATIO,
} from "./constants";
import type {
  GeometryV2AlphaMeasurement,
  GeometryV2PrintAreaRects,
  GeometryV2Rect,
} from "./types";

export interface RawAlphaBuffer {
  data: Buffer;
  width: number;
  height: number;
}

export function measureAlphaSilhouetteFromBuffer(
  buffer: RawAlphaBuffer,
): GeometryV2AlphaMeasurement {
  const { data, width, height } = buffer;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > GEOMETRY_V2_ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    throw new Error("Geometry V2: no opaque pixels found in asset");
  }

  const alphaBoundingBox: GeometryV2Rect = {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  const garmentWidthPx = alphaBoundingBox.width;
  const garmentHeightPx = alphaBoundingBox.height;
  const centerPoint = {
    x: minX + garmentWidthPx / 2,
    y: minY + garmentHeightPx / 2,
  };
  const collarAnchor = { x: centerPoint.x, y: minY };
  const hem = { x: centerPoint.x, y: maxY };

  const shoulderScanY = Math.min(
    height - 1,
    minY + Math.round(garmentHeightPx * GEOMETRY_V2_SHOULDER_SCAN_RATIO),
  );
  let shoulderLeft = width;
  let shoulderRight = -1;
  for (let x = 0; x < width; x++) {
    const alpha = data[(shoulderScanY * width + x) * 4 + 3];
    if (alpha > GEOMETRY_V2_ALPHA_THRESHOLD) {
      if (x < shoulderLeft) shoulderLeft = x;
      if (x > shoulderRight) shoulderRight = x;
    }
  }
  const shoulderWidthPx =
    shoulderRight >= shoulderLeft ? shoulderRight - shoulderLeft + 1 : 0;

  return {
    canvas: { width, height },
    alphaBoundingBox,
    collarAnchor,
    shoulderWidthPx,
    shoulderScanY,
    garmentWidthPx,
    garmentHeightPx,
    centerPoint,
    hem,
  };
}

export function deriveGeometryV2SilhouettePxPerCm(garmentWidthPx: number): number {
  return garmentWidthPx / GEOMETRY_V2_BASELINE_CHEST_CM;
}

/** Print area / artwork stage use frozen factory px/cm (not silhouette-derived). */
export function resolveGeometryV2PrintPxPerCm(): number {
  return GEOMETRY_V2_PRINT_PX_PER_CM;
}

export function resolveGeometryV2PrintAreaRects(
  side: Side,
  collarAnchor: { x: number; y: number },
  pxPerCm: number,
): GeometryV2PrintAreaRects {
  const offsetCm = GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side];
  const { widthCm, heightCm } = GEOMETRY_V2_FACTORY_PRINT_AREA_CM[side];
  const width = widthCm * pxPerCm;
  const height = heightCm * pxPerCm;
  const top = collarAnchor.y + offsetCm * pxPerCm;
  const left = collarAnchor.x - width / 2;

  const printArea: GeometryV2Rect = { left, top, width, height };
  return {
    printArea,
    artworkStage: { ...printArea },
  };
}

export function assertGeometryV2Canvas(
  width: number,
  height: number,
): void {
  if (
    width !== GEOMETRY_V2_CANVAS_WIDTH_PX ||
    height !== GEOMETRY_V2_CANVAS_HEIGHT_PX
  ) {
    throw new Error(
      `Geometry V2: expected ${GEOMETRY_V2_CANVAS_WIDTH_PX}×${GEOMETRY_V2_CANVAS_HEIGHT_PX}, got ${width}×${height}`,
    );
  }
}
