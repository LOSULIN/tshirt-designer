/**
 * 驗證：MVP Layer System 擴充
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    console.error("✗", message);
    process.exitCode = 1;
    return;
  }
  console.log("✓", message);
}

const layerSystemSrc = readFileSync(
  join(root, "lib/layer-system.ts"),
  "utf8",
);
assert(
  layerSystemSrc.includes("getMvpLayerListItems"),
  "getMvpLayerListItems 已實作",
);
assert(
  layerSystemSrc.includes("getLayersForCanvasRender"),
  "getLayersForCanvasRender 已實作",
);
assert(
  layerSystemSrc.includes("sortLayersByZIndex"),
  "Canvas render 依 zIndex 排序",
);

const liveStateSrc = readFileSync(
  join(root, "lib/live-design-state.ts"),
  "utf8",
);
assert(liveStateSrc.includes("zIndex: number"), "elements 含 zIndex 欄位");
assert(liveStateSrc.includes("isSelected: boolean"), "elements 含 isSelected 欄位");

const mvpListSrc = readFileSync(
  join(root, "components/designer/MvpLayerList.tsx"),
  "utf8",
);
assert(mvpListSrc.includes("Layer List"), "MvpLayerList UI 已建立");
assert(mvpListSrc.includes("zIndex:"), "Layer List 顯示 zIndex");

const canvasInfoSrc = readFileSync(
  join(root, "components/designer/CanvasInfoPanel.tsx"),
  "utf8",
);
assert(
  canvasInfoSrc.includes("MvpLayerList"),
  "CanvasInfoPanel 整合 Layer List",
);

const designCanvasSrc = readFileSync(
  join(root, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
assert(
  designCanvasSrc.includes("getLayersForCanvasRender"),
  "DesignCanvas 使用 layer-system render 排序",
);
assert(
  designCanvasSrc.includes("onClearSelection"),
  "點擊空白可取消選取",
);
assert(
  designCanvasSrc.includes("ring-blue-400") ||
    designCanvasSrc.includes("isActive"),
  "選取元素 highlight（透過 PrintAreaElement）",
);

const printAreaElSrc = readFileSync(
  join(root, "components/designer/PrintAreaElement.tsx"),
  "utf8",
);
assert(
  printAreaElSrc.includes("ring-2 ring-blue-400"),
  "選取元素顯示 highlight border",
);

console.log("\nMVP Layer System 結構檢查完成。");
