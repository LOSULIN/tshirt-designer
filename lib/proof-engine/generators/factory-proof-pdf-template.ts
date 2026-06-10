/**
 * Factory Proof PDF Template — A4 · 4~5 pages · POD production ready.
 * cm 為唯一標準；mockup 為 cm-accurate render（非 UI 截圖）。
 */

import type { RGB } from "pdf-lib";
import type { Side } from "../../constants";
import {
  getProductName,
  MATERIAL_OPTIONS,
  normalizeMaterial,
  type Material,
} from "../../constants";
import { formatInspectorCm } from "../../design-inspector";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import { buildLiveDesignState } from "../../live-design-state";
import { PRINT_COLLAR_OFFSET_CM, PRINT_AREA } from "../../printArea";
import {
  getPrintAreaRectInContainerPx,
  MOCKUP_EXPORT_SCALE,
} from "../../mockup-export";
import { SHIRT_CONTAINER_HEIGHT, SHIRT_CONTAINER_WIDTH } from "../../printArea";
import { getShirtColorName } from "../../shirt-template";
import type { ProofOrder } from "../types";

export const FACTORY_PROOF_A4_WIDTH_PT = 595.28;
export const FACTORY_PROOF_A4_HEIGHT_PT = 841.89;
export const FACTORY_PROOF_DPI = 300;
export const FACTORY_PROOF_TOLERANCE_CM = 0.3;

const MARGIN = 40;
const FOOTER_H = 28;
const HEADER_H = 36;

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

function formatCm(value: number, digits = 1): string {
  return `${value.toFixed(digits)} cm`;
}

