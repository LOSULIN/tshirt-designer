# Garment Anchor Runtime Audit — Phase 15.3.1

**Analysis only.** No runtime or UI files were modified.

**Verdict:** Designer and Preview **do not** share the same Garment Anchor for DOM placement. They share `resolveGarmentPrintAreaCm` (cm data) but fork at **printable rect → template px** mapping.

---

## 1. Designer Garment Anchor — Full Call Chain

```
DesignCanvas.tsx
  └─ data-design-workspace / data-print-area
       style={getDesignerWorkspaceContainerStyle(side)}
            └─ lib/designer-workspace.ts
                 getDesignerWorkspaceContainerStyle(side)
                 size = DESIGNER_WORKSPACE_REFERENCE_SIZE ("M")  ← fixed
            └─ lib/coordinates/preview.ts
                 getDesignerFactoryOverlayContainerStyle(side, "M")
                 ├─ resolveFactoryOverlayRectCm(side, "M")
                 │    └─ lib/factory-overlay-runtime.ts
                 │         topFromCollarCm = 7 (front) / 5 (back)
                 │         width/height ← resolveGarmentPrintAreaCm(size, side)
                 │              └─ lib/garment-anchor-runtime.ts
                 │                   getDesignerBluePrintArea(size) / Back
                 ├─ factoryOverlayRectCmToTemplatePx(rect, side, size)
                 │    ├─ topPx ← getPrintAreaOffsetPx(side, pxPerCm, COLLAR_ANCHOR_Y, scale=1)
                 │    │         └─ lib/coordinates/print-area-offset.ts
                 │    │              COLLAR_ANCHOR_Y_PX = 386
                 │    │              PRINT_AREA_OFFSET_CM front=7 / back=5
                 │    ├─ leftPx ← resolveFactoryCenterTemplateXPx(side, size) − width/2
                 │    └─ width/heightPx ← blue cm × getPreviewPxPerCm() (12.24)
                 └─ buildUiPrintAreaContainerStyleFromPx(rectPx, 1024, 1536)
                      └─ lib/coordinates/ui-print-offset.ts
                           left/top/width/height as % of canvas
                           transform: "none"  ← top-left anchor

Layer position (inside blue frame):
  getLayerDesignerDisplayCssPercent(workspaceRect, ctx)
    └─ lib/designer-display-projection.ts → designer-coordinate-facade
         toDesignerCssPercentFromWorkspace
         denominator = ctx.garmentPrintArea (current size blue cm)
```

### Designer Printable Rect Sources @ Front · M (1024×1536)

| Property | Source | Value (computed) |
|----------|--------|------------------|
| **Top** | `COLLAR_ANCHOR_Y (386) + PRINT_AREA_OFFSET_CM.front (7) × pxPerCm (12.24)` | **471.68 px** |
| **Left** | `resolveFactoryCenterTemplateXPx − widthPx/2` (center ≈ 512) | **297.80 px** |
| **Width** | `getDesignerBluePrintArea(M).widthCm (35) × 12.24` | **428.40 px** |
| **Height** | `getDesignerBluePrintArea(M).heightCm (50) × 12.24` | **612.00 px** |
| **Transform** | `buildUiPrintAreaContainerStyleFromPx` | **`none`** |

**Note:** Container geometry is **always M** regardless of selected garment size. Only layer % denominator changes with size.

---

## 2. Preview Garment Anchor — Full Call Chain

```
PreviewGarmentView.tsx
  ├─ PreviewGarmentVisual (shirt PNG only)
  │    └─ getPreviewGarmentVisualScale() = getGarmentVisualRenderScale("M")
  └─ data-preview-artwork-stage
       style={getPreviewArtworkStageStyle(side, { mode })}
            └─ lib/preview-runtime.ts
                 getPreviewArtworkStageStyle(side)
                 referenceSize = "M"  ← fixed (Phase 15.0)
                 ├─ getDesignerBlueVisualContainerPct("M", 1024, 1536)
                 │    └─ lib/garment-visual-profile.ts
                 │         blue cm / chest cm × garment render width px
                 │         includes getGarmentVisualRenderScale(M) ≈ 1.1127
                 ├─ getPreviewPrintReference(side, { size: "M" })
                 │    └─ lib/coordinates/preview.ts
                 │         front·M → getRuntimeTemplatePlacement().reference
                 │         else → getGarmentPrintReference({ side, size })
                 │              └─ lib/coordinates/garment.ts
                 │                   container center (512, 768) + template offset
                 │                   NOT collar-based top-left
                 └─ buildUiPrintAreaContainerStyle(ref, widthPct, heightPct,
                      PREVIEW_REFERENCE_TRANSFORM)
                      └─ PREVIEW_REFERENCE_TRANSFORM = "translate(-50%, -50%)"
                           center-anchor, not top-left

Layer position (inside artwork stage):
  previewGarmentRectToPhysicalStyle(garmentRect, ctx)
    position % ÷ ctx.garmentPrintable (current size)  ← Phase 15.3
    size % ÷ ctx.physicalReferencePrintable (M)         ← Phase 15.0 frozen
```

