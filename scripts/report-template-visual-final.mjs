#!/usr/bin/env node
/**
 * Template Visual Final QA — 分析藍框 vs 衣服輪廓定位（不修改 runtime）
 * 複製 ShirtVisualScale、getGarmentPrintMetrics、getPreviewPrintAreaContainerStyle 公式
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCodebaseCalibrationConstants } from "./lib/read-calibration-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SIZES = ["M", "90", "130", "GM", "XL", "XXXL"];
const CONTAINER = { width: 1024, height: 1536 };
const CENTER = { x: 512, y: 768 };
const SIDE = "front";
const MIN_PREVIEW_PRINT_AREA_SCALE = 0.85;
const SAFE_ZONE_M_FRONT = { widthCm: 26, heightCm: 40 };
const COLLAR_ANCHOR_Y = 386;
const PRINT_AREA_OFFSET_CM_FRONT = 7;

function round(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function pct(num, den) {
  return den ? round((num / den) * 100, 1) : null;
}

function parseProductChestBySize() {
  const src = fs.readFileSync(
    path.join(ROOT, "lib/product-size-config.ts"),
    "utf8",
  );
  const map = {};
  const re = /size:\s*"([^"]+)"[\s\S]*?chest:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    map[m[1]] = Number(m[2]);
  }
  return map;
}

function parseTemplateOffsetPx() {
  const src = fs.readFileSync(
    path.join(ROOT, "lib/garment-template-calibration.ts"),
    "utf8",
  );
  const front = src.match(/front:\s*\{\s*x:\s*(-?[\d.]+),\s*y:\s*(-?[\d.]+)/);
  return {
    x: front ? Number(front[1]) : 0,
    y: front ? Number(front[2]) : 0,
  };
}

function getShirtScale(size, baselineChestCm, chestBySize) {
  return chestBySize[size] / baselineChestCm;
}

function getPreviewPrintAreaScale(shirtScale) {
  return Math.max(MIN_PREVIEW_PRINT_AREA_SCALE, shirtScale);
}

function getShirtVisualScale(size, silhouetteScale, baselineChestCm, chestBySize) {
  return getShirtScale(size, baselineChestCm, chestBySize) * silhouetteScale;
}

function scalePoint(x, y, scale, cx = CENTER.x, cy = CENTER.y) {
  return {
    x: cx + (x - cx) * scale,
    y: cy + (y - cy) * scale,
  };
}

function scaleShirtBounds(baseBBox, visualScale) {
  const tl = scalePoint(baseBBox.minX, baseBBox.minY, visualScale);
  const br = scalePoint(baseBBox.maxX, baseBBox.maxY, visualScale);
  return {
    left: tl.x,
    top: tl.y,
    right: br.x,
    bottom: br.y,
    width: br.x - tl.x,
    height: br.y - tl.y,
  };
}

function scaleGarmentY(yPx, garmentScale) {
  return CENTER.y + (yPx - CENTER.y) * garmentScale;
}

function getGarmentPrintMetrics(size, shirtScale) {
  const scaledCollarLowYPx = scaleGarmentY(COLLAR_ANCHOR_Y, shirtScale);
  const pxPerCm = 12.24;
  const printTopPx =
    scaledCollarLowYPx + PRINT_AREA_OFFSET_CM_FRONT * pxPerCm * shirtScale;
  const templateOffset = parseTemplateOffsetPx();
  const printCenterXPx = CONTAINER.width / 2 + templateOffset.x;
  const printCenterPx = CONTAINER.height / 2 + templateOffset.y;
  return {
    shirtScale,
    scaledCollarLowYPx,
    printTopPx,
    ref: {
      x: printCenterXPx / CONTAINER.width,
      y: printCenterPx / CONTAINER.height,
    },
    printCenterPx,
    printCenterXPx,
    templateOffset,
  };
}

function getBlueBounds(size, pxPerCm, blueBoxCm, metrics) {
  const shirtScale = metrics.shirtScale;
  const previewScale = getPreviewPrintAreaScale(shirtScale);
  const widthPct =
    ((blueBoxCm.widthCm * pxPerCm) / CONTAINER.width) * previewScale;
  const heightPct =
    ((blueBoxCm.heightCm * pxPerCm) / CONTAINER.height) * previewScale;
  const centerX = metrics.ref.x * CONTAINER.width;
  const centerY = metrics.ref.y * CONTAINER.height;
  const width = CONTAINER.width * widthPct;
  const height = CONTAINER.height * heightPct;
  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
    width,
    height,
    centerX,
    centerY,
    widthPct,
    heightPct,
    previewPrintAreaScale: previewScale,
  };
}

function getOrangePctInBlue(size, metrics, pxPerCm, blueBoxCm, chestBySize, baselineChestCm) {
  const printWidthPx = blueBoxCm.widthCm * pxPerCm;
  const printHeightPx = blueBoxCm.heightCm * pxPerCm;
  const printLeftPx = (CONTAINER.width - printWidthPx) / 2;
  const printTopPx = metrics.printTopPx;
  const chest = chestBySize[size];
  const ratio = chest / baselineChestCm;
  const safeWidthCm = SAFE_ZONE_M_FRONT.widthCm * ratio;
  const safeHeightCm = SAFE_ZONE_M_FRONT.heightCm * ratio;
  const safeWidthPx = safeWidthCm * pxPerCm;
  const safeHeightPx = safeHeightCm * pxPerCm;
  const safeLeftPx = (CONTAINER.width - safeWidthPx) / 2;
  const safeTopPx = metrics.printTopPx;
  return {
    leftPct: ((safeLeftPx - printLeftPx) / printWidthPx) * 100,
    topPct: ((safeTopPx - printTopPx) / printHeightPx) * 100,
    widthPct: (safeWidthPx / printWidthPx) * 100,
    heightPct: (safeHeightPx / printHeightPx) * 100,
    collarBasedPrintTopPx: printTopPx,
  };
}

function getOrangeBounds(blue, orangePct) {
  const left = blue.left + (blue.width * orangePct.leftPct) / 100;
  const top = blue.top + (blue.height * orangePct.topPct) / 100;
  const width = (blue.width * orangePct.widthPct) / 100;
  const height = (blue.height * orangePct.heightPct) / 100;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

function margins(inner, outer) {
  return {
    left: round(inner.left - outer.left, 1),
    right: round(outer.right - inner.right, 1),
    top: round(inner.top - outer.top, 1),
    bottom: round(outer.bottom - inner.bottom, 1),
  };
}

function assessProportions(shirt, blue, orange, shirtArmpitWidthPx) {
  const blueOverShirtW = pct(blue.width, shirtArmpitWidthPx);
  const orangeOverShirtW = pct(orange.width, shirtArmpitWidthPx);
  const orangeOverBlueW = pct(orange.width, blue.width);
  const blueInsideShirt =
    blue.left >= shirt.left - 1 &&
    blue.right <= shirt.right + 1 &&
    blue.top >= shirt.top - 1 &&
    blue.bottom <= shirt.bottom + 1;
  const orangeInsideBlue =
    orange.left >= blue.left - 0.5 &&
    orange.right <= blue.right + 0.5 &&
    orange.top >= blue.top - 0.5 &&
    orange.bottom <= blue.bottom + 0.5;
  let reasonable = true;
  const notes = [];
  if (blue.width > shirtArmpitWidthPx * 1.05) {
    reasonable = false;
    notes.push("藍框寬度超出腋下胸寬參考");
  }
  if (!orangeInsideBlue && orange.bottom > blue.bottom + 1) {
    reasonable = false;
    notes.push("橘框下緣超出藍框（高度裁切風險）");
  }
  if (orangeOverShirtW > 85) {
    notes.push("橘框接近或超過胸寬比例上限");
  }
  if (blueOverShirtW < 65 || blueOverShirtW > 85) {
    notes.push(`藍框/衣寬 ${blueOverShirtW}% 偏離典型 70–80% 區間`);
  }
  return {
    blueOverShirtWidthPct: blueOverShirtW,
    orangeOverShirtWidthPct: orangeOverShirtW,
    orangeOverBlueWidthPct: orangeOverBlueW,
    blueInsideShirt,
    orangeInsideBlue,
    proportionsReasonable: reasonable && notes.length <= 1,
    notes,
  };
}

function analyzePosition(blueMargins, metrics, blue) {
  const horizontalDelta = blueMargins.left - blueMargins.right;
  const verticalDelta = blueMargins.top - blueMargins.bottom;
  const analysis = {
    vertical: "centered",
    horizontal: "centered",
    reasons: [],
  };
  if (Math.abs(horizontalDelta) > 25) {
    analysis.horizontal = horizontalDelta > 0 ? "偏右" : "偏左";
    analysis.reasons.push(
      "藍框錨點在 container 中心；衣服輪廓視覺中心與 container 中心不完全重合",
    );
  }
  if (blueMargins.top < 150) {
    analysis.vertical = "偏高";
    analysis.reasons.push(
      "藍框以 container 中心定位（translate -50%,-50%），非領口+7cm 起印線",
    );
  } else if (blueMargins.bottom < 120) {
    analysis.vertical = "偏低";
    analysis.reasons.push("衣長放大後下擺接近藍框下緣");
  }
  const collarPrintTop = metrics.printTopPx;
  const blueTopDelta = round(blue.top - collarPrintTop, 1);
  analysis.reasons.push(
    `領口基準起印線 Y≈${round(collarPrintTop, 1)}px；藍框上緣 Y=${round(blue.top, 1)}px（Δ${blueTopDelta}px）`,
  );
  analysis.reasons.push(
    `GARMENT_TEMPLATE_OFFSET_PX = (${metrics.templateOffset.x}, ${metrics.templateOffset.y})`,
  );
  return analysis;
}

function buildRecommendation(allRows) {
  const m = allRows.find((r) => r.size === "M");
  const childWide = allRows.filter(
    (r) =>
      (r.size === "90" || r.size === "130") &&
      r.proportions.blueOverShirtWidthPct > 100,
  );
  const xxxlClip = allRows.find((r) => r.size === "XXXL" && !r.proportions.orangeInsideBlue);

  let choice = "C";
  let rationale = [];

  if (m) {
    const hm = Math.abs(m.blueMargins.left - m.blueMargins.right);
    const vm = m.positionAnalysis.vertical;
    if (hm > 30 || vm !== "centered") {
      choice = "A";
      rationale.push("M 尺碼藍框相對衣身輪廓邊距不對稱或垂直偏移，可優先以 GARMENT_TEMPLATE_OFFSET_PX 微調");
    }
    const topDelta = Math.abs(m.blueBounds.top - m.metrics.collarBasedPrintTopPx);
    if (topDelta > 15 && choice === "C") {
      choice = "B";
      rationale.push(
        "藍框中心錨點與領口+offset 起印線不一致，若需對齊實際印刷起點需調 print area anchor",
      );
    }
  }

  if (childWide.length) {
    rationale.push("90/130 藍框寬度仍大於縮放後衣身（preview 0.85 floor），屬既有 preview 策略非 offset 可解");
  }
  if (xxxlClip) {
    rationale.push("XXXL 橘框高度超出藍框為尺碼安全區 cm 設計問題，非 silhouette 或 offset 單獨可解");
  }

  if (choice === "C" && rationale.length === 0) {
    rationale.push(
      "silhouetteScale 已使 M 衣寬對齊 612px 標定；藍框維持印刷座標契約且全尺碼大致落在衣身內",
    );
    rationale.push(
      "剩餘偏差主要來自 container 中心錨點 vs 衣身視覺中心，屬可接受範圍或留待目視 QA",
    );
  }

  return {
    choice,
    label:
      choice === "A"
        ? "修改 GARMENT_TEMPLATE_OFFSET_PX"
        : choice === "B"
          ? "修改 print area anchor"
          : "完全不用修改",
    rationale,
    childBlueWiderThanShirt: childWide.map((r) => r.size),
    xxxlOrangeClipped: Boolean(xxxlClip),
  };
}

function main() {
  const profile = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "public/template-profiles/adult-white-front.json"),
      "utf8",
    ),
  );
  const calibration = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "public/guides/template-calibration-report.json"),
      "utf8",
    ),
  );
  const codebase = readCodebaseCalibrationConstants(ROOT);
  const pcs = codebase.printCoordinateSystem;
  const pxPerCm = pcs.pxPerCm;
  const blueBoxCm = pcs.blueBoxCm.front;
  const baselineChestCm = profile.garment.baselineChestCm;
  const silhouetteScale = profile.measurement.silhouetteScale ?? 1;
  const chestBySize = parseProductChestBySize();
  const baseShirtBBox = calibration.templates[0].pngMeasurement.shirtBBox;

  const templateCenter = {
    x: profile.measurement.containerCenterPx.x,
    y: profile.measurement.containerCenterPx.y,
    offsetPx: parseTemplateOffsetPx(),
  };

  const sizeRows = SIZES.map((size) => {
    const shirtScale = getShirtScale(size, baselineChestCm, chestBySize);
    const visualScale = getShirtVisualScale(
      size,
      silhouetteScale,
      baselineChestCm,
      chestBySize,
    );
    const metrics = getGarmentPrintMetrics(size, shirtScale);
    const shirt = scaleShirtBounds(baseShirtBBox, visualScale);
    const shirtArmpitWidthPx = profile.garment.armpitChestWidthPx * visualScale;
    const shirtBodyLengthPx = profile.garment.bodyLengthPx * visualScale;
    const blue = getBlueBounds(size, pxPerCm, blueBoxCm, metrics);
    const orangePct = getOrangePctInBlue(
      size,
      metrics,
      pxPerCm,
      blueBoxCm,
      chestBySize,
      baselineChestCm,
    );
    const orange = getOrangeBounds(blue, orangePct);
    const blueMargins = margins(blue, shirt);
    const orangeMargins = margins(orange, shirt);
    const proportions = assessProportions(shirt, blue, orange, shirtArmpitWidthPx);
    const positionAnalysis = analyzePosition(blueMargins, metrics, blue);

    return {
      size,
      officialChestCm: chestBySize[size],
      shirtVisualScale: round(visualScale, 4),
      shirtScale: round(shirtScale, 4),
      previewPrintAreaScale: blue.previewPrintAreaScale,
      shirtArmpitWidthPx: round(shirtArmpitWidthPx, 1),
      shirtBodyLengthPx: round(shirtBodyLengthPx, 1),
      shirtBounds: {
        left: round(shirt.left, 1),
        top: round(shirt.top, 1),
        right: round(shirt.right, 1),
        bottom: round(shirt.bottom, 1),
        width: round(shirt.width, 1),
        height: round(shirt.height, 1),
      },
      blueBounds: {
        left: round(blue.left, 1),
        top: round(blue.top, 1),
        right: round(blue.right, 1),
        bottom: round(blue.bottom, 1),
        width: round(blue.width, 1),
        height: round(blue.height, 1),
      },
      orangeBounds: {
        left: round(orange.left, 1),
        top: round(orange.top, 1),
        right: round(orange.right, 1),
        bottom: round(orange.bottom, 1),
        width: round(orange.width, 1),
        height: round(orange.height, 1),
      },
      blueMargins,
      orangeMargins,
      proportions,
      positionAnalysis,
      metrics: {
        collarBasedPrintTopPx: round(metrics.printTopPx, 1),
        scaledCollarYPx: round(metrics.scaledCollarLowYPx, 1),
        blueAnchor: {
          x: round(blue.centerX, 1),
          y: round(blue.centerY, 1),
        },
      },
    };
  });

  const recommendation = buildRecommendation(sizeRows);

  const report = {
    schema: "template-visual-final-report/v1",
    generatedAt: new Date().toISOString(),
    side: SIDE,
    templateProfile: profile.id,
    silhouetteScale,
    templateCenter,
    assumptions: {
      shirtVisualScale: "getShirtScale(size) × silhouetteScale @ transform-origin center",
      blueAnchor: "container center + GARMENT_TEMPLATE_OFFSET_PX; translate(-50%,-50%)",
      blueSize: "35×50cm × 12.24 × previewPrintAreaScale",
      orangeLayout: "getGarmentPrintSafeZonePctInPrintArea（領口+7cm 基準 % 於藍框內）",
      baseShirtBBox,
    },
    sizes: sizeRows,
    recommendation,
  };

  const outPath = path.join(
    ROOT,
    "public/guides/template-visual-final-report.json",
  );
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Template Visual Final QA\n");
  for (const row of sizeRows) {
    console.log(`--- ${row.size} ---`);
    console.log(
      `Shirt ${row.shirtBounds.width}×${row.shirtBounds.height} | Blue ${row.blueBounds.width}×${row.blueBounds.height} | Orange ${row.orangeBounds.width}×${row.orangeBounds.height}`,
    );
    console.log(
      `Blue/Shirt ${row.proportions.blueOverShirtWidthPct}% | Orange/Shirt ${row.proportions.orangeOverShirtWidthPct}% | Orange/Blue ${row.proportions.orangeOverBlueWidthPct}%`,
    );
    console.log(
      `Blue margins L${row.blueMargins.left} R${row.blueMargins.right} T${row.blueMargins.top} B${row.blueMargins.bottom}`,
    );
    console.log(
      `Position: ${row.positionAnalysis.horizontal} / ${row.positionAnalysis.vertical} | reasonable=${row.proportions.proportionsReasonable}`,
    );
  }
  console.log(`\nRecommendation: ${recommendation.choice} — ${recommendation.label}`);
  console.log(`JSON: ${outPath}`);
}

main();
