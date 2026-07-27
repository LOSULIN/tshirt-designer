/**
 * Factory Proof PDF — 工廠打樣確認稿（Layout v2）
 * 專業成衣印刷工廠校稿風格；定位來源 designer-layout.ts
 */

import type { RGB } from "pdf-lib";
import type { ShirtColor, Side } from "../proof-domain";
import { getShirtColorName } from "../proof-domain";
import {
  getProductBrand,
  getProductCode,
  getProductDisplayName,
  getProductMaterialLabel,
  getProductPrintMethodLabel,
  getProductWeightLabel,
} from "../../product-metadata";
import { getPrintAreaOffsetCm } from "../../coordinates/print-area-offset";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import { getExportCanvasSpec } from "../../export-coordinates";
import { embedPdfCjkFonts } from "../../pdf-fonts";
import { loadRegistryGarmentAssetBytes } from "../../products/registry-garment-asset-fs";
import type { PdfArtworkPositionPresentation } from "../pdf-position-presentation";
import {
  mapDesignerLayoutToPdf,
  type DesignerPdfRenderPlacement,
} from "../designer-layout";
import type { ProofOrder } from "../types";
import type { PdfMockupContentAreaPt } from "./pdf-mockup-layout";
import type { ExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import type { DesignerGeometryVersion } from "@/lib/designer-geometry-v2/geometry-version";
import {
  maybeLogPdfExportRuntimeCompare,
  resolvePdfExportPipelineContext,
  resolvePdfExportRuntimeLayout,
  resolvePdfExportRuntimePresentationOffsetY,
} from "@/lib/designer-geometry-v2/export-pdf-runtime";

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
  geometryVersion?: DesignerGeometryVersion;
  pipelineContextBySide?: Partial<Record<Side, ExportPipelineContext>>;
  /** Single-side dev override; prefer pipelineContextBySide for multi-page proofs. */
  pipelineContext?: ExportPipelineContext;
}

function resolveSidePdfPipelineContext(
  side: Side,
  order: ProofOrder,
  input: FactoryProofPdfInput,
): ExportPipelineContext | undefined {
  const bySide = input.pipelineContextBySide?.[side];
  if (bySide) {
    return bySide;
  }

  if (input.geometryVersion != null) {
    return resolvePdfExportPipelineContext({
      side,
      size: order.size ?? "M",
      geometryVersion: input.geometryVersion,
    });
  }

  return input.pipelineContext;
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
  guideGray: RGB;
  accent: RGB;
  border: RGB;
  printBlue: RGB;
  tagYellow: RGB;
  tagText: RGB;
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
  "本校稿僅供印刷位置確認。",
  "實際生產依 TIIIGO 工廠規範執行。",
  "正面印刷以領口下緣 7 cm、背面以後領下緣 5 cm 為定位基準。",
];

/** Factory Proof Layout v2 — 工廠校稿用語 */
const FACTORY_POSITION_BADGE: Record<
  Side,
  { title: string; subtitle: (offsetCm: number) => string; collarLineLabel: string }
> = {
  front: {
    title: "印刷定位基準",
    subtitle: (cm) => `領口下緣起算 ${cm} cm`,
    collarLineLabel: "領口下緣",
  },
  back: {
    title: "印刷定位基準",
    subtitle: (cm) => `後領下緣起算 ${cm} cm`,
    collarLineLabel: "後領下緣",
  },
};

