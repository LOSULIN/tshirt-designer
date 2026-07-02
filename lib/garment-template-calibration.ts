/**
 * Garment template visual calibration — Preview overlay only.
 * 補正模板 PNG 與印刷區錨點的視覺偏差；不影響 layer cm、export、production。
 */

import type { Side } from "./constants";

export interface GarmentTemplateOffsetPx {
  x: number;
  y: number;
}

/** 模板視覺校正（px @ 1024×1536 畫布；相對 container 中心微調） */
export const GARMENT_TEMPLATE_OFFSET_PX: Record<Side, GarmentTemplateOffsetPx> = {
  front: { x: 0, y: 0 },
  back: { x: 0, y: 0 },
} as const;

export function getGarmentTemplateCalibrationOffsetPx(
  side: Side,
): GarmentTemplateOffsetPx {
  return GARMENT_TEMPLATE_OFFSET_PX[side];
}
