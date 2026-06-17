/**
 * 驗證：Direct Manipulation 直接操作系統
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

const printAreaEl = readFileSync(
  join(root, "components/designer/PrintAreaElement.tsx"),
  "utf8",
);
assert(printAreaEl.includes("onResizeChange"), "四角 resize 回調");
assert(printAreaEl.includes("onDoubleClick"), "雙擊回調");
assert(printAreaEl.includes("onResizePointerDown"), "corner resize 拖曳");

const canvas = readFileSync(
  join(root, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
assert(canvas.includes("CanvasInlineTextEditor"), "畫布 inline 文字編輯");
assert(canvas.includes('e.key === "Delete"'), "鍵盤刪除");

const panel = readFileSync(
  join(root, "components/designer/DesignPanel.tsx"),
  "utf8",
);
assert(!panel.includes("縮放 ("), "DesignPanel 無縮放 slider");
assert(!panel.includes("旋轉 ("), "DesignPanel 無旋轉 slider");
assert(!panel.includes("TextLayerEditor"), "DesignPanel 無文字編輯器");

const toolbar = readFileSync(
  join(root, "components/designer/DesignToolbar.tsx"),
  "utf8",
);
assert(!toolbar.includes("TextLayerEditor"), "DesignToolbar 無文字編輯器");

console.log("\nDirect Manipulation 檢查完成。");
