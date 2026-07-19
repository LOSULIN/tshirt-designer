import type { TextDesignLayer } from "../../types";
import { getTextLayerPlacementCmRect } from "../../text-layer";
import { getRichTextRenderMetrics } from "../../text-style";
import { TEXT_RULES_PT } from "../constants";
import {
  buildValidationResult,
  severityFromHigherIsBetter,
} from "../message";
import { DEFAULT_RULE_SET, getRule } from "../rule-set";
import type { ValidationResult } from "../types";
import { cmToPt, formatPt } from "../units";

function resolveEffectiveFontSizeCm(layer: TextDesignLayer): number {
  if (layer.keepRatio === false) {
    const placementRect = getTextLayerPlacementCmRect(layer);
    return getRichTextRenderMetrics(layer, placementRect).fontSize_cm;
  }
  return layer.fontSize_cm * layer.scale;
}

export function validateTextSize(
  layer: TextDesignLayer,
): ValidationResult | null {
  const effectiveFontSizeCm = resolveEffectiveFontSizeCm(layer);
  const pt = cmToPt(effectiveFontSizeCm);
  const severity = severityFromHigherIsBetter(pt, TEXT_RULES_PT);
  if (severity === "pass") return null;

  const rule = getRule(DEFAULT_RULE_SET, "TEXT-001");
  return buildValidationResult({
    id: `${layer.id}:text-size`,
    layerId: layer.id,
    layerName: layer.name,
    rule,
    severity,
    currentValue: formatPt(pt),
    measured: {
      pt: Math.round(pt * 10) / 10,
      fontSize_cm: effectiveFontSizeCm,
      keepRatio: layer.keepRatio !== false ? "true" : "false",
    },
  });
}
