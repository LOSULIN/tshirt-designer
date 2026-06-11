/**
 * validation-report.json — 彙整既有驗證結果供 ZIP 輸出。
 */

import { getPrintExportSpec } from "../print-export-system";
import { buildArtworkValidationSummary } from "./artwork-validation-summary";
import type { ProofOrder } from "./types";

export const VALIDATION_REPORT_FILENAME = "validation-report.json";

export interface ValidationReport {
  status: "PASS" | "FAIL";
  dpi: number;
  colorMode: "RGB";
  transparent: boolean;
  resolutionPassed: boolean;
  boundsPassed: boolean;
  timestamp: string;
}

export function buildValidationReport(
  order: ProofOrder,
  timestamp?: string,
): ValidationReport {
  const summary = buildArtworkValidationSummary(order);
  const spec = getPrintExportSpec();

  const transparent =
    summary.checks.find((check) => check.label === "Transparent Background")
      ?.passed ?? false;
  const resolutionPassed =
    summary.checks.find((check) => check.label === "Resolution Passed")
      ?.passed ?? false;
  const boundsPassed =
    summary.checks.find((check) => check.label === "Print Area Passed")
      ?.passed ?? false;

  return {
    status: summary.allPassed ? "PASS" : "FAIL",
    dpi: spec.dpi,
    colorMode: "RGB",
    transparent,
    resolutionPassed,
    boundsPassed,
    timestamp: timestamp ?? order.created_at ?? new Date().toISOString(),
  };
}

export function serializeValidationReport(report: ValidationReport): string {
  return JSON.stringify(report, null, 2);
}
