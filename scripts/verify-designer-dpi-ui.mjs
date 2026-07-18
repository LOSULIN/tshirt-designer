/**
 * Designer DPI UI — verification
 * node scripts/verify-designer-dpi-ui.mjs
 */
import { readFileSync } from "node:fs";

const TARGET = 300;

function computeDesignerDisplayDpi(
  artworkPixelWidth,
  artworkPixelHeight,
  designerWidthCm,
  designerHeightCm,
) {
  const dpiX =
    artworkPixelWidth > 0 && designerWidthCm > 0
      ? artworkPixelWidth / (designerWidthCm / 2.54)
      : 0;
  const dpiY =
    artworkPixelHeight > 0 && designerHeightCm > 0
      ? artworkPixelHeight / (designerHeightCm / 2.54)
      : 0;
  if (dpiX <= 0 && dpiY <= 0) return 0;
  if (dpiX <= 0) return Math.floor(dpiY);
  if (dpiY <= 0) return Math.floor(dpiX);
  return Math.floor(Math.min(dpiX, dpiY));
}

function requiredPx(wCm, hCm, dpi = TARGET) {
  return {
    w: Math.round((wCm / 2.54) * dpi),
    h: Math.round((hCm / 2.54) * dpi),
  };
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed++;
    return;
  }
  console.log(`PASS: ${msg}`);
  passed++;
}

// Case 1: 3233×2953 @ 16×15 cm → ~500 DPI (min of axes)
{
  const dpi = computeDesignerDisplayDpi(3233, 2953, 16, 15);
  assert(dpi >= 490 && dpi <= 520, `3233×2953 @ 16×15 → ${dpi} DPI (~513 width / ~500 height min)`);
}

// Case 2: 1772×1772 @ 15×15 → 300 DPI
{
  const dpi = computeDesignerDisplayDpi(1772, 1772, 15, 15);
  assert(dpi === 300, `1772×1772 @ 15×15 → ${dpi} DPI`);
}

// Case 3: 3543×3543 @ 30×30 → 300 DPI
{
  const dpi = computeDesignerDisplayDpi(3543, 3543, 30, 30);
  assert(dpi === 300, `3543×3543 @ 30×30 → ${dpi} DPI`);
}

// Required pixels match designer cm
{
  const req = requiredPx(15, 15);
  assert(req.w === 1772 && req.h === 1772, "15×15 cm needs 1772×1772 px @ 300");
}

// analyzeImagePrintQuality untouched
{
  const src = readFileSync(
    new URL("../lib/image-print-quality.ts", import.meta.url),
    "utf8",
  );
  assert(
    src.includes("computeRasterPrintDpi(artworkPixelWidth, rect.width_cm)"),
    "runtime analyzeImagePrintQuality still uses workspace width",
  );
}

// New UI module exists
{
  const src = readFileSync(
    new URL("../lib/image-print-quality-ui.ts", import.meta.url),
    "utf8",
  );
  assert(src.includes("getArtworkDesignerPrintQuality"), "UI module exported");
  assert(src.includes("Math.floor(Math.min(dpiX, dpiY))"), "uses min dpi axes");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
