#!/usr/bin/env node
/**
 * 驗證 UI_GLOBAL_PRINT_OFFSET_Y_PX 有接到 Preview / Mockup UI style
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

const uiOffset = read("lib/coordinates/ui-print-offset.ts");
const previewMode = read("lib/coordinates/preview-position-mode.ts");
const uiPrintArea = read("lib/coordinates/ui-print-area.ts");
const preview = read("lib/coordinates/preview.ts");
const mockup = read("lib/coordinates/mockup.ts");
const designCanvas = read("components/designer/DesignCanvas.tsx");
const flatShirt = read("components/designer/FlatShirtDesignView.tsx");
const modelPreview = read("components/designer/ModelDesignPreview.tsx");

assert(
  uiOffset.includes("UI_GLOBAL_PRINT_OFFSET_Y_PX"),
  "ui-print-offset 定義 UI_GLOBAL_PRINT_OFFSET_Y_PX",
);
assert(
  preview.includes("resolveUiPrintReference") &&
    preview.includes("getGarmentPrintReference"),
  "Preview 支援 canvas + garment 雙模式",
);
assert(
  mockup.includes("resolveUiPrintReference"),
  "Mockup style 使用 ui-print-offset",
);
assert(
  previewMode.includes('DEFAULT_PRINT_MODE: PreviewPrintPositionMode = "garment"'),
  "DEFAULT_PRINT_MODE 為 garment",
);
assert(
  uiPrintArea.includes("getUiPrintAreaContainerStyle"),
  "ui-print-area 提供統一 selector",
);

assert(
  designCanvas.includes("getPrintAreaContainerStyle"),
  "DesignCanvas 使用統一 print area selector",
);
assert(
  flatShirt.includes("getPrintAreaContainerStyle"),
  "FlatShirtDesignView 使用統一 print area selector",
);
assert(
  modelPreview.includes("getUiPrintAreaContainerStyle"),
  "ModelDesignPreview 使用統一 print area selector",
);

assert(
  !designCanvas.includes("getFlatMockupPrintAreaContainerStyle"),
  "DesignCanvas 不誤用 Mockup flat",
);

console.log("\nUI print offset 接線檢查完成。");
