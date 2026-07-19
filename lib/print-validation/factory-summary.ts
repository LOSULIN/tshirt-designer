import { resolveGarmentPrintAreaCm } from "../garment-anchor-runtime";
import { resolveExportGarmentLayerCmRect } from "../export-runtime";
import { getArtworkPixelSize } from "../image-bounds";
import {
  computeDesignerDisplayDpi,
  computeDesignerRasterPrintDpiAxes,
} from "../image-print-quality-ui";
import type { DesignLayer } from "../types";
import { DPI_RULES } from "./constants";
import { getPrintReadyBadge } from "./print-ready";
import { DEFAULT_RULE_SET } from "./rule-set";
import { scoreValidationResults } from "./score";
import type {
  FactoryPrintSummary,
  PrintValidationReport,
  ValidateDesignContext,
} from "./types";
import { validateDesignLayer } from "./validator";

function formatSizePair(widthCm: number, heightCm: number): string {
  const w = Math.round(widthCm * 10) / 10;
  const h = Math.round(heightCm * 10) / 10;
  return `${w} × ${h} cm`;
}

function resolveLayerDpi(
  layer: DesignLayer,
  ctx: ValidateDesignContext,
): number | null {
  if (layer.type !== "image") return null;
  const garmentRect = resolveExportGarmentLayerCmRect(layer, ctx.side, ctx.size);
  const { artworkPixelWidth, artworkPixelHeight } = getArtworkPixelSize(layer.image);
  const { dpiX, dpiY } = computeDesignerRasterPrintDpiAxes(
    artworkPixelWidth,
    artworkPixelHeight,
    garmentRect.width_cm,
    garmentRect.height_cm,
  );
  return computeDesignerDisplayDpi(dpiX, dpiY);
}

function resolveLayerArtworkSize(
  layer: DesignLayer,
  ctx: ValidateDesignContext,
): string | null {
  const garmentRect = resolveExportGarmentLayerCmRect(layer, ctx.side, ctx.size);
  return formatSizePair(garmentRect.width_cm, garmentRect.height_cm);
}

/** Read-only factory summary — no export side effects. */
export function buildFactoryPrintSummary(
  layer: DesignLayer,
  ctx: ValidateDesignContext,
  report?: PrintValidationReport,
): FactoryPrintSummary {
  const validationReport = report ?? validateDesignLayer(layer, ctx);
  const printArea = resolveGarmentPrintAreaCm(ctx.size, ctx.side);

  return {
    printingMethod: DEFAULT_RULE_SET.printingMethod,
    ruleSetId: DEFAULT_RULE_SET.id,
    ruleSetVersion: DEFAULT_RULE_SET.version,
    recommendedDpi: DPI_RULES.excellent,
    currentDpi: resolveLayerDpi(layer, ctx),
    artworkSizeCm: resolveLayerArtworkSize(layer, ctx),
    printAreaCm: formatSizePair(printArea.width, printArea.height),
    printQuality: validationReport.score,
    printReady: validationReport.printReady,
  };
}

export function buildWorkspaceFactorySummary(
  layers: readonly DesignLayer[],
  ctx: ValidateDesignContext,
  reports: PrintValidationReport[],
): FactoryPrintSummary {
  const visibleLayers = layers.filter((l) => l.visible);
  const allResults = reports.flatMap((r) => r.results);
  const printArea = resolveGarmentPrintAreaCm(ctx.size, ctx.side);

  const imageDpis = visibleLayers
    .filter((l) => l.type === "image")
    .map((l) => resolveLayerDpi(l, ctx))
    .filter((dpi): dpi is number => dpi != null);

  const currentDpi =
    imageDpis.length > 0 ? Math.min(...imageDpis) : null;

  return {
    printingMethod: DEFAULT_RULE_SET.printingMethod,
    ruleSetId: DEFAULT_RULE_SET.id,
    ruleSetVersion: DEFAULT_RULE_SET.version,
    recommendedDpi: DPI_RULES.excellent,
    currentDpi,
    artworkSizeCm: null,
    printAreaCm: formatSizePair(printArea.width, printArea.height),
    printQuality: scoreValidationResults(allResults),
    printReady: getPrintReadyBadge(allResults),
  };
}
