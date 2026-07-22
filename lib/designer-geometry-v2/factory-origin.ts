/**
 * Designer Geometry V2 — factory collar bottom & origin derivation.
 *
 * Alpha bbox top ≠ factory collar bottom.
 * Collar bottom is derived from centerline neck/shoulder anatomy scan.
 */

import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V2_ALPHA_THRESHOLD,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_PRINT_PX_PER_CM,
} from "./constants";
import type {
  CollarDerivationCalibration,
} from "./geometry-builder-calibration";
import {
  getActiveCollarDerivationCalibration,
} from "./geometry-builder-calibration";
import type { RawAlphaBuffer } from "./measure-garment-alpha";
import type { GeometryV2AlphaMeasurement } from "./types";
import type {
  GeometryV2CollarBottom,
  GeometryV2FactoryOrigin,
  GeometryV2NeckMetrics,
  GeometryV2ShoulderMetrics,
} from "./geometry-profile";

export interface ScanlineSpan {
  y: number;
  left: number;
  right: number;
  width: number;
}

export function scanOpaqueSpanAtY(
  buffer: RawAlphaBuffer,
  y: number,
): ScanlineSpan | null {
  const { data, width } = buffer;
  if (y < 0 || y >= buffer.height) return null;

  let left = width;
  let right = -1;
  for (let x = 0; x < width; x++) {
    const alpha = data[(y * width + x) * 4 + 3];
    if (alpha > GEOMETRY_V2_ALPHA_THRESHOLD) {
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (right < left) return null;
  return { y, left, right, width: right - left + 1 };
}

export function deriveShoulderMetrics(
  buffer: RawAlphaBuffer,
  measurement: GeometryV2AlphaMeasurement,
): GeometryV2ShoulderMetrics {
  const span = scanOpaqueSpanAtY(buffer, measurement.shoulderScanY);
  if (!span) {
    return {
      scanY: measurement.shoulderScanY,
      widthPx: measurement.shoulderWidthPx,
      left: 0,
      right: 0,
    };
  }
  return {
    scanY: span.y,
    widthPx: span.width,
    left: span.left,
    right: span.right,
  };
}

export function deriveNeckMetrics(
  buffer: RawAlphaBuffer,
  measurement: GeometryV2AlphaMeasurement,
  shoulder: GeometryV2ShoulderMetrics,
): GeometryV2NeckMetrics {
  const centerX = Math.round(measurement.centerPoint.x);
  const startY = measurement.alphaBoundingBox.top;
  const endY = shoulder.scanY;
  const spans: ScanlineSpan[] = [];

  for (let y = startY; y <= endY; y++) {
    const span = scanOpaqueSpanAtY(buffer, y);
    if (span) spans.push(span);
  }

  let narrowest = spans[0];
  for (const span of spans) {
    if (span.width < narrowest.width) narrowest = span;
  }

  const curveSamplePoints = spans
    .filter((_, index) => index % 3 === 0)
    .map((span) => ({
      x: centerX,
      y: span.y,
    }));

  return {
    widthPx: narrowest?.width ?? 0,
    narrowestY: narrowest?.y ?? startY,
    curveSamplePoints,
  };
}

/**
 * Derive factory collar bottom from neck → shoulder transition.
 * Walks down from narrowest neck until width expands toward shoulder breadth.
 */
export function deriveFactoryCollarBottom(
  buffer: RawAlphaBuffer,
  measurement: GeometryV2AlphaMeasurement,
  neck: GeometryV2NeckMetrics,
  shoulder: GeometryV2ShoulderMetrics,
  calibration: CollarDerivationCalibration = getActiveCollarDerivationCalibration(),
): GeometryV2CollarBottom {
  const centerX = Math.round(measurement.centerPoint.x);
  const startY = Math.max(measurement.alphaBoundingBox.top, neck.narrowestY);
  const endY = shoulder.scanY;
  const shoulderTarget = Math.max(
    neck.widthPx * calibration.shoulderExpandRatio,
    shoulder.widthPx * calibration.shoulderBlendRatio,
  );

  let collarBottomY = startY;
  for (let y = startY; y <= endY; y++) {
    const span = scanOpaqueSpanAtY(buffer, y);
    if (!span) continue;
    if (span.width >= shoulderTarget) {
      collarBottomY = Math.max(startY, y - 1);
      break;
    }
    collarBottomY = y;
  }

  const collarSpan = scanOpaqueSpanAtY(buffer, collarBottomY);
  const neckWidthPx = collarSpan?.width ?? neck.widthPx;

  return {
    x: centerX,
    y: collarBottomY,
    neckWidthPx,
  };
}

export function resolveFactoryOrigin(
  side: Side,
  collarBottom: GeometryV2CollarBottom,
  pxPerCm: number = GEOMETRY_V2_PRINT_PX_PER_CM,
): GeometryV2FactoryOrigin {
  return {
    side,
    x: collarBottom.x,
    y: collarBottom.y,
    offsetCm: GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side],
    pxPerCm,
  };
}
