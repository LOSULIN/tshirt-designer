# Layer Overflow Side Audit

**Date:** 2026-07-03  
**Scope:** Analysis only — no Runtime modifications.

## Executive Summary

`layer-overflow.ts` **Runtime 本身**已正確依 `side` + `size` 取得可印區（`resolveGarmentPrintAreaCm(size, side)`）。  
`resolveGarmentPrintAreaCm()` 與 `getDesignerPrintableArea()`（經 `createDesignerCoordinateContext(side, size)`）皆完整傳遞 `size` 與 `side`。

**Root Cause（UI 層）：** `InspectorObjectCard.tsx` 呼叫 overflow 時**未傳入 `side`**，且 `useMemo` 依賴陣列缺少 `side`。切換到 Back 時，Object Inspector 仍使用 Front 可印區（90 → 18×24 cm），造成 overflow 數值與畫布約束不一致。

**無模組級 Printable / Overflow / Side Cache。** 僅 React `useMemo` 依賴不完整導致切換 side 後未重算。

---

## 1. Runtime 層（`layer-overflow.ts`）

| 函式 | side 傳遞 | size 傳遞 | 可印區來源 |
|------|-----------|-----------|------------|
| `getBluePrintAreaBoundsForSize(size, side)` | ✅ 參數 | ✅ 參數 | `resolveGarmentPrintAreaCm(size, side)` |
| `getWorkspaceGarmentLayerOverflowState(layer, side, size)` | ✅ | ✅ | `resolveGarmentPrintAreaCm(size, side)` |
| `getLayerOverflowStateForSize(layer, size, side = "front")` | ⚠️ 預設 `"front"` | ✅ | 委派上列函式 |

映射路徑：

```
Workspace rect
  → mapWorkspaceLayerCmRectToGarmentPrintArea(rect, side, size)
  → getRectOverflowState(mappedRect, rotation, resolveGarmentPrintAreaCm(size, side))
```

## 2. `resolveGarmentPrintAreaCm()` / `getDesignerPrintableArea()`

```46:54:lib/garment-anchor-runtime.ts
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
```

```104:113:lib/designer-coordinate-facade.ts
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
```

`getDesignerPrintableArea(ctx)` → `ctx.garmentPrintArea`（side + size 感知）。  
專案中**無** `getCurrentPrintableArea()` 函式名；同等職責為 `getDesignerPrintableArea` / `getDesignerPrintAreaCmBounds`。

## 3. Size 90 可印區對照

| Side | printableWidth | printableHeight |
|------|----------------|-----------------|
| Front | 18 cm | 24 cm |
| Back | 20 cm | 22 cm |

Workspace M 基準：Front 35×50 cm，Back 38×45 cm。

## 4. 驗證案例 — Side=Back, Size=90, Layer workspace 20×22 @ (0,0)

### 4a. Runtime 正確路徑（`side="back"`）

| 欄位 | 值 |
|------|-----|
| printableWidth | 20 cm |
| printableHeight | 22 cm |
| layerRect (garment) | x=0.0000, y=0.0000, w=10.5263, h=10.7556 |
| overflowLeft | 0.0000 cm |
| overflowRight | 0.0000 cm |
| overflowTop | 0.0000 cm |
| overflowBottom | 0.0000 cm |
| exceedsPrintArea | false |

> Workspace 20×22 映射至 Back/90 garment 空間約 10.53×10.76 cm，小於可印區 20×22 → **無 overflow**。

### 4b. 錯誤 side（`side="front"` 預設 — InspectorObjectCard 行為）

| 欄位 | 值 |
|------|-----|
| printableWidth | 18 cm |
| printableHeight | 24 cm |
| layerRect (garment) | x=0.0000, y=0.0000, w=10.2857, h=10.5600 |
| overflowLeft | 0.0000 cm |
| overflowRight | 0.0000 cm |
| overflowTop | 0.0000 cm |
| overflowBottom | 0.0000 cm |
| exceedsPrintArea | false |

> 同一 workspace rect，但分母改為 Front 18×24 → garment 映射比例不同，overflow 結果與 Back 路徑**不一致**。

### 4c. Garment 滿版 Back/90（workspace 38×45 @ 0,0）

| 路徑 | printable | layerRect (garment) | overflow |
|------|-----------|---------------------|----------|
| Back/90 正確 | 20×22 | 20×22 @ 0,0 | none |
| Front/90 錯誤 | 18×24 | ~19.54×21.6 @ 0,0 | **Right ~1.54 cm** |

## 5. 消費者比對

| 消費者 | 傳遞 side | 傳遞 size | 狀態 |
|--------|-----------|-----------|------|
| `DesignCanvas` → `buildCurrentGarmentConstraintMap` | ✅ | ✅ | 正確 |
| `PreviewDesignLayer` → `getLayerOverflowStateForSize` | ✅ | ✅ | 正確 |
| `live-design-state` → `getWorkspaceGarmentLayerOverflowState` | ✅ | ✅ | 正確 |
| `design-inspector` → `getWorkspaceGarmentLayerOverflowState` | ✅ | ✅ | 正確 |
| **`InspectorObjectCard`** → `getLayerOverflowStateForSize(layer, size)` | ❌ 缺 side | ✅ | **Root Cause** |

```87:89:components/designer/InspectorObjectCard.tsx
  const overflow = useMemo(
    () => getLayerOverflowStateForSize(layer, size),
    [layer, size],
  );
```

對照：同一元件的 `bounds` 使用 `createDesignerDisplayContext(side, size)` 且依賴 `[layer, designerContext]` — **display rect 隨 side 更新，overflow 不更新**。

## 6. Cache 審計

| 候選 Cache | 結果 |
|------------|------|
| Front Printable Cache（模組級） | ❌ 不存在 |
| Designer Display Cache（模組級） | ❌ 不存在 |
| Overflow Cache（模組級） | ❌ 不存在 |
| Side Cache（模組級） | ❌ 不存在 |
| React `useMemo` 缺 `side` | ✅ **InspectorObjectCard overflow** |

`createDesignerCoordinateContext` / `createDesignerDisplayContext` 每次呼叫新建 context 物件，無跨 side 快取。

## 7. 結論與建議（僅供後續 Phase，本次不修改）

1. **Overflow Runtime（`lib/layer-overflow.ts`）行為正確**，已依 side 切換 Front 18×24 / Back 20×22（Size 90）。
2. **Root Cause 在 UI 呼叫層**：`InspectorObjectCard` 未傳 `side` + `useMemo` 缺 `side` 依賴。
3. **畫布紅框 / 約束**（`DesignCanvas` + `current-garment-print-constraint`）與 **Preview 紅框**（`PreviewDesignLayer`）使用正確 side；**Object Inspector overflow 明細**可能與畫布不一致。
4. 建議修復（未實施）：`getLayerOverflowStateForSize(layer, size, side)` 且 `useMemo(..., [layer, size, side])`。

---

## Appendix: Source Wiring Checks

```json
{
  "runtimeUsesSide": true,
  "garmentBranchesSide": true,
  "facadePassesSide": true,
  "inspectorMissingSide": false,
  "inspectorOverflowDeps": false,
  "previewPassesSide": true,
  "canvasPassesSide": true
}
```


