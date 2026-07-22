/**
 * Designer Geometry V2 — Shadow Runtime debug report (dev-only, no spam).
 */

import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  getActiveDesignerGeometryVersion,
} from "./geometry-version";
import type {
  GeometryShadowComparison,
  GeometryShadowDebugReport,
  GeometryShadowMetricDelta,
  GeometryShadowOverallSummary,
} from "./shadow-runtime-types";
import {
  buildGeometryShadowOverallSummary,
  compareGeometryShadow,
  getGeometryShadowRuntimeState,
  isGeometryShadowEnabled,
} from "./shadow-runtime";

const SHADOW_DEBUG_ENV_KEY = "NEXT_PUBLIC_GEOMETRY_SHADOW_DEBUG";

let lastReportSignature: string | null = null;

export function isGeometryShadowDebugEnabled(): boolean {
  if (!isGeometryShadowEnabled()) return false;
  const flag =
    typeof process !== "undefined" ? process.env[SHADOW_DEBUG_ENV_KEY] : undefined;
  return flag === "true" || flag === "1";
}

export function formatGeometryShadowMetricLine(
  metric: GeometryShadowMetricDelta,
): string {
  const pct =
    metric.percentDelta !== null ? `${metric.percentDelta}%` : "—";
  if (metric.deltaWidth !== 0 || metric.label.includes("Stage") || metric.label.includes("Safe")) {
    return (
      `${metric.label}: V1=${metric.v1} V2=${metric.v2} ` +
      `ΔX=${metric.deltaX}px ΔY=${metric.deltaY}px ` +
      `ΔW=${metric.deltaWidth}px ΔH=${metric.deltaHeight}px (${pct})`
    );
  }
  return (
    `${metric.label}: V1=${metric.v1} V2=${metric.v2} ` +
    `ΔY=${metric.deltaY}px (${pct})`
  );
}

export function formatGeometryShadowComparisonReport(
  comparison: GeometryShadowComparison,
): string {
  const title = comparison.colorSlug
    ? `${comparison.colorSlug}/${comparison.side}`
    : comparison.side;
  return [
    `=== Shadow Compare (${title}) — ${comparison.verdict} ===`,
    `Active=${comparison.activeVersion} Shadow=${comparison.shadowVersion}`,
    ...comparison.metrics.map(formatGeometryShadowMetricLine),
    `max|ΔY|=${comparison.maxAbsDeltaY}px avg|ΔY|=${comparison.averageAbsDeltaY}px`,
  ].join("\n");
}

export function buildGeometryShadowDebugReport(options?: {
  colorSlug?: string;
}): GeometryShadowDebugReport | null {
  if (!isGeometryShadowEnabled()) return null;

  const whiteFront = compareGeometryShadow("front", {
    colorSlug: options?.colorSlug ?? "white",
  });
  const whiteBack = compareGeometryShadow("back", {
    colorSlug: options?.colorSlug ?? "white",
  });

  const comparisons = [whiteFront, whiteBack];
  const overall = buildGeometryShadowOverallSummary(comparisons);

  return {
    runtime: getGeometryShadowRuntimeState(),
    flow: [
      "Designer Runtime",
      "↓",
      "Geometry V1 (active render)",
      "↓",
      "Geometry V2 Product Master (shadow)",
      "↓",
      "Geometry Compare",
      "↓",
      overall.verdict,
    ],
    whiteFront,
    whiteBack,
    overall,
    compareVerdict: overall.verdict,
  };
}

export function formatGeometryShadowDebugReport(
  report: GeometryShadowDebugReport,
): string {
  return [
    "=== Designer Geometry Runtime (Shadow) ===",
    `Geometry Version = ${ACTIVE_DESIGNER_GEOMETRY_VERSION}`,
    `Active Resolver = ${getActiveDesignerGeometryVersion()}`,
    `Shadow Geometry = v2`,
    `Shadow Enabled = ${report.runtime.enabled}`,
    "",
    "Shadow Runtime Flow:",
    ...report.flow.map((line) => (line === "↓" ? line : `  ${line}`)),
    "",
    report.whiteFront
      ? formatGeometryShadowComparisonReport(report.whiteFront)
      : "",
    "",
    report.whiteBack ? formatGeometryShadowComparisonReport(report.whiteBack) : "",
    "",
    "=== Overall Compare Summary ===",
    `Assets: ${report.overall.assetCount}`,
    `PASS: ${report.overall.passCount}  WARNING: ${report.overall.warningCount}`,
    `Average |ΔY|: ${report.overall.averageDeltaY}px`,
    `Maximum |ΔY|: ${report.overall.maximumDeltaY}px`,
    `Compare Result: ${report.compareVerdict}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Emit shadow debug report once per unique signature (dev debug mode only).
 * Does not log in production or when shadow/debug disabled.
 */
export function logGeometryShadowDebugReportOnce(
  report: GeometryShadowDebugReport,
): void {
  if (!isGeometryShadowDebugEnabled()) return;

  const signature = [
    report.compareVerdict,
    report.overall.maximumDeltaY,
    report.whiteFront?.metrics.map((m) => m.deltaY).join(","),
  ].join("|");

  if (signature === lastReportSignature) return;
  lastReportSignature = signature;

  // eslint-disable-next-line no-console
  console.info(formatGeometryShadowDebugReport(report));
}

export function formatGeometryShadowOverallSummary(
  summary: GeometryShadowOverallSummary,
): string {
  return [
    `20 Assets: ${summary.assetCount} evaluated`,
    `PASS: ${summary.passCount}`,
    `WARNING: ${summary.warningCount}`,
    `Average Delta (|ΔY|): ${summary.averageDeltaY}px`,
    `Maximum Delta (|ΔY|): ${summary.maximumDeltaY}px`,
    `Overall: ${summary.verdict}`,
  ].join("\n");
}