function formatGeneratedAt(iso?: string): string {
  return (iso ? new Date(iso) : new Date()).toLocaleString("en-GB", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveFabricLabel(order: ProofOrder): string {
  const raw = order.design_meta?.material;
  const material = normalizeMaterial(raw) as Material;
  return (
    MATERIAL_OPTIONS.find((m) => m.id === material)?.label ??
    MATERIAL_OPTIONS[0].label
  );
}

function toPngBuffer(bytes: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}

function drawFooter(ctx: PageContext, order: ProofOrder, version: number) {
  const { page, fonts, gray } = ctx;
  const label = `Order ${order.order_id}  |  Version v${version}  |  Page ${ctx.pageIndex} of ${ctx.totalPages}`;
  page.drawText(label, {
    x: MARGIN,
    y: 16,
    size: 8,
    font: fonts.regular,
    color: gray,
  });
  page.drawText("ZIIIGO Factory Proof", {
    x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN - 100,
    y: 16,
    size: 8,
    font: fonts.regular,
    color: gray,
  });
}

function drawPageTitle(ctx: PageContext, title: string, subtitle?: string) {
  const { page, fonts, black, gray } = ctx;
  const top = FACTORY_PROOF_A4_HEIGHT_PT - MARGIN;

  page.drawRectangle({
    x: MARGIN,
    y: top - HEADER_H,
    width: FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2,
    height: HEADER_H,
    color: undefined,
    borderColor: ctx.border,
    borderWidth: 0.75,
  });

  page.drawText(title, {
    x: MARGIN + 10,
    y: top - 24,
    size: 14,
    font: fonts.bold,
    color: black,
  });

  if (subtitle) {
    page.drawText(subtitle, {
      x: MARGIN + 10,
      y: top - HEADER_H - 14,
      size: 9,
      font: fonts.regular,
      color: gray,
    });
  }
}

function drawKeyValueGrid(
  ctx: PageContext,
  startY: number,
  rows: { label: string; value: string }[],
  columns = 2,
): number {
  const { page, fonts, black, gray } = ctx;
  const colWidth = (FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2) / columns;
  let y = startY;

  for (let i = 0; i < rows.length; i += columns) {
    for (let c = 0; c < columns; c++) {
      const row = rows[i + c];
      if (!row) continue;
      const x = MARGIN + c * colWidth;
      page.drawText(row.label, {
        x,
        y,
        size: 8,
        font: fonts.bold,
        color: gray,
      });
      page.drawText(row.value, {
        x,
        y: y - 12,
        size: 11,
        font: fonts.regular,
        color: black,
      });
    }
    y -= 34;
  }

  return y;
}

function drawHorizontalRule(ctx: PageContext, y: number) {
  ctx.page.drawLine({
    start: { x: MARGIN, y },
    end: { x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN, y },
    thickness: 0.5,
    color: ctx.border,
  });
}

function drawTable(
  ctx: PageContext,
  startY: number,
  headers: string[],
  rows: string[][],
  colWidths: number[],
): number {
  const { page, fonts, black, border } = ctx;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const rowH = 18;
  let y = startY;

  const drawRow = (cells: string[], bold: boolean) => {
    let x = MARGIN;
    for (let i = 0; i < cells.length; i++) {
      page.drawRectangle({
        x,
        y: y - rowH,
        width: colWidths[i],
        height: rowH,
        borderColor: border,
        borderWidth: 0.5,
      });
      page.drawText(cells[i], {
        x: x + 4,
        y: y - rowH + 5,
        size: bold ? 8 : 8,
        font: bold ? fonts.bold : fonts.regular,
        color: black,
        maxWidth: colWidths[i] - 8,
      });
      x += colWidths[i];
    }
    y -= rowH;
  };

  drawRow(headers, true);
  for (const row of rows) {
    drawRow(row, false);
  }

  void tableWidth;
  return y - 8;
}

function computeMockupImageLayout(imageW: number, imageH: number) {
  const maxW = FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2;
  const maxH = FACTORY_PROOF_A4_HEIGHT_PT - MARGIN - HEADER_H - FOOTER_H - 80;
  const scale = Math.min(maxW / imageW, maxH / imageH, 1);
  const drawW = imageW * scale;
  const drawH = imageH * scale;
  const x = MARGIN + (maxW - drawW) / 2;
  const y = FOOTER_H + 48;
  return { x, y, drawW, drawH };
}

function drawPrintAreaBoundingBox(
  ctx: PageContext,
  imageLayout: { x: number; y: number; drawW: number; drawH: number },
) {
  const containerW = SHIRT_CONTAINER_WIDTH * MOCKUP_EXPORT_SCALE;
  const containerH = SHIRT_CONTAINER_HEIGHT * MOCKUP_EXPORT_SCALE;
  const printRect = getPrintAreaRectInContainerPx(containerW, containerH);

  const relLeft = printRect.left / containerW;
  const relTop = printRect.top / containerH;
  const relW = printRect.width / containerW;
  const relH = printRect.height / containerH;

  const { x, y, drawW, drawH } = imageLayout;
  const boxX = x + relLeft * drawW;
  const boxY = y + drawH - (relTop + relH) * drawH;
  const boxW = relW * drawW;
  const boxH = relH * drawH;

  const { page, accent } = ctx;
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: accent,
    borderWidth: 1.5,
  });

  const label = `PRINT AREA ${PRINT_AREA.widthCm} x ${PRINT_AREA.heightCm} cm`;
  page.drawText(label, {
    x: boxX,
    y: boxY + boxH + 4,
    size: 8,
    font: ctx.fonts.bold,
    color: accent,
  });
}

