/**
 * Designer Geometry V2 — QA calibration types.
 */

import type { Side } from "@/lib/constants";
import type { GeometryMetricStats } from "./product-master-profile";

export interface GeometryCalibrationMetricBundle {
  collarY: GeometryMetricStats;
  factoryOriginY: GeometryMetricStats;
  artworkStageTop: GeometryMetricStats;
  safeAreaTop: GeometryMetricStats;
  hemY: GeometryMetricStats;
  centerY: GeometryMetricStats;
  shoulderWidth: GeometryMetricStats;
  pixelDiffPercent: GeometryMetricStats;
  torsoPixelDiffPercent: GeometryMetricStats;
  centerDiffY: GeometryMetricStats;
  topDiff: GeometryMetricStats;
  bottomDiff: GeometryMetricStats;
}

export type GeometryCalibrationPhaseMetrics = GeometryCalibrationMetricBundle;

export interface GeometryCalibrationAssetResult {
  colorSlug: string;
  side: Side;
  collarY: number;
  artworkStageTop: number;
  pixelDiffPercent: number;
  torsoPixelDiffPercent: number;
  centerDiffY: number | null;
  topDiff: number | null;
  bottomDiff: number | null;
}

export interface GeometryCalibrationBuilderSummary {
  before: {
    expandRatio: number;
    blendRatio: number;
    collarYOffsetFront: number;
    collarYOffsetBack: number;
    masterAggregation: string;
  };
  after: {
    expandRatio: number;
    blendRatio: number;
    collarYOffsetFront: number;
    collarYOffsetBack: number;
    masterAggregation: string;
  };
}

export interface GeometryCalibrationImprovement {
  collarStdDevDelta: number;
  pixelDiffPercentDelta: number;
  torsoPixelDiffPercentDelta: number;
  centerDiffYDelta: number;
}

export interface GeometryCalibrationReport {
  goalNote: string;
  flow: string[];
  builderCalibration: GeometryCalibrationBuilderSummary;
  before: GeometryCalibrationPhaseMetrics;
  after: GeometryCalibrationPhaseMetrics;
  improvement: GeometryCalibrationImprovement;
  whiteFrontDetail: string;
  whiteBackDetail: string;
  assetResults: GeometryCalibrationAssetResult[];
  verdict: "PASS" | "WARNING";
  visualNote: string;
}
