/**
 * Template Profile — Runtime Facade
 * ─────────────────────────────────
 * Step 11.2-1：統一 Template 資料入口（僅轉呼叫既有 API，無新公式）。
 * 本模組尚未接線至其他 runtime；消費者仍使用原有 import。
 */

import type { Side } from "../constants";
import {
  GARMENT_TEMPLATE_OFFSET_PX,
  getGarmentTemplateCalibrationOffsetPx,
  type GarmentTemplateOffsetPx,
} from "../garment-template-calibration";
import type { UiPrintReference } from "../coordinates/ui-print-offset";
import { getCurrentTemplateProfile } from "./index";
import type { TemplateProfile } from "./types";

export interface RuntimeTemplateCanvas {
  widthPx: number;
  heightPx: number;
  aspectRatio: number;
}

export interface RuntimeTemplatePrintArea {
  widthCm: number;
  heightCm: number;
}

export interface RuntimeTemplatePlacement {
  reference: UiPrintReference;
  offset: Record<Side, GarmentTemplateOffsetPx>;
  containerCenter: { x: number; y: number };
}

export interface RuntimeTemplateCollar {
  collarAnchorY: number;
  printOffsetCm: number;
}

/** 模板畫布規格（1024×1536） */
export function getRuntimeTemplateCanvas(): RuntimeTemplateCanvas {
  const { widthPx, heightPx } = getCurrentTemplateProfile().canvas;
  return {
    widthPx,
    heightPx,
    aspectRatio: widthPx / heightPx,
  };
}

/** 設計器藍框最大印刷區（cm）— 正面 35×50、背面 38×45 */
export function getRuntimeTemplatePrintArea(
  side: Side,
): RuntimeTemplatePrintArea {
  const { widthCm, heightCm } =
    getCurrentTemplateProfile().print.maxPrintAreaCm[side];
  return {
    widthCm,
    heightCm,
  };
}

/** Print overlay：1 cm → px（12.24） */
export function getRuntimeTemplatePxPerCm(): number {
  return getCurrentTemplateProfile().print.pxPerCm;
}

/**
 * 藍框錨點與 container 中心（@ front · M 預設 reference）。
 * offset 為面別校正表；containerCenter 與 PREVIEW_CONTAINER 一致。
 * reference 公式與 garment.getGarmentPrintReference（front · M）相同：
 * container 中心 + 視覺校正 offset → ref（0~1）。
 */
export function getRuntimeTemplatePlacement(): RuntimeTemplatePlacement {
  const { widthPx, heightPx } = getCurrentTemplateProfile().canvas;
  const templateOffset = getGarmentTemplateCalibrationOffsetPx("front");
  const printCenterXPx = widthPx / 2 + templateOffset.x;
  const printCenterPx = heightPx / 2 + templateOffset.y;
  return {
    reference: {
      x: printCenterXPx / widthPx,
      y: printCenterPx / heightPx,
    },
    offset: {
      front: getGarmentTemplateCalibrationOffsetPx("front"),
      back: getGarmentTemplateCalibrationOffsetPx("back"),
    },
    containerCenter: {
      x: widthPx / 2,
      y: heightPx / 2,
    },
  };
}

/** 領口錨點 Y（px）與印刷區上緣 offset（cm） */
export function getRuntimeTemplateCollar(side: Side): RuntimeTemplateCollar {
  const { anchorYPx, printOffsetCm } = getCurrentTemplateProfile().collar[side];
  return {
    collarAnchorY: anchorYPx,
    printOffsetCm,
  };
}

/** 目前設計器 Template Profile */
export function getRuntimeTemplateProfile(): TemplateProfile {
  return getCurrentTemplateProfile();
}

/** Facade 透出的 offset 常數（與 garment-template-calibration 同源） */
export { GARMENT_TEMPLATE_OFFSET_PX };