async function drawMockupPage(
  doc: Awaited<ReturnType<typeof import("pdf-lib")["PDFDocument"]["create"]>>,
  ctx: PageContext,
  order: ProofOrder,
  side: Side,
  mockupBytes: Uint8Array | Buffer,
) {
  drawPageTitle(
    ctx,
    side === "front" ? "FRONT" : "BACK",
    "Mockup preview — template + design overlay (cm accurate)",
  );

  const pngBytes = toPngBuffer(mockupBytes);
  const image = await doc.embedPng(pngBytes);
  const layout = computeMockupImageLayout(image.width, image.height);

  ctx.page.drawImage(image, {
    x: layout.x,
    y: layout.y,
    width: layout.drawW,
    height: layout.drawH,
  });

  drawPrintAreaBoundingBox(ctx, layout);

  const sideLabel = side === "front" ? "FRONT" : "BACK";
  ctx.page.drawText(sideLabel, {
    x: FACTORY_PROOF_A4_WIDTH_PT - MARGIN - 60,
    y: FACTORY_PROOF_A4_HEIGHT_PT - MARGIN - 20,
    size: 16,
    font: ctx.fonts.bold,
    color: ctx.accent,
  });

  const collarOffset = PRINT_COLLAR_OFFSET_CM[side];
  ctx.page.drawText(
    `Collar to print area top: ${formatCm(collarOffset, 0)}`,
    {
      x: MARGIN,
      y: FOOTER_H + 24,
      size: 9,
      font: ctx.fonts.regular,
      color: ctx.gray,
    },
  );

  void order;
}

type FactoryPageType = "overview" | "mockup" | "technical" | "notes";

function buildPagePlan(
  order: ProofOrder,
  mockups: Partial<Record<Side, Uint8Array | Buffer>>,
): { pages: FactoryPageType[]; mockupSides: Side[] } {
  const mockupSides: Side[] = [];

  for (const side of DESIGN_SIDES) {
    const hasMockup = Boolean(mockups[side]?.length);
    const hasDesign = hasDesignInSlot(
      order.layers_by_template,
      order.gender,
      side,
    );
    if (hasMockup || hasDesign) {
      mockupSides.push(side);
    }
  }

  const pages: FactoryPageType[] = [
    "overview",
    ...mockupSides.map(() => "mockup" as const),
    "technical",
    "notes",
  ];

  return { pages, mockupSides };
}

