/**
 * 驗證各 gender 印刷區規格與匯出尺寸
 */
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 1536;
const EXPORT_DPI = 300;
const DESIGN_SAFE_MARGIN = 0.05;

const ADULT_PRINT_WIDTH_CM = 32;
const ADULT_PRINT_HEIGHT_CM = 40;
const ADULT_SAFE_WIDTH_CM = 30;
const ADULT_SAFE_HEIGHT_CM = 38;
const FEMALE_SCALE = 0.88;
const CANVAS_UNITS_PER_CM = 420 / ADULT_PRINT_WIDTH_CM;
const CANVAS_COLLAR_UNITS_PER_CM = 300 / 6.5;

function cmToExportPx(cm) {
  return Math.round((cm / 2.54) * EXPORT_DPI);
}

const PRINT_AREA_CONFIG = {
  male: {
    collarOffsetCm: 6.5,
    printWidthCm: 32,
    printHeightCm: 40,
    safeWidthCm: 30,
    safeHeightCm: 38,
  },
  female: {
    collarOffsetCm: 6,
    printWidthCm: 32 * FEMALE_SCALE,
    printHeightCm: 40 * FEMALE_SCALE,
    safeWidthCm: 30 * FEMALE_SCALE,
    safeHeightCm: 38 * FEMALE_SCALE,
  },
  "child-male": {
    collarOffsetCm: 5,
    printWidthCm: 24,
    printHeightCm: 30,
    safeWidthCm: 24 * (ADULT_SAFE_WIDTH_CM / ADULT_PRINT_WIDTH_CM),
    safeHeightCm: 30 * (ADULT_SAFE_HEIGHT_CM / ADULT_PRINT_HEIGHT_CM),
  },
  "child-female": {
    collarOffsetCm: 5,
    printWidthCm: 24,
    printHeightCm: 30,
    safeWidthCm: 24 * (ADULT_SAFE_WIDTH_CM / ADULT_PRINT_WIDTH_CM),
    safeHeightCm: 30 * (ADULT_SAFE_HEIGHT_CM / ADULT_PRINT_HEIGHT_CM),
  },
};

function getPrintAreaForGender(gender) {
  const config = PRINT_AREA_CONFIG[gender];
  const width = Math.round(config.printWidthCm * CANVAS_UNITS_PER_CM);
  const height = Math.round(config.printHeightCm * CANVAS_UNITS_PER_CM);
  const y = Math.round(config.collarOffsetCm * CANVAS_COLLAR_UNITS_PER_CM);
  return {
    x: (CANVAS_WIDTH - width) / 2,
    y,
    width,
    height,
  };
}

function getExportDimensionsForGender(gender) {
  const config = PRINT_AREA_CONFIG[gender];
  return {
    width: cmToExportPx(config.printWidthCm),
    height: cmToExportPx(config.printHeightCm),
  };
}

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.log(`✗ ${msg}`);
    failed++;
    return false;
  }
  console.log(`✓ ${msg}`);
  return true;
}

console.log("檢查 PRINT_AREA_CONFIG…\n");

const male = getPrintAreaForGender("male");
const maleExp = getExportDimensionsForGender("male");

assert(male.width === 420 && male.height === 525 && male.y === 300,
  "成人男：畫布 420×525 @ y=300");
assert(maleExp.width === 3780 && maleExp.height === 4724,
  "成人男：輸出 3780×4724 px（32cm@300DPI）");

const female = getPrintAreaForGender("female");
const femaleExp = getExportDimensionsForGender("female");
const femaleCfg = PRINT_AREA_CONFIG.female;

assert(
  Math.abs(femaleCfg.printWidthCm - 32 * 0.88) < 0.01,
  "成人女：印刷寬度為男款 88%",
);
assert(female.width === 370 && female.height === 462 && female.y === 277,
  "成人女：畫布 370×462 @ y=277");
assert(femaleExp.width === 3326 && femaleExp.height === 4157,
  "成人女：輸出 3326×4157 px");

for (const g of ["child-male", "child-female"]) {
  const child = getPrintAreaForGender(g);
  const childExp = getExportDimensionsForGender(g);
  assert(child.width === 315 && child.height === 394 && child.y === 231,
    `${g}：畫布 315×394 @ y=231`);
  assert(childExp.width === 2835 && childExp.height === 3543,
    `${g}：輸出 2835×3543 px`);
}

// 安全區 5%
for (const g of Object.keys(PRINT_AREA_CONFIG)) {
  const pa = getPrintAreaForGender(g);
  const safeW = pa.width * (1 - DESIGN_SAFE_MARGIN * 2);
  const safeH = pa.height * (1 - DESIGN_SAFE_MARGIN * 2);
  const cfg = PRINT_AREA_CONFIG[g];
  const safeCmW = cfg.printWidthCm * 0.9;
  const safeCmH = cfg.printHeightCm * 0.9;
  const canvasSafeW = safeW / CANVAS_UNITS_PER_CM;
  const canvasSafeH = safeH / CANVAS_UNITS_PER_CM;
  assert(
    Math.abs(canvasSafeW - safeCmW) < 0.2 && Math.abs(canvasSafeH - safeCmH) < 0.2,
    `${g}：5% 安全區約等於物理安全規格`,
  );
}

// 匯出縮放比一致
for (const g of Object.keys(PRINT_AREA_CONFIG)) {
  const pa = getPrintAreaForGender(g);
  const exp = getExportDimensionsForGender(g);
  const scaleX = exp.width / pa.width;
  const scaleY = exp.height / pa.height;
  assert(
    Math.abs(scaleX - scaleY) < 0.01,
    `${g}：匯出縮放比一致 (scaleX≈scaleY≈${scaleX.toFixed(2)})`,
  );
}

console.log("");
if (failed > 0) {
  console.log(`檢查失敗：${failed} 項`);
  process.exit(1);
}
console.log("全部印刷區規格檢查通過。");
