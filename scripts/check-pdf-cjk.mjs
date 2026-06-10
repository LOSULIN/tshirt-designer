/**
 * 驗證：PDF 中文輸出（pdf-fontkit + Noto Sans TC subset）
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "pdf-fontkit";
import { PDFDocument, rgb } from "pdf-lib";

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

const fontPath = join(root, "public/fonts/noto-sans-tc-400.woff");
assert(
  readFileSync(fontPath).byteLength > 100_000,
  "Noto Sans TC 字型檔存在",
);

const pdfFontsSrc = readFileSync(join(root, "lib/pdf-fonts.ts"), "utf8");
assert(
  pdfFontsSrc.includes("pdf-fontkit"),
  "lib/pdf-fonts.ts 使用 pdf-fontkit",
);

const sampleText = "經典純棉 100% 精梳純棉 180g · 申請人王小明";

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const fontBytes = readFileSync(fontPath);
const font = await doc.embedFont(fontBytes, { subset: true });
const page = doc.addPage([520, 120]);
page.drawText(sampleText, {
  x: 24,
  y: 60,
  size: 12,
  font,
  color: rgb(0, 0, 0),
});

const pdfBytes = await doc.save();
assert(pdfBytes.length > 3_000, "subset PDF 已產生（含 CJK 字形）");

console.log("\nPDF 中文輸出校驗完成。");
