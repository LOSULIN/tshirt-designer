# Phase 71.2 — Product Mockup Export Audit

**Audit Only (pre-implementation baseline)**

---

## Product PNG Call Flow

```
downloadProductExport()                    [product-export.ts]
  ↓
buildProductExportFiles()
  ├─ exportArtworkPng()                    → Artwork chain (71.1, separate)
  └─ exportPrintAreaArtworkForMockup()
       ↓
     renderMockupArtworkPng()              [mockup-artwork-export.ts]
       ↓
     renderPrintExportPng()                [print-export-system.ts]
       │  geometry: resolvePrintAreaCm (V1 garment blue cm)
       │  pipelineContext: passthrough only (void)
       ↓
     renderProductMockupPngFromArtwork()
       ↓
     renderProductMockupOnProduct()        [ProductMockupEngine.ts]
       ├─ loadAsset()                      [asset-loader.ts]
       │    ├─ fetchProductCalibrationFile() → calibration.json
       │    └─ fetchMockupVisualCompensationFile() → mockupVisualScale
       ↓
     composeProductMockup()                [product-mockup-compose.ts]
       ↓
     Canvas drawImage(artwork @ placementRect)
```

**Print-area artwork** (mockupArtwork blob) and **product compose** are independent chains.
Phase 71.2 scope: **compose placement only** (ProductMockupEngine → composeProductMockup).

---

## Geometry Usage Map

| Location | Module | Source | Version |
|----------|--------|--------|---------|
| Print-area render | `print-export-system.ts` | `resolvePrintAreaCm` → garment blue cm | V1 |
| Placement baseline | `visual-adjustment.ts` | `resolveFinalArtworkPlacement` → calibration.json mapping | V1 |
| Size scale | `product-placement-scale.ts` | M→size blue print area cm ratio | V1 |
| Placement rect | `product-placement-scale.ts` | `resolveProductMockupPlacementForGarmentSize` | V1 |
| mockupVisualScale | `render/visual-compensation.ts` | `applyMockupVisualCompensation` | V1 |
| Legacy ±8% | `presentation/visual-compensation.ts` | `applyProductPreviewVisualCompensationToRect` | V1 |
| Photo Bridge (ResultPanel) | `geometry-runtime-photo-bridge.ts` | `resolveGeometryRuntimeSnapshot` → stage % | V2 ✅ |
| pipelineContext | `export-pipeline-context.ts` | snapshot + photoBridge pre-built | Pre-71.1 ✅ |

**Product export compose today: 100% V1.** `pipelineContext` passed but `void` in composeProductMockup.

---

## calibration.json Usage

| Step | Function | Field |
|------|----------|-------|
| `loadAsset` | `fetchProductCalibrationFile` | full file |
| `resolveMappedArtworkPlacement` | `coordinate-mapping.ts` | `productReference.printArea` |
| `getFineCalibrationForSide` | `fine-calibration.ts` | `mapping` offset/scale |
| `getVisualAdjustmentForSide` | `visual-adjustment.ts` | `visualAdjustment` (+150 front Y) |
| `scaleProductCalibration` | export asset scale | scaled coords @ export resolution |

**UA35001 front productReference:** x=298, y=350, w=428, h=612 + visualAdjustment y=+150 → **y=500**

---

## mockupVisualScale

- Source: `public/products/{code}/mockup-visual-compensation.json` (via `fetchMockupVisualCompensationFile`)
- Applied: `applyMockupVisualCompensation(rect, asset.mockupVisualScale)` in composeProductMockup
- Scales draw rect around center; placement definition unchanged

---

## Visual Compensation (Legacy Export)

- `applyProductPreviewVisualCompensationToRect(side, canvasW, canvasH)`
- Uses `LEGACY_V1_PRODUCT_PREVIEW_VISUAL_COMPENSATION`: front **+8%**, back **-8%**
- Applied **after** mockupVisualScale in composeProductMockup

**V2 ResultPanel:** `resolveRuntimeVisualCompensation` → **0/0** (no translate)

---

## Photo Bridge Status

| Surface | Uses Photo Bridge? | Module |
|---------|-------------------|--------|
| ResultPanel V2 | ✅ | `resolveGeometryRuntimePhotoBridge` |
| Product Export compose | ❌ | Uses calibration placement |
| ExportPipelineContext V2 | ✅ pre-built | `pipelineContext.photoBridge` |

Photo Bridge exists but **not wired** to product mockup export.

---

## pipelineContext Passthrough (Pre-71.2)

| Layer | Receives | Reads |
|-------|----------|-------|
| `geometry-runtime-export.ts` | resolves context | ✅ |
| `product-export.ts` | `input.pipelineContext` | passthrough |
| `mockup-artwork-export.ts` | options | void |
| `print-export-system.ts` | options | void |
| `ProductMockupEngine.ts` | input | passthrough |
| `composeProductMockup.ts` | input | **void** ← migration target |

---

## V1 vs V2 Placement Delta (M, front, 1024×1536)

| Source | top (px) | Notes |
|--------|----------|-------|
| V1 calibration placement | ~500 | productReference + visualAdjustment |
| V1 after legacy ±8% | ~500 + 8% canvas | export only |
| V2 snapshot artworkStage | **501.68** | factoryOrigin 416 + 7cm |
| V2 photoBridge % | derived from snapshot | matches ResultPanel |

Expected export V2 Δ vs V1 legacy: **~30px stage + compensation removal**

---

## Adapter Design (71.2)

```
resolveProductMockupRuntimePlacement(pipelineContext, product, size, artworkRect?)
  │
  ├─ V1 / missing context / missing photoBridge
  │     → resolveProductMockupPlacementForGarmentSize(calibration)
  │     → visualCompensation from pipelineContext or legacy export
  │     → scale = mockupVisualScale
  │
  └─ V2
        → placementRect from pipelineContext.photoBridge.photoArtworkStage (% → px)
        → visualCompensation from pipelineContext (0/0)
        → scale = 1 (no mockupVisualScale)
        → no applyProductPreviewVisualCompensationToRect
```

**Forbidden in adapter:** `resolveGeometryRuntimeSnapshot`, `resolveGeometryRuntimePhotoBridge`, Builder, calibration re-parse.

---

## Files to Modify (71.2)

| File | Change |
|------|--------|
| `lib/designer-geometry-v2/product-mockup-runtime.ts` | **NEW** adapter |
| `lib/render/product-mockup-compose.ts` | use adapter, V1/V2 compensation split |
| `components/render/ProductMockupEngine.ts` | shadow compare hook (optional) |
| `lib/designer-geometry-v2/index.ts` | exports |
| `product-mockup-runtime.regression.ts` | **NEW** |

**Not in scope:** print-export-system, PDF, ZIP, calibration.json, geometry runtime core.
