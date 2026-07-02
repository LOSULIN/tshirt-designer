/**
 * Template Profile — adult-tshirt-white-back
 * 資料來源：public/guides/template-calibration-report.json
 * （templates[1] · codebase · measuredAt 2026-07-02T04:23:46.483Z）
 */

import type { TemplateProfile } from "./types";

export const ADULT_WHITE_BACK_TEMPLATE_PROFILE: TemplateProfile = {
  id: "adult-white-back",
  canvas: {
    widthPx: 1024,
    heightPx: 1536,
    format: "png",
    pathPattern: "/templates/adult-tshirt-white-back.png",
  },
  garment: {
    baselineChestCm: 52,
    baselineLengthCm: 69,
    armpitChestWidthPx: 603,
    bodyLengthPx: 904,
    pxPerCm: 11.596,
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
      front: 386,
      back: 494,
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
    silhouetteScale: 1,
    source:
      "template-calibration/v1 @ 2026-07-02T04:23:46.483Z · adult-tshirt-white-back.png · legacy-concave",
  },
};
