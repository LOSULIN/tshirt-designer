import { type Gender, type Side } from "./constants";
import {
  getLayersForSlot,
  hasDesignInSlot,
  type DesignLayersByTemplate,
} from "./design-state";
import {
  cmToExportPx,
  getPrintExportDimensionsPx,
  getPrintExportSpec,
  renderPrintExportPng,
} from "./print-export-system";
import { sortLayersByZIndex } from "./layers";
import type { DesignLayer } from "./types";

export type PrintExportFormat = "png" | "pdf";

export type PrintExportDescriptor = {
  gender: Gender;
  side: Side;
  format: PrintExportFormat;
  dpi: number;
  widthPx: number;
  heightPx: number;
  widthCm: number;
  heightCm: number;
  widthPt: number;
  heightPt: number;
  background: "transparent";
  content: "printable-area-only";
};

export type PrintExportResult = {
  blob: Blob;
  filename: string;
  descriptor: PrintExportDescriptor;
};

function cmToPdfPoints(cm: number): number {
  return (cm / 2.54) * 72;
}

export function hasExportablePrintableDesign(layers: DesignLayer[]): boolean {
  return sortLayersByZIndex(layers).some((layer) => {
    if (!layer.visible) return false;
    if (layer.type === "image" || layer.type === "shape") return true;
    return layer.text.trim().length > 0;
  });
}

export function getPrintExportDescriptor(
  gender: Gender,
  side: Side,
  format: PrintExportFormat,
  size: string = "M",
): PrintExportDescriptor {
  const spec = getPrintExportSpec(side, size);

  return {
    gender,
    side,
    format,
    dpi: spec.dpi,
    widthPx: spec.widthPx,
    heightPx: spec.heightPx,
    widthCm: spec.widthCm,
    heightCm: spec.heightCm,
    widthPt: cmToPdfPoints(spec.widthCm),
    heightPt: cmToPdfPoints(spec.heightCm),
    background: "transparent",
    content: "printable-area-only",
  };
}

export function buildPrintExportFileName(
  gender: Gender,
  side: Side,
  format: PrintExportFormat,
): string {
  return `print-${gender}-${side}-300dpi.${format}`;
}

export function downloadPrintBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 將可印刷區 PNG 嵌入 PDF，頁面尺寸對應實際印刷公分 */
export async function renderPrintableDesignPdf(
  gender: Gender,
  _side: Side,
  layers: DesignLayer[],
  size: string = "M",
): Promise<Blob> {
  const pngBlob = await renderPrintExportPng(layers, { side: _side, size });
  const descriptor = getPrintExportDescriptor(gender, _side, "pdf", size);
  const { PDFDocument } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`TIIIGO Print ${gender} ${_side}`);
  pdfDoc.setProducer("TIIIGO T-Shirt Designer");
  pdfDoc.setCreator("TIIIGO T-Shirt Designer");

  const page = pdfDoc.addPage([descriptor.widthPt, descriptor.heightPt]);
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  const image = await pdfDoc.embedPng(pngBytes);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width: descriptor.widthPt,
    height: descriptor.heightPt,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([Uint8Array.from(pdfBytes)], { type: "application/pdf" });
}

export async function renderPrintableDesign(
  gender: Gender,
  side: Side,
  layers: DesignLayer[],
  format: PrintExportFormat,
  size: string = "M",
): Promise<Blob> {
  if (format === "png") {
    return renderPrintExportPng(layers, { side, size });
  }
  return renderPrintableDesignPdf(gender, side, layers, size);
}

export async function exportPrintableDesign(params: {
  gender: Gender;
  side: Side;
  layers: DesignLayer[];
  format: PrintExportFormat;
  size?: string;
}): Promise<PrintExportResult> {
  const { gender, side, layers, format, size = "M" } = params;

  if (!hasExportablePrintableDesign(layers)) {
    throw new Error("此面向尚無可輸出的設計內容");
  }

  const blob = await renderPrintableDesign(gender, side, layers, format, size);
  const filename = buildPrintExportFileName(gender, side, format);
  const descriptor = getPrintExportDescriptor(gender, side, format, size);

  return { blob, filename, descriptor };
}

export async function exportAndDownloadPrintableDesign(params: {
  gender: Gender;
  side: Side;
  layers: DesignLayer[];
  format: PrintExportFormat;
}): Promise<PrintExportResult> {
  const result = await exportPrintableDesign(params);
  downloadPrintBlob(result.blob, result.filename);
  return result;
}

export function listPrintableExportSlots(
  layersByTemplate: DesignLayersByTemplate,
  gender: Gender,
): { side: Side; hasDesign: boolean; exportable: boolean }[] {
  return (["front", "back"] as const).map((side) => {
    const layers = getLayersForSlot(layersByTemplate, gender, side);
    return {
      side,
      hasDesign: hasDesignInSlot(layersByTemplate, gender, side),
      exportable: hasExportablePrintableDesign(layers),
    };
  });
}

export function formatPrintExportSpecLine(
  _gender?: Gender,
  side: Side = "front",
  size: string = "M",
): string {
  const spec = getPrintExportSpec(side, size);
  return `PNG / PDF · ${spec.widthCm}×${spec.heightCm}cm · ${spec.widthPx}×${spec.heightPx}px · ${spec.dpi} DPI · 透明背景 · 僅可印刷區`;
}

export {
  cmToExportPx,
  getPrintExportDimensionsPx,
  getPrintExportSpec,
  renderPrintExportPng,
} from "./print-export-system";
