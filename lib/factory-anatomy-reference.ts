/**
 * Factory Anatomy Reference — Step 12.6C-1 / 12.7C-4
 * ────────────────────────────────────────
 * 成衣解剖基準（M · 1024×1536 PNG）。
 * 純資料層；不參與 Placement / Render / Export。
 *
 * 資料來源：public/guides/template-calibration-report.json
 * · templates[0] adult-tshirt-white-front.png · pngMeasurement
 * · templates[1] adult-tshirt-white-back.png · pngMeasurement
 */

import type { Side } from "./constants";

/** 模板 PNG 像素座標 */
export interface FactoryAnatomyPointPx {
  x: number;
  y: number;
}

export interface FactoryAnatomyProfile {
  collarLowest: FactoryAnatomyPointPx;
  leftShoulder: FactoryAnatomyPointPx;
  rightShoulder: FactoryAnatomyPointPx;
  /** 前中／背中垂直線 X（px @ M baseline） */
  centerFront: number;
  hps: FactoryAnatomyPointPx;
  bodyLengthPx: number;
  chestWidthPx: number;
}

/** 成人 M · 正面 · template-calibration-report.json */
export const FACTORY_ANATOMY_PROFILE_M_FRONT: FactoryAnatomyProfile = {
  collarLowest: { x: 488, y: 494 },
  leftShoulder: { x: 355, y: 302 },
  rightShoulder: { x: 726, y: 322 },
  centerFront: 512,
  hps: { x: 541, y: 312 },
  bodyLengthPx: 903,
  chestWidthPx: 550,
};

/** 成人 M · 背面 · template-calibration-report.json templates[1] */
export const FACTORY_ANATOMY_PROFILE_M_BACK: FactoryAnatomyProfile = {
  collarLowest: { x: 489, y: 494 },
  leftShoulder: { x: 358, y: 301 },
  rightShoulder: { x: 727, y: 323 },
  centerFront: 513,
  hps: { x: 543, y: 312 },
  bodyLengthPx: 904,
  chestWidthPx: 603,
};

/**
 * M 尺碼印刷 overlay 基準（template-calibration-report · printOverlayRects）。
 * 僅凍結資料；供 Runtime 將解剖 px 換算為印刷區 cm，不引入 Designer Runtime。
 */
export interface FactoryAnatomyPrintBaselineM {
  blueBoxLeftPx: number;
  printTopPx: number;
  blueBoxWidthPx: number;
  blueWidthCm: number;
}

/** 正面 M overlay 基準 */
export const FACTORY_ANATOMY_PRINT_BASELINE_M_FRONT: FactoryAnatomyPrintBaselineM =
  {
    blueBoxLeftPx: 297.79999999999995,
    printTopPx: 471.68,
    blueBoxWidthPx: 428.40000000000003,
    blueWidthCm: 35,
  };

/** @deprecated 請用 FACTORY_ANATOMY_PRINT_BASELINE_M_FRONT */
export const FACTORY_ANATOMY_PRINT_BASELINE_M =
  FACTORY_ANATOMY_PRINT_BASELINE_M_FRONT;

/** 背面 M overlay 基準 */
export const FACTORY_ANATOMY_PRINT_BASELINE_M_BACK: FactoryAnatomyPrintBaselineM =
  {
    blueBoxLeftPx: 279.44,
    printTopPx: 447.2,
    blueBoxWidthPx: 465.12,
    blueWidthCm: 38,
  };

const FACTORY_ANATOMY_PROFILE_BY_SIDE: Record<Side, FactoryAnatomyProfile> = {
  front: FACTORY_ANATOMY_PROFILE_M_FRONT,
  back: FACTORY_ANATOMY_PROFILE_M_BACK,
};

const FACTORY_ANATOMY_PRINT_BASELINE_BY_SIDE: Record<
  Side,
  FactoryAnatomyPrintBaselineM
> = {
  front: FACTORY_ANATOMY_PRINT_BASELINE_M_FRONT,
  back: FACTORY_ANATOMY_PRINT_BASELINE_M_BACK,
};

/**
 * 模板 PNG 領口最低點 Y（px @ 1024×1536）。
 * Factory Calibration 凍結值；Overlay 定位不隨商品尺碼衣長縮放。
 */
export const FACTORY_COLLAR_LOWEST_TEMPLATE_Y_PX: Record<Side, number> = {
  front: FACTORY_ANATOMY_PROFILE_M_FRONT.collarLowest.y,
  back: FACTORY_ANATOMY_PROFILE_M_BACK.collarLowest.y,
};

/** Factory Calibration 領口最低點 @ 模板 Y（px）；不依 size 衣長縮放 */
export function getFactoryCollarLowestTemplateYPx(side: Side = "front"): number {
  return FACTORY_COLLAR_LOWEST_TEMPLATE_Y_PX[side];
}

/** 凍結的 M 解剖基準（依面別） */
export function getFactoryAnatomyProfile(side: Side = "front"): FactoryAnatomyProfile {
  return FACTORY_ANATOMY_PROFILE_BY_SIDE[side];
}

/** M overlay 印刷基準（依面別） */
export function getFactoryAnatomyPrintBaseline(
  side: Side = "front",
): FactoryAnatomyPrintBaselineM {
  return FACTORY_ANATOMY_PRINT_BASELINE_BY_SIDE[side];
}
