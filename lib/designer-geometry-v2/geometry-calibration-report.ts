/**
 * Designer Geometry V2 — QA calibration report formatting.
 */

import type {
  GeometryCalibrationAssetResult,
  GeometryCalibrationPhaseMetrics,
  GeometryCalibrationReport,
} from "./geometry-calibration-types";

export function formatGeometryCalibrationPhaseMetrics(
  label: string,
  metrics: GeometryCalibrationPhaseMetrics,
): string {
  return [
    `=== ${label} ===`,
    `Collar Y: avg=${metrics.collarY.average.toFixed(1)} maxΔ=${metrics.collarY.max.toFixed(1)} σ=${metrics.collarY.stdDev.toFixed(2)}`,
    `Factory Origin Y: avg=${metrics.factoryOriginY.average.toFixed(1)}`,
    `Artwork Stage top: avg=${metrics.artworkStageTop.average.toFixed(1)}`,
    `Safe Area top: avg=${metrics.safeAreaTop.average.toFixed(1)}`,
    `Hem Y: avg=${metrics.hemY.average.toFixed(1)} σ=${metrics.hemY.stdDev.toFixed(2)}`,
    `Center Y: avg=${metrics.centerY.average.toFixed(1)}`,
    `Shoulder width: avg=${metrics.shoulderWidth.average.toFixed(1)} σ=${metrics.shoulderWidth.stdDev.toFixed(2)}`,
    `Pixel diff %: avg=${metrics.pixelDiffPercent.average.toFixed(3)} max=${metrics.pixelDiffPercent.max.toFixed(3)}`,
    `Torso pixel diff %: avg=${metrics.torsoPixelDiffPercent.average.toFixed(3)}`,
    `Center diff Y: avg=${metrics.centerDiffY.average.toFixed(1)} max=${metrics.centerDiffY.max.toFixed(1)}`,
    `Top diff: avg=${metrics.topDiff.average.toFixed(1)}`,
    `Bottom diff: avg=${metrics.bottomDiff.average.toFixed(1)}`,
  ].join("\n");
}

export function formatGeometryCalibrationAssetLine(
  result: GeometryCalibrationAssetResult,
): string {
  return (
    `${result.colorSlug}/${result.side}: collar=${result.collarY}px stage=${result.artworkStageTop.toFixed(0)} ` +
    `pixel=${result.pixelDiffPercent.toFixed(2)}% torso=${result.torsoPixelDiffPercent.toFixed(2)}% ` +
    `centerΔY=${result.centerDiffY?.toFixed(0) ?? "n/a"}`
  );
}

export function formatGeometryCalibrationReport(
  report: GeometryCalibrationReport,
): string {
  return [
    "=== Geometry V2 QA Calibration Report ===",
    report.goalNote,
    "",
    "Calibration Flow:",
    ...report.flow.map((line) => `  ${line}`),
    "",
    "Builder Calibration Summary:",
    `  expand ratio: ${report.builderCalibration.before.expandRatio} → ${report.builderCalibration.after.expandRatio}`,
    `  blend ratio: ${report.builderCalibration.before.blendRatio} → ${report.builderCalibration.after.blendRatio}`,
    `  collar Y offset: front ${report.builderCalibration.before.collarYOffsetFront}→${report.builderCalibration.after.collarYOffsetFront}px, back ${report.builderCalibration.before.collarYOffsetBack}→${report.builderCalibration.after.collarYOffsetBack}px`,
    `  master aggregation: ${report.builderCalibration.before.masterAggregation} → ${report.builderCalibration.after.masterAggregation}`,
    "",
    formatGeometryCalibrationPhaseMetrics("BEFORE (baseline)", report.before),
    "",
    formatGeometryCalibrationPhaseMetrics("AFTER (calibrated)", report.after),
    "",
    "Improvement:",
    `  Collar σ: ${report.improvement.collarStdDevDelta >= 0 ? "+" : ""}${report.improvement.collarStdDevDelta.toFixed(2)}px`,
    `  Avg pixel diff: ${report.improvement.pixelDiffPercentDelta >= 0 ? "+" : ""}${report.improvement.pixelDiffPercentDelta.toFixed(3)}%`,
    `  Avg torso pixel diff: ${report.improvement.torsoPixelDiffPercentDelta >= 0 ? "+" : ""}${report.improvement.torsoPixelDiffPercentDelta.toFixed(3)}%`,
    `  Avg center diff Y: ${report.improvement.centerDiffYDelta >= 0 ? "+" : ""}${report.improvement.centerDiffYDelta.toFixed(1)}px`,
    "",
    "--- White Front Calibration ---",
    report.whiteFrontDetail,
    "",
    "--- White Back Calibration ---",
    report.whiteBackDetail,
    "",
    "--- 20 Asset Results ---",
    ...report.assetResults.map(formatGeometryCalibrationAssetLine),
    "",
    `Verdict: ${report.verdict}`,
    report.visualNote,
  ].join("\n");
}
