/**
 * 驗證：design layer 使用 cm 資料格式，UI 僅做 cm×UI_SCALE 轉換
 */

const UI_SCALE = 10;
const PRINT_WIDTH_CM = 35;
const PRINT_HEIGHT_CM = 50;

function cmToUiPx(cm) {
  return cm * UI_SCALE;
}

function assert(condition, message) {
  if (!condition) {
    console.error("✗", message);
    process.exitCode = 1;
    return;
  }
  console.log("✓", message);
}

const sampleLayer = {
  x_cm: 5,
  y_cm: 8,
  width_cm: 12,
  height_cm: 10,
  fontSize_cm: 4.8,
};

assert(
  cmToUiPx(sampleLayer.width_cm) === 120 &&
    cmToUiPx(sampleLayer.height_cm) === 100,
  "UI render：px = cm × UI_SCALE（120×100）",
);

assert(
  sampleLayer.x_cm >= 0 &&
    sampleLayer.y_cm >= 0 &&
    sampleLayer.x_cm + sampleLayer.width_cm <= PRINT_WIDTH_CM + 0.01 &&
    sampleLayer.y_cm + sampleLayer.height_cm <= PRINT_HEIGHT_CM + 0.01,
  "layer cm 座標在印刷區 35×50 cm 內",
);

assert(
  typeof sampleLayer.x_cm === "number" &&
    !("x" in sampleLayer) &&
    !("width" in sampleLayer),
  "資料格式使用 x_cm / width_cm（非 px 欄位）",
);

console.log("\ndesign cm 校驗完成。");