function formatShirtColorEnglish(color: ShirtColor): string {
  return color
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFactoryPositionCardLine(side: Side): string {
  const offsetCm = getPrintAreaOffsetCm(side);
  return side === "back"
    ? `Back Collar Bottom +${offsetCm} cm`
    : `Collar Bottom +${offsetCm} cm`;
}

/** TIIIGO Factory Proof v1.0 — #2563EB */
const FACTORY_PROOF_BLUE_HEX = { r: 37 / 255, g: 99 / 255, b: 235 / 255 };
const FACTORY_PROOF_TAG_HEX = { r: 234 / 255, g: 179 / 255, b: 8 / 255 };

function loadRegistryGarmentBytes(
  shirtColor: ShirtColor,
  side: Side,
): Buffer | null {
  return loadRegistryGarmentAssetBytes(shirtColor, side);
}

function logDesignerLayoutDebug(
  side: Side,
  render: DesignerPdfRenderPlacement,
): void {
  if (typeof console === "undefined") return;
  console.group(`[Factory Proof Designer Layout] ${side}`);
  console.log("viewport", render.contentArea);
  console.log("shirt", render.shirt);
  console.log("printArea", {
    leftPt: render.printAreaLeftPt,
    bottomPt: render.printAreaBottomPt,
    topPt: render.printAreaTopPt,
    widthPt: render.printAreaRenderWidthPt,
    heightPt: render.printAreaRenderHeightPt,
  });
  console.log("collar", render.collarCenterPt);
  console.groupEnd();
}

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

function drawCollarOffsetGuide(
  ctx: PageContext,
  side: Side,
  render: DesignerPdfRenderPlacement,
  pipelineContext?: ExportPipelineContext,
) {
  const { page, fonts, guideGray, tagYellow, tagText } = ctx;

  const offsetCm = getPrintAreaOffsetCm(side);
  const copy = FACTORY_POSITION_BADGE[side];
  const guideX = render.collarCenterPt.x;
  const collarY = render.collarCenterPt.y;
  const printTopY =
    render.printAreaTopPt +
    resolvePdfExportRuntimePresentationOffsetY(
      side,
      render.shirt.heightPt,
      pipelineContext,
    );
  const lineW = 0.4;
  const tickHalf = Math.min(36, render.printAreaRenderWidthPt * 0.12);

  if (collarY <= printTopY + 4) {
    return;
  }

  const printLeft = render.printAreaLeftPt;
  const printRight = printLeft + render.printAreaRenderWidthPt;

  page.drawLine({
    start: { x: printLeft, y: collarY },
    end: { x: printRight, y: collarY },
    thickness: lineW,
    color: guideGray,
    opacity: 0.9,
  });
  page.drawLine({
    start: { x: guideX, y: collarY },
    end: { x: guideX, y: printTopY },
    thickness: lineW,
    color: guideGray,
    opacity: 0.9,
  });
  page.drawLine({
    start: { x: printLeft, y: printTopY },
    end: { x: printRight, y: printTopY },
    thickness: lineW,
    color: guideGray,
    opacity: 0.75,
  });

  page.drawText(copy.collarLineLabel, {
    x: guideX + tickHalf + 4,
    y: collarY - 3,
    size: 7.5,
    font: fonts.regular,
    color: guideGray,
    opacity: 0.95,
  });

  const badgeTitle = copy.title;
  const badgeSubtitle = copy.subtitle(offsetCm);
  const badgeTitleSize = 8;
  const badgeSubtitleSize = 7.5;
  const badgePadX = 8;
  const badgePadY = 5;
  const badgeW =
    Math.max(
      fonts.bold.widthOfTextAtSize(badgeTitle, badgeTitleSize),
      fonts.regular.widthOfTextAtSize(badgeSubtitle, badgeSubtitleSize),
    ) +
    badgePadX * 2;
  const badgeH = badgeTitleSize + badgeSubtitleSize + badgePadY * 2 + 2;
  const badgeX = guideX - badgeW - 10;
  const badgeY = (collarY + render.printAreaTopPt) / 2 - badgeH / 2;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: tagYellow,
    opacity: 0.94,
    borderWidth: 0,
  });
  page.drawText(badgeTitle, {
    x: badgeX + badgePadX,
    y: badgeY + badgePadY + badgeSubtitleSize + 1,
    size: badgeTitleSize,
    font: fonts.bold,
    color: tagText,
  });
  page.drawText(badgeSubtitle, {
    x: badgeX + badgePadX,
    y: badgeY + badgePadY,
    size: badgeSubtitleSize,
    font: fonts.regular,
    color: tagText,
  });
}

