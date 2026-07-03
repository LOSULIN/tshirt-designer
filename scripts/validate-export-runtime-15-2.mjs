/**
 * Phase 15.2 — Export Physical Projection Alignment
 * node scripts/validate-export-runtime-15-2.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");

let failures = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failures += 1;
}

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

console.log("validate-export-runtime-15-2\n");

const frozen = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/designer-display-projection.ts",
  "lib/designer-display-scale.ts",
  "lib/preview-runtime.ts",
  "lib/placement-presets.ts",
  "lib/geometry.ts",
];

console.log("── Export Runtime Module ──");
if (!existsSync(join(ROOT, "lib/export-runtime.ts"))) {
  fail("lib/export-runtime.ts missing");
} else {
  pass("lib/export-runtime.ts exists");
}

const exportRuntime = read("lib/export-runtime.ts");
for (const sym of [
  "projectExportLayerToGarment",
  "resolveExportGarmentLayerCmRect",
  "mapLiveDesignElementsToExportPhysical",
  "workspaceRectToDesignerRect",
]) {
  if (!exportRuntime.includes(sym)) {
    fail(`export-runtime missing ${sym}`);
  } else {
    pass(`export-runtime exports ${sym}`);
  }
}

if (exportRuntime.includes("preview-runtime")) {
  fail("export-runtime must not import preview-runtime");
} else {
  pass("export-runtime independent from preview-runtime");
}

const wired = [
  ["lib/print-export-system.ts", "resolveExportGarmentLayerCmRect"],
  ["lib/mockup-export.ts", "resolveExportGarmentLayerCmRect"],
  ["lib/export-coordinates.ts", "getLayerExportGarmentCmRect"],
  ["lib/export-debug.ts", "getLayerExportGarmentCmRect"],
  ["lib/mockup-export-debug.ts", "getLayerExportGarmentCmRect"],
  [
    "lib/proof-engine/generators/factory-proof-pdf-template.ts",
    "mapLiveDesignElementsToExportPhysical",
  ],
];

console.log("\n── Export Pipeline Wiring ──");
for (const [file, token] of wired) {
  const src = read(file);
  if (!src.includes(token)) {
    fail(`${file} must use ${token}`);
  } else {
    pass(`${file} → ${token}`);
  }
}

console.log("\n── Frozen Files Untouched (existence) ──");
for (const file of frozen) {
  if (!existsSync(join(ROOT, file))) {
    fail(`${file} missing`);
  } else {
    pass(file);
  }
}

console.log("\n── Regression ──");
for (const script of [
  "validate-export-runtime-15-1.mjs",
  "validate-preview-consistency-15-0c.mjs",
]) {
  const result = spawnSync("node", [join(ROOT, "scripts", script)], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`regression failed: ${script}`);
  } else {
    pass(`regression: ${script}`);
  }
}

console.log("\n── Summary ──");
if (failures === 0) {
  console.log("\n✓ validate-export-runtime-15-2 PASS\n");
  process.exit(0);
} else {
  console.error(`\n✗ validate-export-runtime-15-2 FAIL (${failures} failures)\n`);
  process.exit(1);
}
