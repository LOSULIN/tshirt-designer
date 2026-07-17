/**
 * 驗證：工廠校稿 PDF（Factory Proof Layout v2）
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
  templateSrc.includes("getProductDisplayName"),
  "標題含商品名稱",
);
assert(
  templateSrc.includes("resolveDesignerPreviewLayout") &&
    templateSrc.includes("mapDesignerLayoutToPdf") &&
    templateSrc.includes("drawDesignerPreviewMockup"),
  "PDF Mockup 使用 Designer Layout Source（非 mockup PNG 重定位）",
);
assert(
  templateSrc.includes("loadShirtTemplateBytes") &&
    templateSrc.includes("getAdultTshirtTemplateSrc"),
  "PDF 衣服使用 Designer 同款模板 PNG",
);
assert(
  !templateSrc.includes("computeDesignerAlignedPdfMockupPlacement") &&
    !templateSrc.includes("computePdfMockupPlacement("),
  "PDF 不再使用獨立 mockup 放置演算法",
);

const designerLayoutSrc = readFileSync(
  join(root, "lib/proof-engine/designer-layout.ts"),
  "utf8",
);
assert(
  designerLayoutSrc.includes("getDesignerFactoryOverlayTemplatePx") &&
    designerLayoutSrc.includes("getPreviewGarmentVisualScale") &&
    designerLayoutSrc.includes("getDesignerMockupVisualOffsetPx") &&
    designerLayoutSrc.includes("getCollarAnchorYPx"),
  "designer-layout 與 PreviewGarmentView 共用定位來源",
);
assert(
  designerLayoutSrc.includes("PDF_COLLAR_ANCHOR_VISUAL_OFFSET_PX_BY_SIDE") &&
    designerLayoutSrc.includes("getPdfCollarAnchorVisualOffsetPx") &&
    designerLayoutSrc.includes("resolvePdfCollarBottomPx"),
  "designer-layout 含 PDF 領口定位線視覺校正（可擴充款式）",
);
assert(
  designerLayoutSrc.includes("front: 0") &&
    designerLayoutSrc.includes("BACK_COLLAR_VISUAL_COMPENSATION_PX"),
  "Back 領口校正與背面羅紋補償常數對偶、Front 不變",
);
assert(
  !templateSrc.includes("drawMockupImage") ||
    templateSrc.includes("drawDesignerPreviewMockup"),
  "PDF 改為分層渲染（shirt + artwork）",
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
  templateSrc.includes("drawLeftInfoPanel"),
  "左側印刷資訊欄",
);
assert(
  templateSrc.includes("drawMockupAnnotations") &&
    templateSrc.includes("drawCollarOffsetGuide"),
  "Mockup 僅保留印刷區虛線與領口定位提示",
);
assert(
  templateSrc.includes("drawFactoryProofInfoCard"),
  "右下角 Factory Proof 資訊卡",
);
assert(
  templateSrc.includes("drawPageFooter"),
  "頁尾訂單／注意事項",
);
assert(
  !templateSrc.includes("drawPrintInfoSection"),
  "舊版底部印刷資訊區已移除",
);
assert(
  templateSrc.includes("getPrintAreaOffsetCm"),
  "使用固定領口 offset（與 Designer 一致）",
);
assert(
  templateSrc.includes("buildPdfArtworkPositionPresentation"),
  "Artwork 尺寸來自 design-inspector（僅資訊卡）",
);
assert(
  !templateSrc.includes("PRINT AREA"),
  "Mockup 上不顯示 PRINT AREA 尺寸文字",
);
assert(
  !templateSrc.includes("drawArtworkMeasurementAnnotations"),
  "已移除工程尺寸線（左右距離、中心尺寸）",
);
assert(
  !templateSrc.includes("← ") && !templateSrc.includes(" cm →"),
  "不含左右箭頭尺寸標示",
);
assert(
  templateSrc.includes("印刷定位基準") &&
    templateSrc.includes("領口下緣起算") &&
    templateSrc.includes("後領下緣起算"),
  "含工廠校稿定位標籤（正面／背面）",
);
assert(
  templateSrc.includes("Collar Bottom +") &&
    templateSrc.includes("Back Collar Bottom +") &&
    !templateSrc.includes("Collar Offset"),
  "資訊卡使用工廠 Position 用語、無 Collar Offset",
);
assert(
  !templateSrc.includes("arrowSize") &&
    !templateSrc.includes("印刷起始位置"),
  "不含箭頭與工程起始位置標示",
);
assert(
  templateSrc.includes("guideGray") &&
    templateSrc.includes("FACTORY_POSITION_BADGE"),
  "定位線採細灰線 + 黃色標籤",
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
  !templateSrc.includes("客戶確認") &&
    !templateSrc.includes("簽名"),
  "Proof PDF 不含客戶確認簽名區",
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
  wrapperSrc.includes("printImages"),
  "proof-pdf-generator 傳入 print 檔案資訊",
);
assert(
  !wrapperSrc.includes("printArtwork") &&
    !templateSrc.includes("PRINT ARTWORK"),
  "校稿 PDF 不嵌入單獨 print artwork 頁",
);

assert(
  !existsSync(join(root, "lib/proof-engine/pdf-visual-calibration.ts")),
  "Phase 31-2B 整體 Render Calibration 已移除",
);
assert(
  !existsSync(join(root, "lib/proof-engine/pdf-shirt-visual-calibration.ts")),
  "Phase 31-2C Shirt 視覺校正已移除",
);
assert(
  !existsSync(join(root, "lib/proof-engine/pdf-guide-visual-calibration.ts")),
  "Phase 31-2D Guide 視覺校正已移除",
);
assert(
  !existsSync(join(root, "lib/proof-engine/pdf-visual-collar-reference.ts")),
  "Phase 31-3 Visual Collar Reference 已移除",
);
assert(
  !existsSync(join(root, "lib/proof-engine/pdf-shirt-presentation.ts")),
  "Phase 31-4 Shirt Presentation 已移除",
);
assert(
  !templateSrc.includes("resolvePdfVisualCollarGuideYPt") &&
    !templateSrc.includes("resolvePdfShirtPresentationDrawRect") &&
    !templateSrc.includes("resolvePdfGuideVisualY") &&
    !templateSrc.includes("resolvePdfShirtDrawY") &&
    !templateSrc.includes("applyPdfVisualCalibrationToRender"),
  "Factory Proof 無 Presentation / Calibration Runtime",
);
assert(
  templateSrc.includes("y: render.shirt.y") &&
    templateSrc.includes("render.collarCenterPt.y"),
  "Shirt / Guide 使用 Designer Layout 原始座標（Phase 31-2A）",
);
assert(
  templateSrc.includes("x: render.printAreaLeftPt") &&
    templateSrc.includes("y: render.printAreaBottomPt"),
  "Artwork drawImage 使用 Designer Layout 原始座標",
);

console.log("\nFactory Proof PDF Template 結構檢查完成。");
