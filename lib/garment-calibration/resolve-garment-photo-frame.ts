/**
 * Garment Frame Calibration — Template Space → Product Photo Space.
 *
 * Read-only: consumes Garment Metrics + frozen M placement for identity.
 * Does not modify calibration.json, placement pipeline, or Designer.
 */

import { METRICS_BASELINE_SIZE } from "@/lib/garment-metrics/constants";
import type { GarmentMetricsRect } from "@/lib/garment-metrics/types";
import type { CalibrationRect } from "@/lib/render/render-types";
import {
  PHOTO_BASELINE_GARMENT_BOUNDS_PREVIEW,
  PHOTO_CALIBRATION_BASELINE_SIZE,
  scalePhotoRect,
} from "./constants";
import type {
  GarmentComposeFrames,
  GarmentPhotoFrame,
  ResolveGarmentComposeFramesInput,
  ResolveGarmentPhotoFrameInput,
} from "./types";

function isBaselineSize(sizeCode: string): boolean {
  return sizeCode === PHOTO_CALIBRATION_BASELINE_SIZE;
}

function normalizeRectWithinGarment(
  inner: GarmentMetricsRect,
  garment: GarmentMetricsRect,
): GarmentMetricsRect {
  return {
    x: (inner.x - garment.x) / garment.width,
    y: (inner.y - garment.y) / garment.height,
    width: inner.width / garment.width,
    height: inner.height / garment.height,
  };
}

function mapNormalizedRectToPhoto(
  normalized: GarmentMetricsRect,
  photoGarment: CalibrationRect,
): CalibrationRect {
  return {
    x: photoGarment.x + normalized.x * photoGarment.width,
    y: photoGarment.y + normalized.y * photoGarment.height,
    width: normalized.width * photoGarment.width,
    height: normalized.height * photoGarment.height,
  };
}

function resolvePhotoGarmentBounds(
  metrics: { bodyWidthPx: number; bodyHeightPx: number },
  baselineMetrics: { bodyWidthPx: number; bodyHeightPx: number },
  assetWidth: number,
  assetHeight: number,
): CalibrationRect {
  const baselinePhotoGarment = scalePhotoRect(
    PHOTO_BASELINE_GARMENT_BOUNDS_PREVIEW,
    assetWidth,
    assetHeight,
  );

  const scaleW = metrics.bodyWidthPx / baselineMetrics.bodyWidthPx;
  const scaleH = metrics.bodyHeightPx / baselineMetrics.bodyHeightPx;

  const width = baselinePhotoGarment.width * scaleW;
  const height = baselinePhotoGarment.height * scaleH;

  return {
    x: (assetWidth - width) / 2,
    y: 0,
    width,
    height,
  };
}

function mapTemplatePointToPhoto(
  point: { x: number; y: number },
  metrics: {
    garmentBounds: GarmentMetricsRect;
  },
  photoGarment: CalibrationRect,
): { x: number; y: number } {
  const nx = (point.x - metrics.garmentBounds.x) / metrics.garmentBounds.width;
  const ny = (point.y - metrics.garmentBounds.y) / metrics.garmentBounds.height;
  return {
    x: photoGarment.x + nx * photoGarment.width,
    y: photoGarment.y + ny * photoGarment.height,
  };
}

/**
 * Map Garment Metrics template frames → product photo space.
 * M identity: garment = full asset; print = frozen placement rect.
 */
export function resolveGarmentPhotoFrame(
  input: ResolveGarmentPhotoFrameInput,
): GarmentPhotoFrame {
  const {
    metrics,
    baselineMetrics,
    assetWidth,
    assetHeight,
    baselinePlacementRect,
  } = input;

  const garmentPhotoBounds = isBaselineSize(metrics.sizeCode)
    ? scalePhotoRect(PHOTO_BASELINE_GARMENT_BOUNDS_PREVIEW, assetWidth, assetHeight)
    : resolvePhotoGarmentBounds(metrics, baselineMetrics, assetWidth, assetHeight);

  const normalizedPrint = normalizeRectWithinGarment(
    metrics.printBounds,
    metrics.garmentBounds,
  );

  const printPhotoBounds =
    isBaselineSize(metrics.sizeCode) && baselinePlacementRect
      ? { ...baselinePlacementRect }
      : mapNormalizedRectToPhoto(normalizedPrint, garmentPhotoBounds);

  const hemTemplateY =
    metrics.hemLine.y ?? metrics.garmentBounds.y + metrics.bodyHeightPx;

  const photoCollar = mapTemplatePointToPhoto(
    metrics.collarAnchor,
    metrics,
    garmentPhotoBounds,
  );

  const photoHemY = mapTemplatePointToPhoto(
    { x: metrics.collarAnchor.x, y: hemTemplateY },
    metrics,
    garmentPhotoBounds,
  ).y;

  return {
    sizeCode: metrics.sizeCode,
    assetWidth,
    assetHeight,
    garmentPhotoBounds,
    printPhotoBounds,
    photoCenter: {
      x: garmentPhotoBounds.x + garmentPhotoBounds.width / 2,
      y: garmentPhotoBounds.y + garmentPhotoBounds.height / 2,
    },
    photoCollar,
    photoHem: { y: photoHemY },
    photoWidth: garmentPhotoBounds.width,
    photoHeight: garmentPhotoBounds.height,
    printWidth: printPhotoBounds.width,
    printHeight: printPhotoBounds.height,
    printToBodyWidthRatio: metrics.ratios.printWidthToBodyWidth,
    printToBodyHeightRatio: metrics.ratios.printHeightToBodyHeight,
    metrics,
  };
}

/** Compose draw frames — garment photo bounds + print photo bounds (artwork). */
export function resolveGarmentComposeFrames(
  input: ResolveGarmentComposeFramesInput,
): GarmentComposeFrames {
  const photoFrame = resolveGarmentPhotoFrame({
    metrics: input.metrics,
    baselineMetrics: input.baselineMetrics,
    assetWidth: input.assetWidth,
    assetHeight: input.assetHeight,
    baselinePlacementRect:
      input.metrics.sizeCode === METRICS_BASELINE_SIZE
        ? input.placementRect
        : null,
  });

  return {
    garmentFrame: { ...photoFrame.garmentPhotoBounds },
    artworkFrame: { ...photoFrame.printPhotoBounds },
    photoFrame,
  };
}
