/**
 * 靜態追蹤：10×3cm layer 在 mockup 的 cm→px 換算（front, exportScale=2）。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const templateMetrics = readFileSync(
  join(root, "lib/template-metrics.ts"),
  "utf8",
);
const garmentPrint = readFileSync(
  join(root, "lib/garment-print-config.ts"),
  "utf8",
);

const pxPerCmMatch = templateMetrics.match(
  /ADULT_TSHIRT_TEMPLATE_PX_PER_CM = ([\d.]+)/,
);
const pxPerCm = pxPerCmMatch ? Number(pxPerCmMatch[1]) : 12.24;

const frontPrintMatch = garmentPrint.match(
  /front: \{ widthCm: ([\d.]+), heightCm: ([\d.]+) \}/,
);
const printAreaWidthCm = frontPrintMatch ? Number(frontPrintMatch[1]) : 35;
const printAreaHeightCm = frontPrintMatch ? Number(frontPrintMatch[2]) : 50;

const containerW = 1024;
const containerH = 1536;
const exportScale = 2;

const widthPct = (printAreaWidthCm * pxPerCm) / containerW;
const heightPct = (printAreaHeightCm * pxPerCm) / containerH;
const printRectW = widthPct * containerW * exportScale;
const printRectH = heightPct * containerH * exportScale;

const pxPerCmX = printRectW / printAreaWidthCm;
const pxPerCmY = printRectH / printAreaHeightCm;

const layerWidthCm = 10;
const layerHeightCm = 3;
const mappedW = layerWidthCm * pxPerCmX;
const mappedH = layerHeightCm * pxPerCmY;

const ratioCm = layerWidthCm / printAreaWidthCm;
const ratioPx = mappedW / printRectW;

console.log("=== Mockup cm→px trace (10×3cm, front, scale=2) ===");
console.log({
  pxPerCm_template: pxPerCm,
  printAreaCm: { width: printAreaWidthCm, height: printAreaHeightCm },
  printRect_px: {
    width: Math.round(printRectW * 100) / 100,
    height: Math.round(printRectH * 100) / 100,
  },
  pxPerCm_from_printRect: {
    x: Math.round(pxPerCmX * 1000) / 1000,
    y: Math.round(pxPerCmY * 1000) / 1000,
  },
  layer_10x3_mapped_px: {
    width: Math.round(mappedW * 100) / 100,
    height: Math.round(mappedH * 100) / 100,
  },
  ratio_check: {
    width_cm_over_printArea: Math.round(ratioCm * 10000) / 10000,
    mapped_px_over_printRect: Math.round(ratioPx * 10000) / 10000,
    match: Math.abs(ratioCm - ratioPx) < 0.0001,
  },
  note: "若 log 中 text width_cm=5 而非 10，問題在 getLayerExportCmRect；若 width_cm=10 但 mapped.width≈一半，問題在 mapLayerCmRectToMockupPx 輸入。",
});