export async function generateFactoryProofPdf(
  input: FactoryProofPdfInput,
): Promise<Uint8Array> {
  const { order, version, mockupImages = {} } = input;
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const { pages: pagePlan, mockupSides } = buildPagePlan(order, mockupImages);
  const totalPages = pagePlan.length;

  const doc = await PDFDocument.create();
  doc.setTitle(`ZIIIGO Factory Proof ${order.order_id} v${version}`);
  doc.setProducer("ZIIIGO Proof Engine");
  doc.setCreator("ZIIIGO Factory Proof Template");

  const fonts: PdfFonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const black = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.45, 0.45, 0.45);
  const accent = rgb(0.12, 0.35, 0.75);
  const border = rgb(0.78, 0.78, 0.78);

  const garmentState = buildLiveDesignState(
    getLayersForSlot(order.layers_by_template, order.gender, order.active_side),
    order.size,
  );
  const { garment } = garmentState;

  let pageIndex = 0;
  let mockupPageIdx = 0;

  for (const pageType of pagePlan) {
    pageIndex += 1;
    const page = doc.addPage([FACTORY_PROOF_A4_WIDTH_PT, FACTORY_PROOF_A4_HEIGHT_PT]);
    const ctx: PageContext = {
      page,
      pageIndex,
      totalPages,
      fonts,
      black,
      gray,
      accent,
      border,
    };

    if (pageType === "overview") {
      drawPageTitle(ctx, "ORDER OVERVIEW", "Production proof — read all pages before print");
      let y = FACTORY_PROOF_A4_HEIGHT_PT - MARGIN - HEADER_H - 28;

      y = drawKeyValueGrid(ctx, y, [
        { label: "ORDER ID", value: order.order_id },
        { label: "VERSION", value: `v${version}` },
        {
          label: "SUBMISSION NO",
          value: order.submission_no ?? "—",
        },
        {
          label: "GENERATED",
          value: formatGeneratedAt(order.created_at),
        },
        { label: "PRODUCT TYPE", value: getProductName() },
        { label: "TEMPLATE", value: order.gender },
        { label: "SIZE", value: garment.size },
        { label: "CHEST WIDTH", value: formatInspectorCm(garment.chestWidth, 0) },
        { label: "LENGTH", value: formatInspectorCm(garment.length, 0) },
        { label: "FABRIC", value: resolveFabricLabel(order) },
        {
          label: "COLOR",
          value: `${getShirtColorName(order.shirt_color)} (${order.shirt_color})`,
        },
      ]);

      y -= 8;
      drawHorizontalRule(ctx, y);
      y -= 20;

      page.drawText("PRINT SPECIFICATION", {
        x: MARGIN,
        y,
        size: 10,
        font: fonts.bold,
        color: black,
      });
      y -= 16;
      y = drawKeyValueGrid(
        ctx,
        y,
        [
          {
            label: "PRINT AREA",
            value: `${formatCm(PRINT_AREA.widthCm, 0)} x ${formatCm(PRINT_AREA.heightCm, 0)}`,
          },
          {
            label: "OUTPUT DPI",
            value: String(FACTORY_PROOF_DPI),
          },
          {
            label: "TOLERANCE",
            value: `±${FACTORY_PROOF_TOLERANCE_CM} cm`,
          },
          {
            label: "ACTIVE SIDE",
            value: order.active_side.toUpperCase(),
          },
        ],
        2,
      );

      if (order.applicant?.applicantName || order.applicant?.applicantEmail) {
        y -= 8;
        drawHorizontalRule(ctx, y);
        y -= 20;
        page.drawText("CUSTOMER", {
          x: MARGIN,
          y,
          size: 10,
          font: fonts.bold,
          color: black,
        });
        y -= 16;
        y = drawKeyValueGrid(ctx, y, [
          {
            label: "NAME",
            value: order.applicant?.applicantName ?? "—",
          },
          {
            label: "EMAIL",
            value: order.applicant?.applicantEmail ?? "—",
          },
        ]);
      }
    }

    if (pageType === "mockup") {
      const side = mockupSides[mockupPageIdx];
      mockupPageIdx += 1;
      const bytes = mockupImages[side];
      if (bytes && bytes.length > 0) {
        await drawMockupPage(doc, ctx, order, side, bytes);
      } else {
        drawPageTitle(ctx, side.toUpperCase(), "Mockup not available — refer to technical sheet");
      }
    }

    if (pageType === "technical") {
      drawPageTitle(
        ctx,
        "PRINT TECHNICAL SHEET",
        "All dimensions in centimeters (cm) — factory reference",
      );

      let y = FACTORY_PROOF_A4_HEIGHT_PT - MARGIN - HEADER_H - 36;

      for (const side of DESIGN_SIDES) {
        if (!hasDesignInSlot(order.layers_by_template, order.gender, side)) {
          continue;
        }

        const sideLayers = getLayersForSlot(
          order.layers_by_template,
          order.gender,
          side,
        );
        const sideState = buildLiveDesignState(sideLayers, order.size);
        const collarOffset = PRINT_COLLAR_OFFSET_CM[side];

        page.drawText(`${side.toUpperCase()} — PRINT AREA`, {
          x: MARGIN,
          y,
          size: 11,
          font: fonts.bold,
          color: black,
        });
        y -= 18;

        y = drawKeyValueGrid(
          ctx,
          y,
          [
            {
              label: "PRINT AREA SIZE",
              value: `${formatCm(PRINT_AREA.widthCm, 0)} x ${formatCm(PRINT_AREA.heightCm, 0)}`,
            },
            {
              label: "FROM NECKLINE (TOP)",
              value: formatCm(collarOffset, 0),
            },
            {
              label: "ORIGIN",
              value: "X/Y = top-left of print area (0, 0)",
            },
            {
              label: "ELEMENT COUNT",
              value: String(sideState.elements.length),
            },
          ],
          2,
        );

        y -= 4;

        if (sideState.elements.length > 0) {
          const headers = ["#", "Type", "W (cm)", "H (cm)", "X (cm)", "Y (cm)", "Status"];
          const colWidths = [28, 52, 58, 58, 58, 58, 72];
          const rows = sideState.elements.map((el) => [
            String(el.index),
            el.type === "text" ? "Text" : "Image",
            el.width_cm.toFixed(1),
            el.height_cm.toFixed(1),
            el.x_cm.toFixed(1),
            el.y_cm.toFixed(1),
            el.exceedsPrintArea ? "OUT" : "OK",
          ]);
          y = drawTable(ctx, y, headers, rows, colWidths);
        } else {
          page.drawText("No elements on this side.", {
            x: MARGIN,
            y: y - 10,
            size: 9,
            font: fonts.regular,
            color: gray,
          });
          y -= 24;
        }

        y -= 12;
        if (y < 120) break;
      }
    }

    if (pageType === "notes") {
      drawPageTitle(ctx, "PRODUCTION NOTES", "Factory & customer approval reference");

      let y = FACTORY_PROOF_A4_HEIGHT_PT - MARGIN - HEADER_H - 40;
      const notes = [
        {
          title: "1. Output resolution",
          body: `All print files are generated at ${FACTORY_PROOF_DPI} DPI. Do not upscale or resample for production.`,
        },
        {
          title: "2. Dimensional tolerance",
          body: `Allowed production tolerance is ±${FACTORY_PROOF_TOLERANCE_CM} cm on position and size versus this proof.`,
        },
        {
          title: "3. Approved version rule",
          body: `This document (Order ${order.order_id}, Version v${version}) is the production-approved reference. Any design change requires a new proof version before manufacturing.`,
        },
        {
          title: "4. Coordinate system",
          body: "Element X/Y positions are measured from the top-left corner of the print area (35 x 50 cm). Collar offset indicates distance from neckline to print area top edge.",
        },
        {
          title: "5. Color & fabric",
          body: `Garment color: ${getShirtColorName(order.shirt_color)}. Fabric: ${resolveFabricLabel(order)}. Verify physical swatch before bulk run.`,
        },
      ];

      for (const note of notes) {
        page.drawText(note.title, {
          x: MARGIN,
          y,
          size: 10,
          font: fonts.bold,
          color: black,
        });
        y -= 14;

        const words = note.body.split(" ");
        let line = "";
        const maxWidth = FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2;
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          const width = fonts.regular.widthOfTextAtSize(test, 9);
          if (width > maxWidth && line) {
            page.drawText(line, {
              x: MARGIN,
              y,
              size: 9,
              font: fonts.regular,
              color: gray,
            });
            y -= 13;
            line = word;
          } else {
            line = test;
          }
        }
        if (line) {
          page.drawText(line, {
            x: MARGIN,
            y,
            size: 9,
            font: fonts.regular,
            color: gray,
          });
          y -= 13;
        }
        y -= 10;
      }

      page.drawRectangle({
        x: MARGIN,
        y: 80,
        width: FACTORY_PROOF_A4_WIDTH_PT - MARGIN * 2,
        height: 48,
        borderColor: accent,
        borderWidth: 1,
      });
      page.drawText("APPROVED FOR PRODUCTION", {
        x: MARGIN + 12,
        y: 104,
        size: 12,
        font: fonts.bold,
        color: accent,
      });
      page.drawText(
        `${order.order_id}  ·  v${version}  ·  ${formatGeneratedAt(order.created_at)}`,
        {
          x: MARGIN + 12,
          y: 88,
          size: 9,
          font: fonts.regular,
          color: gray,
        },
      );
    }

    drawFooter(ctx, order, version);
  }

  const pdfBytes = await doc.save();
  return Uint8Array.from(pdfBytes);
}
