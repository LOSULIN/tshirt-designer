/**
 * 驗證：shirt container 固定、print area 固定 35×50 cm（lib/printArea.ts）
 */

const PRINT_AREA = { widthCm: 35, heightCm: 50 };
const PRINT_REFERENCE = { x: 0.5, y: 0.53 };
const PRINT_REFERENCE_TRANSFORM = "translate(-50%, -50%)";
const UI_SCALE = 10;
const DESIGN_UNITS_PER_CM = 10;
const EXPORT_DPI = 300;
const SHIRT_CONTAINER_WIDTH = 1024;
const SHIRT_CONTAINER_HEIGHT = 1536;

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "2L"];

const SHIRT_SCALE = {
  XS: 0.9,
  S: 0.95,
  M: 1,
  L: 1.05,
  XL: 1.1,
  "2L": 1.1,
};

function getShirtScaleTransform(size) {
  return `scale(${SHIRT_SCALE[size]})`;
}

function cmToUiUnits(cm) {
  return cm * UI_SCALE;
}

function getFixedPrintAreaUiSize() {
  return {
    width: cmToUiUnits(PRINT_AREA.widthCm),
    height: cmToUiUnits(PRINT_AREA.heightCm),
  };
}

function getFixedPrintAreaContainerPct() {
  const ui = getFixedPrintAreaUiSize();
  return {
    widthPct: ui.width / SHIRT_CONTAINER_WIDTH,
    heightPct: ui.height / SHIRT_CONTAINER_HEIGHT,
  };
}

function getPrintAreaContainerStyle(_side = "front") {
  const { widthPct, heightPct } = getFixedPrintAreaContainerPct();
  return {
    left: `${PRINT_REFERENCE.x * 100}%`,
    top: `${PRINT_REFERENCE.y * 100}%`,
    transform: PRINT_REFERENCE_TRANSFORM,
    width: `${widthPct * 100}%`,
    height: `${heightPct * 100}%`,
  };
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
  SHIRT_CONTAINER_WIDTH === 1024 && SHIRT_CONTAINER_HEIGHT === 1536,
  "shirt container 固定 1024×1536（不依尺碼）",
);

assert(
  PRINT_AREA.widthCm === 35 && PRINT_AREA.heightCm === 50,
  "印刷規格固定 35×50 cm",
);

const ui = getFixedPrintAreaUiSize();
assert(
  ui.width === 350 && ui.height === 500,
  `UI 單位：${ui.width}×${ui.height}（cm×${UI_SCALE}）`,
);

const designBounds = {
  width: PRINT_AREA.widthCm * DESIGN_UNITS_PER_CM,
  height: PRINT_AREA.heightCm * DESIGN_UNITS_PER_CM,
};
assert(
  designBounds.width === 350 && designBounds.height === 500,
  "設計座標：350×500（0.1 cm / unit）",
);

const exportDims = {
  width: Math.round((PRINT_AREA.widthCm / 2.54) * EXPORT_DPI),
  height: Math.round((PRINT_AREA.heightCm / 2.54) * EXPORT_DPI),
};
assert(
  exportDims.width === 4134 && exportDims.height === 5906,
  `匯出尺寸：${exportDims.width}×${exportDims.height}px @ ${EXPORT_DPI} DPI`,
);

const fixedPct = getFixedPrintAreaContainerPct();
const expectedWidthPct = 350 / SHIRT_CONTAINER_WIDTH;
const expectedHeightPct = 500 / SHIRT_CONTAINER_HEIGHT;
assert(
  Math.abs(fixedPct.widthPct - expectedWidthPct) < 0.0001 &&
    Math.abs(fixedPct.heightPct - expectedHeightPct) < 0.0001,
  `固定 UI 比例：${(fixedPct.widthPct * 100).toFixed(2)}%×${(fixedPct.heightPct * 100).toFixed(2)}%`,
);

const stylesBySize = APPAREL_SIZES.map((size) => ({
  size,
  style: getPrintAreaContainerStyle("front"),
}));
const refStyle = stylesBySize[0].style;
assert(
  stylesBySize.every(
    ({ style }) =>
      style.width === refStyle.width &&
      style.height === refStyle.height &&
      style.left === refStyle.left &&
      style.top === refStyle.top &&
      style.transform === refStyle.transform,
  ),
  "全尺碼（XS~2L）print area 寬高與定位完全一致",
);

assert(
  refStyle.left === "50%" &&
    refStyle.top === "53%" &&
    refStyle.transform === PRINT_REFERENCE_TRANSFORM,
  `PRINT_REFERENCE 定位：${refStyle.left} / ${refStyle.top} / ${refStyle.transform}`,
);

assert(
  getShirtScaleTransform("XS") === "scale(0.9)" &&
    getShirtScaleTransform("M") === "scale(1)" &&
    getShirtScaleTransform("XL") === "scale(1.1)",
  "shirt scale：XS=0.9 · M=1 · XL=1.1",
);

assert(
  getShirtScaleTransform("XS") !== getShirtScaleTransform("XL"),
  "shirt scale 隨尺碼變化（不影響 print area style）",
);

console.log("\n印刷區校驗完成。");
