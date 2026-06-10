/**
 * 驗證：工廠級 Proof PDF Template（A4 · 4~5 pages）
 */

import { existsSync, readFileSync } from "node:fs";
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
  templateSrc.includes("ZIIIGO PROOF"),
  "PAGE 1: ZIIIGO Proof Overview",
);
assert(
  !templateSrc.includes("CUSTOMER"),
  "Proof PDF 不含 CUSTOMER 個資區塊",
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
assert(
  templateSrc.includes("embedPdfCjkFonts"),
  "使用 CJK 字型（非 WinAnsi StandardFonts）",
);

const pdfFontsSrc = readFileSync(join(root, "lib/pdf-fonts.ts"), "utf8");
assert(
  pdfFontsSrc.includes("noto-sans-tc") && pdfFontsSrc.includes("pdf-fontkit"),
  "pdf-fonts 使用 pdf-fontkit（CJK subset 修正）",
);
assert(
  existsSync(join(root, "public/fonts/noto-sans-tc-400.woff")),
  "public/fonts 含 Noto Sans TC 400（執行 npm run postinstall）",
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
