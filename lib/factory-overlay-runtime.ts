/**
 * Factory Overlay Runtime — Step 12.7B / 12.7C-1
 * ────────────────────────────────────────────────
 * 工廠 Blue / Orange overlay 矩形（cm）。
 * 僅描述 Factory Anatomy 點位 + 工廠 offset；不含 Template / Canvas / CSS。
 */

import type { Side } from "./constants";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";

/** 前領／背領最低點 → Blue 上緣（cm） */
const FACTORY_OVERLAY_TOP_FROM_COLLAR_CM = {
  front: 7,
  back: 5,
} as const;

export interface FactoryOverlayRectCm {
  /** 距離 Factory Anatomy 前領／背領最低點向下（cm） */
  topFromCollarCm: number;
  /** 距離 Center Front 水平偏移（cm）；左負右正；置中 = 0 */
  centerOffsetXCm: number;
  widthCm: number;
  heightCm: number;
}

/** 工廠 overlay 完整矩形（cm）— Anatomy offset + 印刷區尺寸 */
export function resolveFactoryOverlayRectCm(
  side: Side,
  size: string,
): FactoryOverlayRectCm {
  const { width, height } = resolveGarmentPrintAreaCm(size, side);
  return {
    topFromCollarCm: FACTORY_OVERLAY_TOP_FROM_COLLAR_CM[side],
    centerOffsetXCm: 0,
    widthCm: width,
    heightCm: height,
  };
}
