/**
 * 驗證：Live Design State 單一資料來源
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const require = createRequire(import.meta.url);

function assert(condition, message) {
  if (!condition) {
    console.error("✗", message);
    process.exitCode = 1;
    return;
  }
  console.log("✓", message);
}

const liveStateSrc = readFileSync(
  join(root, "lib/live-design-state.ts"),
  "utf8",
);
assert(
  liveStateSrc.includes("export interface LiveDesignState"),
  "LiveDesignState 型別已匯出",
);
assert(
  liveStateSrc.includes("buildLiveDesignState"),
  "buildLiveDesignState 已實作",
);
assert(
  liveStateSrc.includes("chestWidth"),
  "garment.chestWidth 欄位存在",
);
assert(
  liveStateSrc.includes("exceedsPrintArea"),
  "元素 exceedsPrintArea 即時欄位存在",
);

const contextSrc = readFileSync(
  join(root, "components/designer/LiveDesignStateContext.tsx"),
  "utf8",
);
assert(
  contextSrc.includes("LiveDesignStateProvider"),
  "LiveDesignStateProvider 已建立",
);
assert(
  contextSrc.includes("useLiveDesignState"),
  "useLiveDesignState hook 已建立",
);

const infoPanelSrc = readFileSync(
  join(root, "components/designer/PreviewInfoPanel.tsx"),
  "utf8",
);
assert(
  infoPanelSrc.includes("Garment Info"),
  "Preview Info Panel Garment Info 已建立",
);
assert(
  infoPanelSrc.includes("ElementInspectorCard"),
  "Preview Info Panel 每元素獨立卡片已建立",
);
assert(
  infoPanelSrc.includes("Size (cm)"),
  "Preview Info Panel 顯示每元素 Size (cm)",
);
assert(
  infoPanelSrc.includes("Position (cm)"),
  "Preview Info Panel 顯示每元素 Position (cm)",
);
assert(
  !infoPanelSrc.includes("Selected Element"),
  "Preview Info Panel 不再僅顯示選取元素",
);
assert(
  liveStateSrc.includes("getElementStatusLabel"),
  "每元素獨立 status 標籤函式已建立",
);
assert(
  liveStateSrc.includes("index:"),
  "每元素 index 欄位存在",
);
assert(
  liveStateSrc.includes("zIndex: number"),
  "每元素 zIndex 欄位存在",
);
assert(
  liveStateSrc.includes("isSelected: boolean"),
  "每元素 isSelected 欄位存在",
);

const layerPanelSrc = readFileSync(
  join(root, "components/designer/LayerPanel.tsx"),
  "utf8",
);
assert(
  layerPanelSrc.includes("useLiveDesignState"),
  "LayerPanel 已接入 live design state",
);

const designCanvasSrc = readFileSync(
  join(root, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
assert(
  !designCanvasSrc.includes("LiveInspectorOverlay"),
  "DesignCanvas 不顯示 cm 數據 overlay",
);
assert(
  readFileSync(join(root, "components/designer/CanvasInfoPanel.tsx"), "utf8").includes(
    "PreviewInfoPanel",
  ),
  "CanvasInfoPanel 已建立",
);
assert(
  designCanvasSrc.includes("CanvasInfoPanel"),
  "DesignCanvas 已整合 Info Panel 於畫布旁",
);
assert(
  !readFileSync(
    join(root, "components/designer/ClothingBrowsePanel.tsx"),
    "utf8",
  ).includes("PreviewInfoPanel"),
  "ClothingBrowsePanel 僅保留視覺預覽",
);
assert(
  !readFileSync(join(root, "components/designer/ProductPanel.tsx"), "utf8").includes(
    "PreviewInfoPanel",
  ),
  "ProductPanel 不重複顯示數據",
);

console.log("\nLive Design State 結構檢查完成。");
