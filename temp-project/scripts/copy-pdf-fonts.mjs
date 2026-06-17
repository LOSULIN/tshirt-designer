/**
 * 複製 Noto Sans TC 至 public/fonts，供瀏覽器與伺服器 PDF 產生使用。
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules", "@fontsource", "noto-sans-tc", "files");
const destDir = join(root, "public", "fonts");

if (!existsSync(srcDir)) {
  console.warn("copy-pdf-fonts: @fontsource/noto-sans-tc 未安裝，略過");
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

for (const weight of [400, 700]) {
  const src = join(
    srcDir,
    `noto-sans-tc-chinese-traditional-${weight}-normal.woff`,
  );
  const dest = join(destDir, `noto-sans-tc-${weight}.woff`);
  copyFileSync(src, dest);
  console.log(`copy-pdf-fonts: ${dest}`);
}
