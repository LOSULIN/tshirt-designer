/**
 * 驗證 Preview templatePxPerCm：29.6 cm 設計寬度應占 M 胸寬 50 cm 的 59%
 */

const TEMPLATE_PX_PER_CM = 12.24;
const TEMPLATE_CHEST_PX = 612;
const OLD_PX_PER_CM = 10;
const M_CHEST_CM = 50;
const DESIGN_WIDTH_CM = 29.6;

const printW = 35 * TEMPLATE_PX_PER_CM;
const printH = 50 * TEMPLATE_PX_PER_CM;
const designPx = DESIGN_WIDTH_CM * TEMPLATE_PX_PER_CM;
const chestRatio = designPx / TEMPLATE_CHEST_PX;
const expectedRatio = DESIGN_WIDTH_CM / M_CHEST_CM;

const oldDesignPx = DESIGN_WIDTH_CM * OLD_PX_PER_CM;
const oldChestRatio = oldDesignPx / TEMPLATE_CHEST_PX;

console.log("=== Preview px/cm 對照 ===");
console.log(`修改前（overlay）: ${OLD_PX_PER_CM} px/cm → 印刷區 ${35 * OLD_PX_PER_CM}×${50 * OLD_PX_PER_CM} px`);
console.log(
  `修改後（overlay）: ${TEMPLATE_PX_PER_CM} px/cm → 印刷區 ${printW}×${printH} px`,
);
console.log(`模板胸寬（實測）: ${TEMPLATE_CHEST_PX} px = ${M_CHEST_CM} cm`);
console.log("");
console.log("=== 29.6 cm 設計物件 vs M 胸寬 50 cm ===");
console.log(
  `修改前視覺: ${oldDesignPx.toFixed(1)} px / ${TEMPLATE_CHEST_PX} px = ${(oldChestRatio * 100).toFixed(1)}%`,
);
console.log(
  `修改後視覺: ${designPx.toFixed(1)} px / ${TEMPLATE_CHEST_PX} px = ${(chestRatio * 100).toFixed(1)}%`,
);
console.log(`目標比例: ${(expectedRatio * 100).toFixed(1)}%`);
console.log("");

const pass =
  Math.abs(chestRatio - expectedRatio) < 0.005 &&
  Math.abs(oldChestRatio - 0.48) < 0.02;

if (pass) {
  console.log("✓ 驗證通過");
} else {
  console.error("✗ 驗證失敗");
  process.exitCode = 1;
}
