/**
 * Factory Proof PDF — 工廠打樣確認稿
 * 每面一頁：左側印刷資訊 + 右側完整 T-shirt Mockup（含印刷區標示）
 */

import type { RGB } from "pdf-lib";
import type { Side } from "../../constants";
import { getProductName, resolveMaterialLabelFromDesignMeta } from "../../constants";
import { getDesignerPrintAreaCmBounds } from "../../design-cm";
import { formatInspectorCm } from "../../design-inspector";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import { getExportCanvasSpec } from "../../export-coordinates";
import { getGarmentMaxPrintAreaCm } from "../../garment-print-config";
import {
  buildLiveDesignState,
  type LiveDesignStateElement,
} from "../../live-design-state";
import { getPrintAreaOffsetCm } from "../../coordinates/print-area-offset";
import { embedPdfCjkFonts } from "../../pdf-fonts";
import { getShirtColorName } from "../../shirt-template";
import type { ProofOrder } from "../types";
import {
  computePdfMockupPlacement,
  logPdfMockupPlacementDebug,
  type PdfMockupContentAreaPt,
  type PdfMockupPlacement,
} from "./pdf-mockup-layout";

export const FACTORY_PROOF_A4_WIDTH_PT = 595.28;
export const FACTORY_PROOF_A4_HEIGHT_PT = 841.89;
export const FACTORY_PROOF_DPI = 300;
export const FACTORY_PROOF_TOLERANCE_CM = 0.3;

const MARGIN = 32;
const PAGE_HEADER_H = 56;
const FOOTER_H = 78;
const LEFT_PANEL_W = 172;
const PANEL_GUTTER = 14;

export interface FactoryProofPdfInput {
  order: ProofOrder;
  version: number;
  mockupImages?: Partial<Record<Side, Uint8Array | Buffer>>;
  printImages?: Partial<Record<Side, Uint8Array | Buffer>>;
}

interface PdfFonts {
  regular: import("pdf-lib").PDFFont;
  bold: import("pdf-lib").PDFFont;
}

interface PageContext {
  page: import("pdf-lib").PDFPage;
  pageIndex: number;
  totalPages: number;
  fonts: PdfFonts;
  black: RGB;
  gray: RGB;
  accent: RGB;
  border: RGB;
  printBlue: RGB;
  white: RGB;
}

const SIDE_PRINT_LABEL: Record<Side, string> = {
  front: "正面大圖",
  back: "背面大圖",
};

const SIDE_TITLE: Record<Side, string> = {
  front: "FRONT",
  back: "BACK",
};

const SIDE_DESIGN_FILE: Record<Side, string> = {
  front: "front_design.png",
  back: "back_design.png",
};

const COLLAR_LABEL: Record<Side, string> = {
  front: "距離領口",
  back: "距離後領",
};

const FACTORY_NOTES = [
  "螢幕顯示與實際印刷可能因布料、光線略有差異。",
  "彈性布料印刷後可能產生些微位移。",
  "請以本稿標示之 cm 尺寸為準。",
];

