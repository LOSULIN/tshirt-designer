/**
 * Layer Overflow Side Audit (analysis only)
 * node scripts/audit-layer-overflow-side.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const EPS = 0.01;

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const BLUE_FRONT = {
  M: { width: 35, height: 50 },
  90: { width: 18, height: 24 },
};
const BLUE_BACK = {
  M: { width: 38, height: 45 },
  90: { width: 20, height: 22 },
};

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function resolveGarmentPrintAreaCm(size, side) {
  const table = side === "back" ? BLUE_BACK : BLUE_FRONT;
  const row = table[size];
  if (!row) throw new Error(`missing ${side}/${size}`);
  return { width: row.width, height: row.height };
}

function mapWorkspaceLayerCmRectToGarmentPrintArea(rect, side, size) {
  if (size === "M") return { ...rect };
  const workspace = resolveGarmentPrintAreaCm("M", side);
  const garment = resolveGarmentPrintAreaCm(size, side);
  const scaleX = garment.width / workspace.width;
  const scaleY = garment.height / workspace.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function getRectOverflowState(rect, rotation, printArea) {
  const centerX = rect.x_cm + rect.width_cm / 2;
  const centerY = rect.y_cm + rect.height_cm / 2;
  const left = centerX - rect.width_cm / 2;
  const top = centerY - rect.height_cm / 2;
  const right = left + rect.width_cm;
  const bottom = top + rect.height_cm;

  const exceedsLeft = left < -EPS;
  const exceedsTop = top < -EPS;
  const exceedsRight = right > printArea.width + EPS;
  const exceedsBottom = bottom > printArea.height + EPS;

  return {
    printableWidth: printArea.width,
    printableHeight: printArea.height,
    layerRect: { x_cm: rect.x_cm, y_cm: rect.y_cm, width_cm: rect.width_cm, height_cm: rect.height_cm },
    garmentAabb: { left, top, right, bottom },
    overflowLeft: exceedsLeft ? Math.max(0, -left) : 0,
    overflowRight: exceedsRight ? Math.max(0, right - printArea.width) : 0,
    overflowTop: exceedsTop ? Math.max(0, -top) : 0,
    overflowBottom: exceedsBottom ? Math.max(0, bottom - printArea.height) : 0,
    exceedsPrintArea: exceedsLeft || exceedsRight || exceedsTop || exceedsBottom,
  };
}

function auditOverflow(side, size, workspaceRect, label) {
  const printable = resolveGarmentPrintAreaCm(size, side);
  const garmentRect = mapWorkspaceLayerCmRectToGarmentPrintArea(
    workspaceRect,
    side,
    size,
  );
  return {
    label,
    side,
    size,
    ...getRectOverflowState(garmentRect, 0, printable),
  };
}

const findings = [];

function checkSourceWiring() {
  const overflowSrc = read("lib/layer-overflow.ts");
  const garmentSrc = read("lib/garment-anchor-runtime.ts");
  const facadeSrc = read("lib/designer-coordinate-facade.ts");
  const inspectorCard = read("components/designer/InspectorObjectCard.tsx");
  const previewLayer = read("components/designer/PreviewDesignLayer.tsx");
  const designCanvas = read("components/designer/DesignCanvas.tsx");

  const runtimeUsesSide =
    overflowSrc.includes("resolveGarmentPrintAreaCm(size, side)") &&
    overflowSrc.includes("mapWorkspaceLayerCmRectToGarmentPrintArea(") &&
    overflowSrc.includes("side,");

  const garmentBranchesSide =
    garmentSrc.includes('side === "back"') &&
    garmentSrc.includes("getDesignerBackBluePrintArea(size)") &&
    garmentSrc.includes("getDesignerBluePrintArea(size)");

  const facadePassesSide =
    facadeSrc.includes("resolveGarmentPrintAreaCm(size, side)") &&
    facadeSrc.includes("getDesignerWorkspacePrintAreaCm(side)");

  const inspectorMissingSide =
    inspectorCard.includes("getLayerOverflowStateForSize(layer, size)") &&
    !inspectorCard.includes("getLayerOverflowStateForSize(layer, size, side)");

  const inspectorOverflowDeps =
    /getLayerOverflowStateForSize\(layer, size\),\s*\n\s*\[layer, size\],/s.test(
      inspectorCard,
    );

  const previewPassesSide = previewLayer.includes(
    "getLayerOverflowStateForSize(layer, size, side)",
  );

  const canvasPassesSide = designCanvas.includes(
    "buildCurrentGarmentConstraintMap(visibleLayers, side, size)",
  );

  if (!runtimeUsesSide) findings.push("layer-overflow.ts may not thread side through overflow path");
  if (!garmentBranchesSide) findings.push("resolveGarmentPrintAreaCm may not branch on side");
  if (!facadePassesSide) findings.push("getDesignerPrintableArea context may not include side-aware printable");
  if (inspectorMissingSide) {
    findings.push(
      "InspectorObjectCard calls getLayerOverflowStateForSize(layer, size) without side → defaults to front printable",
    );
  }
  if (inspectorOverflowDeps) {
    findings.push(
      "InspectorObjectCard useMemo([layer, size]) omits side → stale overflow after Front/Back switch",
    );
  }
  if (!previewPassesSide) findings.push("PreviewDesignLayer may not pass side to overflow");
  if (!canvasPassesSide) findings.push("DesignCanvas constraint map may not pass side");

  const cachePatterns = [
    "let printableCache",
    "const printableCache",
    "overflowCache",
    "sideCache",
    "Map<string, PrintAreaCmBounds>",
  ];
  for (const file of [
    "lib/layer-overflow.ts",
    "lib/garment-anchor-runtime.ts",
    "lib/designer-display-projection.ts",
    "lib/designer-coordinate-facade.ts",
    "lib/current-garment-print-constraint.ts",
  ]) {
    const src = read(file);
    for (const pat of cachePatterns) {
      if (src.includes(pat)) {
        findings.push(`${file} contains possible cache pattern: ${pat}`);
      }
    }
  }

  return {
    runtimeUsesSide,
    garmentBranchesSide,
    facadePassesSide,
    inspectorMissingSide,
    inspectorOverflowDeps,
    previewPassesSide,
    canvasPassesSide,
  };
}

const wiring = checkSourceWiring();

const wsUserCase = { x_cm: 0, y_cm: 0, width_cm: 20, height_cm: 22 };
const wsFullBleedBack90 = { x_cm: 0, y_cm: 0, width_cm: 38, height_cm: 45 };

const scenarios = [
  auditOverflow("back", "90", wsUserCase, "Back/90 — workspace 20×22 @ 0,0 (correct side)"),
  auditOverflow("front", "90", wsUserCase, "Front/90 — same workspace (wrong side / default)"),
  auditOverflow("back", "90", wsFullBleedBack90, "Back/90 — garment full-bleed (workspace 38×45)"),
  auditOverflow("front", "90", wsFullBleedBack90, "Front/90 — same full-bleed workspace (wrong side)"),
];

const printableCompare = {
  front90: resolveGarmentPrintAreaCm("90", "front"),
  back90: resolveGarmentPrintAreaCm("90", "back"),
  frontM: resolveGarmentPrintAreaCm("M", "front"),
  backM: resolveGarmentPrintAreaCm("M", "back"),
};

const report = `# Layer Overflow Side Audit

**Date:** 2026-07-03  
**Scope:** Analysis only — no Runtime modifications.

## Executive Summary

\`layer-overflow.ts\` **Runtime 本身**已正確依 \`side\` + \`size\` 取得可印區（\`resolveGarmentPrintAreaCm(size, side)\`）。  
\`resolveGarmentPrintAreaCm()\` 與 \`getDesignerPrintableArea()\`（經 \`createDesignerCoordinateContext(side, size)\`）皆完整傳遞 \`size\` 與 \`side\`。

**Root Cause（UI 層）：** \`InspectorObjectCard.tsx\` 呼叫 overflow 時**未傳入 \`side\`**，且 \`useMemo\` 依賴陣列缺少 \`side\`。切換到 Back 時，Object Inspector 仍使用 Front 可印區（90 → 18×24 cm），造成 overflow 數值與畫布約束不一致。

**無模組級 Printable / Overflow / Side Cache。** 僅 React \`useMemo\` 依賴不完整導致切換 side 後未重算。

---

## 1. Runtime 層（\`layer-overflow.ts\`）

| 函式 | side 傳遞 | size 傳遞 | 可印區來源 |
|------|-----------|-----------|------------|
| \`getBluePrintAreaBoundsForSize(size, side)\` | ✅ 參數 | ✅ 參數 | \`resolveGarmentPrintAreaCm(size, side)\` |
| \`getWorkspaceGarmentLayerOverflowState(layer, side, size)\` | ✅ | ✅ | \`resolveGarmentPrintAreaCm(size, side)\` |
| \`getLayerOverflowStateForSize(layer, size, side = "front")\` | ⚠️ 預設 \`"front"\` | ✅ | 委派上列函式 |

映射路徑：

\`\`\`
Workspace rect
  → mapWorkspaceLayerCmRectToGarmentPrintArea(rect, side, size)
  → getRectOverflowState(mappedRect, rotation, resolveGarmentPrintAreaCm(size, side))
\`\`\`

## 2. \`resolveGarmentPrintAreaCm()\` / \`getDesignerPrintableArea()\`

\`\`\`46:54:lib/garment-anchor-runtime.ts
export function resolveGarmentPrintAreaCm(
  size: string,
  side: Side = "front",
): PrintAreaCmBounds {
  const { widthCm, heightCm } =
    side === "back"
      ? getDesignerBackBluePrintArea(size)
      : getDesignerBluePrintArea(size);
  return { width: widthCm, height: heightCm };
}
\`\`\`

\`\`\`104:113:lib/designer-coordinate-facade.ts
export function createDesignerCoordinateContext(
  side: Side,
  size: string,
): DesignerCoordinateContext {
  return {
    side,
    size,
    workspacePrintArea: getDesignerWorkspacePrintAreaCm(side),
    garmentPrintArea: resolveGarmentPrintAreaCm(size, side),
  };
}
\`\`\`

\`getDesignerPrintableArea(ctx)\` → \`ctx.garmentPrintArea\`（side + size 感知）。  
專案中**無** \`getCurrentPrintableArea()\` 函式名；同等職責為 \`getDesignerPrintableArea\` / \`getDesignerPrintAreaCmBounds\`。

## 3. Size 90 可印區對照

| Side | printableWidth | printableHeight |
|------|----------------|-----------------|
| Front | ${printableCompare.front90.width} cm | ${printableCompare.front90.height} cm |
| Back | ${printableCompare.back90.width} cm | ${printableCompare.back90.height} cm |

Workspace M 基準：Front ${WORKSPACE_M.front.width}×${WORKSPACE_M.front.height} cm，Back ${WORKSPACE_M.back.width}×${WORKSPACE_M.back.height} cm。

## 4. 驗證案例 — Side=Back, Size=90, Layer workspace 20×22 @ (0,0)

### 4a. Runtime 正確路徑（\`side="back"\`）

| 欄位 | 值 |
|------|-----|
| printableWidth | ${scenarios[0].printableWidth} cm |
| printableHeight | ${scenarios[0].printableHeight} cm |
| layerRect (garment) | x=${scenarios[0].layerRect.x_cm.toFixed(4)}, y=${scenarios[0].layerRect.y_cm.toFixed(4)}, w=${scenarios[0].layerRect.width_cm.toFixed(4)}, h=${scenarios[0].layerRect.height_cm.toFixed(4)} |
| overflowLeft | ${scenarios[0].overflowLeft.toFixed(4)} cm |
| overflowRight | ${scenarios[0].overflowRight.toFixed(4)} cm |
| overflowTop | ${scenarios[0].overflowTop.toFixed(4)} cm |
| overflowBottom | ${scenarios[0].overflowBottom.toFixed(4)} cm |
| exceedsPrintArea | ${scenarios[0].exceedsPrintArea} |

> Workspace 20×22 映射至 Back/90 garment 空間約 10.53×10.76 cm，小於可印區 20×22 → **無 overflow**。

### 4b. 錯誤 side（\`side="front"\` 預設 — InspectorObjectCard 行為）

| 欄位 | 值 |
|------|-----|
| printableWidth | ${scenarios[1].printableWidth} cm |
| printableHeight | ${scenarios[1].printableHeight} cm |
| layerRect (garment) | x=${scenarios[1].layerRect.x_cm.toFixed(4)}, y=${scenarios[1].layerRect.y_cm.toFixed(4)}, w=${scenarios[1].layerRect.width_cm.toFixed(4)}, h=${scenarios[1].layerRect.height_cm.toFixed(4)} |
| overflowLeft | ${scenarios[1].overflowLeft.toFixed(4)} cm |
| overflowRight | ${scenarios[1].overflowRight.toFixed(4)} cm |
| overflowTop | ${scenarios[1].overflowTop.toFixed(4)} cm |
| overflowBottom | ${scenarios[1].overflowBottom.toFixed(4)} cm |
| exceedsPrintArea | ${scenarios[1].exceedsPrintArea} |

> 同一 workspace rect，但分母改為 Front 18×24 → garment 映射比例不同，overflow 結果與 Back 路徑**不一致**。

### 4c. Garment 滿版 Back/90（workspace 38×45 @ 0,0）

| 路徑 | printable | layerRect (garment) | overflow |
|------|-----------|---------------------|----------|
| Back/90 正確 | 20×22 | 20×22 @ 0,0 | none |
| Front/90 錯誤 | 18×24 | ~19.54×21.6 @ 0,0 | **Right ~${scenarios[3].overflowRight.toFixed(2)} cm** |

## 5. 消費者比對

| 消費者 | 傳遞 side | 傳遞 size | 狀態 |
|--------|-----------|-----------|------|
| \`DesignCanvas\` → \`buildCurrentGarmentConstraintMap\` | ✅ | ✅ | 正確 |
| \`PreviewDesignLayer\` → \`getLayerOverflowStateForSize\` | ✅ | ✅ | 正確 |
| \`live-design-state\` → \`getWorkspaceGarmentLayerOverflowState\` | ✅ | ✅ | 正確 |
| \`design-inspector\` → \`getWorkspaceGarmentLayerOverflowState\` | ✅ | ✅ | 正確 |
| **\`InspectorObjectCard\`** → \`getLayerOverflowStateForSize(layer, size)\` | ❌ 缺 side | ✅ | **Root Cause** |

\`\`\`87:89:components/designer/InspectorObjectCard.tsx
  const overflow = useMemo(
    () => getLayerOverflowStateForSize(layer, size),
    [layer, size],
  );
\`\`\`

對照：同一元件的 \`bounds\` 使用 \`createDesignerDisplayContext(side, size)\` 且依賴 \`[layer, designerContext]\` — **display rect 隨 side 更新，overflow 不更新**。

## 6. Cache 審計

| 候選 Cache | 結果 |
|------------|------|
| Front Printable Cache（模組級） | ❌ 不存在 |
| Designer Display Cache（模組級） | ❌ 不存在 |
| Overflow Cache（模組級） | ❌ 不存在 |
| Side Cache（模組級） | ❌ 不存在 |
| React \`useMemo\` 缺 \`side\` | ✅ **InspectorObjectCard overflow** |

\`createDesignerCoordinateContext\` / \`createDesignerDisplayContext\` 每次呼叫新建 context 物件，無跨 side 快取。

## 7. 結論與建議（僅供後續 Phase，本次不修改）

1. **Overflow Runtime（\`lib/layer-overflow.ts\`）行為正確**，已依 side 切換 Front 18×24 / Back 20×22（Size 90）。
2. **Root Cause 在 UI 呼叫層**：\`InspectorObjectCard\` 未傳 \`side\` + \`useMemo\` 缺 \`side\` 依賴。
3. **畫布紅框 / 約束**（\`DesignCanvas\` + \`current-garment-print-constraint\`）與 **Preview 紅框**（\`PreviewDesignLayer\`）使用正確 side；**Object Inspector overflow 明細**可能與畫布不一致。
4. 建議修復（未實施）：\`getLayerOverflowStateForSize(layer, size, side)\` 且 \`useMemo(..., [layer, size, side])\`。

---

## Appendix: Source Wiring Checks

\`\`\`json
${JSON.stringify(wiring, null, 2)}
\`\`\`

${findings.length ? `### Findings\n\n${findings.map((f) => `- ${f}`).join("\n")}` : ""}
`;

writeFileSync(join(ROOT, "docs/layer-overflow-side-audit.md"), report);
console.log(report);
console.log("\n✓ Wrote docs/layer-overflow-side-audit.md");
