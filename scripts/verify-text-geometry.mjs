/**
 * 驗證旋轉文字可貼齊印刷區四邊（0°/90°/180°/270°）。
 */

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function getRotatedAabb(width, height, rotation) {
  const rad = degToRad(rotation);
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

function clampPositionToPrintArea(x, y, width, height, scale, rotation, printArea) {
  const scaled = { width: width * scale, height: height * scale };
  const aabb = getRotatedAabb(scaled.width, scaled.height, rotation);
  const minX = (aabb.width - scaled.width) / 2;
  const maxX = printArea.width - aabb.width / 2 - scaled.width / 2;
  const minY = (aabb.height - scaled.height) / 2;
  const maxY = printArea.height - aabb.height / 2 - scaled.height / 2;
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
    minX,
    maxX,
    minY,
    maxY,
    aabb,
    scaled,
  };
}

function visualAabb(x, y, w, h, aabb) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return {
    left: cx - aabb.width / 2,
    right: cx + aabb.width / 2,
    top: cy - aabb.height / 2,
    bottom: cy + aabb.height / 2,
  };
}

const printArea = { width: 35, height: 50 };
const w = 20;
const h = 5;
const rotations = [0, 90, 180, 270];
const epsilon = 0.01;
let failed = false;

for (const rotation of rotations) {
  let rotationOk = true;
  const { minX, maxX, minY, maxY, aabb, scaled } = clampPositionToPrintArea(
    0,
    0,
    w,
    h,
    1,
    rotation,
    printArea,
  );

  const edges = {
    left: visualAabb(
      clampPositionToPrintArea(minX, 0, w, h, 1, rotation, printArea).x,
      0,
      scaled.width,
      scaled.height,
      aabb,
    ).left,
    right: visualAabb(
      clampPositionToPrintArea(maxX, 0, w, h, 1, rotation, printArea).x,
      0,
      scaled.width,
      scaled.height,
      aabb,
    ).right,
    top: visualAabb(
      0,
      clampPositionToPrintArea(0, minY, w, h, 1, rotation, printArea).y,
      scaled.width,
      scaled.height,
      aabb,
    ).top,
    bottom: visualAabb(
      0,
      clampPositionToPrintArea(0, maxY, w, h, 1, rotation, printArea).y,
      scaled.width,
      scaled.height,
      aabb,
    ).bottom,
  };

  const checks = [
    ["left", edges.left, 0],
    ["right", edges.right, printArea.width],
    ["top", edges.top, 0],
    ["bottom", edges.bottom, printArea.height],
  ];

  for (const [name, value, expected] of checks) {
    if (Math.abs(value - expected) > epsilon) {
      console.error(
        `✗ ${rotation}° ${name}: ${value.toFixed(3)} ≠ ${expected} (min/max Y=${minY.toFixed(2)}..${maxY.toFixed(2)})`,
      );
      failed = true;
      rotationOk = false;
    }
  }

  if (rotationOk) {
    console.log(
      `✓ ${rotation}° 四邊可貼齊 (bottom y=${maxY.toFixed(2)}, visual bottom=${edges.bottom.toFixed(2)})`,
    );
  }
}

if (failed) process.exit(1);
console.log("\n文字旋轉邊界驗證完成。");
