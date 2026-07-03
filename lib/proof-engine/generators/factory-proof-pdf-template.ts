/**
 * Factory Proof PDF — 工廠打樣確認稿
 * 每面一頁：左側印刷資訊 + 右側完整 T-shirt Mockup（含印刷區標示）
 */

import type { RGB } from "pdf-lib";
import type { Side } from "../proof-domain";
import { getShirtColorName } from "../proof-domain";
import {
  getProductBrand,
  getProductCode,
  getProductDisplayName,
  getProductMaterialLabel,
  getProductPrintMethodLabel,
  getProductWeightLabel,
} from "../../product-metadata";
import { formatInspectorCm } from "../../design-inspector";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import { getExportCanvasSpec } from "../../export-coordinates";
import { embedPdfCjkFonts } from "../../pdf-fonts";
import type { PdfArtworkPositionPresentation } from "../pdf-position-presentation";
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

const SIDE_TITLE: Record<Side, string> = {
  front: "FRONT",
  back: "BACK",
};

const SIDE_DESIGN_FILE: Record<Side, string> = {
  front: "front_design.png",
  back: "back_design.png",
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
    size: 7,
    font: fonts.bold,
    color: gray,
  });
  page.drawText(value, {
    x,
    y: y - 11,
    size: 8.5,
    font: fonts.regular,
    color: valueColor ?? black,
    maxWidth,
  });
  return y - 22;
}

function drawSectionHeader(
  ctx: PageContext,
  x: number,
  y: number,
  title: string,
  panelMaxW: number,
): number {
  const { page, fonts, black, border } = ctx;
  page.drawText(title, {
    x,
    y,
    size: 9.5,
    font: fonts.bold,
    color: black,
  });
  const lineY = y - 5;
  page.drawLine({
    start: { x, y: lineY },
    end: { x: x + panelMaxW, y: lineY },
    thickness: 0.4,
    color: border,
  });
  return lineY - 12;
}