function toPngBuffer(bytes: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getContentVerticalBounds() {
  const top = FACTORY_PROOF_A4_HEIGHT_PT - MARGIN - PAGE_HEADER_H - 6;
  const bottom = FOOTER_H + MARGIN;
  return { top, bottom, height: top - bottom };
}

function getLeftPanelX(): number {
  return MARGIN;
}

function getRightPanelMockupArea(): PdfMockupContentAreaPt {
  const rightX = MARGIN + LEFT_PANEL_W + PANEL_GUTTER;
  const { bottom, height } = getContentVerticalBounds();
  const maxW = FACTORY_PROOF_A4_WIDTH_PT - MARGIN - rightX;
  return {
    originX: rightX,
    originY: bottom,
    maxWidthPt: maxW,
    maxHeightPt: height,
  };
}

function drawLabelValue(
  ctx: PageContext,
  x: number,
  y: number,
  label: string,
  value: string,
  maxWidth: number,
  valueColor?: RGB,
): number {
  const { page, fonts, black, gray } = ctx;
  page.drawText(label, {
    x,
    y,
    size: 7.5,
    font: fonts.bold,
    color: gray,
  });
  page.drawText(value, {
    x,
    y: y - 12,
    size: 9,
    font: fonts.regular,
    color: valueColor ?? black,
    maxWidth,
  });
  return y - 26;
}

function resolvePositionLabel(
  elements: LiveDesignStateElement[],
  side: Side,
  size: string,
): string {
  if (elements.length === 0) return "—";
  const printArea = getDesignerPrintAreaCmBounds(side, size);
  const primary = [...elements].sort(
    (a, b) => b.width_cm * b.height_cm - a.width_cm * a.height_cm,
  )[0]!;
  const cx = primary.x_cm + primary.width_cm / 2;
  const cy = primary.y_cm + primary.height_cm / 2;
  const tolX = printArea.width * 0.12;
  const tolY = printArea.height * 0.12;
  const hCenter = Math.abs(cx - printArea.width / 2) <= tolX;
  const vUpper = cy < printArea.height * 0.38;
  const hLeft = cx < printArea.width * 0.38;

  if (hCenter && Math.abs(cy - printArea.height / 2) <= tolY) return "Center";
  if (hLeft && vUpper) return "Left Chest";
  if (!hLeft && vUpper) return "Right Chest";
  if (hCenter && cy < printArea.height / 2) return "Upper Center";
  if (hCenter) return "Center";
  return "Custom";
}

function drawPageHeader(ctx: PageContext, side: Side) {
  const { page, fonts, black, gray, accent, border, white } = ctx;
  const top = FACTORY_PROOF_A4_HEIGHT_PT - MARGIN;
  const headerBottom = top - PAGE_HEADER_H;

  page.drawLine({
    start: { x: MARGIN, y: headerBottom },
    end: { x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN, y: headerBottom },
    thickness: 0.75,
    color: border,
  });

  page.drawText("TIIIGO", {
    x: MARGIN,
    y: top - 18,
    size: 14,
    font: fonts.bold,
    color: accent,
  });

  page.drawText(getProductName(), {
    x: MARGIN,
    y: top - 34,
    size: 9,
    font: fonts.regular,
    color: black,
    maxWidth: FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2 - 100,
  });

  const badgeW = 72;
  const badgeH = 28;
  const badgeX = FACTORY_PROOF_A4_WIDTH_PT - MARGIN - badgeW;
  const badgeY = top - 20 - badgeH;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: accent,
    borderWidth: 0,
  });

  const sideTitleW = fonts.bold.widthOfTextAtSize(SIDE_TITLE[side], 14);
  page.drawText(SIDE_TITLE[side], {
    x: badgeX + (badgeW - sideTitleW) / 2,
    y: badgeY + 8,
    size: 14,
    font: fonts.bold,
    color: white,
  });

  const pageLabel = `Page ${ctx.pageIndex} of ${ctx.totalPages}`;
  const pageLabelW = fonts.regular.widthOfTextAtSize(pageLabel, 8);
  page.drawText(pageLabel, {
    x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN - pageLabelW,
    y: badgeY - 12,
    size: 8,
    font: fonts.regular,
    color: gray,
  });
}

