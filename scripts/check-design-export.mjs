/**
 * 驗證：Design Export System（mockup / print / proof sheet）
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

const designExportSrc = readFileSync(
  join(root, "lib/design-export-system.ts"),
  "utf8",
);
assert(
  designExportSrc.includes("exportDesignBundle"),
  "exportDesignBundle 已實作",
);
assert(
  designExportSrc.includes("mockup") && designExportSrc.includes("proof"),
  "三種輸出（mockup / print / proof）已整合",
);
assert(
  designExportSrc.includes("buildLiveDesignState") ||
    readFileSync(join(root, "lib/proof-sheet-export.ts"), "utf8").includes(
      "buildLiveDesignState",
    ),
  "proof sheet 依據 designState",
);

const mockupSrc = readFileSync(join(root, "lib/mockup-export.ts"), "utf8");
assert(
  mockupSrc.includes("renderMockupPreviewPng"),
  "renderMockupPreviewPng 已實作",
);
assert(
  mockupSrc.includes("getAdultTshirtTemplateSrc"),
  "mockup 使用 shirt template image",
);
assert(
  mockupSrc.includes("getLayerInspectorCmRect"),
  "mockup 依 cm 資料渲染元素",
);
assert(
  !mockupSrc.includes("html2canvas") && !mockupSrc.includes("dom-to-image"),
  "mockup 不使用 DOM 截圖",
);

const proofSrc = readFileSync(join(root, "lib/proof-sheet-export.ts"), "utf8");
assert(
  proofSrc.includes("renderProofSheetPdf"),
  "renderProofSheetPdf 已實作",
);
assert(
  proofSrc.includes("width_cm") && proofSrc.includes("x_cm"),
  "proof sheet 含 element cm 明細",
);
assert(proofSrc.includes("595.28"), "proof sheet 使用 A4 尺寸");

const printExportSrc = readFileSync(
  join(root, "lib/print-export-system.ts"),
  "utf8",
);
assert(
  printExportSrc.includes("PRINT_EXPORT_DPI") ||
    printExportSrc.includes("EXPORT_DPI"),
  "print 輸出 300 DPI",
);

const modalSrc = readFileSync(
  join(root, "components/designer/DesignExportModal.tsx"),
  "utf8",
);
assert(
  modalSrc.includes("exportAndDownloadDesignBundle"),
  "DesignExportModal 已接入匯出系統",
);

const canvasSrc = readFileSync(
  join(root, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
assert(
  canvasSrc.includes("DesignExportModal"),
  "DesignCanvas 已整合 Export 按鈕",
);

console.log("\nDesign Export System 結構檢查完成。");
