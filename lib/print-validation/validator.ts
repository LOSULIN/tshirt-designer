import type { DesignLayer } from "../types";
import { validateImageDpi } from "./rules/dpi";
import { validateLineThickness } from "./rules/line";
import { validatePrintArea } from "./rules/print-area";
import { validateSafetyMargin } from "./rules/safety";
import { validateShapeStroke, validateTextStroke } from "./rules/stroke";
import { validateTextSize } from "./rules/text";
import { countBySeverity, getPrintReadyBadge } from "./print-ready";
import { scoreValidationResults } from "./score";
import type {
  PrintValidationReport,
  ValidateDesignContext,
  ValidationResult,
  WorkspacePrintValidationSummary,
} from "./types";

function isVisible(layer: DesignLayer): boolean {
  return layer.visible;
}

function collectLayerResults(
  layer: DesignLayer,
  ctx: ValidateDesignContext,
): ValidationResult[] {
  const results: ValidationResult[] = [];

  const printAreaResult = validatePrintArea(layer, ctx);
  if (printAreaResult) results.push(printAreaResult);

  if (layer.type === "text") {
    const textResult = validateTextSize(layer);
    if (textResult) results.push(textResult);
    const strokeResult = validateTextStroke(layer);
    if (strokeResult) results.push(strokeResult);
  }

  if (layer.type === "shape") {
    const lineResult = validateLineThickness(layer);
    if (lineResult) results.push(lineResult);
    const strokeResult = validateShapeStroke(layer);
    if (strokeResult) results.push(strokeResult);
  }

  if (layer.type === "image") {
    const dpiResult = validateImageDpi(layer, ctx);
    if (dpiResult) results.push(dpiResult);
  }

  const safetyResult = validateSafetyMargin(layer, ctx);
  if (safetyResult) results.push(safetyResult);

  return results;
}

export function validateDesignLayer(
  layer: DesignLayer,
  ctx: ValidateDesignContext,
): PrintValidationReport {
  const results = isVisible(layer) ? collectLayerResults(layer, ctx) : [];

  return {
    layerId: layer.id,
    layerName: layer.name,
    layerType: layer.type,
    results,
    score: scoreValidationResults(results),
    printReady: getPrintReadyBadge(results),
  };
}

export function validateDesignLayers(
  layers: readonly DesignLayer[],
  ctx: ValidateDesignContext,
): WorkspacePrintValidationSummary {
  const reports = layers.map((layer) => validateDesignLayer(layer, ctx));
  const allResults = reports.flatMap((report) => report.results);
  const counts = countBySeverity(allResults);

  return {
    reports,
    overallScore: scoreValidationResults(allResults),
    printReady: getPrintReadyBadge(allResults),
    infoCount: counts.info,
    recommendationCount: counts.recommendation,
    warningCount: counts.warning,
    criticalCount: counts.critical,
  };
}
