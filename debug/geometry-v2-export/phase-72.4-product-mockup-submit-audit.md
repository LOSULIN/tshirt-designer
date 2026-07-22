# Phase 72.4 — Client Mockup Runtime Migration Audit

## Proof Mockup Flow (Pre-72.4)

```
DesignerApp.handleSubmitConfirm
  ↓
prepareProofSubmission(order)
  ↓
generateProofArtifacts(order)
  ↓
generateMockupsForOrder()
  ↓
generateMockupPng() → renderMockupPreviewPng()   [mockup-export.ts]
  ↓
appendProofArtifactsToFormData → ZIP packaging (server, bytes only)
```

### Legacy Placement Reads (mockup-export.ts)

| Read point | Source |
|------------|--------|
| Print area rect | `getMockupExportPrintAreaRectPx` / `getFlatMockupPrintAreaRectPx` |
| Layer cm → px | `resolvePrintAreaCm`, `resolveExportGarmentLayerCmRect`, `mapLayerCmRect` |
| Visual compensation | `resolveProductPreviewVisualCompensation` (legacy ±8%) |

ZIP packaging has **no** geometry reads — inherits mockup PNG bytes.

---

## Phase 72.4 Flow

```
prepareProofSubmission(order, proofRuntimeContext)
  ↓
generateProofArtifacts(order, proofRuntimeContext)
  ↓
resolveProofMockupRuntimeForward()
  ↓
V1: renderMockupPreviewPng()              (unchanged)
V2: renderProofSubmitProductMockupPng()   [product-mockup-submit-render.ts]
      → renderMockupArtworkPng(pipelineContext)
      → renderProductMockupOnProduct()
      → composeProductMockup()
      → resolveProductMockupRuntimePlacement()
```

Modules:
- `product-mockup-submit-runtime.ts` — forward resolver only (regression-safe)
- `product-mockup-submit-render.ts` — render + shadow compare log

Submit mockup == Download mockup when `effectiveVersions.mockup` matches (same `pipelineContext`).

---

## Out of Scope

- `print-export-system` (print PNG unchanged)
- PDF / ZIP packaging / Email
- `mockup-export.ts` internals (V1 fallback only)