function drawSectionGap(ctx: PageContext, y: number): number {
  return y - 6;
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

  page.drawText(getProductBrand(), {
    x: MARGIN,
    y: top - 18,
    size: 14,
    font: fonts.bold,
    color: accent,
  });

  page.drawText(getProductDisplayName(), {
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
  printBytes: Uint8Array | Buffer | undefined,
  positionPresentation: PdfArtworkPositionPresentation | null,
) {
  const { page, fonts, black, gray, accent, border } = ctx;
  const x = getLeftPanelX();
  const { top, bottom } = getContentVerticalBounds();
  const panelMaxW = LEFT_PANEL_W;
  let y = top - 4;

  page.drawLine({
    start: { x: x + panelMaxW + PANEL_GUTTER / 2, y: bottom },
    end: { x: x + panelMaxW + PANEL_GUTTER / 2, y: top },
    thickness: 0.5,
    color: border,
  });

  const printSpec = getExportCanvasSpec(side, order.size);
  const missingPosition = "—";
  const caseNo = order.submission_no ?? order.order_id;
  const dateStr = (order.created_at ?? new Date().toISOString()).slice(0, 10);

  y = drawSectionHeader(ctx, x, y, "商品資訊", panelMaxW);
  y = drawLabelValue(ctx, x, y, "品牌", getProductBrand(), panelMaxW, accent);
  y = drawLabelValue(ctx, x, y, "商品名稱", getProductDisplayName(), panelMaxW);
  y = drawLabelValue(ctx, x, y, "商品型號", getProductCode(), panelMaxW);
  y = drawLabelValue(
    ctx,
    x,
    y,
    "顏色",
    getShirtColorName(order.shirt_color),
    panelMaxW,
  );
  y = drawLabelValue(ctx, x, y, "尺碼", order.size, panelMaxW);
  y = drawLabelValue(
    ctx,
    x,
    y,
    "材質",
    getProductMaterialLabel(),
    panelMaxW,
  );
  y = drawLabelValue(
    ctx,
    x,
    y,
    "克重",
    getProductWeightLabel(),
    panelMaxW,
  );
  y = drawLabelValue(
    ctx,
    x,
    y,
    "印刷方式",
    getProductPrintMethodLabel(),
    panelMaxW,
    accent,
  );

  y = drawSectionGap(ctx, y);
  y = drawSectionHeader(ctx, x, y, "位置資訊", panelMaxW);
  y = drawLabelValue(
    ctx,
    x,
    y,
    "印刷位置",
    positionPresentation?.sideLabel ?? missingPosition,
    panelMaxW,
  );
  y = drawLabelValue(
    ctx,
    x,
    y,
    "印刷尺寸",
    positionPresentation?.printSizeLabel ?? missingPosition,
    panelMaxW,
    accent,
  );
  page.drawText("距離標示見右側圖稿", {
    x,
    y: y - 2,
    size: 6.5,
    font: fonts.regular,
    color: gray,
    maxWidth: panelMaxW,
  });
  y -= 14;

  y = drawSectionGap(ctx, y);
  y = drawSectionHeader(ctx, x, y, "印刷規格", panelMaxW);
  y = drawLabelValue(ctx, x, y, "解析度", `${FACTORY_PROOF_DPI} DPI`, panelMaxW);
  y = drawLabelValue(ctx, x, y, "色彩模式", "RGB", panelMaxW);
  y = drawLabelValue(ctx, x, y, "檔案格式", "PNG", panelMaxW);

  y = drawSectionGap(ctx, y);
  y = drawSectionHeader(ctx, x, y, "設計檔案資訊", panelMaxW);
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
    "像素尺寸",
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

  y = drawSectionGap(ctx, y);
  y = drawSectionHeader(ctx, x, y, "訂單資訊", panelMaxW);
  y = drawLabelValue(ctx, x, y, "訂單編號", caseNo, panelMaxW);
  y = drawLabelValue(ctx, x, y, "日期", dateStr, panelMaxW);
  const notes = order.applicant?.notes?.trim();
  if (notes) {
    y = drawLabelValue(
      ctx,
      x,
      y,
      "客戶備註",
      notes.slice(0, 48),
      panelMaxW,
    );
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

function artworkBoundsPt(
  placement: PdfMockupPlacement,
  position: PdfArtworkPositionPresentation,
) {
  const {
    printAreaLeftPt,
    printAreaTopPt,
    printAreaRenderWidthPt,
    printAreaRenderHeightPt,
  } = placement;
  const wCm = position.printAreaWidthCm;
  const hCm = position.printAreaHeightCm;

  const left =
    printAreaLeftPt +
    (position.artworkLeftCm / wCm) * printAreaRenderWidthPt;
  const right =
    printAreaLeftPt +
    (position.artworkRightCm / wCm) * printAreaRenderWidthPt;
  const top =
    printAreaTopPt -
    (position.artworkTopCm / hCm) * printAreaRenderHeightPt;
  const bottom =
    printAreaTopPt -
    (position.artworkBottomCm / hCm) * printAreaRenderHeightPt;

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

function drawArtworkMeasurementAnnotations(
  ctx: PageContext,
  placement: PdfMockupPlacement,
  position: PdfArtworkPositionPresentation,
) {
  const { page, fonts, accent, gray } = ctx;
  const bounds = artworkBoundsPt(placement, position);
  const tick = 3;
  const lineW = 0.65;
  const labelSize = 7.5;

  const collarY = placement.collarCenterPt.y;
  const neckX = bounds.centerX;

  if (collarY > bounds.top + 6) {
    page.drawLine({
      start: { x: neckX, y: bounds.top },
      end: { x: neckX, y: collarY },
      thickness: lineW,
      color: accent,
    });
    page.drawLine({
      start: { x: neckX - tick, y: bounds.top },
      end: { x: neckX + tick, y: bounds.top },
      thickness: lineW,
      color: accent,
    });
    page.drawLine({
      start: { x: neckX - tick, y: collarY },
      end: { x: neckX + tick, y: collarY },
      thickness: lineW,
      color: accent,
    });
    const neckLabel = `↑ ${position.collarDistanceCm} cm`;
    const neckLabelW = fonts.regular.widthOfTextAtSize(neckLabel, labelSize);
    page.drawText(neckLabel, {
      x: neckX - neckLabelW / 2,
      y: bounds.top + 6,
      size: labelSize,
      font: fonts.bold,
      color: accent,
    });
  }

  const leftY = bounds.centerY;
  if (bounds.left > placement.printAreaLeftPt + 8) {
    page.drawLine({
      start: { x: placement.printAreaLeftPt, y: leftY },
      end: { x: bounds.left, y: leftY },
      thickness: lineW,
      color: accent,
    });
    page.drawLine({
      start: { x: placement.printAreaLeftPt, y: leftY - tick },
      end: { x: placement.printAreaLeftPt, y: leftY + tick },
      thickness: lineW,
      color: accent,
    });
    page.drawLine({
      start: { x: bounds.left, y: leftY - tick },
      end: { x: bounds.left, y: leftY + tick },
      thickness: lineW,
      color: accent,
    });
    const leftLabel = `← ${position.leftDistanceCm} cm`;
    page.drawText(leftLabel, {
      x: placement.printAreaLeftPt - 2,
      y: leftY + 8,
      size: labelSize,
      font: fonts.bold,
      color: accent,
    });
  }

  const rightY = bounds.centerY;
  const printAreaRight = placement.printAreaLeftPt + placement.printAreaRenderWidthPt;
  if (printAreaRight > bounds.right + 8) {
    page.drawLine({
      start: { x: bounds.right, y: rightY },
      end: { x: printAreaRight, y: rightY },
      thickness: lineW,
      color: accent,
    });
    page.drawLine({
      start: { x: bounds.right, y: rightY - tick },
      end: { x: bounds.right, y: rightY + tick },
      thickness: lineW,
      color: accent,
    });
    page.drawLine({
      start: { x: printAreaRight, y: rightY - tick },
      end: { x: printAreaRight, y: rightY + tick },
      thickness: lineW,
      color: accent,
    });
    const rightLabel = `${position.rightDistanceCm} cm →`;
    const rightLabelW = fonts.regular.widthOfTextAtSize(rightLabel, labelSize);
    page.drawText(rightLabel, {
      x: printAreaRight - rightLabelW + 2,
      y: rightY - 14,
      size: labelSize,
      font: fonts.bold,
      color: accent,
    });
  }

  page.drawRectangle({
    x: bounds.left,
    y: bounds.bottom,
    width: bounds.right - bounds.left,
    height: bounds.top - bounds.bottom,
    borderColor: accent,
    borderWidth: 0.8,
    color: undefined,
    opacity: 0.15,
  });

  const sizeLabel = position.printSizeLabel;
  const sizeLabelW = fonts.bold.widthOfTextAtSize(sizeLabel, labelSize);
  page.drawText(sizeLabel, {
    x: bounds.centerX - sizeLabelW / 2,
    y: bounds.centerY - 4,
    size: labelSize,
    font: fonts.bold,
    color: gray,
  });
}

async function drawMockupAnnotations(
  ctx: PageContext,
  side: Side,
  placement: PdfMockupPlacement,
  positionPresentation: PdfArtworkPositionPresentation | null,
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

  if (positionPresentation) {
    drawArtworkMeasurementAnnotations(ctx, placement, positionPresentation);
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

  const colW = (FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2) / 2;
  const cols = [MARGIN, MARGIN + colW];
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
  const { buildPdfArtworkPositionPresentation } = await import(
    "../pdf-position-presentation"
  );
  const positionPresentation = await buildPdfArtworkPositionPresentation(
    sideLayers,
    side,
    order.size,
  );

  drawLeftInfoPanel(
    ctx,
    order,
    side,
    printBytes,
    positionPresentation,
  );

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
    await drawMockupAnnotations(ctx, side, placement, positionPresentation);
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
