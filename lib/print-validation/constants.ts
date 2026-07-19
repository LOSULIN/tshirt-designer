import { ptToCm } from "./units";

/** Professional Print Rules — Version 1 */

export const TEXT_RULES_PT = {
  excellent: 10,
  recommended: 8,
  warning: 6,
} as const;

export const LINE_RULES_MM = {
  excellent: 0.5,
  recommended: 0.4,
  warning: 0.3,
} as const;

export const STROKE_RULES_MM = {
  excellent: 0.5,
  recommended: 0.4,
  warning: 0.3,
} as const;

export const DPI_RULES = {
  excellent: 450,
  recommended: 350,
  warning: 300,
} as const;

export const SAFETY_MARGIN_RULES_CM = {
  excellent: 1.5,
  recommended: 1.0,
  warning: 0.5,
} as const;

/** Phase 49.5 — creation defaults (prevention, not auto-fix) */
export const DEFAULT_NEW_TEXT_FONT_SIZE_PT = 8;
export const DEFAULT_NEW_TEXT_FONT_SIZE_CM = ptToCm(DEFAULT_NEW_TEXT_FONT_SIZE_PT);
export const DEFAULT_NEW_TEXT_FONT_WEIGHT = 500;
export const DEFAULT_NEW_TEXT_LINE_HEIGHT = 1.2;
export const DEFAULT_NEW_TEXT_LETTER_SPACING_CM = 0;

export const DEFAULT_NEW_LINE_STROKE_MM = 0.4;
export const DEFAULT_NEW_LINE_STROKE_CM = DEFAULT_NEW_LINE_STROKE_MM / 10;

export const DEFAULT_NEW_SHAPE_STROKE_MM = 0.4;
export const DEFAULT_NEW_SHAPE_STROKE_CM = DEFAULT_NEW_SHAPE_STROKE_MM / 10;