function drawFactoryProofInfoCard(
  ctx: PageContext,
  contentArea: PdfMockupContentAreaPt,
  order: ProofOrder,
  side: Side,
  positionPresentation: PdfArtworkPositionPresentation | null,
) {
  const { page, fonts, border, white, printBlue } = ctx;
  const muted = ctx.gray;
  const dark = ctx.black;

  const cardW = 188;
  const cardH = 168;
  const cardX = contentArea.originX + contentArea.maxWidthPt - cardW - 10;
  const cardY = contentArea.originY + 12;

  page.drawRectangle({
    x: cardX,
    y: cardY,
    width: cardW,
    height: cardH,
    color: white,
    opacity: 0.97,
    borderColor: border,
    borderWidth: 0.6,
  });

  let y = cardY + cardH - 16;
  const x = cardX + 12;
  const innerW = cardW - 24;
  const labelSize = 8;
  const valueSize = 10;
  const gap = 20;

  page.drawText("TIIIGO Factory Proof", {
    x,
    y,
    size: 11,
    font: fonts.bold,
    color: printBlue,
  });
  y -= 16;

  page.drawText(SIDE_TITLE[side], {
    x,
    y,
    size: valueSize,
    font: fonts.bold,
    color: dark,
  });
  y -= 13;

  page.drawText(formatShirtColorEnglish(order.shirt_color), {
    x,
    y,
    size: valueSize,
    font: fonts.regular,
    color: dark,
  });
  y -= 13;

  page.drawText(`Size ${order.size}`, {
    x,
    y,
    size: valueSize,
    font: fonts.regular,
    color: dark,
  });
  y -= gap;

  const artworkSize = positionPresentation?.printSizeLabel ?? "—";
  page.drawText("Artwork", {
    x,
    y,
    size: labelSize,
    font: fonts.bold,
    color: muted,
  });
  page.drawText(artworkSize, {
    x,
    y: y - 12,
    size: valueSize,
    font: fonts.regular,
    color: dark,
    maxWidth: innerW,
  });
  y -= gap;

  page.drawText("Print Position", {
    x,
    y,
    size: labelSize,
    font: fonts.bold,
    color: muted,
  });
  y -= 12;
  page.drawText(SIDE_TITLE[side], {
    x,
    y,
    size: valueSize,
    font: fonts.regular,
    color: dark,
  });
  y -= 14;
  page.drawText("Position", {
    x,
    y,
    size: labelSize,
    font: fonts.bold,
    color: muted,
  });
  page.drawText(getFactoryPositionCardLine(side), {
    x,
    y: y - 12,
    size: valueSize,
    font: fonts.regular,
    color: dark,
    maxWidth: innerW,
  });
  y -= gap;

  const dateStr = (order.created_at ?? new Date().toISOString()).slice(0, 10);
  page.drawText("Generated", {
    x,
    y,
    size: labelSize,
    font: fonts.bold,
    color: muted,
  });
  page.drawText(dateStr, {
    x,
    y: y - 12,
    size: valueSize,
    font: fonts.regular,
    color: dark,
  });
}

async function drawMockupAnnotations(
  ctx: PageContext,
  side: Side,
  render: DesignerPdfRenderPlacement,
  pipelineContext?: ExportPipelineContext,
) {
  const { page, printBlue } = ctx;

  drawCollarOffsetGuide(ctx, side, render, pipelineContext);

  await drawDashedRect(
    page,
    render.printAreaLeftPt,
    render.printAreaBottomPt +
      resolvePdfExportRuntimePresentationOffsetY(
        side,
        render.shirt.heightPt,
        pipelineContext,
      ),
    render.printAreaRenderWidthPt,
    render.printAreaRenderHeightPt,
    printBlue,
    0.85,
  );
}

