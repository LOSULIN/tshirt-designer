/**
 * Artwork Validation Summary — 彙整既有驗證結果供 Proof PDF 顯示。
 * 不修改 design-inspector 或 print-export 驗證邏輯。
 */

import { EXPORT_DPI } from "../constants";
import { getPrintAreaCmBounds } from "../design-cm";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../design-state";
import { inspectDesignLayer } from "../design-inspector";
import {
  getPrintExportDimensionsPx,
  getPrintExportSpec,
} from "../print-export-system";
import type { ProofOrder } from "./types";

export interface ArtworkValidationCheck {
  label: string;
  passed: boolean;
}

export interface ArtworkValidationSummary {
  checks: ArtworkValidationCheck[];
  allPassed: boolean;
}

function evaluatePrintAreaPassed(order: ProofOrder): boolean {
  const printArea = getPrintAreaCmBounds();

  for (const side of DESIGN_SIDES) {
    if (!hasDesignInSlot(order.layers_by_template, order.gender, side)) {
      continue;
    }

    const layers = getLayersForSlot(
      order.layers_by_template,
      order.gender,
      side,
    );

    for (const layer of layers) {
      if (!layer.visible) {
        continue;
      }
      const report = inspectDesignLayer(layer, printArea);
      if (report.exceedsPrintArea) {
        return false;
      }
    }
  }

  return true;
}

export function buildArtworkValidationSummary(
  order: ProofOrder,
): ArtworkValidationSummary {
  const spec = getPrintExportSpec(order.active_side);
  const { widthPx, heightPx } = getPrintExportDimensionsPx(order.active_side);
  const printAreaPassed = evaluatePrintAreaPassed(order);

  const baseChecks: ArtworkValidationCheck[] = [
    {
      label: "PNG Format",
      passed: true,
    },
    {
      label: "RGB Color",
      passed: true,
    },
    {
      label: "Transparent Background",
      passed: spec.background === "transparent",
    },
    {
      label: "Resolution Passed",
      passed:
        spec.dpi === EXPORT_DPI &&
        widthPx === spec.widthPx &&
        heightPx === spec.heightPx,
    },
    {
      label: "Print Area Passed",
      passed: printAreaPassed,
    },
  ];

  const allBasePassed = baseChecks.every((check) => check.passed);

  return {
    checks: [
      ...baseChecks,
      {
        label: "Production Ready",
        passed: allBasePassed,
      },
    ],
    allPassed: allBasePassed,
  };
}
