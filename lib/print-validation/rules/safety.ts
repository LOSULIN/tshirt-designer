import type { Side } from "../../constants";
import {
  getDesignerBackBluePrintArea,
  getDesignerBackRecommendedPrintArea,
  getDesignerBluePrintArea,
  getDesignerRecommendedPrintArea,
} from "../../designer-print-area-config";
import { getLayerOrientedAabbCm } from "../../design-inspector";
import { getWorkspaceGarmentLayerOverflowState } from "../../layer-overflow";
import { resolveExportGarmentLayerCmRect } from "../../export-runtime";
import type { LayerCmRect } from "../../design-cm";
import type { DesignLayer } from "../../types";
import { SAFETY_MARGIN_RULES_CM } from "../constants";
import {
  buildValidationResult,
  severityFromMarginInset,
} from "../message";
import { DEFAULT_RULE_SET, getRule } from "../rule-set";
import type { ValidateDesignContext, ValidationResult } from "../types";
import { formatCm } from "../units";

function resolveRecommendedZoneRect(side: Side, size: string): LayerCmRect {
  const blue =
    side === "back"
      ? getDesignerBackBluePrintArea(size)
      : getDesignerBluePrintArea(size);
  const recommended =
    side === "back"
      ? getDesignerBackRecommendedPrintArea(size)
      : getDesignerRecommendedPrintArea(size);

  return {
    x_cm: (blue.widthCm - recommended.widthCm) / 2,
    y_cm: 0,
    width_cm: recommended.widthCm,
    height_cm: recommended.heightCm,
  };
}

function minInsetToRect(
  aabb: { left: number; top: number; right: number; bottom: number },
  bounds: LayerCmRect,
): number {
  return Math.min(
    aabb.left - bounds.x_cm,
    bounds.x_cm + bounds.width_cm - aabb.right,
    aabb.top - bounds.y_cm,
    bounds.y_cm + bounds.height_cm - aabb.bottom,
  );
}

export function validateSafetyMargin(
  layer: DesignLayer,
  ctx: ValidateDesignContext,
): ValidationResult | null {
  const overflow = getWorkspaceGarmentLayerOverflowState(
    layer,
    ctx.side,
    ctx.size,
  );
  if (overflow.exceedsPrintArea) return null;

  const garmentRect = resolveExportGarmentLayerCmRect(layer, ctx.side, ctx.size);
  const aabb = getLayerOrientedAabbCm(garmentRect, layer.rotation);
  const recommended = resolveRecommendedZoneRect(ctx.side, ctx.size);
  const marginCm = minInsetToRect(aabb, recommended);
  const severity = severityFromMarginInset(marginCm, SAFETY_MARGIN_RULES_CM);
  if (severity === "pass") return null;

  const rule = getRule(DEFAULT_RULE_SET, "SAFE-001");
  const rounded = Math.round(marginCm * 100) / 100;
  const currentValue =
    marginCm < 0
      ? `進入安全區邊緣 ${formatCm(Math.abs(rounded))}`
      : `距安全區 ${formatCm(Math.max(0, rounded))}`;

  return buildValidationResult({
    id: `${layer.id}:safety-margin`,
    layerId: layer.id,
    layerName: layer.name,
    rule,
    severity,
    currentValue,
    measured: { marginCm: rounded },
  });
}
