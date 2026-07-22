# Phase 70.3.5 — Back Runtime Visual Compensation Removal

## Step 1 Audit — Why Back had `translateY(-8%)`

| Item | Detail |
|------|--------|
| **歷史來源** | Phase 68.12 `PRODUCT_PREVIEW_VISUAL_COMPENSATION` |
| **最早用途** | V1 UA 商品攝影圖與 template factory overlay 視覺對齊；back 領口剪影偏高，用 -8% 上移 artwork |
| **V2 是否仍必要** | **否** — Phase 70.3 Builder Calibration + Product Master 已提供正確 `artworkStage` |
| **本質** | Legacy V1 mockup 補償，非 Geometry Runtime 的一部分 |

## Step 2 — V2 Back Stage 已一致

`resolveGeometryRuntimeSnapshot()` → `artworkStage` → Designer / ResultPanel：**Δ = 0 px**

因此 `translate(-8%)` 已無存在必要。

## Step 3 — Resolver 變更

| Version | Front | Back |
|---------|-------|------|
| **V2 Runtime** | 0 / 0 | **0 / 0** (was 0 / -8) |
| **V1 Legacy (export)** | +8% | -8% (unchanged) |

## Before / After — Artwork Top (@1024×1536, sample layer y=8cm)

### Front (Phase 70.2.2, unchanged)

| | Designer | ResultPanel | Δ |
|--|----------|-------------|---|
| Before | 599.60 px | 648.56 px | +48.96 px |
| After | 599.60 px | 599.60 px | **0.00 px** |

### Back (Phase 70.3.5)

| | Designer | ResultPanel | Δ |
|--|----------|-------------|---|
| Before | 547.12 px | 503.06 px | **-44.06 px** |
| After | 547.12 px | 547.12 px | **0.00 px** |

## Runtime Audit — V2

| Surface | translate | padding | margin | offset | visual compensation |
|---------|-----------|---------|--------|--------|---------------------|
| Designer | ❌ | ❌ | ❌ | ❌ | ❌ |
| ResultPanel | ❌ | ❌ | ❌ | ❌ | ❌ |

**Geometry Runtime = 唯一來源**

```
resolveGeometryRuntimeSnapshot()
        ↓
Designer workspaceStyle          ResultPanel photoStageStyle
        ↓                                ↓
   Artwork (direct)              Artwork (direct, no wrapper)
```

## Back 是否已完全一致

**YES** — Stage / Safe Area / Factory Origin / Artwork 全部 ≤1 px。

## Geometry V2 RC (updated)

| Status | Count |
|--------|-------|
| PASS | **78** |
| WARNING | **0** |
| FAIL | **0** |

## Files changed

- `lib/presentation/visual-compensation.ts`
- `lib/presentation/product-preview-visual-compensation.regression.ts`
- `lib/designer-geometry-v2/geometry-v2-back-alignment.regression.ts` (new)
- `lib/designer-geometry-v2/geometry-v2-release-candidate.regression.ts`

`ResultPanelProductPreviewDesigner.tsx` — no code change required; V2 back now hits `usesVisualCompensation === false` and skips translate wrapper.
