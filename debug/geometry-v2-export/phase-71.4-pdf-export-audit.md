# Phase 71.4 — PDF Export Audit

## Flow: Factory Proof PDF

```
generateProofPdf()                      [proof-pdf-generator.ts]
  ↓
generateFactoryProofPdf()               [factory-proof-pdf-template.ts]
  ↓ per side
drawSideProofPage()
  ├─ drawDesignerPreviewMockup()        shirt + embedded print PNG
  └─ drawMockupAnnotations()            collar guide + dashed print area
```

**Pre-71.4 geometry sources (V1 only):**

| Read point | Source | Notes |
|------------|--------|-------|
| `resolveDesignerPreviewLayout(side)` | `designer-layout.ts` | print area from `getDesignerFactoryOverlayTemplatePx` |
| `resolvePdfCollarBottomPx` | `print-area-offset.ts` anchor 386 + PDF back offset | collar guide line |
| `getFactoryProofPrintAreaPresentationOffsetY` | `visual-compensation.ts` legacy ±8% | artwork + dashed rect Y |
| `mapDesignerLayoutToPdf` | `designer-layout.ts` | template px → PDF pt |

`pipelineContext` on `FactoryProofPdfInput` was **void** (unused).

## Geometry / Placement Read Points

| Element | V1 source | V2 runtime source |
|---------|-----------|-------------------|
| Print area rect | `getDesignerFactoryOverlayTemplatePx` | `pipelineContext.geometry.artworkStage` |
| Collar bottom Y | `getCollarAnchorYPx(386)` + PDF back offset | `pipelineContext.snapshot.collar.y` (scaled) |
| Collar center X | canvas width / 2 | `pipelineContext.snapshot.collar.x` |
| Presentation offset Y | `resolveProductPreviewVisualCompensationPdfOffsetY` | `pipelineContext.visualCompensation` (0/0) |
| Shirt frame | `resolveDesignerPreviewLayout` shell | unchanged V1 shell (garment presentation only) |

Embedded print PNG position: `printAreaLeftPt`, `printAreaBottomPt` + presentation offset.

## Out of Scope

- `print-export-system` (print artifact bytes unchanged)
- `buildDesignPackageZip` (packaging only)
- `designer-layout.ts` internals (adapter wraps; no edits)
- Server `generateProofDocuments` — no `pipelineContext` until client wiring (falls back V1)

## Adapter Design

```
resolveExportPipelineContext(surface: "pdf")
  ↓
resolvePdfExportRuntimeLayout(side, context)
resolvePdfExportRuntimePresentationOffsetY(side, heightPt, context)
resolvePdfExportRuntimePlacement(side, panelArea, context)
  ↓
mapDesignerLayoutToPdf(layout, panelArea)   delegate only
```

Shadow: `EXPORT_PRODUCT_RUNTIME_COMPARE=true` logs V1 vs V2 print area / collar / presentation Δ.

## V1 vs V2 Expected Delta (front M)

| Field | V1 | V2 |
|-------|----|----|
| Print area top | ~471.68 | ~501.68 |
| Collar bottom | ~386 scaled | ~416 scaled |
| Presentation offset | ±8% legacy | 0 |
