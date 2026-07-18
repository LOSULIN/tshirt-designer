/**
 * Phase 37 — Product Export Ultra HD wiring verification
 * node scripts/verify-product-export-ultra-hd.mjs
 */
import { readFileSync } from "node:fs";

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

const productExport = readFileSync("lib/export/product-export.ts", "utf8");
const renderExport = readFileSync("lib/export/render-export.ts", "utf8");
const assetLoader = readFileSync("lib/render/asset-loader.ts", "utf8");
const productLoader = readFileSync("lib/products/product-loader.ts", "utf8");
const mockupEngine = readFileSync("components/render/ProductMockupEngine.ts", "utf8");
const profile = readFileSync("public/products/UA35001/profile.json", "utf8");
const factoryWrapper = readFileSync("lib/export/factory-artwork-export.ts", "utf8");
const mockupWrapper = readFileSync("lib/export/mockup-artwork-export.ts", "utf8");

assert(productExport.includes('const PREVIEW_QUALITY: RenderQuality = "preview"'), "preview quality constant");
assert(productExport.includes('const DOWNLOAD_QUALITY: RenderQuality = "export"'), "export quality constant");
assert(productExport.includes("buildProductExportPreview"), "preview builder exists");
assert(productExport.includes("DOWNLOAD_QUALITY"), "download uses export quality");
assert(productExport.includes("PREVIEW_QUALITY"), "preview uses preview quality");
assert(productExport.includes("renderProductFactoryArtworkPng"), "factory artwork wrapper wired");
assert(productExport.includes("renderMockupArtworkPng"), "mockup artwork wrapper wired");
assert(!productExport.includes("renderFactoryArtworkExportPng"), "product-export does not call factory directly");

assert(renderExport.includes("quality: input.quality ?? \"preview\""), "preview render default");
assert(renderExport.includes("quality: input.quality ?? \"export\""), "download render default");

assert(assetLoader.includes("renderQualityToAssetVariant"), "asset loader uses variant mapping");
assert(assetLoader.includes('"export"'), "asset loader supports export variant");
assert(productLoader.includes("resolveGarmentAssetRelativePath"), "registry asset path resolver");
assert(productLoader.includes("assets?.[variant]"), "profile assets.preview/export");

assert(mockupEngine.includes("quality: input.quality"), "mockup engine passes quality");

assert(factoryWrapper.includes("pixelScale"), "factory wrapper passes pixelScale");
assert(mockupWrapper.includes("pixelScale"), "mockup wrapper passes pixelScale");
assert(mockupWrapper.includes("renderPrintExportPng"), "mockup re-renders print area");

assert(profile.includes("\"assetReferenceSize\""), "profile has assetReferenceSize");
assert(profile.includes("\"assets\""), "profile uses assets object");
assert(profile.includes("assets/export/"), "profile export asset paths");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