async function drawDesignerPreviewMockup(
  doc: Awaited<ReturnType<typeof import("pdf-lib")["PDFDocument"]["create"]>>,
  ctx: PageContext,
  order: ProofOrder,
  side: Side,
  panelArea: PdfMockupContentAreaPt,
  printBytes: Uint8Array | Buffer | undefined,
  pipelineContext?: ExportPipelineContext,
): Promise<DesignerPdfRenderPlacement> {
  const layout = resolvePdfExportRuntimeLayout(side, pipelineContext);
  const render = mapDesignerLayoutToPdf(layout, panelArea);
  logDesignerLayoutDebug(side, render);

  const shirtBytes = loadRegistryGarmentBytes(order.shirt_color, side);
  if (shirtBytes) {
    const shirtImage = await doc.embedPng(shirtBytes);
    ctx.page.drawImage(shirtImage, {
      x: render.shirt.x,
      y: render.shirt.y,
      width: render.shirt.widthPt,
      height: render.shirt.heightPt,
    });
  }

  if (printBytes && printBytes.length > 0) {
    const artworkImage = await doc.embedPng(toPngBuffer(printBytes));
    ctx.page.drawImage(artworkImage, {
      x: render.printAreaLeftPt,
      y: render.printAreaBottomPt +
        resolvePdfExportRuntimePresentationOffsetY(
          side,
          render.shirt.heightPt,
          pipelineContext,
        ),
      width: render.printAreaRenderWidthPt,
      height: render.printAreaRenderHeightPt,
    });
  }

  return render;
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
  pipelineContext?: ExportPipelineContext,
) {
  maybeLogPdfExportRuntimeCompare({ side, pipelineContext });

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

  drawLeftInfoPanel(ctx, order, side, printBytes);

  const panelArea = getRightPanelMockupArea();
  const hasRenderableDesign =
    (printBytes && printBytes.length > 0) ||
    (mockupBytes && mockupBytes.length > 0) ||
    sideLayers.some((layer) => layer.visible);

  if (hasRenderableDesign) {
    const render = await drawDesignerPreviewMockup(
      doc,
      ctx,
      order,
      side,
      panelArea,
      printBytes,
      pipelineContext,
    );
    await drawMockupAnnotations(ctx, side, render, pipelineContext);
    drawFactoryProofInfoCard(
      ctx,
      panelArea,
      order,
      side,
      positionPresentation,
    );
  } else {
    const layout = resolvePdfExportRuntimeLayout(side, pipelineContext);
    const render = mapDesignerLayoutToPdf(layout, panelArea);
    ctx.page.drawRectangle({
      x: render.contentArea.originX,
      y: render.contentArea.originY,
      width: render.contentArea.maxWidthPt,
      height: render.contentArea.maxHeightPt,
      borderColor: ctx.border,
      borderWidth: 1,
      color: undefined,
    });
    ctx.page.drawText("Mockup 預覽無法載入", {
      x: render.contentArea.originX + render.contentArea.maxWidthPt / 2 - 40,
      y: render.contentArea.originY + render.contentArea.maxHeightPt / 2,
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
  const guideGray = rgb(0.62, 0.62, 0.62);
  const accent = rgb(
    FACTORY_PROOF_BLUE_HEX.r,
    FACTORY_PROOF_BLUE_HEX.g,
    FACTORY_PROOF_BLUE_HEX.b,
  );
  const border = rgb(0.82, 0.82, 0.82);
  const printBlue = rgb(
    FACTORY_PROOF_BLUE_HEX.r,
    FACTORY_PROOF_BLUE_HEX.g,
    FACTORY_PROOF_BLUE_HEX.b,
  );
  const tagYellow = rgb(
    FACTORY_PROOF_TAG_HEX.r,
    FACTORY_PROOF_TAG_HEX.g,
    FACTORY_PROOF_TAG_HEX.b,
  );
  const tagText = rgb(0.2, 0.16, 0.04);
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
      guideGray,
      accent,
      border,
      printBlue,
      tagYellow,
      tagText,
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
      resolveSidePdfPipelineContext(side, order, input),
    );
  }

  const pdfBytes = await doc.save();
  return Uint8Array.from(pdfBytes);
}
