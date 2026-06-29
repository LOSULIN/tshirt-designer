/**
 * Design Export System — 完整校稿輸出（mockup / print / proof sheet）。
 * 資料來源：design layers + live designState（cm 為唯一真實資料）。
 */

import type { Gender, Material, ShirtColor, Side } from "./constants";
import { hasExportablePrintableDesign } from "./print-export";
import {
  buildPrintExportFileName,
  exportPrintableDesign,
  type PrintExportFormat,
} from "./print-export";
import {
  buildMockupExportFileName,
  renderMockupPreviewPng,
} from "./mockup-export";
import {
  buildProofSheetFileName,
  renderProofSheetPdf,
} from "./proof-sheet-export";
import {
  buildExportDebugReport,
  logExportDebugReport,
} from "./export-debug";
import type { DesignLayer } from "./types";

export type DesignExportFileKind = "mockup" | "print" | "proof";

export interface DesignExportFile {
  kind: DesignExportFileKind;
  blob: Blob;
  filename: string;
  mimeType: string;
}

export interface DesignExportInput {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size: string;
  layers: DesignLayer[];
  material?: Material;
  printFormat?: PrintExportFormat;
}

export interface DesignExportBundle {
  mockup: DesignExportFile;
  print: DesignExportFile;
  proof: DesignExportFile;
}

export function hasExportableDesign(layers: DesignLayer[]): boolean {
  return hasExportablePrintableDesign(layers);
}

export function downloadExportBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportDesignBundle(
  input: DesignExportInput,
): Promise<DesignExportBundle> {
  const { gender, side, shirtColor, size, layers, material, printFormat = "png" } = input;

  if (!hasExportableDesign(layers)) {
    throw new Error("此面向尚無可輸出的設計內容");
  }

  const debugReport = buildExportDebugReport(layers, side);
  logExportDebugReport(debugReport);

  const [mockupBlob, printResult, proofBlob] = await Promise.all([
    renderMockupPreviewPng({ shirtColor, side, layers }),
    exportPrintableDesign({ gender, side, layers, format: printFormat }),
    renderProofSheetPdf({ gender, side, shirtColor, size, layers, material }),
  ]);

  return {
    mockup: {
      kind: "mockup",
      blob: mockupBlob,
      filename: buildMockupExportFileName(side),
      mimeType: "image/png",
    },
    print: {
      kind: "print",
      blob: printResult.blob,
      filename: printResult.filename,
      mimeType: printFormat === "pdf" ? "application/pdf" : "image/png",
    },
    proof: {
      kind: "proof",
      blob: proofBlob,
      filename: buildProofSheetFileName(gender, side, size),
      mimeType: "application/pdf",
    },
  };
}

export async function exportAndDownloadDesignBundle(
  input: DesignExportInput,
): Promise<DesignExportBundle> {
  const bundle = await exportDesignBundle(input);
  downloadExportBlob(bundle.mockup.blob, bundle.mockup.filename);
  downloadExportBlob(bundle.print.blob, bundle.print.filename);
  downloadExportBlob(bundle.proof.blob, bundle.proof.filename);
  return bundle;
}

export async function exportDesignFile(
  input: DesignExportInput,
  kind: DesignExportFileKind,
): Promise<DesignExportFile> {
  const bundle = await exportDesignBundle(input);
  return bundle[kind];
}

export { buildPrintExportFileName };
