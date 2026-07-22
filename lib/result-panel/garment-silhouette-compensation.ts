/**
 * Garment Silhouette Compensation — ResultPanel preview only.
 *
 * Source: lib/product-size-config.ts (official chest / length / shoulder / sleeve).
 * Does not modify Designer, Factory, Placement, Calibration, or Export pipelines.
 */

import { findProductSizeRow } from "@/lib/product-size-config";

export const SILHOUETTE_COMPENSATION_BASELINE_SIZE = "M" as const;

/** Max blend from physical chart toward silhouette adjustment (bounded, not full scale). */
export const SILHOUETTE_CHEST_BLEND = 0.38;
export const SILHOUETTE_LENGTH_BLEND = 0.42;
export const SILHOUETTE_SHOULDER_BLEND = 0.34;
export const SILHOUETTE_SLEEVE_BLEND = 0.22;

/** Hard clamp — prevents whole-garment shrink/grow reads as global scale. */
export const SILHOUETTE_COMPENSATION_MIN = 0.9;
export const SILHOUETTE_COMPENSATION_MAX = 1.1;

export interface GarmentSilhouetteAxes {
  chest: number;
  length: number;
  shoulder: number;
  sleeve: number;
}

export interface GarmentSilhouetteCompensation {
  sizeCode: string;
  baselineSize: typeof SILHOUETTE_COMPENSATION_BASELINE_SIZE;
  physical: GarmentSilhouetteAxes;
  compensation: GarmentSilhouetteAxes;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, factor: number): number {
  return from + (to - from) * factor;
}

function boundedSilhouetteAxis(
  physicalRatio: number,
  blend: number,
): number {
  const adjusted = lerp(1, physicalRatio, blend);
  return clamp(adjusted, SILHOUETTE_COMPENSATION_MIN, SILHOUETTE_COMPENSATION_MAX);
}

function resolvePhysicalAxes(size: string): GarmentSilhouetteAxes {
  const baseline = findProductSizeRow(SILHOUETTE_COMPENSATION_BASELINE_SIZE);
  const current = findProductSizeRow(size);
  if (!baseline || !current) {
    return { chest: 1, length: 1, shoulder: 1, sleeve: 1 };
  }
  return {
    chest: current.chest / baseline.chest,
    length: current.length / baseline.length,
    shoulder: current.shoulder / baseline.shoulder,
    sleeve: current.sleeve / baseline.sleeve,
  };
}

/** Official size → bounded silhouette compensation axes (ResultPanel only). */
export function resolveGarmentSilhouetteCompensation(
  size: string,
): GarmentSilhouetteCompensation {
  const physical = resolvePhysicalAxes(size);
  return {
    sizeCode: findProductSizeRow(size)?.size ?? size,
    baselineSize: SILHOUETTE_COMPENSATION_BASELINE_SIZE,
    physical,
    compensation: {
      chest: boundedSilhouetteAxis(physical.chest, SILHOUETTE_CHEST_BLEND),
      length: boundedSilhouetteAxis(physical.length, SILHOUETTE_LENGTH_BLEND),
      shoulder: boundedSilhouetteAxis(
        physical.shoulder,
        SILHOUETTE_SHOULDER_BLEND,
      ),
      sleeve: boundedSilhouetteAxis(physical.sleeve, SILHOUETTE_SLEEVE_BLEND),
    },
  };
}

/** M baseline must be identity — warp is a no-op. */
export function isSilhouetteCompensationIdentity(
  compensation: GarmentSilhouetteCompensation,
): boolean {
  const axes = compensation.compensation;
  const epsilon = 0.0005;
  return (
    Math.abs(axes.chest - 1) < epsilon &&
    Math.abs(axes.length - 1) < epsilon &&
    Math.abs(axes.shoulder - 1) < epsilon &&
    Math.abs(axes.sleeve - 1) < epsilon
  );
}
