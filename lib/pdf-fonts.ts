/**
 * PDF 用 CJK 字型 — pdf-lib StandardFonts 僅支援 WinAnsi，無法輸出中文。
 * 字型檔由 scripts/copy-pdf-fonts.mjs 複製至 public/fonts。
 */

import type { PDFDocument, PDFFont } from "pdf-lib";

export interface PdfCjkFonts {
  regular: PDFFont;
  bold: PDFFont;
}

function fontPublicName(weight: 400 | 700): string {
  return `noto-sans-tc-${weight}.woff`;
}

async function loadFontBytes(weight: 400 | 700): Promise<Uint8Array> {
  const fileName = fontPublicName(weight);

  if (typeof window === "undefined") {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const filePath = join(process.cwd(), "public", "fonts", fileName);
    return new Uint8Array(readFileSync(filePath));
  }

  const res = await fetch(`/fonts/${fileName}`);
  if (!res.ok) {
    throw new Error(`無法載入 PDF 字型：${fileName}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** 註冊 fontkit 並嵌入 Noto Sans TC（subset，支援繁中常用字） */
export async function embedPdfCjkFonts(doc: PDFDocument): Promise<PdfCjkFonts> {
  // pdf-fontkit 修正 @pdf-lib/fontkit 的 CJK subset 亂碼問題
  const fontkit = (await import("pdf-fontkit")).default;
  doc.registerFontkit(fontkit);

  const [regularBytes, boldBytes] = await Promise.all([
    loadFontBytes(400),
    loadFontBytes(700),
  ]);

  const [regular, bold] = await Promise.all([
    doc.embedFont(regularBytes, { subset: true }),
    doc.embedFont(boldBytes, { subset: true }),
  ]);

  return { regular, bold };
}
