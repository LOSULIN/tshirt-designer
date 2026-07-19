import type { PrintRuleDefinition } from "./rule-set";
import type { ValidationResult, ValidationSeverity } from "./types";

export function formatProfessionalMessage(
  rule: PrintRuleDefinition,
  currentValue: string,
): string {
  return [
    rule.ruleId,
    `目前：${currentValue}`,
    `最低：${rule.minimumDisplay}`,
    `建議：${rule.recommendedDisplay}`,
    `原因：${rule.reason}`,
  ].join("\n");
}

export function buildValidationResult(params: {
  id: string;
  layerId: string;
  layerName: string;
  rule: PrintRuleDefinition;
  severity: ValidationSeverity;
  currentValue: string;
  measured?: Record<string, number | string>;
}): ValidationResult {
  const { rule, severity, currentValue } = params;
  return {
    id: params.id,
    rule: {
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      version: rule.version,
      category: rule.category,
      reason: rule.reason,
      suggestion: rule.suggestion,
    },
    severity,
    layerId: params.layerId,
    layerName: params.layerName,
    currentValue,
    minimumValue: rule.minimumDisplay,
    recommendedValue: rule.recommendedDisplay,
    message: formatProfessionalMessage(rule, currentValue),
    measured: params.measured,
  };
}

/** Higher-is-better thresholds: excellent → pass, recommended → info, warning → warning tier, below → critical */
export function severityFromHigherIsBetter(
  value: number,
  thresholds: { excellent: number; recommended: number; warning: number },
): ValidationSeverity | "pass" {
  if (value >= thresholds.excellent) return "pass";
  if (value >= thresholds.recommended) return "info";
  if (value >= thresholds.warning) return "warning";
  return "critical";
}

/** Lower-is-better (margin inset): excellent → pass, recommended → info, warning → recommendation, near edge → warning */
export function severityFromMarginInset(
  marginCm: number,
  thresholds: { excellent: number; recommended: number; warning: number },
): ValidationSeverity | "pass" {
  if (marginCm >= thresholds.excellent) return "pass";
  if (marginCm >= thresholds.recommended) return "info";
  if (marginCm >= thresholds.warning) return "recommendation";
  return "warning";
}
