/**
 * Mockup Garment Visual Tuning — UA35001 product photo appearance only.
 *
 * Adjusts garment PNG draw width/height before compose drawImage.
 * Does not affect artwork, placement, metrics, Designer, or Factory.
 */

import type { CalibrationRect } from "./render-types";

export interface MockupGarmentVisualTuning {
  factorW: number;
  factorH: number;
}

/** Per-size garment appearance factors (M = identity). Inline only — no JSON. */
const MOCKUP_GARMENT_VISUAL_TUNING: Record<string, MockupGarmentVisualTuning> = {
  "90": { factorW: 1, factorH: 0.92 },
  "110": { factorW: 1, factorH: 0.96 },
  "130": { factorW: 1, factorH: 1 },
  "150": { factorW: 1, factorH: 1 },
  "160": { factorW: 1, factorH: 1 },
  GS: { factorW: 1, factorH: 1 },
  GM: { factorW: 1, factorH: 1 },
  GL: { factorW: 1, factorH: 1 },
  S: { factorW: 1, factorH: 1 },
  M: { factorW: 1, factorH: 1 },
  L: { factorW: 1, factorH: 1 },
  XL: { factorW: 1.03, factorH: 1 },
  XXL: { factorW: 1.05, factorH: 1 },
  XXXL: { factorW: 1.08, factorH: 1 },
};

const IDENTITY_TUNING: MockupGarmentVisualTuning = { factorW: 1, factorH: 1 };

export function resolveMockupGarmentVisualTuning(
  size: string,
): MockupGarmentVisualTuning {
  return MOCKUP_GARMENT_VISUAL_TUNING[size] ?? IDENTITY_TUNING;
}

/**
 * Apply mockup-only garment appearance tuning.
 * Only garmentFrame.width and garmentFrame.height are changed.
 */
export function applyMockupGarmentVisualTuning(
  frame: CalibrationRect,
  size: string,
): CalibrationRect {
  const { factorW, factorH } = resolveMockupGarmentVisualTuning(size);
  if (factorW === 1 && factorH === 1) {
    return frame;
  }

  return {
    ...frame,
    width: frame.width * factorW,
    height: frame.height * factorH,
  };
}
