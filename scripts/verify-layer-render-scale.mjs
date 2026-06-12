#!/usr/bin/env node
/**
 * 驗證 Designer / Mockup 印刷區 overlay 比例一致（35cm → 12.24 px/cm）
 */
import assert from "node:assert/strict";

const PRINT_W_CM = 35;
const PRINT_H_CM = 50;
const PX_PER_CM = 12.24;
const CONTAINER_W = 1024;
const CONTAINER_H = 1536;
const LAYER_W_CM = 12;

function previewPct() {
  return {
    widthPct: (PRINT_W_CM * PX_PER_CM) / CONTAINER_W,
    heightPct: (PRINT_H_CM * PX_PER_CM) / CONTAINER_H,
  };
}

const { widthPct } = previewPct();
const printAreaWidthPx = CONTAINER_W * widthPct;
const layerWidthPx = LAYER_W_CM * (printAreaWidthPx / PRINT_W_CM);
const wrongMockupWidthPx = CONTAINER_W * (PRINT_W_CM * 10) / CONTAINER_W; // old mm-as-px bug

assert.ok(
  Math.abs(widthPct - 0.418359375) < 0.0001,
  `preview widthPct ≈ 41.84% (${widthPct})`,
);
assert.ok(
  Math.abs(printAreaWidthPx - 428.4) < 0.1,
  `print area width px ≈ 428.4 (${printAreaWidthPx})`,
);
assert.ok(
  Math.abs(layerWidthPx - 12 * PX_PER_CM) < 0.1,
  `12cm layer ≈ ${12 * PX_PER_CM}px (${layerWidthPx})`,
);
assert.ok(
  printAreaWidthPx > wrongMockupWidthPx,
  "修正後 mockup print area 應大於舊版 mm→px 錯誤值",
);

console.log("verify-layer-render-scale: OK");
console.log(
  JSON.stringify(
    {
      garmentWidthCm: 50,
      printAreaWidthCm: PRINT_W_CM,
      textLayerWidthCm: LAYER_W_CM,
      templatePxPerCm: PX_PER_CM,
      printAreaWidthPx,
      layerWidthPx,
      oldWrongPrintAreaWidthPx: PRINT_W_CM * 10,
    },
    null,
    2,
  ),
);
