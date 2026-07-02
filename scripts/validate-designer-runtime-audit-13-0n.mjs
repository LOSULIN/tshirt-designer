/**
 * Step 13.0N — Designer Coordinate Final Architecture Audit validation
 * Read-only audit: no runtime modifications.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");

const REGRESSION_SCRIPTS = [
  "validate-designer-pointer-projection-13-0f.mjs",
  "validate-designer-resize-projection-13-0g.mjs",
  "validate-designer-placement-projection-13-0h.mjs",
  "validate-designer-snap-projection-13-0i.mjs",
  "validate-designer-gesture-projection-13-0j.mjs",
  "validate-designer-alignment-projection-13-0k.mjs",
  "validate-designer-floating-controls-projection-13-0l.mjs",
  "validate-designer-fit-projection-13-0m.mjs",
];

const GEOMETRY_FORBIDDEN_IMPORTS = [
  "designer-coordinate-facade",
  "designer-coordinate-controller",
  "designer-display-projection",
];

const CONSTRAINTS_FORBIDDEN_IMPORTS = [
  "designer-coordinate-facade",
  "designer-coordinate-controller",
  "designer-display-projection",
];

const FACADE_FORBIDDEN_PATTERNS = [
  /from\s+["']react["']/,
  /document\./,
  /window\./,
  /getBoundingClientRect/,
  /PointerEvent/,
];

const CONTROLLER_FORBIDDEN_PATTERNS = [
  /from\s+["']react["']/,
  /document\./,
  /window\./,
  /getBoundingClientRect/,
  /PointerEvent/,
  /from\s+["'].*PrintAreaElement/,
  /from\s+["'].*DesignCanvas/,
];

const DISPLAY_FORBIDDEN_WRITE_PATTERNS = [
  /setLayers\s*\(/,
  /setLayersByTemplate\s*\(/,
  /mergeWorkspacePatchIntoLayer\s*\(/,
  /projectLayerToWorkspace\s*\(/,
  /applyDesignerLayerPatch\s*\(/,
];

const DESIGNER_APP_FORBIDDEN_WRITES = [
  "fitTextLayer(",
  "fitImageLayer(",
  "fitShapeLayer(",
  "fitDesignLayers(",
  "alignDesignLayers(",
  "workspaceRectToDesignerRect(",
  "designerRectToWorkspaceRect(",
  "designerPointToWorkspacePoint(",
  "workspacePointToDesignerPoint(",
];

const CONTROLLER_WRITE_ENTRY_POINTS = [
  "createControllerContext",
  "applyDesignerLayerPatch",
  "fitDesignerLayer",
  "fitDesignerLayers",
  "updateDesignerLayer",
  "hydrateDesignerLayers",
  "applyDesignerLayerAlignment",
  "applyDesignerFloatingMove",
  "resolveDesignerDragWorkspacePatch",
  "resolveDesignerHandleResizeWorkspacePatch",
  "resolveWorkspaceGestureForApplyClamped",
  "createDesignerUploadPlacement",
  "createDesignerDefaultTextLayer",
  "createDesignerDefaultShapeLayer",
  "createDesignerAutoFitLayer",
  "createDesignerDuplicateLayer",
];

const DESIGNER_COMPONENT_CONTROLLER_IMPORTS = [
  "components/designer/DesignerApp.tsx",
  "components/designer/PrintAreaElement.tsx",
  "components/designer/DesignCanvas.tsx",
  "components/designer/LayerFloatingControls.tsx",
  "components/designer/LayerInspectorEditor.tsx",
  "components/designer/InspectorObjectCard.tsx",
];

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

function validateAuditDocExists() {
  const docPath = "docs/designer-coordinate-runtime-audit.md";
  if (!existsSync(join(ROOT, docPath))) {
    fail(`缺少架構審計文件：${docPath}`);
    return;
  }
  const doc = read(docPath);
  const required = [
    "Runtime Classification",
    "Dependency Graph",
    "Workspace Runtime Audit",
    "Remaining Workspace Runtime",
    "Architecture Conclusion",
    "Category A",
    "Category B",
    "Category C",
    "Category D",
  ];
  for (const token of required) {
    if (!doc.includes(token)) {
      fail(`審計文件缺少章節：${token}`);
    }
  }
  pass("docs/designer-coordinate-runtime-audit.md 存在且結構完整");
}

function validateGeometryIsolation() {
  const source = read("lib/geometry.ts");
  for (const token of GEOMETRY_FORBIDDEN_IMPORTS) {
    if (source.includes(token)) {
      fail(`geometry.ts 不得引用 ${token}`);
    }
  }
  pass("geometry.ts 完全 Coordinate-Agnostic");
}

function validateConstraintsIsolation() {
  const source = read("lib/layer-constraints.ts");
  for (const token of CONSTRAINTS_FORBIDDEN_IMPORTS) {
    if (source.includes(token)) {
      fail(`layer-constraints.ts 不得引用 ${token}`);
    }
  }
  pass("layer-constraints.ts 完全 Coordinate-Agnostic");
}

function validateFacadePurity() {
  const source = read("lib/designer-coordinate-facade.ts");
  for (const pattern of FACADE_FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
      fail(`Facade 含禁止依賴：${pattern}`);
    }
  }
  pass("Facade 無 React / DOM / Pointer 依賴");
}

function validateControllerPurity() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const pattern of CONTROLLER_FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
      fail(`Controller 含禁止依賴：${pattern}`);
    }
  }
  for (const api of CONTROLLER_WRITE_ENTRY_POINTS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少寫入入口 ${api}`);
    }
  }
  pass("Controller 無 React / DOM / Canvas 依賴");
  pass(`Controller 寫入 API 完整（${CONTROLLER_WRITE_ENTRY_POINTS.length} 項）`);
}

function validateDisplayReadOnly() {
  const source = read("lib/designer-display-projection.ts");
  for (const pattern of DISPLAY_FORBIDDEN_WRITE_PATTERNS) {
    if (pattern.test(source)) {
      fail(`Display Projection 不得寫入 Storage：${pattern}`);
    }
  }
  pass("Display Projection 唯讀（不寫入 Storage）");
}

function validateDesignerAppWriteBoundary() {
  const source = read("components/designer/DesignerApp.tsx");
  for (const forbidden of DESIGNER_APP_FORBIDDEN_WRITES) {
    if (source.includes(forbidden)) {
      fail(`DesignerApp 直接呼叫禁止寫入 API：${forbidden}`);
    }
  }
  const required = [
    "designer-coordinate-controller",
    "designerFitContext",
    "fitDesignerLayers",
    "updateDesignerLayer",
    "hydrateDesignerLayers",
    "applyDesignerLayerAlignment",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`DesignerApp 缺少 Controller 寫入路徑：${token}`);
    }
  }
  pass("DesignerApp 所有 Fit/Hydration/Alignment 經 Controller");
  pass("DesignerApp 無禁止 Facade / fit* 直接寫入");
}

function validateComponentControllerImports() {
  for (const file of DESIGNER_COMPONENT_CONTROLLER_IMPORTS) {
    const source = read(file);
    if (!source.includes("designer-coordinate-controller")) {
      fail(`${file} 應引用 designer-coordinate-controller`);
      continue;
    }
    pass(`${file} 引用 Controller`);
  }
}

function validateKnownWorkspaceBoundaries() {
  const printArea = read("components/designer/PrintAreaElement.tsx");
  if (!printArea.includes("applyDesignerDragSnap")) {
    fail("PrintAreaElement 缺少 Designer snap 路徑");
  }
  if (!printArea.includes("fitLayerTransform")) {
    fail("PrintAreaElement 缺少 Workspace post-snap clamp");
  }
  pass("PrintAreaElement：Designer snap + Workspace clamp（Canonical Boundary）");

  const canvas = read("components/designer/DesignCanvas.tsx");
  if (!canvas.includes("getAlignmentGuidesForSelection")) {
    fail("DesignCanvas 缺少 alignment guide preview");
  }
  if (!canvas.includes("designerPrintableArea")) {
    fail("DesignCanvas 缺少 designer printable area display");
  }
  pass("DesignCanvas：Display Runtime 分離（guide preview / designer display）");

  const app = read("components/designer/DesignerApp.tsx");
  if (!app.includes("applyClampedLayerPatch")) {
    fail("DesignerApp 缺少 gesture workspace clamp 路徑");
  }
  pass("DesignerApp：Gesture patch 經 Controller → applyClampedLayerPatch（Canonical Clamp）");
}

function validateStorageSchemaUnchanged() {
  const types = read("lib/types.ts");
  if (!types.includes("x_cm: number")) {
    fail("Storage schema 缺少 x_cm");
  }
  if (types.includes("designer_x_cm")) {
    fail("Storage schema 不應引入 designer 欄位");
  }
  pass("Storage Schema 維持 Workspace M（x_cm / y_cm canonical）");
}

function runRegressionSuite() {
  for (const script of REGRESSION_SCRIPTS) {
    const scriptPath = join(ROOT, "scripts", script);
    if (!existsSync(scriptPath)) {
      fail(`缺少 regression script：${script}`);
      continue;
    }
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

console.log("validate-designer-runtime-audit-13-0n\n");
console.log("── Architecture Boundary ──\n");

validateAuditDocExists();
validateGeometryIsolation();
validateConstraintsIsolation();
validateFacadePurity();
validateControllerPurity();
validateDisplayReadOnly();
validateDesignerAppWriteBoundary();
validateComponentControllerImports();
validateKnownWorkspaceBoundaries();
validateStorageSchemaUnchanged();

console.log("\n── Regression Suite (13.0F–13.0M) ──\n");
runRegressionSuite();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
