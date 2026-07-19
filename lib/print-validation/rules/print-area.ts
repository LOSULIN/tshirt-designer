import { getWorkspaceGarmentLayerOverflowState } from "../../layer-overflow";
import type { DesignLayer } from "../../types";
import { buildValidationResult } from "../message";
import { DEFAULT_RULE_SET, getRule } from "../rule-set";
import type { ValidateDesignContext, ValidationResult } from "../types";
import { formatCm } from "../units";

const EDGE_LABELS = {
  left: "左側",
  right: "右側",
  top: "上緣",
  bottom: "下緣",
} as const;

export function validatePrintArea(
  layer: DesignLayer,
  ctx: ValidateDesignContext,
): ValidationResult | null {
  const overflow = getWorkspaceGarmentLayerOverflowState(
    layer,
    ctx.side,
    ctx.size,
  );
  if (!overflow.exceedsPrintArea) return null;

  const rule = getRule(DEFAULT_RULE_SET, "PRINT-001");
  const edges = overflow.overflowEdges
    .map((edge) => EDGE_LABELS[edge])
    .join("、");
  const maxOverflow = Math.max(
    overflow.overflowAmountCm.left,
    overflow.overflowAmountCm.right,
    overflow.overflowAmountCm.top,
    overflow.overflowAmountCm.bottom,
  );

  return buildValidationResult({
    id: `${layer.id}:print-area`,
    layerId: layer.id,
    layerName: layer.name,
    rule,
    severity: "critical",
    currentValue: `超出${edges} ${formatCm(maxOverflow)}`,
    measured: {
      maxOverflowCm: Math.round(maxOverflow * 100) / 100,
      edges: edges || "unknown",
    },
  });
}
