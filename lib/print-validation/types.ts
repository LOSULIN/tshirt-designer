import type { Side } from "../constants";
import type { DesignLayer } from "../types";

/** Pass does not produce a ValidationResult. */
export type ValidationSeverity =
  | "info"
  | "recommendation"
  | "warning"
  | "critical";

export type ValidationCategory =
  | "text"
  | "line"
  | "stroke"
  | "dpi"
  | "safety"
  | "print-area";

export interface RuleMetadata {
  ruleId: string;
  ruleName: string;
  version: string;
  category: ValidationCategory;
  reason: string;
  suggestion: string;
}

export interface ValidationResult {
  id: string;
  rule: RuleMetadata;
  severity: ValidationSeverity;
  layerId: string;
  layerName: string;
  message: string;
  currentValue: string;
  minimumValue: string;
  recommendedValue: string;
  measured?: Record<string, number | string>;
}

export interface PrintQualityScore {
  stars: number;
  label: "Excellent" | "Good" | "Needs Improvement" | "Poor";
  labelZh: string;
}

export type PrintReadyStatus = "ready" | "check_required" | "not_ready";

export interface PrintReadyBadge {
  status: PrintReadyStatus;
  label: string;
  labelZh: string;
  emoji: string;
}

export interface PrintValidationReport {
  layerId: string;
  layerName: string;
  layerType: DesignLayer["type"];
  results: ValidationResult[];
  score: PrintQualityScore;
  printReady: PrintReadyBadge;
}

export interface ValidateDesignContext {
  side: Side;
  size: string;
}

export interface WorkspacePrintValidationSummary {
  reports: PrintValidationReport[];
  overallScore: PrintQualityScore;
  printReady: PrintReadyBadge;
  infoCount: number;
  recommendationCount: number;
  warningCount: number;
  criticalCount: number;
}

export interface FactoryPrintSummary {
  printingMethod: string;
  ruleSetId: string;
  ruleSetVersion: string;
  recommendedDpi: number;
  currentDpi: number | null;
  artworkSizeCm: string | null;
  printAreaCm: string;
  printQuality: PrintQualityScore;
  printReady: PrintReadyBadge;
}
