import type { ShapeDesignLayer } from "../../types";
import { LINE_RULES_MM } from "../constants";
import {
  buildValidationResult,
  severityFromHigherIsBetter,
} from "../message";
import { DEFAULT_RULE_SET, getRule } from "../rule-set";
import type { ValidationResult } from "../types";
import { cmToMm, formatMm } from "../units";

export function validateLineThickness(
  layer: ShapeDesignLayer,
): ValidationResult | null {
  if (layer.shapeKind !== "line" && layer.shapeKind !== "arrow") return null;

  const mm = cmToMm(layer.strokeWidth_cm);
  const severity = severityFromHigherIsBetter(mm, LINE_RULES_MM);
  if (severity === "pass") return null;

  const rule = getRule(DEFAULT_RULE_SET, "LINE-001");
  return buildValidationResult({
    id: `${layer.id}:line-thickness`,
    layerId: layer.id,
    layerName: layer.name,
    rule,
    severity,
    currentValue: formatMm(mm),
    measured: { mm: Math.round(mm * 100) / 100, strokeWidth_cm: layer.strokeWidth_cm },
  });
}
