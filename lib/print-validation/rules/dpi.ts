import { getArtworkPixelSize } from "../../image-bounds";
import { resolveExportGarmentLayerCmRect } from "../../export-runtime";
import {
  computeDesignerDisplayDpi,
  computeDesignerRasterPrintDpiAxes,
} from "../../image-print-quality-ui";
import type { ImageDesignLayer } from "../../types";
import { DPI_RULES } from "../constants";
import { buildValidationResult } from "../message";
import { DEFAULT_RULE_SET, getRule } from "../rule-set";
import type { ValidateDesignContext, ValidationResult } from "../types";

export function validateImageDpi(
  layer: ImageDesignLayer,
  ctx: ValidateDesignContext,
): ValidationResult | null {
  const garmentRect = resolveExportGarmentLayerCmRect(layer, ctx.side, ctx.size);
  const { artworkPixelWidth, artworkPixelHeight } = getArtworkPixelSize(layer.image);
  const { dpiX, dpiY } = computeDesignerRasterPrintDpiAxes(
    artworkPixelWidth,
    artworkPixelHeight,
    garmentRect.width_cm,
    garmentRect.height_cm,
  );
  const dpi = computeDesignerDisplayDpi(dpiX, dpiY);

  if (dpi >= DPI_RULES.excellent) return null;

  const isCritical = dpi < DPI_RULES.warning;
  const ruleId = isCritical ? "DPI-001" : "DPI-002";
  const rule = getRule(DEFAULT_RULE_SET, ruleId);

  let severity: ValidationResult["severity"];
  if (isCritical) {
    severity = "critical";
  } else if (dpi < DPI_RULES.recommended) {
    severity = "warning";
  } else {
    severity = "info";
  }

  return buildValidationResult({
    id: `${layer.id}:${ruleId.toLowerCase()}`,
    layerId: layer.id,
    layerName: layer.name,
    rule,
    severity,
    currentValue: `${dpi} DPI`,
    measured: {
      dpi,
      artworkPixelWidth,
      artworkPixelHeight,
      width_cm: garmentRect.width_cm,
      height_cm: garmentRect.height_cm,
    },
  });
}
