/**
 * Step 14.0B — Architecture Freeze Documentation validation
 * Documentation-only milestone: no runtime modifications.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const ARCHITECTURE_DOC = "docs/ARCHITECTURE.md";

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
];

const GEOMETRY_ISOLATION_FILES = [
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
];

const FORBIDDEN_COORDINATE_IMPORTS = [
  "designer-coordinate-controller",
  "designer-coordinate-facade",
  "designer-display-projection",
];

const FACADE_WRITE_APIS = [
  "designerRectToWorkspaceRect(",
  "workspaceRectToDesignerRect(",
  "projectLayerToWorkspace(",
  "projectLayerToDesigner(",
  "designerPointToWorkspacePoint(",
  "workspacePointToDesignerPoint(",
];

const UI_COMPONENT_CHECKS = [
  {
    name: "DesignerApp",
    file: "components/designer/DesignerApp.tsx",
    requireController: true,
  },
  {
    name: "PrintAreaElement",
    file: "components/designer/PrintAreaElement.tsx",
    requireController: true,
  },
  {
    name: "LayerFloatingControls",
    file: "components/designer/LayerFloatingControls.tsx",
    requireController: true,
  },
  {
    name: "DesignCanvas",
    file: "components/designer/DesignCanvas.tsx",
    requireController: true,
  },
  {
    name: "LayerInspectorEditor",
    file: "components/designer/LayerInspectorEditor.tsx",
    requireController: true,
  },
];

const ARCHITECTURE_SECTIONS = [
  "# 1. Runtime Overview",
  "# 2. Canonical Rules",
  "# 3. Responsibilities",
  "# 4. Forbidden Rules",
  "# 5. Future Development Rules",
  "# 6. Runtime Classification",
  "# 7. Frozen Runtime Files",
];

const DISPLAY_FORBIDDEN_WRITES = [
  /setLayers\s*\(/,
  /setLayersByTemplate\s*\(/,
  /mergeWorkspacePatchIntoLayer\s*\(/,
  /projectLayerToWorkspace\s*\(/,
  /applyDesignerLayerPatch\s*\(/,
];

const REACT_IMPORT = /from\s+["']react["']/;

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

function validateArchitectureDoc() {
  if (!existsSync(join(ROOT, ARCHITECTURE_DOC))) {
    fail(`${ARCHITECTURE_DOC} 不存在`);
    return;
  }
  const doc = read(ARCHITECTURE_DOC);
  for (const section of ARCHITECTURE_SECTIONS) {
    if (!doc.includes(section)) {
      fail(`${ARCHITECTURE_DOC} 缺少章節：${section}`);
    }
  }
  const requiredPhrases = [
    "Storage is always Workspace Canonical",
    "Designer Coordinate never persists",
    "Workspace M is the only persistent coordinate system",
    "Never bypass Controller",
    "Projection math belongs only inside Facade",
  ];
  for (const phrase of requiredPhrases) {
    if (!doc.includes(phrase)) {
      fail(`${ARCHITECTURE_DOC} 缺少關鍵敘述`);
      break;
    }
  }
  pass(`${ARCHITECTURE_DOC} 存在且結構完整`);
}

function validateFrozenFiles() {
  for (const file of FROZEN_RUNTIME_FILES) {
    if (!existsSync(join(ROOT, file))) {
      fail(`Frozen runtime 缺失：${file}`);
    } else {
      pass(`Frozen runtime 存在：${file}`);
    }
  }
}

function validateGeometryIsolation() {
  for (const file of GEOMETRY_ISOLATION_FILES) {
    const source = read(file);
    for (const token of FORBIDDEN_COORDINATE_IMPORTS) {
      if (source.includes(token)) {
        fail(`${file} 不得引用 ${token}`);
      }
    }
  }
  pass("geometry.ts 無 controller / facade imports");
  pass("layer-constraints.ts 無 controller imports");
  pass("layer-alignment.ts 無 controller imports");
}

function validateFacadePurity() {
  const source = read("lib/designer-coordinate-facade.ts");
  if (REACT_IMPORT.test(source)) {
    fail("Facade 不得引用 React");
  }
  if (/document\.|window\.|getBoundingClientRect|PointerEvent/.test(source)) {
    fail("Facade 不得引用 DOM / Pointer");
  }
  pass("Facade 無 React imports");
}

function validateControllerPurity() {
  const source = read("lib/designer-coordinate-controller.ts");
  if (REACT_IMPORT.test(source)) {
    fail("Controller 不得引用 React");
  }
  if (/document\.|window\.|getBoundingClientRect|PointerEvent/.test(source)) {
    fail("Controller 不得引用 DOM / Pointer");
  }
  pass("Controller 無 React imports");
}

function validateDisplayReadOnly() {
  const source = read("lib/designer-display-projection.ts");
  for (const pattern of DISPLAY_FORBIDDEN_WRITES) {
    if (pattern.test(source)) {
      fail("Display Projection 不得寫入 Storage");
    }
  }
  pass("Display Projection 無 storage writes");
}

function validateUiComponentBoundaries() {
  for (const check of UI_COMPONENT_CHECKS) {
    const source = read(check.file);
    if (check.requireController && !source.includes("designer-coordinate-controller")) {
      fail(`${check.name} 必須引用 designer-coordinate-controller`);
      continue;
    }
    for (const api of FACADE_WRITE_APIS) {
      if (source.includes(api)) {
        fail(`${check.name} 直接呼叫禁止 Facade API：${api}`);
      }
    }
    pass(`${check.name} 引用 Controller、無 Facade write APIs`);
  }
}

console.log("validate-architecture-freeze-14-0b\n");

validateArchitectureDoc();
validateFrozenFiles();
validateGeometryIsolation();
validateFacadePurity();
validateControllerPurity();
validateDisplayReadOnly();
validateUiComponentBoundaries();

console.log(
  `\n${failures === 0 ? "Architecture Freeze Validation — PASS" : "Architecture Freeze Validation — FAIL"}`,
);
if (failures > 0) {
  console.error(`${failures} failure(s)`);
}
process.exit(failures === 0 ? 0 : 1);
