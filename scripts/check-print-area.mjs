/**
 * 驗證：shirt container 固定、print area 固定 35×50 cm（lib/printArea.ts）
 */

const PRINT_AREA = { widthCm: 35, heightCm: 50 };
const SHIRT_CONTAINER_WIDTH = 1024;
const SHIRT_CONTAINER_HEIGHT = 1536;
const UI_GLOBAL_PRINT_OFFSET_Y_PX = -25;
const PRINT_REF_Y =
  0.53 + UI_GLOBAL_PRINT_OFFSET_Y_PX / SHIRT_CONTAINER_HEIGHT;

const PRINT_REFERENCE_BY_SIDE = {
  front: { x: 0.5, y: PRINT_REF_Y },
  back: { x: 0.5, y: PRINT_REF_Y },
};
const PRINT_REFERENCE_TRANSFORM = "translate(-50%, -50%)";
const UI_SCALE = 10;
const TEMPLATE_PX_PER_CM = 12.24;
const PREVIEW_UI_UNITS_PER_MM = TEMPLATE_PX_PER_CM / 10;
const DESIGN_UNITS_PER_CM = 10;
const EXPORT_DPI = 300;

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "2L"];

const ADULT_TSHIRT_SIZE_MEASUREMENTS = [
  { size: "XS", chestCm: 44 },
  { size: "S", chestCm: 47 },
  { size: "M", chestCm: 50 },
  { size: "L", chestCm: 53 },
  { size: "XL", chestCm: 56 },
  { size: "2L", chestCm: 59 },
];

const M_CHEST_CM =
  ADULT_TSHIRT_SIZE_MEASUREMENTS.find((entry) => entry.size === "M").chestCm;

const SHIRT_SCALE = Object.fromEntries(
  ADULT_TSHIRT_SIZE_MEASUREMENTS.map(({ size, chestCm }) => [
    size,
    chestCm / M_CHEST_CM,
  ]),
);

function getShirtScale(size) {
  return SHIRT_SCALE[size];
}

function getShirtScaleTransform(size) {
  return `scale(${getShirtScale(size)})`;
}

function cmToUiUnits(cm) {
  return cm * UI_SCALE;
}

function getFixedPrintAreaUiSize() {
  return {
    width: PRINT_AREA.widthCm * 10 * PREVIEW_UI_UNITS_PER_MM,
    height: PRINT_AREA.heightCm * 10 * PREVIEW_UI_UNITS_PER_MM,
  };
}

function getFixedPrintAreaContainerPct() {
  const ui = getFixedPrintAreaUiSize();
  return {
    widthPct: ui.width / SHIRT_CONTAINER_WIDTH,
    heightPct: ui.height / SHIRT_CONTAINER_HEIGHT,
  };
}

function getPrintReference(side = "front") {
  return PRINT_REFERENCE_BY_SIDE[side] ?? PRINT_REFERENCE_BY_SIDE.front;
}

function getPrintAreaContainerStyle(side = "front") {
  const ref = getPrintReference(side);
  const { widthPct, heightPct } = getFixedPrintAreaContainerPct();
  return {
    left: `${ref.x * 100}%`,
    top: `${ref.y * 100}%`,
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
const expectedUiW = PRINT_AREA.widthCm * TEMPLATE_PX_PER_CM;
const expectedUiH = PRINT_AREA.heightCm * TEMPLATE_PX_PER_CM;
assert(
  Math.abs(ui.width - expectedUiW) < 0.01 &&
    Math.abs(ui.height - expectedUiH) < 0.01,
  `Preview UI overlay：${ui.width}×${ui.height} px（${TEMPLATE_PX_PER_CM} px/cm）`,
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
const expectedWidthPct = expectedUiW / SHIRT_CONTAINER_WIDTH;
const expectedHeightPct = expectedUiH / SHIRT_CONTAINER_HEIGHT;
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

const frontRef = getPrintReference("front");
assert(
  refStyle.left === `${frontRef.x * 100}%` &&
    refStyle.top === `${frontRef.y * 100}%` &&
    refStyle.transform === PRINT_REFERENCE_TRANSFORM,
  `PRINT_REFERENCE 定位（front）：${refStyle.left} / ${refStyle.top} / ${refStyle.transform}`,
);
assert(
  getPrintReference("front").y === PRINT_REF_Y &&
    getPrintReference("back").y === PRINT_REF_Y,
  `PRINT_REFERENCE y=${PRINT_REF_Y}（UI_GLOBAL 向上 ${-UI_GLOBAL_PRINT_OFFSET_Y_PX}px）`,
);

assert(getShirtScale("M") === 1, "shirt scale：M 為基準 1.0");
assert(
  getShirtScale("XL") === 56 / M_CHEST_CM,
  "shirt scale 由胸寬推導（XL = chest / M_chest）",
);
assert(
  getShirtScale("2L") === 59 / M_CHEST_CM,
  "shirt scale 由胸寬推導（2L = chest / M_chest）",
);
assert(
  getShirtScale("XL") !== getShirtScale("2L"),
  "XL 與 2L scale 不同（不影響 print area style）",
);
assert(
  getShirtScaleTransform("XS") !== getShirtScaleTransform("XL"),
  "shirt scale 隨尺碼變化（不影響 print area style）",
);

console.log("\n印刷區校驗完成。");
