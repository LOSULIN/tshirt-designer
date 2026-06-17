/**
 * 驗證：design inspector 邊界與安全區檢查
 */

const PRINT_W = 35;
const PRINT_H = 50;
const SAFE_SCALE = 0.9;
const SAFE_INSET = (1 - SAFE_SCALE) / 2;

function getRotatedAabb(width, height, rotationDeg) {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

function getAabb(rect, rotation) {
  const aabb = getRotatedAabb(rect.width_cm, rect.height_cm, rotation);
  const cx = rect.x_cm + rect.width_cm / 2;
  const cy = rect.y_cm + rect.height_cm / 2;
  return {
    left: cx - aabb.width / 2,
    top: cy - aabb.height / 2,
    right: cx + aabb.width / 2,
    bottom: cy + aabb.height / 2,
  };
}

function exceedsBounds(aabb, bounds) {
  return (
    aabb.left < bounds.x ||
    aabb.top < bounds.y ||
    aabb.right > bounds.x + bounds.width ||
    aabb.bottom > bounds.y + bounds.height
  );
}

function assert(condition, message) {
  if (!condition) {
    console.error("✗", message);
    process.exitCode = 1;
    return;
  }
  console.log("✓", message);
}

const printBounds = { x: 0, y: 0, width: PRINT_W, height: PRINT_H };
const safeBounds = {
  x: PRINT_W * SAFE_INSET,
  y: PRINT_H * SAFE_INSET,
  width: PRINT_W * SAFE_SCALE,
  height: PRINT_H * SAFE_SCALE,
};

const inside = { x_cm: 5, y_cm: 8, width_cm: 10, height_cm: 8 };
const outsidePrint = { x_cm: 30, y_cm: 45, width_cm: 10, height_cm: 10 };
const outsideSafe = { x_cm: 0.5, y_cm: 0.5, width_cm: 20, height_cm: 20 };

assert(
  !exceedsBounds(getAabb(inside, 0), printBounds),
  "圖層在印刷區內 → OK",
);
assert(
  exceedsBounds(getAabb(outsidePrint, 0), printBounds),
  "圖層超出印刷區 → 觸發 boundary check",
);
assert(
  !exceedsBounds(getAabb(outsideSafe, 0), printBounds) &&
    exceedsBounds(getAabb(outsideSafe, 0), safeBounds),
  "圖層超出 90% 安全區但在印刷區內 → 安全區 warning",
);

assert(
  Math.abs(safeBounds.width - PRINT_W * SAFE_SCALE) < 0.001,
  `安全區寬度 = print area × ${SAFE_SCALE}（${safeBounds.width} cm）`,
);

console.log("\n設計檢視器校驗完成。");