function drawLeftInfoPanel(
  ctx: PageContext,
  order: ProofOrder,
  side: Side,
  elements: LiveDesignStateElement[],
  printBytes: Uint8Array | Buffer | undefined,
) {
  const { page, fonts, black, gray, accent, border } = ctx;
  const x = getLeftPanelX();
  const { top, bottom } = getContentVerticalBounds();
  const panelMaxW = LEFT_PANEL_W;
  let y = top - 8;

  page.drawLine({
    start: { x: x + panelMaxW + PANEL_GUTTER / 2, y: bottom },
    end: { x: x + panelMaxW + PANEL_GUTTER / 2, y: top },
    thickness: 0.5,
    color: border,
  });

  page.drawText("印刷資訊", {
    x,
    y,
    size: 11,
    font: fonts.bold,
    color: black,
  });
  y -= 20;

  const printArea = getGarmentMaxPrintAreaCm(side);
  const printSpec = getExportCanvasSpec(side, order.size);

  y = drawLabelValue(ctx, x, y, "品牌", "TIIIGO", panelMaxW, accent);
  y = drawLabelValue(ctx, x, y, "商品", getProductName(), panelMaxW);
  y = drawLabelValue(
    ctx,
    x,
    y,
    "印刷位置",
    SIDE_PRINT_LABEL[side],
    panelMaxW,
  );
  y = drawLabelValue(
    ctx,
    x,
    y,
    "印刷尺寸",
    `${formatInspectorCm(printArea.widthCm, 0)} × ${formatInspectorCm(printArea.heightCm, 0)} cm`,
    panelMaxW,
    accent,
  );
  y = drawLabelValue(
    ctx,
    x,
    y,
    "位置",
    resolvePositionLabel(elements, side, order.size),
    panelMaxW,
  );
  y = drawLabelValue(
    ctx,
    x,
    y,
    COLLAR_LABEL[side],
    `${formatInspectorCm(getPrintAreaOffsetCm(side), 0)} cm`,
    panelMaxW,
    accent,
  );
  y = drawLabelValue(ctx, x, y, "解析度", `${FACTORY_PROOF_DPI} DPI`, panelMaxW);
  y = drawLabelValue(ctx, x, y, "印刷方式", "DTG（直噴印刷）", panelMaxW);
  y = drawLabelValue(ctx, x, y, "色彩模式", "RGB", panelMaxW);
  y = drawLabelValue(ctx, x, y, "檔案格式", "PNG", panelMaxW);

  y -= 8;
  page.drawLine({
    start: { x, y },
    end: { x: x + panelMaxW, y },
    thickness: 0.5,
    color: border,
  });
  y -= 16;

  page.drawText("設計檔案資訊", {
    x,
    y,
    size: 10,
    font: fonts.bold,
    color: black,
  });
  y -= 18;

  y = drawLabelValue(
    ctx,
    x,
    y,
    "檔案名稱",
    SIDE_DESIGN_FILE[side],
    panelMaxW,
  );
  y = drawLabelValue(
    ctx,
    x,
    y,
    "尺寸",
    `${printSpec.widthPx} × ${printSpec.heightPx} px`,
    panelMaxW,
    accent,
  );

  const fileSize = printBytes?.length ?? 0;
  y = drawLabelValue(
    ctx,
    x,
    y,
    "檔案大小",
    fileSize > 0 ? formatFileSize(fileSize) : "—",
    panelMaxW,
  );

  y = drawLabelValue(
    ctx,
    x,
    y,
    "衣服顏色",
    getShirtColorName(order.shirt_color),
    panelMaxW,
  );
  y = drawLabelValue(ctx, x, y, "尺碼", order.size, panelMaxW);
  y = drawLabelValue(
    ctx,
    x,
    y,
    "材質 / 克重",
    resolveMaterialLabelFromDesignMeta(order.design_meta),
    panelMaxW,
  );

  if (elements.length > 0) {
    y -= 6;
    page.drawText("設計物件", {
      x,
      y,
      size: 9,
      font: fonts.bold,
      color: accent,
    });
    y -= 14;
    for (const el of elements.slice(0, 3)) {
      const line = `${el.index}. ${el.width_cm.toFixed(1)}×${el.height_cm.toFixed(1)} cm`;
      page.drawText(line, {
        x,
        y,
        size: 7.5,
        font: fonts.regular,
        color: gray,
        maxWidth: panelMaxW,
      });
      y -= 11;
    }
  }
}

async function drawDashedRect(
  page: import("pdf-lib").PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGB,
  lineWidth = 1,
) {
  const {
    setDashPattern,
    setLineWidth,
    setStrokingRgbColor,
    moveTo,
    lineTo,
    stroke,
    pushGraphicsState,
    popGraphicsState,
    restoreDashPattern,
  } = await import("pdf-lib");

  const right = x + width;
  const top = y + height;

  page.pushOperators(
    pushGraphicsState(),
    setLineWidth(lineWidth),
    setStrokingRgbColor(color.red, color.green, color.blue),
    setDashPattern([4, 3], 0),
    moveTo(x, y),
    lineTo(right, y),
    lineTo(right, top),
    lineTo(x, top),
    lineTo(x, y),
    stroke(),
    restoreDashPattern(),
    popGraphicsState(),
  );
}

function drawMockupImage(
  page: import("pdf-lib").PDFPage,
  image: import("pdf-lib").PDFImage,
  placement: PdfMockupPlacement,
) {
  page.drawImage(image, {
    x: placement.x,
    y: placement.y,
    width: placement.drawWidthPt,
    height: placement.drawHeightPt,
  });
}

