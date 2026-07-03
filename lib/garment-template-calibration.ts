/**
 * Garment template visual calibration — Preview overlay only.
 * 補正模板 PNG 與印刷區錨點的視覺偏差；不影響 layer cm、export、production。
 *
 * Presentation Only. Visual compensation only.
 * Does NOT affect coordinate runtime.
 * Does NOT affect print position.
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

/**
 * 背面領口剪影較高於 COLLAR_ANCHOR — 僅下移衣服 PNG 以對齊視覺領口。
 * 可於 mockup-calibration 目測微調（建議約 12–18 px @ 1024×1536）。
 */
export const BACK_COLLAR_VISUAL_COMPENSATION_PX = 15;

/**
 * Designer 衣服 PNG 視覺位移（@ 1024×1536 模板空間；藍框與 layer cm 不動）。
 * Presentation Only — 不進 export / proof / inspector。
 */
export const MOCKUP_VISUAL_OFFSET_PX_BY_SIDE: Record<
  Side,
  GarmentTemplateOffsetPx
> = {
  front: { x: 0, y: 0 },
  back: { x: 0, y: BACK_COLLAR_VISUAL_COMPENSATION_PX },
} as const;

export function getGarmentTemplateCalibrationOffsetPx(
  side: Side,
): GarmentTemplateOffsetPx {
  return GARMENT_TEMPLATE_OFFSET_PX[side];
}

/** Designer 主畫布：衣服 PNG presentation offset（不含藍框） */
export function getDesignerMockupVisualOffsetPx(
  side: Side,
): GarmentTemplateOffsetPx {
  return MOCKUP_VISUAL_OFFSET_PX_BY_SIDE[side];
}
