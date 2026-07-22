/**
 * Garment Metrics — M baseline template constants.
 * Source: template-calibration-report / adult-white-front template profile.
 * Read-only; not imported by Designer / Factory runtimes.
 */

import type { Side } from "@/lib/constants";

/** Official M chest — paired with visualChestPx */
export const METRICS_BASELINE_CHEST_CM = 52;

/** Official M length — paired with visualBodyHeightPx */
export const METRICS_BASELINE_LENGTH_CM = 69;

export const METRICS_BASELINE_SIZE = "M" as const;

export const METRICS_TEMPLATE_WIDTH_PX = 1024;

export const METRICS_TEMPLATE_HEIGHT_PX = 1536;

/** Armpit chest width @ M template PNG */
export const METRICS_BASELINE_VISUAL_CHEST_PX = 550;

/** HPS → hem body length @ M template PNG */
export const METRICS_BASELINE_VISUAL_BODY_HEIGHT_PX = 903;

/** HPS Y @ M */
export const METRICS_BASELINE_COLLAR_TOP_PX = 312;

/** Hem center Y @ M */
export const METRICS_BASELINE_HEM_BOTTOM_PX = 1215;

/** Front center line X @ M */
export const METRICS_BASELINE_CENTER_X_PX = 512;

/** Template vertical center */
export const METRICS_TEMPLATE_CENTER_Y_PX = 768;

/** Collar lowest Y for print-area offset @ M (print-area-offset) */
export const METRICS_COLLAR_ANCHOR_Y_PX: Record<Side, number> = {
  front: 386,
  back: 386,
};

/** Collar lowest → blue top (cm) */
export const METRICS_PRINT_TOP_OFFSET_CM: Record<Side, number> = {
  front: 7,
  back: 5,
};

/** 1 cm → template px @ designer template */
export const METRICS_TEMPLATE_PX_PER_CM = 12.24;

/** Print chest reference / visual chest — matches garment-visual-profile */
export const METRICS_CHEST_PRINT_ALIGN_RATIO = 612 / 550;