### Preview Artwork Stage Sources @ Front · M

| Property | Source | Value (computed) |
|----------|--------|------------------|
| **Top** | `ref.y × 1536 − height/2` (ref.y = 0.5 → center 768) | **404.05 px** |
| **Left** | `ref.x × 1024 − width/2` (ref.x = 0.5 → center 512) | **306.05 px** |
| **Width** | `getDesignerBlueVisualContainerPct(M)` (Garment Visual Profile) | **411.87 px** |
| **Height** | same | **727.87 px** |
| **Transform** | `PREVIEW_REFERENCE_TRANSFORM` | **`translate(-50%, -50%)`** |

---

## 3. Front / Back Anchor Comparison

### Front @ M

| | Designer | Preview | Identical? |
|---|----------|---------|------------|
| Top | 471.68 px | 404.05 px | **No (Δ −67.6 px)** |
| Left | 297.80 px | 306.05 px | **No (Δ +8.3 px)** |
| Width | 428.40 px | 411.87 px | **No (Δ −16.5 px)** |
| Height | 612.00 px | 727.87 px | **No (Δ +115.9 px)** |
| Anchor model | Collar + cm offset → top-left | Container center + translate(−50%,−50%) | **No** |

### Back @ M (same fork; offset cm differs)

| | Designer | Preview |
|---|----------|---------|
| Neck → print top cm | `PRINT_AREA_OFFSET_CM.back = 5` | Same cm constant, **not used in preview ref path** |
| Top px formula | `386 + 5 × 12.24 = 447.2` | Center-anchor (different model) |
| Shared? | cm yes / DOM no | |

---

## 4. All Print Area Anchor Influence Sources

| Source | File | Affects Designer? | Affects Preview? |
|--------|------|-------------------|------------------|
| `PRINT_AREA_OFFSET_CM` (front 7 / back 5) | `coordinates/print-area-offset.ts` | ✅ topPx | ⚠️ cm only; artwork stage ignores for DOM |
| `COLLAR_ANCHOR_Y_PX_BY_SIDE` (386) | `coordinates/print-area-offset.ts` | ✅ topPx | ❌ (preview ref uses container center) |
| `getPrintAreaOffsetPx` | `coordinates/print-area-offset.ts` | ✅ | ❌ |
| `resolveFactoryOverlayRectCm` | `factory-overlay-runtime.ts` | ✅ | ⚠️ only via printable boundary helper |
| `factoryOverlayRectCmToTemplatePx` | `coordinates/preview.ts` | ✅ | ❌ |
| `getDesignerFactoryOverlayContainerStyle` | `coordinates/preview.ts` | ✅ | ❌ |
| `getPreviewPrintReference` | `coordinates/preview.ts` | ❌ | ✅ artwork stage |
| `getGarmentPrintReference` | `coordinates/garment.ts` | ❌ | ✅ non-M preview ref |
| `GARMENT_TEMPLATE_OFFSET_PX` | `garment-template-calibration.ts` | ❌ | ✅ ref offset (currently 0,0) |
| `getDesignerBlueVisualContainerPct` | `garment-visual-profile.ts` | ❌ | ✅ stage width/height % |
| `getGarmentVisualRenderScale` | `garment-visual-profile.ts` | ❌ | ✅ shirt PNG + blue % |
| `PREVIEW_REFERENCE_TRANSFORM` | `coordinates/preview.ts` | ❌ | ✅ `translate(-50%,-50%)` |
| `UI_GLOBAL_PRINT_OFFSET_Y_PX` (0) | `coordinates/ui-print-offset.ts` | deprecated | deprecated |
| `UI_PRINT_REF_BASE_Y` (0.53) | `coordinates/ui-print-offset.ts` | deprecated | deprecated |
| `getPreviewGarmentVisualScale` | `preview-runtime.ts` | ❌ | ✅ shirt image only |
| Shirt PNG `object-contain` | `DesignCanvas` | ✅ no scale wrapper | N/A |
| `ShirtContainerFrame` zoom | `ShirtContainerFrame.tsx` | ✅ camera | ✅ camera |

