/**
 * 驗證：工廠級 Proof PDF Template（A4 · 4~5 pages）
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

const templateSrc = readFileSync(
  join(root, "lib/proof-engine/generators/factory-proof-pdf-template.ts"),
  "utf8",
);

assert(
  templateSrc.includes("generateFactoryProofPdf"),
  "generateFactoryProofPdf 已實作",
);
assert(
  templateSrc.includes("ORDER OVERVIEW"),
  "PAGE 1: Order Overview",
);
assert(
  templateSrc.includes("PRINT AREA") &&
    templateSrc.includes("drawPrintAreaBoundingBox"),
  "Mockup page 含 print area bounding box",
);
assert(
  templateSrc.includes("FRONT") && templateSrc.includes("BACK"),
  "Front / Back mockup labels",
);
assert(
  templateSrc.includes("PRINT TECHNICAL SHEET"),
  "PAGE 4: Print Technical Sheet",
);
assert(
  templateSrc.includes("FROM NECKLINE") && templateSrc.includes("W (cm)"),
  "Technical sheet 含 neckline 與 element cm 欄位",
);
assert(
  templateSrc.includes("PRODUCTION NOTES"),
  "PAGE 5: Production Notes",
);
assert(
  templateSrc.includes("FACTORY_PROOF_DPI") &&
    templateSrc.includes("FACTORY_PROOF_TOLERANCE_CM"),
  "Notes 含 DPI 300 與 tolerance",
);
assert(
  templateSrc.includes("buildLiveDesignState"),
  "PDF 依據 designState（cm 標準）",
);
assert(
  !templateSrc.includes("html2canvas") && !templateSrc.includes("screenshot"),
  "不使用 UI 截圖",
);

const wrapperSrc = readFileSync(
  join(root, "lib/proof-engine/generators/proof-pdf-generator.ts"),
  "utf8",
);
assert(
  wrapperSrc.includes("generateFactoryProofPdf"),
  "proof-pdf-generator 委派 factory template",
);

console.log("\nFactory Proof PDF Template 結構檢查完成。");
