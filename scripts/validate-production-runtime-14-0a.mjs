/**
 * Phase 14.0A — Production Runtime Verification
 * Read-only: no runtime modifications.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EPSILON = 0.0001;

const FROZEN_FILES = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/designer-display-projection.ts",
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
  "lib/placement-presets.ts",
  "lib/designer-workspace.ts",
  "lib/garment-anchor-runtime.ts",
];

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
];

const SIDES = ["front", "back"];
const LAYER_TYPES = ["image", "text", "shape"];

const INTERACTION_MATRIX = [
  {
    interaction: "Drag",
    component: "components/designer/PrintAreaElement.tsx",
    tokens: ["applyDesignerDragSnap", "clientPixelDeltaToDesignerCm"],
    forbidden: ["printArea.width / printRect.width"],
  },
  {
    interaction: "Resize",
    component: "components/designer/PrintAreaElement.tsx",
    tokens: ["resolveDesignerHandleResizeWorkspacePatch", "clientPointToDesignerCm"],
  },
  {
    interaction: "Rotate",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["resolveWorkspaceGestureForApplyClamped", "applyClampedLayerPatch"],
  },
  {
    interaction: "Snap",
    component: "components/designer/PrintAreaElement.tsx",
    tokens: ["applyDesignerDragSnap"],
    forbidden: ["applyDragSnap("],
  },
  {
    interaction: "Alignment",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["applyDesignerLayerAlignment", "designerAlignmentContext"],
    forbidden: ["alignDesignLayers("],
  },
  {
    interaction: "Placement",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["applyDesignerPlacementPreset", "handleApplyPlacementPreset"],
  },
  {
    interaction: "Upload",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["createDesignerUploadPlacement"],
  },
  {
    interaction: "Duplicate",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["createDesignerDuplicateLayer"],
  },
  {
    interaction: "Auto Fit",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["fitDesignerLayers", "updateDesignerLayer", "hydrateDesignerLayers"],
    forbidden: ["fitDesignLayers("],
  },
  {
    interaction: "Quick Rotate",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["rotateLayersQuick90", "resolveWorkspaceGestureForApplyClamped"],
  },
  {
    interaction: "Floating Controls",
    component: "components/designer/LayerFloatingControls.tsx",
    tokens: ["applyDesignerFloatingMove", "clientPixelDeltaToDesignerCm"],
  },
  {
    interaction: "History Undo/Redo",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["restoreLayersFromHistory", "useDesignHistory"],
  },
  {
    interaction: "Gender Change",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["handleGenderChange", "fitDesignerLayers"],
  },
  {
    interaction: "Draft Restore",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["hydrateDesignerLayers", "hydrateDesignLayersByTemplate"],
  },
  {
    interaction: "Inspector Edit",
    component: "components/designer/LayerInspectorEditor.tsx",
    tokens: ["applyDesignerLayerPatch", "designer-coordinate-controller"],
  },
  {
    interaction: "Layer Creation",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["createDesignerDefaultTextLayer", "createDesignerDefaultShapeLayer"],
  },
  {
    interaction: "Layer Delete",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["deleteLayerById", "revokeLayerAssets"],
  },
  {
    interaction: "Visibility Toggle",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["updateLayer", "visible"],
  },
  {
    interaction: "Lock / Unlock",
    component: "components/designer/DesignerApp.tsx",
    tokens: ["updateLayer", "locked"],
  },
];

const DISPLAY_RUNTIME_CHECKS = [
  {
    name: "Blue Print Area",
    file: "components/designer/DesignCanvas.tsx",
    tokens: ["designerPrintableArea", "getDesignerPrintableArea"],
  },
  {
    name: "Orange Safe Zone",
    file: "components/designer/DesignCanvas.tsx",
    tokens: ["orangeSafeZonePct", "getDesignerWorkspaceOrangeSafeZonePct"],
  },
  {
    name: "Constraint Overlay",
    file: "components/designer/DesignCanvas.tsx",
    tokens: ["CurrentGarmentConstraintVisualization", "workspacePrintArea"],
  },
  {
    name: "Alignment Guides",
    file: "components/designer/DesignCanvas.tsx",
    tokens: ["ElementAlignmentGuides", "designerPrintableArea"],
  },
  {
    name: "Grid",
    file: "components/designer/DesignCanvas.tsx",
    tokens: ["PrintAreaGrid", "designerGridSizeCm"],
  },
  {
    name: "Floating Controls",
    file: "components/designer/LayerFloatingControls.tsx",
    tokens: ["displayPercentStyle", "applyDesignerFloatingMove"],
  },
  {
    name: "Inspector",
    file: "components/designer/LayerInspectorEditor.tsx",
    tokens: ["getLayerDesignerDisplayRect", "applyDesignerLayerPatch"],
  },
  {
    name: "Status Bar",
    file: "components/designer/DesignCanvas.tsx",
    tokens: ["DesignWorkspaceStatusBar"],
  },
  {
    name: "Preview Panel",
    file: "components/designer/PreviewInfoPanel.tsx",
    tokens: ["createDesignerDisplayContext", "getDesignerPrintableArea"],
  },
];

const EXPORT_PIPELINE_FILES = [
  "lib/export-coordinates.ts",
  "lib/coordinate-runtime.ts",
  "lib/proof-engine/generators/mockup-generator.ts",
  "lib/proof-engine/generators/print-generator.ts",
  "lib/proof-engine/generators/factory-proof-pdf-template.ts",
];

const STORAGE_COORD_FIELDS = [
  "x_cm",
  "y_cm",
  "width_cm",
  "height_cm",
  "rotation",
  "scale",
];

const FORBIDDEN_STORAGE_FIELDS = ["designer_x_cm", "designer_y_cm", "designer_width_cm"];

let failures = 0;
let discoveredSizes = [];
let garmentBlueBySide = { front: {}, back: {} };
let workspaceBaseline = { front: null, back: null };

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

function parsePrintAreaRows(source, constName) {
  const marker = `export const ${constName}`;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Cannot find ${constName}`);
  }
  const slice = source.slice(start);
  const endIdx = slice.indexOf("] as const;");
  if (endIdx === -1) {
    throw new Error(`Cannot parse end of ${constName}`);
  }
  const block = slice.slice(0, endIdx);
  const rows = [];
  const rowRegex =
    /size:\s*"([^"]+)"[\s\S]*?blue:\s*\{\s*widthCm:\s*([\d.]+),\s*heightCm:\s*([\d.]+)\s*\}/g;
  let match;
  while ((match = rowRegex.exec(block)) !== null) {
    rows.push({
      size: match[1],
      width: Number(match[2]),
      height: Number(match[3]),
    });
  }
  return rows;
}

function discoverGarmentSizesFromRuntime() {
  const source = read("lib/designer-print-area-config.ts");
  const frontRows = parsePrintAreaRows(source, "DESIGNER_PRINT_AREA_ROWS");
  const backRows = parsePrintAreaRows(source, "DESIGNER_PRINT_AREA_ROWS_BACK");

  if (frontRows.length === 0 || backRows.length === 0) {
    fail("無法從 designer-print-area-config 解析尺碼");
    return;
  }

  const frontSizes = frontRows.map((row) => row.size);
  const backSizes = backRows.map((row) => row.size);
  if (frontSizes.join(",") !== backSizes.join(",")) {
    fail("Front/Back 尺碼表不一致");
  }

  discoveredSizes = frontSizes;
  for (const row of frontRows) {
    garmentBlueBySide.front[row.size] = {
      width: row.width,
      height: row.height,
    };
  }
  for (const row of backRows) {
    garmentBlueBySide.back[row.size] = {
      width: row.width,
      height: row.height,
    };
  }

  const refMatch = read("lib/designer-workspace.ts").match(
    /DESIGNER_WORKSPACE_REFERENCE_SIZE\s*=\s*"([^"]+)"/,
  );
  const refSize = refMatch?.[1] ?? "M";
  workspaceBaseline.front = garmentBlueBySide.front[refSize];
  workspaceBaseline.back = garmentBlueBySide.back[refSize];

  if (!workspaceBaseline.front || !workspaceBaseline.back) {
    fail(`Workspace baseline size "${refSize}" 不在尺碼表`);
  }

  pass(
    `自動發現 ${discoveredSizes.length} 個尺碼：${discoveredSizes.join(", ")}`,
  );
  pass(`Workspace M baseline：front ${workspaceBaseline.front.width}×${workspaceBaseline.front.height} cm，back ${workspaceBaseline.back.width}×${workspaceBaseline.back.height} cm`);
}

function workspaceToDesigner(point, side, size) {
  const ws = workspaceBaseline[side];
  const gm = garmentBlueBySide[side][size];
  return {
    x_cm: point.x_cm * (gm.width / ws.width),
    y_cm: point.y_cm * (gm.height / ws.height),
  };
}

function designerToWorkspace(point, side, size) {
  const ws = workspaceBaseline[side];
  const gm = garmentBlueBySide[side][size];
  return {
    x_cm: point.x_cm * (ws.width / gm.width),
    y_cm: point.y_cm * (ws.height / gm.height),
  };
}

function designerCssPercent(point, side, size) {
  const gm = garmentBlueBySide[side][size];
  return {
    left: (point.x_cm / gm.width) * 100,
    top: (point.y_cm / gm.height) * 100,
  };
}

function workspaceCssPercent(point, side) {
  const ws = workspaceBaseline[side];
  return {
    left: (point.x_cm / ws.width) * 100,
    top: (point.y_cm / ws.height) * 100,
  };
}

function layerFixture(type) {
  const base = {
    x_cm: 9.25,
    y_cm: 14.5,
    width_cm: 10,
    height_cm: 6,
    rotation: 12,
    scale: 1.15,
  };
  if (type === "text") {
    return { ...base, fontSize_cm: 2.4 };
  }
  return base;
}

function validateProductionDoc() {
  const docPath = "docs/production-verification.md";
  if (!existsSync(join(ROOT, docPath))) {
    fail(`缺少 ${docPath}`);
    return;
  }
  const doc = read(docPath);
  for (const token of [
    "Architecture Freeze Version",
    "Production Checklist",
    "Verification Matrix",
    "Supported Garment Sizes",
    "Coordinate Flow",
    "Regression Matrix",
    "Production Readiness Summary",
  ]) {
    if (!doc.includes(token)) {
      fail(`production-verification.md 缺少：${token}`);
    }
  }
  pass("docs/production-verification.md 結構完整");
}

function validateFrozenFiles() {
  for (const file of FROZEN_FILES) {
    if (!existsSync(join(ROOT, file))) {
      fail(`Frozen file 缺失：${file}`);
    } else {
      pass(`Frozen file 存在：${file}`);
    }
  }
}

function validateArchitectureBoundaries() {
  const geometry = read("lib/geometry.ts");
  const constraints = read("lib/layer-constraints.ts");
  const alignment = read("lib/layer-alignment.ts");
  const facade = read("lib/designer-coordinate-facade.ts");
  const controller = read("lib/designer-coordinate-controller.ts");
  const display = read("lib/designer-display-projection.ts");

  for (const token of [
    "designer-coordinate-facade",
    "designer-coordinate-controller",
    "designer-display-projection",
  ]) {
    if (geometry.includes(token)) fail(`geometry.ts 引用 ${token}`);
    if (constraints.includes(token)) fail(`layer-constraints.ts 引用 ${token}`);
    if (alignment.includes(token)) fail(`layer-alignment.ts 引用 ${token}`);
  }

  if (/from\s+["']react["']/.test(facade)) fail("Facade 引用 React");
  if (/from\s+["']react["']/.test(controller)) fail("Controller 引用 React");
  if (/document\.|getBoundingClientRect|PointerEvent/.test(controller)) {
    fail("Controller 引用 DOM/Pointer");
  }

  for (const pattern of [
    /setLayers\s*\(/,
    /setLayersByTemplate\s*\(/,
    /mergeWorkspacePatchIntoLayer\s*\(/,
  ]) {
    if (pattern.test(display)) fail("Display Projection 寫入 Storage");
  }

  if (facade.includes("designer-coordinate-controller")) {
    fail("Facade → Controller 循環依賴");
  }
  if (geometry.includes("designer-coordinate-controller")) {
    fail("Geometry → Controller 循環依賴");
  }

  pass("Architecture boundaries（Geometry / Facade / Controller / Display）");
}

function validateDuplicateProjections() {
  const files = [];
  for (const dir of ["lib", "components/designer"]) {
    const base = join(ROOT, dir);
    if (!existsSync(base)) continue;
  }
  const result = spawnSync(
    "grep",
    [
      "-rn",
      "workspaceRectToDesignerRect|designerRectToWorkspaceRect",
      "lib",
      "components/designer",
      "--include=*.ts",
      "--include=*.tsx",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  const lines = (result.stdout || "")
    .split("\n")
    .filter((line) => line && !line.includes("temp-project"));
  const allowed = [
    "designer-coordinate-facade.ts",
    "designer-coordinate-controller.ts",
    "designer-display-projection.ts",
  ];
  const offenders = lines.filter(
    (line) => !allowed.some((name) => line.includes(name)),
  );
  if (offenders.length > 0) {
    fail(`重複投影實作：${offenders[0]}`);
  } else {
    pass("投影實作僅存在於 Facade / Controller / Display");
  }
}

function validateStorageContract() {
  const types = read("lib/types.ts");
  for (const field of STORAGE_COORD_FIELDS) {
    if (!types.includes(`${field}:`) && !types.includes(`${field}?:`)) {
      fail(`Storage schema 缺少 ${field}`);
    }
  }
  for (const field of FORBIDDEN_STORAGE_FIELDS) {
    if (types.includes(field)) {
      fail(`Storage schema 出現禁止欄位 ${field}`);
    }
  }
  pass("Storage canonical fields（x_cm, y_cm, width_cm, height_cm, rotation, scale）");
}

function validateVerificationMatrix() {
  let cases = 0;
  const samplePoints = [
    { x_cm: 8, y_cm: 12 },
    { x_cm: 15.5, y_cm: 22.25 },
    { x_cm: 3.75, y_cm: 41.5 },
  ];

  for (const size of discoveredSizes) {
    for (const side of SIDES) {
      for (const layerType of LAYER_TYPES) {
        const fixture = layerFixture(layerType);
        const designer = workspaceToDesigner(fixture, side, size);
        const roundTrip = designerToWorkspace(designer, side, size);

        for (const key of ["x_cm", "y_cm"]) {
          cases += 1;
          if (Math.abs(roundTrip[key] - fixture[key]) > EPSILON) {
            fail(
              `Matrix ${size}/${side}/${layerType} round-trip ${key} drift`,
            );
          }
        }

        const wsPct = workspaceCssPercent(fixture, side);
        const displayPct = designerCssPercent(designer, side, size);
        cases += 2;
        if (Math.abs(wsPct.left - displayPct.left) > EPSILON) {
          fail(`Matrix ${size}/${side}/${layerType} CSS left drift`);
        }
        if (Math.abs(wsPct.top - displayPct.top) > EPSILON) {
          fail(`Matrix ${size}/${side}/${layerType} CSS top drift`);
        }
      }
    }
  }

  pass(
    `Verification matrix：${cases} coordinate/display checks（${discoveredSizes.length} sizes × ${SIDES.length} sides × ${LAYER_TYPES.length} layer types）`,
  );
}

function validateInteractionRouting() {
  for (const entry of INTERACTION_MATRIX) {
    const source = read(entry.component);
    for (const token of entry.tokens) {
      if (!source.includes(token)) {
        fail(`${entry.interaction} 缺少 ${token}（${entry.component}）`);
      }
    }
    for (const forbidden of entry.forbidden ?? []) {
      if (source.includes(forbidden)) {
        fail(`${entry.interaction} 仍含禁止路徑：${forbidden}`);
      }
    }
    pass(`${entry.interaction} → Controller / Canonical 路徑`);
  }
}

function validateDisplayRuntime() {
  for (const check of DISPLAY_RUNTIME_CHECKS) {
    const source = read(check.file);
    for (const token of check.tokens) {
      if (!source.includes(token)) {
        fail(`${check.name} 缺少 ${token}`);
      }
    }
    pass(`Display：${check.name}`);
  }
}

function validateExportPipelines() {
  for (const file of EXPORT_PIPELINE_FILES) {
    if (!existsSync(join(ROOT, file))) {
      fail(`Export pipeline 檔案缺失：${file}`);
      continue;
    }
    const source = read(file);
    if (source.includes("designer-coordinate-controller")) {
      fail(`${file} 不應引用 Controller（Read Pipeline）`);
    }
    if (!source.includes("x_cm") && !source.includes("layersByTemplate")) {
      fail(`${file} 未讀取 Workspace storage`);
    }
    pass(`Export pipeline：${file}（Workspace read）`);
  }

  const exportCoords = read("lib/export-coordinates.ts");
  if (!exportCoords.includes("resolvePrintAreaCm")) {
    fail("export-coordinates 缺少 resolvePrintAreaCm");
  }
  pass("Export coordinates 使用 coordinate-runtime（Garment Blue @ size）");
}

function validatePerformanceStatic() {
  const printArea = read("components/designer/PrintAreaElement.tsx");
  const floating = read("components/designer/LayerFloatingControls.tsx");
  const canvas = read("components/designer/DesignCanvas.tsx");

  if (printArea.includes("projectLayerToDesigner(")) {
    fail("PrintAreaElement 在 hot path 重複 projectLayerToDesigner");
  }
  if ((printArea.match(/clientPixelDeltaToDesignerCm/g) ?? []).length < 1) {
    fail("PrintAreaElement 缺少 designer pointer delta");
  }
  if (canvas.includes("fitDesignerLayers(")) {
    fail("DesignCanvas render 路徑不應呼叫 fitDesignerLayers");
  }
  if ((floating.match(/applyDesignerFloatingMove/g) ?? []).length < 1) {
    fail("LayerFloatingControls 缺少單次 controller move");
  }

  const controller = read("lib/designer-coordinate-controller.ts");
  const facadeCalls = (controller.match(/projectLayerToDesigner\(/g) ?? [])
    .length;
  const workspaceCalls = (controller.match(/projectLayerToWorkspace\(/g) ?? [])
    .length;
  if (facadeCalls === 0 || workspaceCalls === 0) {
    fail("Controller 缺少標準投影委派");
  }

  pass("Performance static：無 render-loop 重複 fit / 無 canvas 寫入 fit");
  pass(`Controller 投影委派（projectLayerToDesigner×${facadeCalls}, projectLayerToWorkspace×${workspaceCalls}）`);
}

function runRegressionSuite() {
  for (const script of REGRESSION_SCRIPTS) {
    const scriptPath = join(ROOT, "scripts", script);
    if (!existsSync(scriptPath)) {
      fail(`Regression script 缺失：${script}`);
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

console.log("validate-production-runtime-14-0a\n");

console.log("── Garment Size Discovery ──\n");
discoverGarmentSizesFromRuntime();

console.log("\n── Production Documentation ──\n");
validateProductionDoc();

console.log("\n── Architecture Freeze ──\n");
validateFrozenFiles();
validateArchitectureBoundaries();
validateDuplicateProjections();

console.log("\n── Storage Contract ──\n");
validateStorageContract();

console.log("\n── Verification Matrix ──\n");
validateVerificationMatrix();

console.log("\n── Interaction Routing ──\n");
validateInteractionRouting();

console.log("\n── Display Runtime ──\n");
validateDisplayRuntime();

console.log("\n── Export Pipelines ──\n");
validateExportPipelines();

console.log("\n── Performance Static ──\n");
validatePerformanceStatic();

console.log("\n── Regression Suite (13.0C–13.0N) ──\n");
runRegressionSuite();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
if (discoveredSizes.length > 0) {
  console.log(`Sizes verified: ${discoveredSizes.join(", ")}`);
}
process.exit(failures === 0 ? 0 : 1);