async function drawMockupAnnotations(
  ctx: PageContext,
  side: Side,
  placement: PdfMockupPlacement,
) {
  const { page, fonts, accent, printBlue } = ctx;
  const {
    printAreaLeftPt,
    printAreaBottomPt,
    printAreaRenderWidthPt,
    printAreaRenderHeightPt,
    printAreaTopPt,
    printAreaWidthCm,
    printAreaHeightCm,
    collarCenterPt,
    x,
    drawWidthPt,
  } = placement;

  await drawDashedRect(
    page,
    printAreaLeftPt,
    printAreaBottomPt,
    printAreaRenderWidthPt,
    printAreaRenderHeightPt,
    printBlue,
    1.2,
  );

  const areaLabel = `PRINT AREA  ${formatInspectorCm(printAreaWidthCm, 0)} × ${formatInspectorCm(printAreaHeightCm, 0)} cm`;
  const labelSize = 8;
  const labelW = fonts.bold.widthOfTextAtSize(areaLabel, labelSize);
  const labelX = printAreaLeftPt + (printAreaRenderWidthPt - labelW) / 2;
  const labelY = printAreaTopPt + 6;

  page.drawText(areaLabel, {
    x: labelX,
    y: labelY,
    size: labelSize,
    font: fonts.bold,
    color: accent,
  });

  const offsetCm = getPrintAreaOffsetCm(side);
  const dimX = x + drawWidthPt + 10;
  const dimTop = collarCenterPt.y;
  const dimBottom = printAreaTopPt;

  if (dimTop > dimBottom + 8) {
    page.drawLine({
      start: { x: dimX, y: dimBottom },
      end: { x: dimX, y: dimTop },
      thickness: 0.75,
      color: accent,
    });
    page.drawLine({
      start: { x: dimX - 4, y: dimBottom },
      end: { x: dimX + 4, y: dimBottom },
      thickness: 0.75,
      color: accent,
    });
    page.drawLine({
      start: { x: dimX - 4, y: dimTop },
      end: { x: dimX + 4, y: dimTop },
      thickness: 0.75,
      color: accent,
    });

    const offsetLabel = `${formatInspectorCm(offsetCm, 0)} cm`;
    const offsetLabelW = fonts.regular.widthOfTextAtSize(offsetLabel, 8);
    page.drawText(offsetLabel, {
      x: dimX + 6,
      y: (dimTop + dimBottom) / 2 - 4,
      size: 8,
      font: fonts.regular,
      color: accent,
    });

    void offsetLabelW;
  }
}

function drawPageFooter(ctx: PageContext, order: ProofOrder, version: number) {
  const { page, fonts, black, gray, border } = ctx;
  const footerTop = FOOTER_H + MARGIN - 4;
  const y0 = footerTop;

  page.drawLine({
    start: { x: MARGIN, y: y0 },
    end: { x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN, y: y0 },
    thickness: 0.75,
    color: border,
  });

  const colW = (FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2) / 3;
  const cols = [MARGIN, MARGIN + colW, MARGIN + colW * 2];
  const caseNo = order.submission_no ?? order.order_id;
  const dateStr = (order.created_at ?? new Date().toISOString()).slice(0, 10);
  const notes = order.applicant?.notes?.trim();

  const sections = [
    {
      title: "訂單資訊",
      lines: [
        `訂單編號：${caseNo}`,
        `日期：${dateStr}`,
        notes ? `客戶備註：${notes.slice(0, 40)}` : "客戶備註：—",
      ],
    },
    {
      title: "衣服資訊",
      lines: [
        `商品：${getProductName()}`,
        `顏色：${getShirtColorName(order.shirt_color)}`,
        `尺碼：${order.size}`,
        `材質 / 克重：${resolveMaterialLabelFromDesignMeta(order.design_meta)}`,
      ],
    },
    {
      title: "注意事項",
      lines: FACTORY_NOTES,
    },
  ];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i]!;
    const x = cols[i]!;
    let y = y0 - 14;
    page.drawText(sec.title, {
      x,
      y,
      size: 8,
      font: fonts.bold,
      color: black,
    });
    y -= 12;
    for (const line of sec.lines) {
      page.drawText(line, {
        x,
        y,
        size: 7,
        font: fonts.regular,
        color: gray,
        maxWidth: colW - 8,
      });
      y -= 10;
    }
  }

  const meta = `TIIIGO Factory Proof  ·  v${version}`;
  const metaW = fonts.regular.widthOfTextAtSize(meta, 7);
  page.drawText(meta, {
    x: (FACTORY_PROOF_A4_WIDTH_PT - metaW) / 2,
    y: 10,
    size: 7,
    font: fonts.regular,
    color: gray,
  });
}

