/**
 * 驗證：工廠校稿 PDF（每面一頁 · Mockup + 印刷資訊）
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
  templateSrc.includes("drawSideProofPage"),
  "每面一頁校稿版面",
);
assert(
  templateSrc.includes("getProductName"),
  "標題含商品名稱",
);
assert(
  templateSrc.includes("computePdfMockupPlacement"),
  "Mockup 使用 Designer 固定像素比例放置",
);
assert(
  templateSrc.includes("logPdfMockupPlacementDebug"),
  "PDF Mockup 匯出前除錯資訊",
);
assert(
  !templateSrc.includes("drawClippedMockupImage") &&
    templateSrc.includes("drawMockupImage"),
  "PDF Mockup 完整繪製、不 clip 裁切",
);

const layoutSrc = readFileSync(
  join(root, "lib/proof-engine/generators/pdf-mockup-layout.ts"),
  "utf8",
);
assert(
  layoutSrc.includes("MOCKUP_FLAT_CONTAINER") &&
    layoutSrc.includes("MOCKUP_EXPORT_SCALE") &&
    layoutSrc.includes('fitMode: "contain"') &&
    layoutSrc.includes("Math.min(scaleX, scaleY)"),
  "pdf-mockup-layout 使用 contain 完整顯示 Mockup PNG",
);
assert(
  templateSrc.includes("drawPrintInfoSection"),
  "含印刷資訊區",
);
assert(
  templateSrc.includes("getGarmentMaxPrintAreaCm"),
  "印刷尺寸依面別藍框（35×50 / 38×45）",
);
assert(
  templateSrc.includes("getPrintAreaOffsetCm"),
  "含領口距離",
);
assert(
  templateSrc.includes("buildLiveDesignState"),
  "物件尺寸來自 Designer cm 資料",
);
assert(
  !templateSrc.includes("PRINT ARTWORK"),
  "不含單獨 PRINT ARTWORK 頁",
);
assert(
  !templateSrc.includes("drawPrintArtworkPage"),
  "不含印刷圖稿獨立頁",
);
assert(
  !templateSrc.includes("ARTWORK VALIDATION"),
  "不含舊版 Validation 頁",
);
assert(
  !templateSrc.includes("PRODUCTION NOTES"),
  "不含舊版 Production Notes 頁",
);
assert(
  !templateSrc.includes("CUSTOMER"),
  "Proof PDF 不含 CUSTOMER 個資區塊",
);
assert(
  templateSrc.includes("FRONT") && templateSrc.includes("BACK"),
  "支援正面 / 背面標題",
);
assert(
  !templateSrc.includes("html2canvas") && !templateSrc.includes("screenshot"),
  "不使用 UI 截圖",
);
assert(
  templateSrc.includes("embedPdfCjkFonts"),
  "使用 CJK 字型",
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
assert(
  !wrapperSrc.includes("printImages"),
  "校稿 PDF 不嵌入單獨 print artwork",
);

console.log("\nFactory Proof PDF Template 結構檢查完成。");
