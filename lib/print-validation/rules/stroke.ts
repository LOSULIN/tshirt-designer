import type { ShapeDesignLayer, TextDesignLayer } from "../../types";
import { STROKE_RULES_MM } from "../constants";
import {
  buildValidationResult,
  severityFromHigherIsBetter,
} from "../message";
import { DEFAULT_RULE_SET, getRule } from "../rule-set";
import type { ValidationResult } from "../types";
import { cmToMm, formatMm } from "../units";

function validateStrokeMm(
  layerId: string,
  layerName: string,
  strokeWidthCm: number,
  ruleId: "TEXT-002" | "STROKE-001",
  idSuffix: string,
): ValidationResult | null {
  const mm = cmToMm(strokeWidthCm);
  const severity = severityFromHigherIsBetter(mm, STROKE_RULES_MM);
  if (severity === "pass") return null;

  const rule = getRule(DEFAULT_RULE_SET, ruleId);
  return buildValidationResult({
    id: `${layerId}:${idSuffix}`,
    layerId,
    layerName,
    rule,
    severity,
    currentValue: formatMm(mm),
    measured: { mm: Math.round(mm * 100) / 100, strokeWidth_cm: strokeWidthCm },
  });
}

export function validateShapeStroke(
  layer: ShapeDesignLayer,
): ValidationResult | null {
  if (layer.shapeKind === "line" || layer.shapeKind === "arrow") return null;
  if (layer.strokeWidth_cm <= 0) return null;
  return validateStrokeMm(
    layer.id,
    layer.name,
    layer.strokeWidth_cm,
    "STROKE-001",
    "shape-stroke",
  );
}

export function validateTextStroke(
  layer: TextDesignLayer,
): ValidationResult | null {
  const stroke = layer.stroke;
  if (!stroke || stroke.width_cm <= 0) return null;
  return validateStrokeMm(
    layer.id,
    layer.name,
    stroke.width_cm,
    "TEXT-002",
    "text-stroke",
  );
}
