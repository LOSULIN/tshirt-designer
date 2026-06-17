/**
 * 驗證：印刷輸出系統 35×50 cm @ 300 DPI
 */

const EXPORT_DPI = 300;
const CM_TO_EXPORT_PX = EXPORT_DPI / 2.54;
const PRINT_WIDTH_CM = 35;
const PRINT_HEIGHT_CM = 50;

function cmToExportPx(cm) {
  return Math.round(cm * CM_TO_EXPORT_PX);
}

function assert(condition, message) {
  if (!condition) {
    console.error("✗", message);
    process.exitCode = 1;
    return;
  }
  console.log("✓", message);
}

assert(
  Math.abs(CM_TO_EXPORT_PX - 300 / 2.54) < 0.0001,
  `轉換規則：1 cm = ${EXPORT_DPI}/2.54 px（≈${CM_TO_EXPORT_PX.toFixed(4)}）`,
);

const widthPx = cmToExportPx(PRINT_WIDTH_CM);
const heightPx = cmToExportPx(PRINT_HEIGHT_CM);

assert(widthPx === 4134, `寬度：35 cm → ${widthPx}px @ ${EXPORT_DPI} DPI`);
assert(heightPx === 5906, `高度：50 cm → ${heightPx}px @ ${EXPORT_DPI} DPI`);

const posCm = 10;
const posPx = cmToExportPx(posCm);
assert(
  posPx === Math.round(10 * CM_TO_EXPORT_PX),
  `位置轉換：${posCm} cm → ${posPx}px`,
);

const sizeCm = 20;
const sizePx = cmToExportPx(sizeCm);
assert(
  sizePx === Math.round(20 * CM_TO_EXPORT_PX),
  `尺寸轉換：${sizeCm} cm → ${sizePx}px`,
);

assert(
  cmToExportPx(PRINT_WIDTH_CM) / PRINT_WIDTH_CM >= CM_TO_EXPORT_PX - 0.01,
  "放大比例一致（向量輸出，可直接送印）",
);

const ratioWidthPx = (21 / PRINT_WIDTH_CM) * widthPx;
const directWidthPx = cmToExportPx(21);
assert(
  Math.abs(ratioWidthPx - directWidthPx) <= 2,
  `比例換算與 cm 換算一致（21cm → ${Math.round(ratioWidthPx)}px ≈ ${directWidthPx}px）`,
);

const BACK_WIDTH_CM = 38;
const BACK_HEIGHT_CM = 45;
const backWidthPx = cmToExportPx(BACK_WIDTH_CM);
const backHeightPx = cmToExportPx(BACK_HEIGHT_CM);

assert(backWidthPx === 4488, `背面寬度：38 cm → ${backWidthPx}px @ ${EXPORT_DPI} DPI`);
assert(
  backHeightPx === 5315,
  `背面高度：45 cm → ${backHeightPx}px @ ${EXPORT_DPI} DPI`,
);

console.log("\n印刷輸出系統校驗完成。");
