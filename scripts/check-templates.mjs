import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TEMPLATES_DIR = join(ROOT, "public", "templates");

const REQUIRED = [
  "adult-male-front.png",
  "adult-male-back.png",
  "adult-female-front.png",
  "adult-female-back.png",
  "child-male-front.png",
  "child-male-back.png",
  "child-female-front.png",
  "child-female-back.png",
];

const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1536;

function readPngDimensions(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    format: "PNG",
  };
}

function readJpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let i = 2;
  while (i < buffer.length) {
    if (buffer[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buffer[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        height: buffer.readUInt16BE(i + 5),
        width: buffer.readUInt16BE(i + 7),
        format: "JPEG",
      };
    }
    const len = buffer.readUInt16BE(i + 2);
    i += 2 + len;
  }
  return null;
}

function readImageInfo(buffer) {
  return readPngDimensions(buffer) ?? readJpegDimensions(buffer);
}

let failed = false;
let warned = false;

console.log("檢查模特模板：public/templates/\n");

for (const file of REQUIRED) {
  const path = join(TEMPLATES_DIR, file);

  if (!existsSync(path)) {
    console.log(`✗ 缺少：${file}`);
    failed = true;
    continue;
  }

  const buffer = readFileSync(path);
  const info = readImageInfo(buffer);

  if (!info) {
    console.log(`✗ 無法讀取圖片：${file}`);
    failed = true;
    continue;
  }

  const { width, height, format } = info;
  const kb = Math.round(buffer.byteLength / 1024);
  const sizeOk =
    width === EXPECTED_WIDTH && height === EXPECTED_HEIGHT;
  const formatOk = format === "PNG";

  if (!sizeOk) {
    console.log(
      `⚠ 尺寸不符 ${file}：${width}×${height}（建議 ${EXPECTED_WIDTH}×${EXPECTED_HEIGHT}）· ${format} · ${kb} KB`,
    );
    warned = true;
    continue;
  }

  if (!formatOk) {
    console.log(
      `⚠ 格式為 ${format} 但副檔名為 .png：${file}（${width}×${height}，${kb} KB）— 建議轉存為 PNG`,
    );
    warned = true;
    continue;
  }

  console.log(`✓ ${file}（${width}×${height}，${kb} KB）`);
}

const extras = readdirSync(TEMPLATES_DIR).filter(
  (name) =>
    !REQUIRED.includes(name) &&
    !name.startsWith(".") &&
    name !== "README.md",
);

if (extras.length > 0) {
  console.log("\n多餘檔案（可刪除或重新命名）：");
  for (const name of extras) {
    console.log(`  - ${name}`);
  }
  warned = true;
}

console.log("");

if (failed) {
  console.log("請依 public/templates/README.md 補齊缺少的檔案。");
  process.exit(1);
}

if (warned) {
  console.log(
    "模板已可預覽，但尺寸或格式尚未符合上架規格；印刷區對位可能偏移，建議調整為 1024×1536 PNG。",
  );
  process.exit(0);
}

console.log("全部模特模板檢查通過。");
