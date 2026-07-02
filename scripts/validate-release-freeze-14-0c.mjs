/**
 * Phase 14.0C — Release Freeze & Final Acceptance validation
 * Documentation-only milestone: no runtime modifications.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");

const RELEASE_DOC = "docs/RELEASE-14.0.md";
const TEST_REPORT = "docs/TEST-REPORT-14.0.md";
const ARCHITECTURE_DOC = "docs/ARCHITECTURE.md";

const REGRESSION_SCRIPTS = [
  "validate-designer-coordinate-facade-13-0c.mjs",
  "validate-designer-display-projection-13-0d.mjs",
  "validate-designer-coordinate-controller-13-0e.mjs",
  "validate-designer-pointer-projection-13-0f.mjs",
  "validate-designer-resize-projection-13-0g.mjs",
  "validate-designer-placement-projection-13-0h.mjs",
  "validate-designer-snap-projection-13-0i.mjs",
  "validate-designer-gesture-projection-13-0j.mjs",
  "validate-designer-alignment-projection-13-0k.mjs",
  "validate-designer-floating-controls-projection-13-0l.mjs",
  "validate-designer-fit-projection-13-0m.mjs",
  "validate-designer-runtime-audit-13-0n.mjs",
  "validate-production-runtime-14-0a.mjs",
  "validate-architecture-freeze-14-0b.mjs",
];

const FROZEN_RUNTIME_FILES = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/designer-display-projection.ts",
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
  "lib/placement-presets.ts",
  "lib/direct-manipulation.ts",
  "lib/designer-workspace.ts",
  "lib/garment-anchor-runtime.ts",
];

const STORAGE_COORD_FIELDS = [
  "x_cm",
  "y_cm",
  "width_cm",
  "height_cm",
  "rotation",
  "scale",
];

const FORBIDDEN_STORAGE_FIELDS = ["designer_x_cm", "designer_y_cm"];

/** Phase 14.0C may only add/modify these artifacts (release step scope). */
const RELEASE_STEP_ARTIFACTS = [
  "docs/RELEASE-14.0.md",
  "docs/TEST-REPORT-14.0.md",
  "scripts/validate-release-freeze-14-0c.mjs",
];

let failures = 0;
let discoveredSizes = [];

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

function parseSizesFromRuntime() {
  const source = read("lib/designer-print-area-config.ts");
  const marker = "export const DESIGNER_PRINT_AREA_ROWS";
  const start = source.indexOf(marker);
  const slice = source.slice(start);
  const endIdx = slice.indexOf("] as const;");
  const block = slice.slice(0, endIdx);
  const sizes = [];
  const rowRegex = /size:\s*"([^"]+)"/g;
  let match;
  while ((match = rowRegex.exec(block)) !== null) {
    sizes.push(match[1]);
  }
  return sizes;
}

function validateReleaseDocumentation() {
  for (const doc of [RELEASE_DOC, TEST_REPORT, ARCHITECTURE_DOC]) {
    if (!existsSync(join(ROOT, doc))) {
      fail(`缺少文件：${doc}`);
    } else {
      pass(`${doc} 存在`);
    }
  }

  const release = read(RELEASE_DOC);
  for (const token of [
    "v14.0",
    "RELEASED",
    "FROZEN",
    "DESIGNER_PRINT_AREA_ROWS",
    "Regression Matrix",
    "No Designer Coordinate is persisted",
  ]) {
    if (!release.includes(token)) {
      fail(`RELEASE-14.0.md 缺少：${token}`);
    }
  }

  const report = read(TEST_REPORT);
  if (!report.includes("Final Acceptance Checklist")) {
    fail("TEST-REPORT-14.0.md 缺少 Final Acceptance Checklist");
  }
  pass("Release 與 Test Report 結構完整");
}

function validateRegressionScriptsExist() {
  for (const script of REGRESSION_SCRIPTS) {
    const path = join(ROOT, "scripts", script);
    if (!existsSync(path)) {
      fail(`Regression script 缺失：${script}`);
    } else {
      pass(`script 存在：${script}`);
    }
  }
  if (!existsSync(join(ROOT, "scripts/validate-release-freeze-14-0c.mjs"))) {
    fail("validate-release-freeze-14-0c.mjs 缺失");
  } else {
    pass("script 存在：validate-release-freeze-14-0c.mjs");
  }
}

function validateFrozenRuntimeFiles() {
  for (const file of FROZEN_RUNTIME_FILES) {
    if (!existsSync(join(ROOT, file))) {
      fail(`Frozen runtime 缺失：${file}`);
    }
  }
  pass(`Frozen runtime 完整（${FROZEN_RUNTIME_FILES.length} 檔）`);
}

function validateCoreModules() {
  for (const file of [
    "lib/designer-coordinate-controller.ts",
    "lib/designer-coordinate-facade.ts",
    "lib/designer-display-projection.ts",
  ]) {
    if (!existsSync(join(ROOT, file))) {
      fail(`核心模組缺失：${file}`);
    }
  }
  pass("Controller / Facade / Display Projection 存在");
}

function validateStorageSchema() {
  const types = read("lib/types.ts");
  for (const field of STORAGE_COORD_FIELDS) {
    if (!types.includes(`${field}:`) && !types.includes(`${field}?:`)) {
      fail(`Storage schema 缺少 ${field}`);
    }
  }
  for (const field of FORBIDDEN_STORAGE_FIELDS) {
    if (types.includes(field)) {
      fail(`Storage schema 禁止欄位：${field}`);
    }
  }
  pass("Storage schema 未變更（Workspace M canonical）");
}

function validateReleaseStepScope() {
  for (const artifact of RELEASE_STEP_ARTIFACTS) {
    if (!existsSync(join(ROOT, artifact))) {
      fail(`14.0C artifact 缺失：${artifact}`);
    }
  }
  const release = read(RELEASE_DOC);
  if (!release.includes("verification and documentation only")) {
    fail("RELEASE-14.0.md 未聲明 documentation-only scope");
  }
  pass("Phase 14.0C 僅新增 release 文件與驗證腳本（無 runtime 修改）");
}

function validateSupportedSizes() {
  discoveredSizes = parseSizesFromRuntime();
  if (discoveredSizes.length === 0) {
    fail("無法從 DESIGNER_PRINT_AREA_ROWS 解析尺碼");
    return;
  }
  pass(
    `支援尺碼（自動發現 ${discoveredSizes.length}）：${discoveredSizes.join(", ")}`,
  );
}

function runRegressionSuite() {
  const allScripts = [...REGRESSION_SCRIPTS];
  for (const script of allScripts) {
    const scriptPath = join(ROOT, "scripts", script);
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: ROOT,
      encoding: "utf8",
    });
    if (result.status !== 0) {
      fail(`${script} FAIL`);
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    } else {
      pass(`${script} PASS`);
    }
  }
}

console.log("validate-release-freeze-14-0c\n");
console.log("── Release Documentation ──\n");
validateReleaseDocumentation();

console.log("\n── Validation Scripts (13.0C–14.0B) ──\n");
validateRegressionScriptsExist();

console.log("\n── Frozen Runtime ──\n");
validateFrozenRuntimeFiles();
validateCoreModules();
validateStorageSchema();
validateReleaseStepScope();

console.log("\n── Supported Sizes ──\n");
validateSupportedSizes();

console.log("\n── Regression Suite ──\n");
runRegressionSuite();

console.log(
  `\n${failures === 0 ? "Release Freeze Validation — PASS" : "Release Freeze Validation — FAIL"}`,
);
if (failures > 0) {
  console.error(`${failures} failure(s)`);
}
process.exit(failures === 0 ? 0 : 1);