---

## 5. Runtime Diagrams

### Designer

```
Shirt Image (1024×1536 template, no ShirtVisualScale)
    ↓
Neck scanline Y = 386 px (COLLAR_ANCHOR_Y_PX_BY_SIDE)
    ↓ + PRINT_AREA_OFFSET_CM (front 7 cm × 12.24 px/cm)
Printable Area DOM (Factory Overlay, top-left, transform none)
    size = M blue cm × pxPerCm  (always M geometry)
    100% CSS = current garmentPrintable cm (layer %)
    ↓
Artwork (layer % via designer-display-projection → facade)
```

### Preview

```
Shirt Image (PreviewGarmentVisual scale = GarmentVisualRenderScale(M))
    ↓
Neck (386 px exists in constants but artwork stage does NOT use collar top)
    ↓
Container center ref (0.5, 0.5) + translate(-50%, -50%)
Printable Area DOM (Artwork Stage, center-anchored)
    size = getDesignerBlueVisualContainerPct(M)  (Garment Visual Profile)
    always M geometry
    ↓
Artwork (previewGarmentRectToPhysicalStyle)
    position % ÷ garmentPrintable (size-aware)
    size % ÷ M-reference printable
```

---

## 6. Printable Rect Comparison

See §3 table. **Not consistent** at any size. Both fix container to M visual, but use **different formulas** → different Top/Left/Width/Height.

Smaller garment sizes do not change either container rect, but change layer % denominator → effective px/cm on shirt diverges further from Designer.

---

## 7. Shirt Bounding Box Comparison

| Property | Designer (`DesignCanvas`) | Preview (`PreviewGarmentView`) |
|----------|---------------------------|--------------------------------|
| Container | `ShirtContainerFrame` 1024:1536 aspect | Same |
| Shirt image scale | **None** (full `inset-0 object-contain`) | **`PreviewGarmentVisual` → scale(M) ≈ 1.1127** |
| Print overlay vs shirt | Sibling (overlay **not** inside shirt scale) | Sibling (same) |
| Padding | `ShirtContainerFrame` p-2 on canvas | Panel-dependent |
| Transform origin (shirt) | n/a | `center center` |
| Transform origin (zoom) | `center center` | `top center` (width mode) |

Print overlay placement is **not** affected by shirt scale in either pipeline (sibling DOM). Bounding-box difference is secondary to overlay anchor fork.

---

## 8. Hardcoded / Legacy Offset Audit

| Name | File | Value | Used by Preview artwork? | Necessary? |
|------|------|-------|--------------------------|------------|
| `PRINT_AREA_OFFSET_CM` | `print-area-offset.ts` | front 7 / back 5 | cm layer only | ✅ cm truth |
| `COLLAR_ANCHOR_Y_PX_BY_SIDE` | `print-area-offset.ts` | 386 | ❌ artwork stage | ✅ Designer top |
| `PREVIEW_REFERENCE_TRANSFORM` | `coordinates/preview.ts` | `translate(-50%,-50%)` | ✅ | ⚠️ **causes fork** |
| `PLACEMENT_REF` / template center | `template-profile`, `garment.ts` | (0.5, 0.5) | ✅ | ⚠️ **causes fork** |
| `UI_PRINT_REF_BASE_Y` | `ui-print-offset.ts` | 0.53 | ❌ deprecated | No |
| `UI_GLOBAL_PRINT_OFFSET_Y_PX` | `ui-print-offset.ts` | 0 | ❌ deprecated | No |
| `GARMENT_TEMPLATE_OFFSET_PX` | `garment-template-calibration.ts` | 0,0 | ✅ ref path | Optional tuning |
| `FACTORY_OVERLAY_TOP_FROM_COLLAR_CM` | `factory-overlay-runtime.ts` | 7 / 5 | ❌ preview stage | ✅ Designer |

