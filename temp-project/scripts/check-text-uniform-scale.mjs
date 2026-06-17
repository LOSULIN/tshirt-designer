/**
 * 驗證文字 auto-fit：固定基準字級量測 → placement 框 targetFontSize。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const src = readFileSync(join(root, "lib/text-style.ts"), "utf8");

assert(
  src.includes("TEXT_AUTOFIT_MARGIN_RATIO = 0.95"),
  "auto-fit 保留 5% 安全邊距",
);
assert(
  src.includes("TEXT_AUTOFIT_REFERENCE_FONT_SIZE_CM"),
  "keepRatio:false 使用固定基準字級量測",
);
assert(
  src.includes("measureRichTextGlyphBoundsCmWithPxPerCm") &&
    src.includes("measureRichTextGlyphBoundsPx"),
  "共用 Canvas measureText 量測 glyph",
);
assert(
  src.includes(
    "const availableWidthCm = placementRect.width_cm * TEXT_AUTOFIT_MARGIN_RATIO",
  ) &&
    src.includes(
      "const availableHeightCm = placementRect.height_cm * TEXT_AUTOFIT_MARGIN_RATIO",
    ),
  "available 區域來自 placementRect",
);
assert(
  src.includes("const scaleX = availableWidthCm / glyphWidthCm") &&
    src.includes("const scaleY = availableHeightCm / glyphHeightCm"),
  "scaleX / scaleY 使用 glyph 與 available 比例",
);
assert(
  src.includes("const uniformScale = Math.min(scaleX, scaleY)"),
  "uniformScale = Math.min(scaleX, scaleY)",
);
assert(
  src.includes(
    "TEXT_AUTOFIT_REFERENCE_FONT_SIZE_CM * uniformScale",
  ),
  "keepRatio:false targetFontSize = 基準字級 × uniformScale",
);
assert(
  src.includes("scales.targetFontSize_cm"),
  "render 直接使用 targetFontSize（不寫回 layer）",
);
assert(
  src.includes("getRichTextRenderMetrics(layer, placementRect, pxPerCm)"),
  "draw 與 auto-fit 共用 pxPerCm",
);
assert(
  src.includes("letterSpacing_cm: style.letterSpacing_cm * uniformScale"),
  "letterSpacing 套用 uniformScale",
);
assert(
  src.includes("usesTextPlacementAutoFit") &&
    src.includes("layer.keepRatio === false"),
  "keepRatio:false 版型框才 auto-fit",
);

console.log("check-text-uniform-scale: OK");
