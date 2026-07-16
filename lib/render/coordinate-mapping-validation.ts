/**
 * Coordinate Mapping Validation — Designer Preview vs Product Export alignment.
 * Tolerance: ≤ 1 px for bbox center and scale.
 */

import { mapDesignerRectToProduct } from "./coordinate-mapping";
import type { CalibrationRect } from "./render-types";
import type { CoordinateMappingTransform } from "./coordinate-mapping";

export const MAPPING_VALIDATION_TOLERANCE_PX = 1;

export interface MappingAlignmentMetrics {
  expectedBounds: CalibrationRect;
  actualBounds: CalibrationRect;
  centerDeviationPx: { x: number; y: number };
  scaleDeviationPx: { width: number; height: number };
  bboxDeviationPx: number;
}

export interface MappingAlignmentResult {
  passed: boolean;
  metrics: MappingAlignmentMetrics;
  details: string[];
}

function rectCenter(rect: CalibrationRect): { x: number; y: number } {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function maxBBoxCornerDeviation(
  expected: CalibrationRect,
  actual: CalibrationRect,
): number {
  const corners = (rect: CalibrationRect) => [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ];
  const expectedCorners = corners(expected);
  const actualCorners = corners(actual);
  let max = 0;
  for (let i = 0; i < 4; i++) {
    const dx = Math.abs(expectedCorners[i].x - actualCorners[i].x);
    const dy = Math.abs(expectedCorners[i].y - actualCorners[i].y);
    max = Math.max(max, dx, dy);
  }
  return max;
}

export function computeExpectedProductBounds(
  artworkBoundsInDesignerSpace: CalibrationRect,
  mapping: CoordinateMappingTransform,
): CalibrationRect {
  return mapDesignerRectToProduct(artworkBoundsInDesignerSpace, mapping);
}

export function validateMappingAlignment(
  artworkBoundsInDesignerSpace: CalibrationRect,
  mapping: CoordinateMappingTransform,
  actualProductBounds: CalibrationRect,
  tolerancePx = MAPPING_VALIDATION_TOLERANCE_PX,
): MappingAlignmentResult {
  const expectedBounds = computeExpectedProductBounds(
    artworkBoundsInDesignerSpace,
    mapping,
  );
  const expectedCenter = rectCenter(expectedBounds);
  const actualCenter = rectCenter(actualProductBounds);
  const centerDeviationPx = {
    x: Math.abs(expectedCenter.x - actualCenter.x),
    y: Math.abs(expectedCenter.y - actualCenter.y),
  };
  const scaleDeviationPx = {
    width: Math.abs(expectedBounds.width - actualProductBounds.width),
    height: Math.abs(expectedBounds.height - actualProductBounds.height),
  };
  const bboxDeviationPx = maxBBoxCornerDeviation(expectedBounds, actualProductBounds);

  const details: string[] = [
    `Center Δx=${centerDeviationPx.x.toFixed(2)}px Δy=${centerDeviationPx.y.toFixed(2)}px`,
    `Scale Δw=${scaleDeviationPx.width}px Δh=${scaleDeviationPx.height}px`,
    `BBox max corner Δ=${bboxDeviationPx.toFixed(2)}px`,
  ];

  const passed =
    centerDeviationPx.x <= tolerancePx &&
    centerDeviationPx.y <= tolerancePx &&
    scaleDeviationPx.width <= tolerancePx &&
    scaleDeviationPx.height <= tolerancePx &&
    bboxDeviationPx <= tolerancePx;

  return {
    passed,
    metrics: {
      expectedBounds,
      actualBounds: actualProductBounds,
      centerDeviationPx,
      scaleDeviationPx,
      bboxDeviationPx,
    },
    details,
  };
}
