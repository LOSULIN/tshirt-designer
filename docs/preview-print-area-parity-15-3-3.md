# Preview Print Area Parity Audit — Phase 15.3.3

**Analysis only.** No Runtime, UI, Controller, Facade, Storage, or Export files were modified.

---

## Executive Summary

| Container pair | Rect identical? | Notes |
|----------------|-----------------|-------|
| **Designer Blue Print Area** ↔ **Preview Artwork Stage** | **YES (28/28)** | Both call `getDesignerFactoryOverlayContainerStyle(side, "M")` after Phase 15.3.2 |
| **Designer Blue** ↔ **Preview Printable Boundary** | **NO (28/28)** | Boundary uses legacy center-anchor + Garment Visual Profile |
| **Preview Artwork Stage** ↔ **Preview Printable Boundary** | **NO (28/28)** | Two different formulas in `preview-runtime.ts` |

**Triple overlap (Designer Blue = Artwork Stage = Printable Boundary): FAIL**

Only the first pair overlaps. The user's screenshot suspicion that *Preview Artwork Stage is smaller than Designer blue* is **not supported at the CSS container level post-15.3.2** — outer rects match. What **does** appear smaller is **layer occupancy inside** the shared container for non-M sizes, and **Printable Boundary** is a genuinely smaller/different rect.

---

## Single Root Cause

**Preview `previewGarmentRectToPhysicalStyle` maps layer width/height using M-reference printable denominators inside a container whose Designer counterpart treats 100% width/height as current-size garment printable cm—so for any size ≠ M, artwork fills a different proportional region within the same outer Factory Overlay rect, shifting every preset together.**

(Outer Artwork Stage CSS **does** match Designer Blue after 15.3.2; the remaining visual gap is **inner coordinate-frame mismatch**, not a second outer anchor.)

---

## 1. Container Stack — Designer

```
ShirtContainerFrame (1024×1536 aspect, data-shirt-container)
  └─ ProcessedTemplateImage (inset-0, object-contain, NO ShirtVisualScale)
  └─ data-design-workspace / data-print-area  ← Blue Print Area DOM
       style = getDesignerWorkspaceContainerStyle(side)
            = getDesignerFactoryOverlayContainerStyle(side, "M")
       overflow: hidden
       border: 2px dashed blue (visual only)
       └─ PrintAreaGrid / rulers (overlay)
       └─ PrintAreaElement (data-layer-root)  ← Layer parent
            displayPercentStyle = getLayerDesignerDisplayCssPercent
            denominator: garmentPrintable (current size) for ALL axes
```

### Designer Blue Print Area @ Front · M (Factory Overlay px)

| Property | Value | Source |
|----------|-------|--------|
| Top | **471.68 px** | `COLLAR_ANCHOR_Y (386) + 7cm × 12.24` |
| Left | **297.80 px** | `centerX (512) − width/2` |
| Width | **428.40 px** | `35cm × 12.24` |
| Height | **612.00 px** | `50cm × 12.24` |
| Transform | **`none`** | `buildUiPrintAreaContainerStyleFromPx` |
| Transform origin | n/a | top-left positioning |
| Scale | 1 | — |
| Anchor | **top-left (collar + cm)** | `factoryOverlayRectCmToTemplatePx` |

**Size independence:** Container geometry is **always M blue cm × pxPerCm** regardless of selected garment size (90…XXXL).

---

## 2. Container Stack — Preview

```
ShirtContainerFrame (same aspect)
  └─ PreviewGarmentVisual (data-preview-garment-visual)
       transform: scale(getGarmentVisualRenderScale("M")) ≈ 1.1127
       transformOrigin: center center
       └─ shirt PNG only
  └─ data-preview-printable-boundary (opacity-0, z-5)
       style = getPreviewPrintableBoundaryStyle(side, size)  ← LEGACY PATH
  └─ data-preview-artwork-stage (z-10)
       style = getPreviewArtworkStageStyle(side)
            = getDesignerFactoryOverlayContainerStyle(side, "M")  ← 15.3.2
       overflow: visible
       └─ PreviewDesignLayer
            style = previewGarmentRectToPhysicalStyle
            position % ÷ garmentPrintable (current size)
            size % ÷ M-reference printable
```

### Preview Artwork Stage @ Front · M

| Property | Value | Source |
|----------|-------|--------|
| Top | **471.68 px** | Same as Designer |
| Left | **297.80 px** | Same as Designer |
| Width | **428.40 px** | Same as Designer |
| Height | **612.00 px** | Same as Designer |
| Transform | **`none`** | Same as Designer |

### Preview Printable Boundary @ Front · M (differs)

| Property | Value | Δ vs Designer Blue |
|----------|-------|-------------------|
| Top | **404.05 px** | **−67.7 px** |
| Left | **306.05 px** | +8.3 px |
| Width | **411.87 px** | **−16.5 px** |
| Height | **727.87 px** | **+115.9 px** |
| Transform | **`translate(-50%, -50%)`** | center anchor |

Sources: `getPreviewPrintReference` + `getDesignerBlueVisualContainerPct(M)` + `PREVIEW_REFERENCE_TRANSFORM`.

### Preview Printable Boundary @ Front · 90 (size-scaled)

Width/height further scaled by `(18/35)` × `(24/50)` relative to M visual-profile box — **smaller than Artwork Stage** for kids sizes.

---

## 3. `computePrintAreaParityFingerprint()`

