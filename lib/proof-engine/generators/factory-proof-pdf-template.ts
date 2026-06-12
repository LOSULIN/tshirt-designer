/**
 * Factory Proof PDF — 工廠校稿（每面一頁）
 * Front / Back：標題 + 完整 Mockup Preview + 印刷資訊（cm 資料）
 */

import type { RGB } from "pdf-lib";
import type { Side } from "../../constants";
import { getProductName } from "../../constants";
import { getDesignerPrintAreaCmBounds } from "../../design-cm";
import { formatInspectorCm } from "../../design-inspector";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import {
  getGarmentMaxPrintAreaCm,
} from "../../garment-print-config";
import {
  buildLiveDesignState,
  type LiveDesignStateElement,
} from "../../live-design-state";
import type { DesignLayer } from "../../types";
import { getPrintAreaOffsetCm } from "../../coordinates/print-area-offset";
import { embedPdfCjkFonts } from "../../pdf-fonts";
import { getShirtColorName } from "../../shirt-template";
import type { ProofOrder } from "../types";
import {
  computePdfMockupPlacement,
  logPdfMockupPlacementDebug,
  type PdfMockupContentAreaPt,
} from "./pdf-mockup-layout";

export const FACTORY_PROOF_A4_WIDTH_PT = 595.28;
export const FACTORY_PROOF_A4_HEIGHT_PT = 841.89;
export const FACTORY_PROOF_DPI = 300;
export const FACTORY_PROOF_TOLERANCE_CM = 0.3;

const MARGIN = 36;
const FOOTER_H = 24;
const PAGE_HEADER_H = 72;
const INFO_SECTION_H = 200;

export interface FactoryProofPdfInput {
  order: ProofOrder;
  version: number;
  mockupImages?: Partial<Record<Side, Uint8Array | Buffer>>;
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
}

const SIDE_PRINT_LABEL: Record<Side, string> = {
  front: "正面大圖",
  back: "背面大圖",
};

const SIDE_TITLE: Record<Side, string> = {
  front: "FRONT",
  back: "BACK",
};

const COLLAR_LABEL: Record<Side, string> = {
  front: "距離領口",
  back: "距離後領",
};

