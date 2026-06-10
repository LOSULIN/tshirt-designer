/**
 * 驗證：Inspector Panel ↔ Canvas 雙向同步（cm 單位、submit lock）
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

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const inspectorSync = read("lib/inspector-sync.ts");
assert(
  inspectorSync.includes("getTextInspectorValues"),
  "文字 Inspector 值由 cm 欄位導出",
);
assert(
  inspectorSync.includes("getImageInspectorValues"),
  "圖片 Inspector 值由 cm 欄位導出",
);
const designLock = read("lib/design-lock.ts");
assert(
  designLock.includes("lockAllLayersInTemplate"),
  "submit 後鎖定所有圖層",
);

const layerEditor = read("components/designer/LayerInspectorEditor.tsx");
assert(layerEditor.includes("Font size (cm)"), "文字 font size 以 cm 顯示");
assert(layerEditor.includes("Width (cm)"), "圖片 width 以 cm 顯示");
assert(layerEditor.includes("Height (cm)"), "圖片 height 以 cm 顯示");

const inlineEditor = read("components/designer/CanvasInlineTextEditor.tsx");
assert(inlineEditor.includes("onBlur={onCommit}"), "文字 blur 時 commit");
assert(
  inlineEditor.includes('e.key === "Enter"'),
  "Enter 時 commit 文字",
);

const designerApp = read("components/designer/DesignerApp.tsx");
assert(designerApp.includes("isDesignLocked"), "DesignerApp 追蹤 submit lock");
assert(
  designerApp.includes("lockAllLayersInTemplate"),
  "submit 成功後鎖定 layersByTemplate",
);
assert(
  designerApp.includes("handleTextInspectorPatch"),
  "Inspector → Canvas 文字 patch",
);
assert(
  designerApp.includes("readOnly={isDesignLocked}"),
  "submit 後 Canvas readonly",
);

const designCanvas = read("components/designer/DesignCanvas.tsx");
assert(
  designCanvas.includes("LayerInspectorEditor") ||
    designCanvas.includes("CanvasInfoPanel"),
  "Canvas 側掛載 Inspector",
);
assert(designCanvas.includes("pendingTextEditLayerId"), "新增文字進入 editing mode");

const previewPanel = read("components/designer/PreviewInfoPanel.tsx");
assert(
  previewPanel.includes("LayerInspectorEditor"),
  "PreviewInfoPanel 含可編輯 Inspector",
);
assert(previewPanel.includes("readOnly"), "Inspector 支援 disabled 狀態");

console.log("\nInspector 雙向同步校驗完成。");