No active `shirtTop` / `previewTop` / `artworkOffset` literals in preview-runtime; fork is structural (function choice), not a stray magic number.

---

## 9. Shared Garment Printable Area Runtime?

| Stage | Shared? |
|-------|---------|
| `resolveGarmentPrintAreaCm` / `getDesignerBluePrintArea` | ✅ **Yes** — single cm table |
| `createDesignerCoordinateContext` / facade projection | ✅ **Yes** — Preview reads facade |
| **DOM anchor: printable rect on template** | ❌ **Fork** |
| **Fork begins at** | `getDesignerFactoryOverlayContainerStyle` (Designer) vs `getPreviewArtworkStageStyle` (Preview) in `lib/coordinates/preview.ts` + `lib/preview-runtime.ts` |

---

## 10. Front 7 cm / Back 5 cm Collar Baseline

| | Designer | Preview |
|---|----------|---------|
| cm constant | `PRINT_AREA_OFFSET_CM` + `FACTORY_OVERLAY_TOP_FROM_COLLAR_CM` | Same constants exist |
| Applied to artwork DOM | ✅ via `getPrintAreaOffsetPx` → top-left | ❌ artwork stage uses center ref |
| Layer cm coordinates | ✅ facade / garment origin | ✅ facade (same) |

**cm baseline is shared; DOM application is not.**

---

## A. Runtime Dependency Graph (summary)

```
Workspace Storage
    ↓ (read-only)
designer-coordinate-facade  ← SHARED
    ↓ garment cm rect
    ├─ Designer Display: toDesignerCssPercent(garmentPrintable denom)
    │       inside getDesignerFactoryOverlayContainerStyle (top-left M rect)
    └─ Preview Runtime: previewGarmentRectToPhysicalStyle
            inside getPreviewArtworkStageStyle (center M rect)  ← FORK
```

---

## B. Anchor Comparison Table (Designer vs Preview)

| Field | Designer | Preview | Match |
|-------|----------|---------|-------|
| Top | Collar 386 + 7cm×pxPerCm | Center Y − height/2 | ❌ |
| Left | CenterX − width/2 (factory) | Center X − width/2 (placement ref) | ❌ |
| Width | blueCm × pxPerCm | Garment Visual Profile % | ❌ |
| Height | blueCm × pxPerCm | Garment Visual Profile % | ❌ |
| Neck offset cm | 7 / 5 | 7 / 5 (not applied to stage) | partial |
| Shirt scale | none | M render scale on PNG | ❌ |
| Padding | canvas p-2 | varies | ❌ |
| Transform origin | none (overlay) | center (shirt visual) | ❌ |
| Layer position denom | garmentPrintable | garmentPrintable (15.3) | ✅ |
| Layer size denom | garmentPrintable | M-reference (15.0) | ❌ |

---

## C. Root Cause (single answer)

**② Preview Artwork Stage problem** — structurally a **③ Garment Anchor fork**.

Designer places the blue printable DOM with **Factory Overlay top-left** (`getDesignerFactoryOverlayContainerStyle`). Preview places the artwork stage with **center reference + `translate(-50%, -50%)`** and **Garment Visual Profile** sizing (`getPreviewArtworkStageStyle`). Same cm data, different template anchor → all presets shift together; smaller sizes worsen because layer position % uses a shrinking cm denominator inside a mismatched parent rect.

Not primarily ① Layer Position (formula aligned in 15.3 but parent frame wrong), ④ Shirt Bounding Box, or ⑤ Neck Anchor alone.

---

## D. Minimal Fix Scope (analysis only — no code)

1. **`lib/preview-runtime.ts` — `getPreviewArtworkStageStyle`**
   Align DOM placement with Designer: use `getDesignerFactoryOverlayContainerStyle(side, M)` / `buildUiPrintAreaContainerStyleFromPx` path (top-left, `transform: none`). This is the smallest surface that fixes the shared anchor fork without touching facade or storage.

2. **Optional follow-up in `preview-runtime.ts` — `previewGarmentRectToPhysicalStyle`**
   After anchor unify, re-evaluate split denominators (position vs size). May converge to single garmentPrintable denominator like Designer if parent frame matches.

3. **Do not change:** `designer-coordinate-facade`, controller, workspace, export-runtime, `designer-display-projection`, `placement-presets`, geometry.

---

*Generated by `scripts/audit-garment-anchor-15-3-1.mjs`*
