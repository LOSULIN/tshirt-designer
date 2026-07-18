/**
 * Phase 36C — Artwork Size ↔ Render 比例驗證（靜態數學）
 * 假設 scale=1、layer 置於 (0,0)，Artwork Size 設為 Garment Blue 滿版。
 */

const WORKSPACE = { width: 35, height: 50 };

const GARMENT_FRONT = {
  90: [18, 24],
  110: [22, 30],
  130: [25, 35],
  150: [29, 41],
  160: [32, 44],
  GS: [29, 41],
  GM: [32, 44],
  GL: [35, 46],
  S: [35, 46],
  M: [35, 50],
  L: [38, 52],
  XL: [40, 55],
  XXL: [42, 58],
  XXXL: [45, 60],
};

function designerLengthToWorkspace(lengthCm, garment, axis) {
  const workspaceLen = axis === "x" ? WORKSPACE.width : WORKSPACE.height;
  const garmentLen = axis === "x" ? garment[0] : garment[1];
  return lengthCm * (workspaceLen / garmentLen);
}

function workspaceRectToDesigner(rect, garment) {
  const scaleX = garment[0] / WORKSPACE.width;
  const scaleY = garment[1] / WORKSPACE.height;
  return {
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function cssPercent(designerRect, garment) {
  return {
    widthPct: (designerRect.width_cm / garment[0]) * 100,
    heightPct: (designerRect.height_cm / garment[1]) * 100,
  };
}

console.log("Size | Garment(cm) | Workspace Storage | Render CSS% | Match");
console.log("-----|-------------|-------------------|-------------|------");

let allOk = true;
for (const [size, garment] of Object.entries(GARMENT_FRONT)) {
  const designerW = garment[0];
  const designerH = garment[1];
  const storageW = designerLengthToWorkspace(designerW, garment, "x");
  const storageH = designerLengthToWorkspace(designerH, garment, "y");
  const designerRect = workspaceRectToDesigner(
    { width_cm: storageW, height_cm: storageH },
    garment,
  );
  const css = cssPercent(designerRect, garment);
  const ok =
    Math.abs(css.widthPct - 100) < 0.01 && Math.abs(css.heightPct - 100) < 0.01;
  if (!ok) allOk = false;
  console.log(
    `${size.padEnd(4)} | ${garment[0]}×${garment[1].toString().padEnd(8)} | ${storageW.toFixed(2)}×${storageH.toFixed(2).padEnd(11)} | ${css.widthPct.toFixed(1)}%×${css.heightPct.toFixed(1)}%`.padEnd(20) +
      ` | ${ok ? "✅" : "❌"}`,
  );
}

console.log(allOk ? "\nAll sizes: PASS" : "\nSome sizes: FAIL");
process.exit(allOk ? 0 : 1);
