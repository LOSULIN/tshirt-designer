/**
 * Phase 76.2 — Product Mockup Render Parity regression.
 * Run: npx tsx lib/export/product-mockup-render-parity.regression.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const FILES = {
  productExport: "lib/export/product-export.ts",
  compose: "lib/render/product-mockup-compose.ts",
  engine: "components/render/ProductMockupEngine.ts",
  submitRender: "lib/designer-geometry-v2/product-mockup-submit-render.ts",
  resultPanelBuild: "lib/result-panel/build-result-panel-product-preview.ts",
  resultPanel: "components/designer/ResultPanel.tsx",
};

let pass = true;
const checks: string[] = [];

function assert(label: string, condition: boolean): void {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    pass = false;
  } else {
    checks.push(`PASS: ${label}`);
    console.log(`PASS: ${label}`);
  }
}

function read(rel: string): string {
  const abs = join(ROOT, rel);
  assert(`${rel} exists`, existsSync(abs));
  return readFileSync(abs, "utf8");
}

const productExport = read(FILES.productExport);
const compose = read(FILES.compose);
const engine = read(FILES.engine);
const submitRender = read(FILES.submitRender);
const resultPanelBuild = read(FILES.resultPanelBuild);
const resultPanel = read(FILES.resultPanel);

assert(
  "download compose uses preview quality constant",
  productExport.includes("PRODUCT_MOCKUP_COMPOSE_QUALITY") &&
    productExport.includes('= PREVIEW_QUALITY'),
);
assert(
  "download scales composed canvas (no export-quality compose)",
  productExport.includes("scaleCanvasUniform") &&
    productExport.includes("outputPixelScale"),
);
assert(
  "download does not pass export quality to renderProductMockupOnProduct",
  !productExport.match(
    /renderProductMockupOnProduct\([\s\S]*?quality:\s*DOWNLOAD_QUALITY/,
  ),
);
assert(
  "mockup artwork for download uses pixelScale 1",
  productExport.includes("PRODUCT_MOCKUP_COMPOSE_QUALITY,\n    1,"),
);

assert(
  "compose delegates placement to ProductMockupRuntime only",
  compose.includes("resolveProductMockupRuntimePlacement("),
);
assert(
  "compose has no background fill",
  !compose.includes("fillRect(") && !compose.includes("fillStyle"),
);
assert(
  "compose clears alpha canvas before draw",
  compose.includes("clearRect(") && compose.includes("alpha: true"),
);

assert(
  "ProductMockupEngine delegates composeProductMockup",
  engine.includes("composeProductMockup("),
);
assert(
  "ProductMockupEngine has no second placement path",
  !engine.includes("resolveProductMockupRuntimePlacement"),
);

assert(
  "submit mockup uses renderProductMockupOnProduct",
  submitRender.includes("renderProductMockupOnProduct("),
);
assert(
  "submit mockup uses preview quality",
  submitRender.includes('quality: PROOF_MOCKUP_PREVIEW_QUALITY'),
);

assert(
  "result panel preview passes pipelineContext to mockup engine",
  resultPanelBuild.includes("pipelineContext: input.pipelineContext"),
);
assert(
  "result panel resolves shared pipelineContext for export",
  resultPanel.includes("resolveExportPipelineContext(") &&
    resultPanel.includes("pipelineContext"),
);

assert(
  "no /templates/ garment path in product export",
  !productExport.includes("/templates/"),
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
