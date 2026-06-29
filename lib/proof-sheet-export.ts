/**
 * Proof Sheet PDF — A4 校稿文件，資料來自 designState（cm）。
 */

import type { Gender, Material, ShirtColor, Side } from "./constants";
import { getMaterialLabel } from "./constants";
import { formatInspectorCm } from "./design-inspector";
import { buildLiveDesignState } from "./live-design-state";
import { getShirtColorName } from "./shirt-template";
import { embedPdfCjkFonts } from "./pdf-fonts";
import type { DesignLayer } from "./types";

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

export function buildProofSheetFileName(
  gender: Gender,
  side: Side,
  size: string,
): string {
  return `proof-${gender}-${side}-${size}.pdf`;
}

function formatExportDate(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * 生成 A4 Proof Sheet PDF（條列式 element 明細）。
 */
export async function renderProofSheetPdf(params: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size: string;
  layers: DesignLayer[];
  material?: Material;
}): Promise<Blob> {
  const { gender, side, shirtColor, size, layers, material } = params;
  const designState = buildLiveDesignState(layers, size);
  const { garment, elements } = designState;

  const { PDFDocument, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`TIIIGO Proof ${gender} ${side} ${size}`);
  pdfDoc.setProducer("TIIIGO T-Shirt Designer");
  pdfDoc.setCreator("TIIIGO T-Shirt Designer");

  const { regular: font, bold: fontBold } = await embedPdfCjkFonts(pdfDoc);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.35, 0.35, 0.35);

  let page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
  let y = A4_HEIGHT_PT - 50;
  const marginX = 48;
  const lineHeight = 14;

  const drawLine = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> },
  ) => {
    if (y < 60) {
      page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
      y = A4_HEIGHT_PT - 50;
    }
    page.drawText(text, {
      x: marginX,
      y,
      size: opts?.size ?? 10,
      font: opts?.bold ? fontBold : font,
      color: opts?.color ?? black,
    });
    y -= opts?.size ? opts.size + 4 : lineHeight;
  };

  drawLine("TIIIGO Design Proof Sheet", { bold: true, size: 18 });
  y -= 4;
  drawLine(`Generated: ${formatExportDate()}`, { color: gray, size: 9 });
  y -= 8;

  drawLine("Garment", { bold: true, size: 12 });
  drawLine(`Shirt size: ${garment.size}`);
  drawLine(`Chest width: ${formatInspectorCm(garment.chestWidth, 0)}`);
  drawLine(`Length: ${formatInspectorCm(garment.length, 0)}`);
  drawLine(
    `Print area: ${formatInspectorCm(garment.printArea.width_cm, 0)} x ${formatInspectorCm(garment.printArea.height_cm, 0)}`,
  );
  drawLine(`Template: ${gender} / ${side}`);
  drawLine(`Shirt color: ${getShirtColorName(shirtColor)}`);
  drawLine(`Material: ${getMaterialLabel(material)}`);
  y -= 8;

  drawLine(`Design Elements (${elements.length})`, { bold: true, size: 12 });
  y -= 4;

  if (elements.length === 0) {
    drawLine("No design elements on this side.", { color: gray });
  } else {
    for (const element of elements) {
      const typeLabel = element.type === "text" ? "Text" : "Image";
      drawLine(`Element ${element.index}: ${element.name}`, { bold: true });
      drawLine(`  Type: ${typeLabel}`);
      drawLine(`  width_cm: ${element.width_cm.toFixed(1)}`);
      drawLine(`  height_cm: ${element.height_cm.toFixed(1)}`);
      drawLine(`  x_cm: ${element.x_cm.toFixed(1)}`);
      drawLine(`  y_cm: ${element.y_cm.toFixed(1)}`);
      drawLine(`  zIndex: ${element.zIndex}`);
      drawLine(`  Status: ${element.exceedsPrintArea ? "OUT OF BOUNDS" : element.status.toUpperCase()}`);
      y -= 6;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
}
