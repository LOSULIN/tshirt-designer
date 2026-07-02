/**
 * Template Profile — adult-tshirt-white-front
 * 資料來源：public/guides/template-calibration-report.json
 * （referenceTemplate · templates[0] · codebase · measuredAt 2026-07-02T04:23:46.483Z）
 */

import type { TemplateProfile } from "./types";

export const ADULT_WHITE_FRONT_TEMPLATE_PROFILE: TemplateProfile = {
  id: "adult-white-front",
  canvas: {
    widthPx: 1024,
    heightPx: 1536,
    format: "png",
    pathPattern: "/templates/adult-tshirt-white-front.png",
  },
  garment: {
    baselineChestCm: 52,
    baselineLengthCm: 69,
    armpitChestWidthPx: 550,
    bodyLengthPx: 903,
    pxPerCm: 10.577,
  },
  print: {
    chestReferencePx: 612,
    pxPerCm: 12.24,
    maxPrintAreaCm: {
      front: { widthCm: 35, heightCm: 50 },
      back: { widthCm: 38, heightCm: 45 },
    },
    productionPrintAreaMm: {
      width_mm: 350,
      height_mm: 500,
    },
    printAreaOffsetCm: {
      front: 7,
      back: 5,
    },
  },
  collar: {
    front: { anchorYPx: 386, printOffsetCm: 7 },
    back: { anchorYPx: 386, printOffsetCm: 5 },
  },
  measurement: {
    collarAnchorYPx: {
      front: 494,
      back: 386,
    },
    calibrationLine: {
      leftXPx: 206,
      rightXPx: 818,
      yPx: 386,
      chestPx: 612,
    },
    containerCenterPx: {
      x: 512,
      y: 768,
    },
    /** 612 / 550 — 對齊印刷標定胸寬，僅 ShirtVisualScale */
    silhouetteScale: 1.1127,
    source:
      "template-calibration/v1 @ 2026-07-02T04:23:46.483Z · adult-tshirt-white-front.png · legacy-concave",
  },
};
