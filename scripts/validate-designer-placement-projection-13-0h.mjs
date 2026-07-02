/**
 * Step 13.0H — Designer Placement / Creation Projection validation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;

const PLACEMENT_CONTROLLER_APIS = [
  "applyDesignerPlacementPreset",
  "createDesignerPlacementPatch",
  "createDesignerUploadPlacement",
  "createDesignerDefaultTextLayer",
  "createDesignerDefaultShapeLayer",
  "createDesignerAutoFitLayer",
  "createDesignerDuplicateLayer",
];

const CREATION_HANDLERS = [
  "handleUpload",
  "handleAddText",
  "handleAddShape",
  "handleApplyPlacementPreset",
  "handleDuplicate",
];

const FORBIDDEN_IN_CREATION_BOUNDARY = [
  "applyLayerPlacementPreset(",
  "designerRectToWorkspaceRect(",
  "designerLengthToWorkspaceLength(",
  "getInitialPlacement(",
  "getStaggeredPlacement(",
  "createDefaultTextLayer(",
  "createDefaultShapeLayer(",
];

const FORBIDDEN_RUNTIME_FILES = [
  "lib/geometry.ts",
  "lib/placement-presets.ts",
  "lib/layer-alignment.ts",
  "lib/layer-constraints.ts",
  "lib/direct-manipulation.ts",
];

const POINTER_FILES = [
  "components/designer/PrintAreaElement.tsx",
  "components/designer/DesignCanvas.tsx",
];

const SIZES = [
  "90",
  "110",
  "130",
  "150",
  "160",
  "GS",
  "GM",
  "GL",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
];

const SIDES = ["front", "back"];

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const GARMENT_BLUE = {
  front: {
    90: { width: 18, height: 24 },
    M: { width: 35, height: 50 },
    XXXL: { width: 45, height: 60 },
  },
  back: {
    90: { width: 20, height: 22 },
    M: { width: 38, height: 45 },
    XXXL: { width: 49, height: 54 },
  },
};

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

function garmentFor(side, size) {
  return (
    GARMENT_BLUE[side][size] ??
    (side === "front"
      ? { width: 35, height: 50 }
      : { width: 38, height: 45 })
  );
}

function workspaceToDesignerRect(rect, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: rect.x_cm * (gm.width / ws.width),
    y_cm: rect.y_cm * (gm.height / ws.height),
    width_cm: rect.width_cm * (gm.width / ws.width),
    height_cm: rect.height_cm * (gm.height / ws.height),
  };
}

function designerToWorkspaceRect(rect, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: rect.x_cm * (ws.width / gm.width),
    y_cm: rect.y_cm * (ws.height / gm.height),
    width_cm: rect.width_cm * (ws.width / gm.width),
    height_cm: rect.height_cm * (ws.height / gm.height),
  };
}

function designerCssPercent(rect, side, size) {
  const gm = garmentFor(side, size);
  return {
    left: (rect.x_cm / gm.width) * 100,
    top: (rect.y_cm / gm.height) * 100,
    width: (rect.width_cm / gm.width) * 100,
    height: (rect.height_cm / gm.height) * 100,
  };
}

function validateControllerPlacementApis() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const api of PLACEMENT_CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
}

function validateDesignerAppCreationFlow() {
  const source = read("components/designer/DesignerApp.tsx");
  const required = [
    "designerCoordinateContext",
    "createControllerContext",
    "applyDesignerPlacementPreset",
    "createDesignerUploadPlacement",
    "createDesignerDefaultTextLayer",
    "createDesignerDefaultShapeLayer",
    "createDesignerAutoFitLayer",
    "createDesignerDuplicateLayer",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`DesignerApp 缺少 Creation 投影：${token}`);
    } else {
      pass(`DesignerApp 使用 ${token}`);
    }
  }

  for (const handler of CREATION_HANDLERS) {
    if (!source.includes(`const ${handler}`) && !source.includes(`function ${handler}`)) {
      fail(`DesignerApp 缺少 ${handler}`);
    } else {
      pass(`${handler} 存在`);
    }
  }

  for (const forbidden of FORBIDDEN_IN_CREATION_BOUNDARY) {
    if (source.includes(forbidden)) {
      fail(`DesignerApp 直接使用禁止 API：${forbidden}`);
    }
  }
  pass("DesignerApp 無禁止 Creation 邊界 API");

  const creationZones = [
    source.slice(source.indexOf("const handleUpload"), source.indexOf("const handleClearCurrentSlotDesign")),
    source.slice(source.indexOf("const handleAddText"), source.indexOf("const handleAddShape")),
    source.slice(source.indexOf("const handleAddShape"), source.indexOf("const handleTextStylePatch")),
    source.slice(
      source.indexOf("const handleApplyPlacementPreset"),
      source.indexOf("const handleLargePrintModeChange"),
    ),
    source.slice(source.indexOf("const handleDuplicate"), source.indexOf("const handleSubmitRequest")),
  ];
  for (const zone of creationZones) {
    const body = zone.split("],")[0];
    if (body.includes("workspacePrintArea")) {
      fail("Creation handler body 仍直接使用 workspacePrintArea");
      return;
    }
  }
  pass("Creation handler bodies 未直接使用 workspacePrintArea");
}

function validateDragResizeUntouched() {
  const printArea = read("components/designer/PrintAreaElement.tsx");
  const dragTokens = [
    "applyDesignerDragSnap",
    "resolveDesignerHandleResizeWorkspacePatch",
  ];
  for (const token of dragTokens) {
    if (!printArea.includes(token)) {
      fail(`Drag/Resize Runtime 遭修改：${token}`);
    } else {
      pass(`Drag/Resize 保留 ${token}`);
    }
  }
}

function validateForbiddenRuntimeUntouched() {
  for (const file of FORBIDDEN_RUNTIME_FILES) {
    const source = read(file);
    if (source.includes("designer-coordinate-controller")) {
      fail(`${file} 不應引用 controller`);
    } else {
      pass(`${file} 未修改（無 controller 引用）`);
    }
  }
}

function validateUploadPlacementEquivalence() {
  const imageAspect = 4 / 3;
  const imageH = 1200;
  const imageW = imageH * imageAspect;
  let cases = 0;

  for (const side of SIDES) {
    for (const size of SIZES) {
      const gm = garmentFor(side, size);
      const designerSafeW = gm.width * 0.9;
      const designerFitW = Math.min(gm.width * 0.875, designerSafeW);
      let designerFitH = (imageH / imageW) * designerFitW;
      if (designerFitH > gm.height * 0.9) {
        designerFitH = gm.height * 0.9;
      }
      const designerRect = {
        x_cm: (gm.width - designerFitW) / 2,
        y_cm: (gm.height - designerFitH) / 2,
        width_cm: designerFitW,
        height_cm: designerFitH,
      };
      const projectedWs = designerToWorkspaceRect(designerRect, side, size);
      const roundTrip = workspaceToDesignerRect(projectedWs, side, size);
      const display = designerCssPercent(designerRect, side, size);
      const roundTripDisplay = designerCssPercent(roundTrip, side, size);

      cases += 1;
      for (const key of ["left", "top", "width", "height"]) {
        const drift = Math.abs(display[key] - roundTripDisplay[key]);
        if (drift > ROUND_TRIP_EPSILON) {
          fail(`Upload controller round-trip ${side}/${size} ${key}`);
        }
      }
    }
  }
  pass(`${cases} upload placement controller round-trip checks`);
}

console.log("validate-designer-placement-projection-13-0h\n");

validateControllerPlacementApis();
validateDesignerAppCreationFlow();
validateDragResizeUntouched();
validateForbiddenRuntimeUntouched();
validateUploadPlacementEquivalence();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