Implemented in `scripts/validate-preview-print-area-parity-15-3-3.mjs`:

```javascript
function computePrintAreaParityFingerprint(containerPx) {
  return {
    topPx, leftPx, widthPx, heightPx, transform,
    topPct, leftPct, widthPct, heightPct,
  };
}
```

---

## 4. Transform / Offset Chain (Designer → Preview Artwork Stage)

| Step | Designer | Preview Artwork Stage |
|------|----------|----------------------|
| Factory overlay cm | ✅ | ✅ (same API) |
| Collar Y + cm offset → top px | ✅ | ✅ |
| Center X − width/2 → left px | ✅ | ✅ |
| blue cm × pxPerCm → size | ✅ | ✅ |
| `translate(-50%, -50%)` | ❌ none | ❌ none |
| Garment Visual Profile % | ❌ | ❌ (not used for artwork stage) |
| template center 0.5/0.5 | ❌ | ❌ (not used for artwork stage) |

**No extra padding/margin/offset between Designer Blue and Preview Artwork Stage at the style level.**

---

## 5. Transform / Offset Chain — Printable Boundary (Preview only)

| Step | Present? |
|------|----------|
| `getPreviewPrintReference` (container center) | ✅ |
| `PREVIEW_REFERENCE_TRANSFORM` | ✅ `translate(-50%, -50%)` |
| `getDesignerBlueVisualContainerPct` | ✅ (Garment Visual Profile, not pxPerCm linear) |
| Size ratio `garmentBlue / mBlue` | ✅ per selected size |

This is a **second print-area container** that does **not** overlap Designer Blue or Artwork Stage.

---

## 6. Case Studies

### Case 1 — Kids 90 · Front · 18×24 cm garment printable

| | Designer | Preview Artwork Stage |
|---|----------|----------------------|
| Outer container | 428×612 px @ (298, 472) | **Identical** |
| Full-bleed layer CSS | **100% × 100%** (÷ 18×24) | **51.4% × 48.0%** (position ÷ 18×24, size ÷ 35×50) |

→ Same outer rect; **inner layer does not fill the stage** the way it fills Designer blue.

### Case 2 — M · 35×50

Full-bleed: **100% × 100%** in both (M garment = M reference).

### Case 3 — XXXL · 45×60

Full-bleed: Designer **100% × 100%**; Preview **128.6% × 120.0%** (overflows inner mapping).

### Case 4 — Front collar 7 cm

Factory overlay top = **471.68 px** — shared by Designer Blue and Preview Artwork Stage.

### Case 5 — Back collar 5 cm

Factory overlay top = **447.20 px** — shared by Designer Blue and Preview Artwork Stage.

---

## 7. Layer Parent Comparison (not container, for context)

| | Designer `PrintAreaElement` | Preview `PreviewDesignLayer` |
|---|----------------------------|------------------------------|
| Parent | `data-print-area` (blue frame) | `data-preview-artwork-stage` |
| Parent rect | Factory Overlay M | **Same** (15.3.2) |
| Position % denom | `garmentPrintable` | `garmentPrintable` (15.3) |
| Size % denom | `garmentPrintable` | **`physicalReferencePrintable` (M)** (15.0 frozen) |
| Rotation | layer.rotation | layer.rotation |

---

## 8. Preview Entry Points (shared runtime)

| Entry | Path |
|-------|------|
| Flat Preview | `FlatShirtDesignView` → `PreviewGarmentView` |
| Model Preview | `ModelDesignPreview` → `PreviewGarmentView` |
| Zoom Preview | `ClothingBrowseModal` → `FlatShirtDesignView` |
| Product Preview | `ClothingBrowsePanel` / `Widget` → `FlatShirtDesignView` |
| Review Modal | `DesignReviewModal` → `ModelDesignPreview` |

All share: `getPreviewArtworkStageStyle` → `getDesignerFactoryOverlayContainerStyle`.

---

## 9. Matrix Results (script)

| Check | Result |
|-------|--------|
| Designer Blue == Preview Artwork Stage (14 sizes × 2 sides) | **28/28 PASS** |
| Designer Blue == Printable Boundary | **0/28** (all differ) |
| Artwork Stage == Printable Boundary | **0/28** (all differ) |
| Collar offset front 7 / back 5 cm | PASS |
| Preview entry points | 5/5 PASS |

Run: `node scripts/validate-preview-print-area-parity-15-3-3.mjs`

---

## 10. Minimal Fix Scope (analysis only — do not implement here)

1. **If goal is layer visual parity inside matched container:** unify `previewGarmentRectToPhysicalStyle` size denominators with Designer (`garmentPrintable` for width/height) while preserving Phase 15.0 physical cm on shirt — requires careful reconciliation (may need separate physical-size path).

2. **If goal is triple container overlap:** align `getPreviewPrintableBoundaryStyle` to Factory Overlay top-left path (or remove boundary layer from visual/debug path).

3. **Do not change:** Facade, Controller, Storage, Export, outer Artwork Stage anchor (already unified in 15.3.2).

---

## 11. Frozen Runtime Confirmation

No files modified in: Controller, Facade, Geometry, Placement, designer-display-*, export-runtime, Workspace Storage, Preview UI components, `preview-runtime.ts` (this audit phase).

---

*Generated by Phase 15.3.3 analysis — `scripts/validate-preview-print-area-parity-15-3-3.mjs`*
