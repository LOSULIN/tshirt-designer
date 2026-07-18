/**
 * Factory Ready Artwork Export — verification
 * node scripts/verify-export-artwork-factory.mjs
 */
import { readFileSync } from "node:fs";

const SMART_DPI_SMALL_MAX_CM = 10;
const SMART_DPI_MEDIUM_MAX_CM = 20;
const SMART_DPI_SMALL = 450;
const SMART_DPI_MEDIUM = 350;
const SMART_DPI_LARGE = 300;

function resolveSmartExportDpi(maxEdgeCm) {
  if (maxEdgeCm <= SMART_DPI_SMALL_MAX_CM) return SMART_DPI_SMALL;
  if (maxEdgeCm <= SMART_DPI_MEDIUM_MAX_CM) return SMART_DPI_MEDIUM;
  return SMART_DPI_LARGE;
}

function cmToFactoryExportPx(cm, exportDpi) {
  return Math.round((cm / 2.54) * exportDpi);
}

function dpiToPngPixelsPerMeter(dpi) {
  return Math.round(dpi / 0.0254);
}

function resolveFactoryExportDpi(maxEdgeCm, imageDesignerDpis) {
  const smartDpi = resolveSmartExportDpi(maxEdgeCm);
  if (imageDesignerDpis.length === 0) return smartDpi;
  return Math.max(smartDpi, Math.max(...imageDesignerDpis));
}

function getRotatedRectVisualBoundsCm(rect, rotationDeg) {
  const normalized = ((rotationDeg % 360) + 360) % 360;
  if (normalized < 1e-6) return { ...rect };

  const cx = rect.x_cm + rect.width_cm / 2;
  const cy = rect.y_cm + rect.height_cm / 2;
  const hw = rect.width_cm / 2;
  const hh = rect.height_cm / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const corner of corners) {
    const x = cx + corner.x * cos - corner.y * sin;
    const y = cy + corner.x * sin + corner.y * cos;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    x_cm: minX,
    y_cm: minY,
    width_cm: maxX - minX,
    height_cm: maxY - minY,
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

assert(resolveSmartExportDpi(6) === 450, "6 cm max edge → 450 DPI");
assert(resolveSmartExportDpi(10) === 450, "10 cm max edge → 450 DPI");
assert(resolveSmartExportDpi(15) === 350, "15 cm max edge → 350 DPI");
assert(resolveSmartExportDpi(20) === 350, "20 cm max edge → 350 DPI");
assert(resolveSmartExportDpi(29.7) === 300, "A3 width → 300 DPI");
assert(resolveSmartExportDpi(42) === 300, "A3 height → 300 DPI");

assert(resolveFactoryExportDpi(16, [280]) === 350, "16 cm smart 350, image 280 → 350");
assert(resolveFactoryExportDpi(16, [420]) === 420, "16 cm smart 350, image 420 → 420 (no downscale)");
assert(resolveFactoryExportDpi(8, [500]) === 500, "8 cm smart 450, image 500 → 500");

assert(cmToFactoryExportPx(16, 350) === 2205, "16 cm @ 350 DPI → 2205 px");
assert(cmToFactoryExportPx(18, 350) === 2480, "18 cm @ 350 DPI → 2480 px");
assert(cmToFactoryExportPx(15, 350) === 2067, "15 cm @ 350 DPI → 2067 px");
assert(cmToFactoryExportPx(29.7, 300) === 3508, "A3 width @ 300 DPI");
assert(cmToFactoryExportPx(42, 300) === 4961, "A3 height @ 300 DPI");

assert(dpiToPngPixelsPerMeter(300) === 11811, "300 DPI → 11811 ppm");
assert(dpiToPngPixelsPerMeter(350) === 13780, "350 DPI → 13780 ppm");
assert(dpiToPngPixelsPerMeter(450) === 17717, "450 DPI → 17717 ppm");

const rotated45 = getRotatedRectVisualBoundsCm(
  { x_cm: 0, y_cm: 0, width_cm: 10, height_cm: 10 },
  45,
);
assert(
  Math.abs(rotated45.width_cm - 10 * Math.SQRT2) < 0.001,
  "45° square visual width = 10√2 cm",
);
assert(
  getRotatedRectVisualBoundsCm(
    { x_cm: 5, y_cm: 5, width_cm: 16, height_cm: 18 },
    0,
  ).width_cm === 16,
  "0° rotation preserves width",
);

const factorySrc = readFileSync(
  new URL("../lib/export-artwork-factory.ts", import.meta.url),
  "utf8",
);
assert(factorySrc.includes("drawImageArtworkOnCanvas"), "reuses drawImageArtworkOnCanvas");
assert(factorySrc.includes("embedPngDpi"), "embeds PNG pHYs");
assert(factorySrc.includes("resolveExportGarmentLayerCmRect"), "uses export garment cm");
assert(!factorySrc.includes("getExportCanvasSpec"), "no full print-area canvas spec");

assert(factorySrc.includes("getRotatedRectVisualBoundsCm"), "rotation visual bounds");
assert(factorySrc.includes("relativeRect"), "bbox-relative coords for all layers");
assert(
  !factorySrc.includes("garmentRect,\n        exportRect.pxPerCmY"),
  "text/shape no longer use absolute garmentRect for draw",
);

const productExportSrc = readFileSync(
  new URL("../lib/export/product-export.ts", import.meta.url),
  "utf8",
);
assert(
  productExportSrc.includes("renderFactoryArtworkExportPng"),
  "exportArtworkPng uses factory export",
);
assert(
  productExportSrc.includes("exportPrintAreaArtworkForMockup"),
  "mockup keeps print-area artwork",
);
assert(
  productExportSrc.includes("renderPrintExportPng"),
  "mockup path still uses renderPrintExportPng",
);

assert(
  productExportSrc.includes("Factory-Artwork.png"),
  "factory artwork download filename",
);

const panelSrc = readFileSync(
  new URL("../components/export/ProductExportPanel.tsx", import.meta.url),
  "utf8",
);
assert(panelSrc.includes("下載工廠 Artwork"), "factory artwork button label");
assert(panelSrc.includes("工廠印刷使用"), "factory artwork tooltip");

const designExportSrc = readFileSync(
  new URL("../components/designer/DesignExportModal.tsx", import.meta.url),
  "utf8",
);
assert(
  designExportSrc.includes("Print Area Preview"),
  "print export labeled as preview",
);

const printExportSrc = readFileSync(
  new URL("../lib/print-export-system.ts", import.meta.url),
  "utf8",
);
assert(
  printExportSrc.includes("embedPngDpi(blob, PRINT_EXPORT_DPI)"),
  "print-export-system unchanged for Factory PDF",
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