function toPngBuffer(bytes: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

function drawFooter(ctx: PageContext, order: ProofOrder, version: number) {
  const { page, fonts, gray } = ctx;
  const caseNo = order.submission_no ?? "—";
  page.drawText(
    `TIIIGO 校稿  |  ${caseNo}  |  v${version}  |  第 ${ctx.pageIndex} / ${ctx.totalPages} 頁`,
    {
      x: MARGIN,
      y: 14,
      size: 8,
      font: fonts.regular,
      color: gray,
    },
  );
}

function drawLabelValue(
  ctx: PageContext,
  x: number,
  y: number,
  label: string,
  value: string,
  valueSize = 10,
): number {
  const { page, fonts, black, gray } = ctx;
  page.drawText(label, {
    x,
    y,
    size: 8,
    font: fonts.bold,
    color: gray,
  });
  page.drawText(value, {
    x,
    y: y - 13,
    size: valueSize,
    font: fonts.regular,
    color: black,
    maxWidth: FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2 - (x - MARGIN),
  });
  return y - 28;
}

function resolvePositionLabel(
  elements: LiveDesignStateElement[],
  side: Side,
): string {
  if (elements.length === 0) return "—";
  const printArea = getDesignerPrintAreaCmBounds(side);
  const primary = [...elements].sort(
    (a, b) => b.width_cm * b.height_cm - a.width_cm * a.height_cm,
  )[0]!;
  const cx = primary.x_cm + primary.width_cm / 2;
  const cy = primary.y_cm + primary.height_cm / 2;
  const tolX = printArea.width * 0.12;
  const tolY = printArea.height * 0.12;
  const h =
    Math.abs(cx - printArea.width / 2) <= tolX
      ? "水平置中"
      : cx < printArea.width / 2
        ? "偏左"
        : "偏右";
  const v =
    Math.abs(cy - printArea.height / 2) <= tolY
      ? "垂直置中"
      : cy < printArea.height / 2
        ? "偏上"
        : "偏下";
  if (h === "水平置中" && v === "垂直置中") return "Center";
  if (h === "水平置中") return v;
  if (v === "垂直置中") return h;
  return `${h} · ${v}`;
}

function formatElementType(type: LiveDesignStateElement["type"]): string {
  if (type === "text") return "文字";
  if (type === "shape") return "形狀";
  return "圖片";
}

function drawPageHeader(ctx: PageContext, side: Side) {
  const { page, fonts, black, gray, accent, border } = ctx;
  const top = FACTORY_PROOF_A4_HEIGHT_PT - MARGIN;

  page.drawRectangle({
    x: MARGIN,
    y: top - PAGE_HEADER_H,
    width: FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2,
    height: PAGE_HEADER_H,
    borderColor: border,
    borderWidth: 0.75,
  });

  page.drawText("TIIIGO", {
    x: MARGIN + 12,
    y: top - 22,
    size: 16,
    font: fonts.bold,
    color: accent,
  });

  page.drawText(`商品名稱：${getProductName()}`, {
    x: MARGIN + 12,
    y: top - 40,
    size: 10,
    font: fonts.regular,
    color: black,
  });

  page.drawText(`印刷面：${SIDE_TITLE[side]}`, {
    x: MARGIN + 12,
    y: top - 56,
    size: 10,
    font: fonts.bold,
    color: black,
  });

  page.drawText(SIDE_TITLE[side], {
    x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN - 72,
    y: top - 38,
    size: 22,
    font: fonts.bold,
    color: accent,
  });

  page.drawText("工廠校稿", {
    x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN - 72,
    y: top - 56,
    size: 9,
    font: fonts.regular,
    color: gray,
  });
}

function getMockupContentAreaPt(): PdfMockupContentAreaPt {
  const contentTop =
    FACTORY_PROOF_A4_HEIGHT_PT - MARGIN - PAGE_HEADER_H - 8;
  const contentBottom = FOOTER_H + INFO_SECTION_H + 16;
  const maxW = FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2;
  const maxH = contentTop - contentBottom;
  return {
    originX: MARGIN,
    originY: contentBottom,
    maxWidthPt: maxW,
    maxHeightPt: maxH,
  };
}

function drawMockupImage(
  page: import("pdf-lib").PDFPage,
  image: import("pdf-lib").PDFImage,
  placement: ReturnType<typeof computePdfMockupPlacement>,
) {
  page.drawImage(image, {
    x: placement.x,
    y: placement.y,
    width: placement.drawWidthPt,
    height: placement.drawHeightPt,
  });
}

function formatElementDetailLine(
  el: LiveDesignStateElement,
  layer: DesignLayer | undefined,
): string {
  const content =
    el.type === "text"
      ? el.content.slice(0, 24) || "（空白文字）"
      : el.type === "image"
        ? el.content || el.name
        : el.content;
  const rot =
    layer && layer.rotation !== 0 ? ` · 旋轉 ${layer.rotation}°` : "";
  const extra =
    el.type === "text"
      ? ` · 「${content}」`
      : el.type === "image"
        ? ` · ${content}`
        : "";
  return `${el.index}. ${formatElementType(el.type)} · ${el.name} · ${el.width_cm.toFixed(1)}×${el.height_cm.toFixed(1)} cm · X ${el.x_cm.toFixed(1)} Y ${el.y_cm.toFixed(1)} cm${rot}${extra}`;
}

function drawPrintInfoSection(
  ctx: PageContext,
  order: ProofOrder,
  side: Side,
  elements: LiveDesignStateElement[],
  layers: DesignLayer[],
) {
  const { page, fonts, black, gray, border, accent } = ctx;
  const printArea = getGarmentMaxPrintAreaCm(side);
  const sectionTop = FOOTER_H + INFO_SECTION_H;
  const y0 = sectionTop - 8;

  page.drawLine({
    start: { x: MARGIN, y: y0 },
    end: { x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN, y: y0 },
    thickness: 0.75,
    color: border,
  });

  page.drawText("印刷資訊", {
    x: MARGIN,
    y: y0 - 16,
    size: 11,
    font: fonts.bold,
    color: black,
  });

  const colW = (FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2) / 2;
  let leftY = y0 - 34;
  let rightY = y0 - 34;

  leftY = drawLabelValue(
    ctx,
    MARGIN,
    leftY,
    "印刷位置",
    SIDE_PRINT_LABEL[side],
  );
  leftY = drawLabelValue(
    ctx,
    MARGIN,
    leftY,
    "印刷尺寸",
    `${formatInspectorCm(printArea.widthCm, 0)} × ${formatInspectorCm(printArea.heightCm, 0)}`,
  );
  leftY = drawLabelValue(
    ctx,
    MARGIN,
    leftY,
    "位置",
    resolvePositionLabel(elements, side),
  );

  rightY = drawLabelValue(
    ctx,
    MARGIN + colW,
    rightY,
    COLLAR_LABEL[side],
    formatInspectorCm(getPrintAreaOffsetCm(side), 0),
  );
  rightY = drawLabelValue(
    ctx,
    MARGIN + colW,
    rightY,
    "解析度",
    `${FACTORY_PROOF_DPI} DPI`,
  );
  rightY = drawLabelValue(
    ctx,
    MARGIN + colW,
    rightY,
    "衣服顏色",
    getShirtColorName(order.shirt_color),
  );

  const detailY = Math.min(leftY, rightY) - 6;
  if (elements.length === 0) {
    page.drawText("（此面尚無設計物件）", {
      x: MARGIN,
      y: detailY,
      size: 9,
      font: fonts.regular,
      color: gray,
    });
    return;
  }

  page.drawText("設計物件", {
    x: MARGIN,
    y: detailY,
    size: 9,
    font: fonts.bold,
    color: accent,
  });

  const layerById = new Map(layers.map((l) => [l.id, l]));
  let lineY = detailY - 14;
  const maxLines = 4;
  for (const el of elements.slice(0, maxLines)) {
    const line = formatElementDetailLine(el, layerById.get(el.id));
    page.drawText(line, {
      x: MARGIN,
      y: lineY,
      size: 8,
      font: fonts.regular,
      color: black,
      maxWidth: FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2,
    });
    lineY -= 12;
  }

  if (elements.length > maxLines) {
    page.drawText(`…另有 ${elements.length - maxLines} 個物件`, {
      x: MARGIN,
      y: lineY,
      size: 8,
      font: fonts.regular,
      color: gray,
    });
  }
}

async function drawSideProofPage(
  doc: Awaited<ReturnType<typeof import("pdf-lib")["PDFDocument"]["create"]>>,
  ctx: PageContext,
  order: ProofOrder,
  side: Side,
  mockupBytes: Uint8Array | Buffer | undefined,
) {
  drawPageHeader(ctx, side);

  const sideLayers = getLayersForSlot(
    order.layers_by_template,
    order.gender,
    side,
  );
  const sideState = buildLiveDesignState(sideLayers, order.size);

  const contentArea = getMockupContentAreaPt();

  if (mockupBytes && mockupBytes.length > 0) {
    const pngBytes = toPngBuffer(mockupBytes);
    const image = await doc.embedPng(pngBytes);
    const placement = computePdfMockupPlacement(side, contentArea, {
      width: image.width,
      height: image.height,
    });
    logPdfMockupPlacementDebug(side, placement);
    drawMockupImage(ctx.page, image, placement);
  } else {
    const placement = computePdfMockupPlacement(side, contentArea);
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

  drawPrintInfoSection(ctx, order, side, sideState.elements, sideLayers);
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
  const { order, version, mockupImages = {} } = input;
  const { PDFDocument, rgb } = await import("pdf-lib");

  const proofSides = resolveProofSides(order, mockupImages);
  const totalPages = Math.max(proofSides.length, 1);

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
  const border = rgb(0.78, 0.78, 0.78);

  const sidesToRender =
    proofSides.length > 0 ? proofSides : (["front"] as Side[]);

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
      totalPages: sidesToRender.length,
      fonts,
      black,
      gray,
      accent,
      border,
    };

    await drawSideProofPage(
      doc,
      ctx,
      order,
      side,
      mockupImages[side],
    );
    drawFooter(ctx, order, version);
  }

  const pdfBytes = await doc.save();
  return Uint8Array.from(pdfBytes);
}
