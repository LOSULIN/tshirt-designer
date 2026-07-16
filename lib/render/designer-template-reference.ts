/**
 * Designer Template Reference — read-only print area on /templates/ canvas.
 * Render / Export mapping only; does not modify Designer Runtime.
 */

import {
  FACTORY_ANATOMY_PRINT_BASELINE_M_BACK,
  FACTORY_ANATOMY_PRINT_BASELINE_M_FRONT,
  type FactoryAnatomyPrintBaselineM,
} from "../factory-anatomy-reference";
import { ADULT_TSHIRT_TEMPLATE_PX_PER_CM } from "../template-metrics";
import type { CalibrationRect, ProductSide } from "./render-types";

const DESIGNER_PRINT_HEIGHT_CM: Record<ProductSide, number> = {
  front: 50,
  back: 45,
};

function baselineToPrintAreaRect(
  baseline: FactoryAnatomyPrintBaselineM,
  heightCm: number,
): CalibrationRect {
  return {
    x: Math.round(baseline.blueBoxLeftPx),
    y: Math.round(baseline.printTopPx),
    width: Math.round(baseline.blueBoxWidthPx),
    height: Math.round(heightCm * ADULT_TSHIRT_TEMPLATE_PX_PER_CM),
  };
}

/** Default Designer Print Area @ 1024×1536 template (M · front/back). */
export function getDefaultDesignerPrintAreaRect(side: ProductSide): CalibrationRect {
  const baseline =
    side === "back"
      ? FACTORY_ANATOMY_PRINT_BASELINE_M_BACK
      : FACTORY_ANATOMY_PRINT_BASELINE_M_FRONT;
  return baselineToPrintAreaRect(baseline, DESIGNER_PRINT_HEIGHT_CM[side]);
}

export const DESIGNER_TEMPLATE_CANVAS = {
  widthPx: 1024,
  heightPx: 1536,
} as const;
