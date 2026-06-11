function clampRasterPrintDimensions(widthCm, heightCm, maxW, maxH) {
  if (widthCm <= maxW && heightCm <= maxH) {
    return { width_cm: widthCm, height_cm: heightCm, wasClamped: false };
  }
  const factor = Math.min(maxW / widthCm, maxH / heightCm);
  return {
    width_cm: widthCm * factor,
    height_cm: heightCm * factor,
    wasClamped: true,
  };
}

function computeRasterPrintDpi(imagePixelWidth, printWidthCm) {
  return imagePixelWidth / (printWidthCm / 2.54);
}

let failed = false;

const a4 = { w: 21, h: 29.7 };
const clamped = clampRasterPrintDimensions(30, 40, a4.w, a4.h);
if (clamped.width_cm > a4.w + 0.01 || clamped.height_cm > a4.h + 0.01) {
  console.error("✗ A4 clamp 失敗");
  failed = true;
}

const dpi300 = computeRasterPrintDpi(3000, 25.4);
if (Math.abs(dpi300 - 300) > 1) {
  console.error(`✗ DPI 公式錯誤: ${dpi300}`);
  failed = true;
}

const dpiLow = computeRasterPrintDpi(1000, 29.7);
if (dpiLow >= 300) {
  console.error("✗ 低解析度應 < 300 DPI");
  failed = true;
}

if (!failed) {
  console.log("✓ A4 尺寸 clamp 正確");
  console.log(`✓ 300 DPI 公式正確（3000px @ 25.4cm → ${Math.round(dpi300)} DPI）`);
  console.log(`✓ 低解析範例 ${Math.round(dpiLow)} DPI < 300`);
}

if (failed) process.exit(1);
console.log("\n圖片印刷品質驗證完成。");