async function drawSideProofPage(
  doc: Awaited<ReturnType<typeof import("pdf-lib")["PDFDocument"]["create"]>>,
  ctx: PageContext,
  order: ProofOrder,
  side: Side,
  version: number,
  mockupBytes: Uint8Array | Buffer | undefined,
  printBytes: Uint8Array | Buffer | undefined,
) {
  drawPageHeader(ctx, side);

  const sideLayers = getLayersForSlot(
    order.layers_by_template,
    order.gender,
    side,
  );
  const sideState = buildLiveDesignState(sideLayers, order.size, side);

  drawLeftInfoPanel(ctx, order, side, sideState.elements, printBytes);

  const contentArea = getRightPanelMockupArea();

  if (mockupBytes && mockupBytes.length > 0) {
    const pngBytes = toPngBuffer(mockupBytes);
    const image = await doc.embedPng(pngBytes);
    const placement = computePdfMockupPlacement(side, contentArea, {
      width: image.width,
      height: image.height,
    }, order.size);
    logPdfMockupPlacementDebug(side, placement);
    drawMockupImage(ctx.page, image, placement);
    await drawMockupAnnotations(ctx, side, placement);
  } else {
    const placement = computePdfMockupPlacement(side, contentArea, undefined, order.size);
    logPdfMockupPlacementDebug(side, placement);
    ctx.page.drawRectangle({
      x: placement.x,
      y: placement.y,
      width: placement.drawWidthPt,
      height: placement.drawHeightPt,
      borderColor: ctx.border,
      borderWidth: 1,
      color: undefined,
    });
    ctx.page.drawText("Mockup 預覽無法載入", {
      x: placement.x + placement.drawWidthPt / 2 - 40,
      y: placement.y + placement.drawHeightPt / 2,
      size: 10,
      font: ctx.fonts.regular,
      color: ctx.gray,
    });
  }

  drawPageFooter(ctx, order, version);
}

function resolveProofSides(
  order: ProofOrder,
  mockups: Partial<Record<Side, Uint8Array | Buffer>>,
): Side[] {
  const sides: Side[] = [];
  for (const side of DESIGN_SIDES) {
    const hasDesign = hasDesignInSlot(
      order.layers_by_template,
      order.gender,
      side,
    );
    const hasMockup = Boolean(mockups[side]?.length);
    if (hasDesign || hasMockup) {
      sides.push(side);
    }
  }
  return sides;
}

export async function generateFactoryProofPdf(
  input: FactoryProofPdfInput,
): Promise<Uint8Array> {
  const { order, version, mockupImages = {}, printImages = {} } = input;
  const { PDFDocument, rgb } = await import("pdf-lib");

  const proofSides = resolveProofSides(order, mockupImages);
  const sidesToRender =
    proofSides.length > 0 ? proofSides : (["front"] as Side[]);
  const totalPages = sidesToRender.length;

  const doc = await PDFDocument.create();
  doc.setTitle(
    `TIIIGO 校稿 ${order.submission_no ?? order.order_id} v${version}`,
  );
  doc.setProducer("TIIIGO Proof Engine");
  doc.setCreator("TIIIGO Factory Proof");

  const fonts: PdfFonts = await embedPdfCjkFonts(doc);
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);
  const accent = rgb(0.12, 0.35, 0.75);
  const border = rgb(0.82, 0.82, 0.82);
  const printBlue = rgb(0.2, 0.45, 0.85);
  const white = rgb(1, 1, 1);

  let pageIndex = 0;
  for (const side of sidesToRender) {
    pageIndex += 1;
    const page = doc.addPage([
      FACTORY_PROOF_A4_WIDTH_PT,
      FACTORY_PROOF_A4_HEIGHT_PT,
    ]);
    const ctx: PageContext = {
      page,
      pageIndex,
      totalPages,
      fonts,
      black,
      gray,
      accent,
      border,
      printBlue,
      white,
    };

    await drawSideProofPage(
      doc,
      ctx,
      order,
      side,
      version,
      mockupImages[side],
      printImages[side],
    );
  }

  const pdfBytes = await doc.save();
  return Uint8Array.from(pdfBytes);
}
