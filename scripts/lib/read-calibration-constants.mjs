/**
 * 從 lib/ 讀取目前 codebase 的校正常數（regex，避免 import TS 循環）。
 * 報告與 overlay 標註應與執行時程式碼一致。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(root, relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function matchNumber(source, pattern, label) {
  const m = source.match(pattern);
  if (!m) throw new Error(`Cannot parse ${label}`);
  return Number(m[1]);
}

function matchRecordSide(source, name) {
  const block = source.match(
    new RegExp(`export const ${name}[\\s\\S]*?front:\\s*([\\d.]+)[\\s\\S]*?back:\\s*([\\d.]+)`),
  );
  if (!block) throw new Error(`Cannot parse ${name}`);
  return { front: Number(block[1]), back: Number(block[2]) };
}

export function readCodebaseCalibrationConstants(root) {
  const templateMetrics = read(root, "lib/template-metrics.ts");
  const printOffset = read(root, "lib/coordinates/print-area-offset.ts");
  const garmentPrint = read(root, "lib/garment-print-config.ts");
  const production = read(root, "lib/coordinates/production.ts");
  const sizes = read(root, "lib/sizes.ts");
  const productSize = read(root, "lib/product-size-config.ts");

  const printChestPx = matchNumber(
    templateMetrics,
    /ADULT_TSHIRT_TEMPLATE_CHEST_PX\s*=\s*([\d.]+)/,
    "ADULT_TSHIRT_TEMPLATE_CHEST_PX",
  );
  const printPxPerCm = matchNumber(
    templateMetrics,
    /ADULT_TSHIRT_TEMPLATE_PX_PER_CM\s*=\s*([\d.]+)/,
    "ADULT_TSHIRT_TEMPLATE_PX_PER_CM",
  );

  const collarAnchorY = matchRecordSide(
    printOffset,
    "COLLAR_ANCHOR_Y_PX_BY_SIDE",
  );
  const printAreaOffsetCm = matchRecordSide(
    printOffset,
    "PRINT_AREA_OFFSET_CM",
  );

  const blueBoxFront = {
    widthCm: matchNumber(
      garmentPrint,
      /front:\s*\{\s*widthCm:\s*([\d.]+)/,
      "front widthCm",
    ),
    heightCm: matchNumber(
      garmentPrint,
      /front:\s*\{\s*widthCm:\s*[\d.]+,\s*heightCm:\s*([\d.]+)/,
      "front heightCm",
    ),
  };
  const blueBoxBack = {
    widthCm: matchNumber(
      garmentPrint,
      /back:\s*\{\s*widthCm:\s*([\d.]+)/,
      "back widthCm",
    ),
    heightCm: matchNumber(
      garmentPrint,
      /back:\s*\{\s*widthCm:\s*[\d.]+,\s*heightCm:\s*([\d.]+)/,
      "back heightCm",
    ),
  };

  const productionPrintMm = {
    width_mm: matchNumber(
      production,
      /width_mm:\s*([\d.]+)/,
      "production width_mm",
    ),
    height_mm: matchNumber(
      production,
      /height_mm:\s*([\d.]+)/,
      "production height_mm",
    ),
  };

  const legacyMChest = matchNumber(
    sizes,
    /\{\s*size:\s*"M",\s*chestCm:\s*([\d.]+)/,
    "legacy M chestCm",
  );
  const legacyMLength = matchNumber(
    sizes,
    /\{\s*size:\s*"M",\s*chestCm:\s*[\d.]+,\s*lengthCm:\s*([\d.]+)/,
    "legacy M lengthCm",
  );

  const productM = productSize.match(
    /size:\s*"M",\s*length:\s*([\d.]+),\s*chest:\s*([\d.]+)/,
  );
  const productMChest = productM ? Number(productM[2]) : null;
  const productMLength = productM ? Number(productM[1]) : null;

  const templateSpec = {
    widthPx: 1024,
    heightPx: 1536,
  };

  /** Preview 標定線（20.1% / 79.9% @ 25.1% 高）— 與 template-metrics 註解同源 */
  const calibrationLine = {
    leftXPct: 0.201,
    rightXPct: 0.799,
    yPct: 0.251,
    leftX: Math.round(templateSpec.widthPx * 0.201),
    rightX: Math.round(templateSpec.widthPx * 0.799),
    y: Math.round(templateSpec.heightPx * 0.251),
    chestPx: Math.round(templateSpec.widthPx * 0.799) - Math.round(templateSpec.widthPx * 0.201),
  };

  return {
    templateSpec,
    printCoordinateSystem: {
      id: "print-overlay",
      label: "印刷／設計座標系（layer cm、藍框、export 契約）",
      chestReferencePx: printChestPx,
      pxPerCm: printPxPerCm,
      uiUnitsPerMm: printPxPerCm / 10,
      calibrationLine,
      blueBoxCm: { front: blueBoxFront, back: blueBoxBack },
      productionPrintMm,
      collarAnchorYPx: collarAnchorY,
      printAreaOffsetCm,
      legacyBaselineM: { chestCm: legacyMChest, lengthCm: legacyMLength },
      productBaselineM:
        productMChest != null
          ? { chestCm: productMChest, lengthCm: productMLength }
          : null,
      notes: [
        `${printPxPerCm} = ${printChestPx} / ${legacyMChest}（template-metrics 註解基準）`,
        "藍框尺寸來自 garment-print-config；export 固定 production 350×500mm",
      ],
    },
  };
}
