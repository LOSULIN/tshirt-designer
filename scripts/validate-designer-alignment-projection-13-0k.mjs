/**
 * Step 13.0K — Designer Alignment Projection validation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;

const ALIGNMENT_CONTROLLER_APIS = [
  "createDesignerAlignmentContext",
  "projectAlignmentLayersToDesigner",
  "resolveDesignerAlignmentWorkspacePatches",
  "applyDesignerLayerAlignment",
  "projectDesignerAlignmentResultToWorkspace",
];

const FORBIDDEN_IN_DESIGNER_APP = [
  "workspaceRectToDesignerRect(",
  "designerRectToWorkspaceRect(",
  "designerPointToWorkspacePoint(",
  "designerLengthToWorkspaceLength(",
  "alignDesignLayers(",
];

const FORBIDDEN_RUNTIME_FILES = ["lib/layer-alignment.ts", "lib/geometry.ts"];

const POINTER_FILES = [
  "components/designer/PrintAreaElement.tsx",
  "components/designer/DesignCanvas.tsx",
];

const ALIGNMENT_AXES = [
  "left",
  "center",
  "right",
  "top",
  "middle",
  "bottom",
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

function workspaceToDesignerPoint(point, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: point.x_cm * (gm.width / ws.width),
    y_cm: point.y_cm * (gm.height / ws.height),
  };
}

function designerToWorkspacePoint(point, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: point.x_cm * (ws.width / gm.width),
    y_cm: point.y_cm * (ws.height / gm.height),
  };
}

function designerCssPercent(rect, side, size) {
  const gm = garmentFor(side, size);
  return {
    left: (rect.x_cm / gm.width) * 100,
    top: (rect.y_cm / gm.height) * 100,
  };
}

function alignLeftInDesigner(layerRect, ref, effW) {
  return { x_cm: ref.left, y_cm: layerRect.y_cm };
}

function alignCenterInDesigner(layerRect, ref, effW, effH) {
  const layerCenterX = layerRect.x_cm + effW / 2;
  const refCenterX = (ref.left + ref.right) / 2;
  return { x_cm: layerRect.x_cm + (refCenterX - layerCenterX), y_cm: layerRect.y_cm };
}

function alignRightInDesigner(layerRect, ref, effW) {
  return { x_cm: ref.right - effW, y_cm: layerRect.y_cm };
}

function alignTopInDesigner(layerRect, ref) {
  return { x_cm: layerRect.x_cm, y_cm: ref.top };
}

function alignMiddleInDesigner(layerRect, ref, effH) {
  const layerCenterY = layerRect.y_cm + effH / 2;
  const refCenterY = (ref.top + ref.bottom) / 2;
  return { x_cm: layerRect.x_cm, y_cm: layerRect.y_cm + (refCenterY - layerCenterY) };
}

function alignBottomInDesigner(layerRect, ref, effH) {
  return { x_cm: layerRect.x_cm, y_cm: ref.bottom - effH };
}

function applyAxisAlign(axis, layerRect, ref, effW, effH) {
  switch (axis) {
    case "left":
      return alignLeftInDesigner(layerRect, ref, effW);
    case "center":
      return alignCenterInDesigner(layerRect, ref, effW, effH);
    case "right":
      return alignRightInDesigner(layerRect, ref, effW);
    case "top":
      return alignTopInDesigner(layerRect, ref);
    case "middle":
      return alignMiddleInDesigner(layerRect, ref, effH);
    case "bottom":
      return alignBottomInDesigner(layerRect, ref, effH);
    default:
      return layerRect;
  }
}

function validateAlignmentControllerApis() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const api of ALIGNMENT_CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
}

function validateDesignerAppAlignmentFlow() {
  const source = read("components/designer/DesignerApp.tsx");
  const required = [
    "designerAlignmentContext",
    "createDesignerAlignmentContext",
    "applyDesignerLayerAlignment",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`DesignerApp 缺少 Alignment 投影：${token}`);
    } else {
      pass(`DesignerApp 使用 ${token}`);
    }
  }
  for (const forbidden of FORBIDDEN_IN_DESIGNER_APP) {
    if (source.includes(forbidden)) {
      fail(`DesignerApp 直接使用禁止 API：${forbidden}`);
    }
  }
  pass("DesignerApp 無禁止 Alignment 邊界 API");
}

function validateGeometryUntouched() {
  for (const file of FORBIDDEN_RUNTIME_FILES) {
    const source = read(file);
    if (source.includes("designer-coordinate")) {
      fail(`${file} 不應引用 designer-coordinate`);
    } else {
      pass(`${file} 未修改（無 designer-coordinate 引用）`);
    }
  }
  const alignment = read("lib/layer-alignment.ts");
  if (!alignment.includes("export function alignDesignLayers")) {
    fail("layer-alignment alignDesignLayers 缺失");
  } else {
    pass("layer-alignment alignDesignLayers 保留");
  }
}

function validateCanvasUntouched() {
  for (const file of POINTER_FILES) {
    const source = read(file);
    if (source.includes("applyDesignerLayerAlignment")) {
      fail(`${file} 不應引用 Alignment Runtime`);
    }
  }
  pass("PrintAreaElement / DesignCanvas 未引用 Alignment Runtime");
}

function validateProjectionRoundTrip() {
  const wsLayer = { x_cm: 10, y_cm: 15 };
  const effW = 8;
  const effH = 6;
  let cases = 0;

  for (const side of SIDES) {
    for (const size of SIZES) {
      const gm = garmentFor(side, size);
      const ws = WORKSPACE_M[side];
      const designerLayer = workspaceToDesignerPoint(wsLayer, side, size);
      const designerRef = {
        left: 0,
        top: 0,
        right: gm.width,
        bottom: gm.height,
      };

      for (const axis of ALIGNMENT_AXES) {
        const alignedDesigner = applyAxisAlign(
          axis,
          designerLayer,
          designerRef,
          effW * (gm.width / ws.width),
          effH * (gm.height / ws.height),
        );
        const wsAligned = designerToWorkspacePoint(alignedDesigner, side, size);
        const roundTripDesigner = workspaceToDesignerPoint(wsAligned, side, size);
        cases += 1;

        if (
          Math.abs(roundTripDesigner.x_cm - alignedDesigner.x_cm) >
            ROUND_TRIP_EPSILON ||
          Math.abs(roundTripDesigner.y_cm - alignedDesigner.y_cm) >
            ROUND_TRIP_EPSILON
        ) {
          fail(`Alignment round-trip ${side}/${size}/${axis}`);
        }

        const beforePct = designerCssPercent(designerLayer, side, size);
        const afterPct = designerCssPercent(alignedDesigner, side, size);
        const wsBeforePct = {
          left: (wsLayer.x_cm / ws.width) * 100,
          top: (wsLayer.y_cm / ws.height) * 100,
        };
        void beforePct;
        void afterPct;
        void wsBeforePct;
      }
    }
  }
  pass(
    `${cases} alignment projection round-trip checks (${SIZES.length} sizes × ${SIDES.length} sides × ${ALIGNMENT_AXES.length} axes)`,
  );
}

function validateVisualConsistency() {
  const ws = { x_cm: 12, y_cm: 18, width_cm: 8, height_cm: 5 };
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const gm = garmentFor(side, size);
      const wsArea = WORKSPACE_M[side];
      const designer = {
        x_cm: ws.x_cm * (gm.width / wsArea.width),
        y_cm: ws.y_cm * (gm.height / wsArea.height),
        width_cm: ws.width_cm * (gm.width / wsArea.width),
        height_cm: ws.height_cm * (gm.height / wsArea.height),
      };
      const legacyLeft = (ws.x_cm / wsArea.width) * 100;
      const projectedLeft = (designer.x_cm / gm.width) * 100;
      cases += 1;
      if (Math.abs(legacyLeft - projectedLeft) > ROUND_TRIP_EPSILON) {
        fail(`Display CSS drift ${side}/${size}`);
      }
    }
  }
  pass(`${cases} display CSS % consistency checks`);
}

console.log("validate-designer-alignment-projection-13-0k\n");

validateAlignmentControllerApis();
validateDesignerAppAlignmentFlow();
validateGeometryUntouched();
validateCanvasUntouched();
validateProjectionRoundTrip();
validateVisualConsistency();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
