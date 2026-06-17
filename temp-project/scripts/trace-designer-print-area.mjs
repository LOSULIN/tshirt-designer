#!/usr/bin/env node
/**
 * 追蹤 Designer 藍框 style 鏈（與 garment / print-area-offset 一致）
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const H = 1536;
const W = 1024;
const COLLAR = 449;
const PX_PER_CM = 12.24;
const PRINT_H_PX = 50 * PX_PER_CM;
const OFFSET = { front: 7, back: 5 };

function scaleY(y, scale) {
  const c = H / 2;
  return c + (y - c) * scale;
}

function traceSide(side, sizeScale = 1) {
  const scaledCollar = scaleY(COLLAR, sizeScale);
  const printTopPx = scaledCollar + OFFSET[side] * PX_PER_CM * sizeScale;
  const printCenterPx = printTopPx + PRINT_H_PX / 2;
  const refY = printCenterPx / H;
  const widthPct = (35 * PX_PER_CM) / W;
  const heightPct = PRINT_H_PX / H;
  return {
    side,
    sizeScale,
    collarAnchorY: COLLAR,
    offsetCm: OFFSET[side],
    scaledCollarY: scaledCollar,
    printTopPx,
    refY,
    printAreaStyle: {
      left: "50%",
      top: `${refY * 100}%`,
      transform: "translate(-50%, -50%)",
      width: `${widthPct * 100}%`,
      height: `${heightPct * 100}%`,
    },
  };
}

const garmentSrc = readFileSync(
  join(ROOT, "lib/coordinates/garment.ts"),
  "utf8",
);
const usesOffset = garmentSrc.includes("print-area-offset");
const usesHardcoded8 = /GARMENT_PRINT_TOP_OFFSET_CM\s*=\s*8/.test(garmentSrc);

console.log("=== Designer Print Area Trace ===\n");
console.log("garment.ts imports print-area-offset:", usesOffset);
console.log("garment.ts hardcoded GARMENT_PRINT_TOP_OFFSET_CM = 8:", usesHardcoded8);
console.log("\n--- M size (scale=1) ---");
console.log(JSON.stringify(traceSide("front"), null, 2));
console.log(JSON.stringify(traceSide("back"), null, 2));
console.log("\n--- vs old hardcoded 8cm front ---");
const oldTop = COLLAR + 8 * PX_PER_CM;
const newTop = COLLAR + 7 * PX_PER_CM;
console.log({
  oldPrintTopPx: oldTop,
  newPrintTopPx: newTop,
  deltaPx: newTop - oldTop,
  deltaCm: (newTop - oldTop) / PX_PER_CM,
  note: "7cm offset = 1cm higher than 8cm (smaller gap below collar)",
});
console.log("\n--- data-print-area locations ---");
console.log([
  "DesignCanvas.tsx:450 (border-blue-500) ← Designer 主藍框",
  "PrintAreaPreviewPanel.tsx:150 (border-red) ← /print-area-preview 頁",
  "PrintAreaElement.tsx:373 (layer 選取框，在藍框內)",
  "FlatShirtDesignView / ModelDesignPreview",
]);
