/**
 * 三層座標系統結構與獨立性檢查
 */

import { existsSync, readFileSync } from "node:fs";
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

function mustNotImport(source, forbidden, label) {
  for (const mod of forbidden) {
    assert(
      !source.includes(`from "./${mod}"`) &&
        !source.includes(`from '../${mod}'`) &&
        !source.includes(`coordinates/${mod}`),
      `${label} 不引用 ${mod}`,
    );
  }
}

const production = read("lib/coordinates/production.ts");
const uiOffset = read("lib/coordinates/ui-print-offset.ts");
const preview = read("lib/coordinates/preview.ts");
const mockup = read("lib/coordinates/mockup.ts");
const printExport = read("lib/print-export-system.ts");
const mockupExport = read("lib/mockup-export.ts");
const modelPreview = read("components/designer/ModelDesignPreview.tsx");
const modelPlaceholder = read("components/designer/ModelTemplatePlaceholder.tsx");
const designCm = read("lib/design-cm.ts");
const factoryProof = read("lib/proof-engine/generators/factory-proof-pdf-template.ts");

assert(existsSync(join(ROOT, "lib/coordinates/production.ts")), "Production 模組存在");
assert(existsSync(join(ROOT, "lib/coordinates/preview.ts")), "Preview 模組存在");
assert(existsSync(join(ROOT, "lib/coordinates/mockup.ts")), "Mockup 模組存在");

assert(
  production.includes("PRODUCTION_PRINT_AREA_MM") &&
    production.includes("width_mm: 350") &&
    production.includes("height_mm: 500"),
  "Production 印刷區為 350×500 mm",
);
assert(
  production.includes("mmToExportPx") && production.includes("MM_TO_EXPORT_PX"),
  "Production 匯出由 mm 計算",
);
mustNotImport(production, ["preview", "mockup"], "Production");

assert(
  uiOffset.includes("UI_GLOBAL_PRINT_OFFSET_Y_PX"),
  "ui-print-offset 定義全域 UI Y 偏移",
);
assert(
  preview.includes("getPreviewPrintAreaContainerStyle") &&
    preview.includes("resolveUiPrintReference"),
  "Preview overlay 使用 ui-print-offset",
);
assert(
  mockup.includes("resolveUiPrintReference"),
  "Mockup overlay 使用 ui-print-offset",
);
assert(!preview.includes("mmToExportPx"), "Preview 不直接匯出 px");
mustNotImport(preview, ["mockup"], "Preview");

assert(
  mockup.includes("MOCKUP_MODEL_PRINT_REFERENCE_BY_SIDE") &&
    mockup.includes("MOCKUP_FLAT_PRINT_REFERENCE_BY_SIDE") &&
    mockup.includes("MOCKUP_FLAT_CONTAINER") &&
    mockup.includes("MOCKUP_MODEL_CONTAINER") &&
    mockup.includes("getModelMockupPrintAreaContainerStyle") &&
    mockup.includes("getFlatMockupPrintAreaRectPx"),
  "Mockup 含平面／模特獨立錨點與容器",
);
mustNotImport(mockup, ["preview"], "Mockup");

assert(
  printExport.includes("coordinates/production") &&
    printExport.includes("getProductionExportDimensionsPx"),
  "Print export 僅用 Production",
);
assert(
  !printExport.includes("coordinates/preview") &&
    !printExport.includes("coordinates/mockup"),
  "Print export 不引用 Preview/Mockup",
);

assert(
  mockupExport.includes("getFlatMockupPrintAreaRectPx") &&
    mockupExport.includes("productionRectToMockupCanvasPx") &&
    mockupExport.includes("MOCKUP_FLAT_CONTAINER"),
  "Mockup export 使用 Mockup 座標",
);
assert(
  !mockupExport.includes("coordinates/preview"),
  "Mockup export 不引用 Preview",
);

assert(
  modelPreview.includes("getModelMockupPrintAreaContainerStyle"),
  "模特預覽使用 Mockup 座標",
);
assert(
  modelPlaceholder.includes("getModelMockupPrintAreaContainerStyle"),
  "模特佔位圖使用 Mockup 座標",
);

assert(
  designCm.includes("readLayerProductionRectMm") &&
    designCm.includes("getProductionPrintAreaCm") &&
    designCm.includes("PRODUCTION_LEGACY_UI_UNITS_PER_CM"),
  "design-cm 橋接 Production mm",
);
assert(
  !designCm.includes('from "./printArea"'),
  "design-cm 不引用 printArea facade",
);

assert(
  factoryProof.includes("MOCKUP_FLAT_CONTAINER") &&
    factoryProof.includes("getProductionPrintAreaCm"),
  "Factory proof mockup 對位使用 Mockup 容器",
);
assert(
  !factoryProof.includes("SHIRT_CONTAINER_WIDTH") &&
    !factoryProof.includes("SHIRT_CONTAINER_HEIGHT"),
  "Factory proof 不引用 Preview 容器常數",
);

console.log("\n三層座標系統檢查完成。");
