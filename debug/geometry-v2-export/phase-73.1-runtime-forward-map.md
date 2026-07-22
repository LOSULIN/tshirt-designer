# Phase 73.1 — Runtime Forward Map

**Date:** 2026-07-23  
**Scope:** Canonical forward resolvers for every runtime surface

---

## Architecture

```
GeometryRuntimeState
        │
        ▼
Effective Version (production lock + dev toggle)
        │
        ▼
Forward Resolver (one per surface/path)
        │
        ▼
ExportPipelineContext
        │
        ▼
Runtime Adapter
        │
        ▼
Renderer
```

---

## Surface Map

### Download Artwork

| Layer | Module | Function |
|-------|--------|----------|
| **Entry** | `geometry-runtime-export.ts` | `downloadArtworkExportWithGeometryRuntime` |
| **Forward** | `runtime-download-forward.ts` | `resolveArtworkRuntimeForwardFromEffectiveVersion` |
| **Pipeline** | `export-pipeline-context.ts` | `resolveExportPipelineContext(surface: "png")` |
| **Adapter** | `export-artwork-runtime.ts` | `resolveArtworkExportRuntimeGeometry` |
| **Renderer** | `factory-artwork-export.ts` | `renderProductFactoryArtworkPng` |

| Control | Behavior |
|---------|----------|
| Production lock | Forces V1 via `resolveEffectiveDownloadGeometryVersion` |
| Dev toggle | `exportRuntime.png` — UI passes effective version from `getEffectiveGeometryVersion("png")` |

---

### Download Mockup

| Layer | Module | Function |
|-------|--------|----------|
| **Entry** | `geometry-runtime-export.ts` | `downloadProductExportWithGeometryRuntime` |
| **Forward** | `runtime-download-forward.ts` | `resolveProductMockupRuntimeForwardFromEffectiveVersion` |
| **Pipeline** | `export-pipeline-context.ts` | `resolveExportPipelineContext(surface: "png")` |
| **Adapter** | `product-mockup-runtime.ts` | `resolveProductMockupRuntimePlacement` |
| **Renderer** | `ProductMockupEngine.ts` → `product-mockup-compose.ts` | `renderProductMockupOnProduct` → `composeProductMockup` |

| Control | Behavior |
|---------|----------|
| Production lock | Forces V1 |
| Dev toggle | `exportRuntime.png` |

**Submit parity:** `resolveProofMockupRuntimeForwardFromEffectiveVersion` produces identical `pipelineContext` per side.

---

### Download ZIP

| Layer | Module | Function |
|-------|--------|----------|
| **Entry** | `geometry-runtime-export.ts` | `downloadProductExportBundleWithGeometryRuntime` |
| **Forward** | `runtime-download-forward.ts` | `resolveZipRuntimeForwardFromEffectiveVersion` |
| **Pipeline** | `export-zip-runtime.ts` | `resolveZipExportPipelineContext(surface: "zip")` |
| **Adapter** | `export-zip-runtime.ts` | `resolveZipExportRuntimeInput` |
| **Renderer** | `product-export.ts` | `buildProductExportFiles` |

| Control | Behavior |
|---------|----------|
| Production lock | Forces V1 |
| Dev toggle | `exportRuntime.zip` |

---

### Download PDF

| Layer | Module | Function |
|-------|--------|----------|
| **Entry** | `geometry-runtime-export-pdf.server.ts` | `generateProofPdfWithGeometryRuntime` |
| **Forward** | `export-pdf-submit-runtime.ts` | `resolveProofPdfRuntimeForwardFromEffectiveVersion` |
| **Pipeline** | `export-pdf-runtime.ts` | `resolvePdfExportPipelineContext(surface: "pdf")` |
| **Adapter** | `export-pdf-runtime.ts` | `resolvePdfExportRuntimeLayout` |
| **Renderer** | `factory-proof-pdf-template.ts` | PDF page render |

| Control | Behavior |
|---------|----------|
| Production lock | Forces V1 |
| Dev toggle | `exportRuntime.pdf` |

---

### Submit PDF

| Layer | Module | Function |
|-------|--------|----------|
| **Entry** | `generate-proof.ts` | `generateProofDocuments` |
| **Forward** | `export-pdf-submit-runtime.ts` | `resolveProofPdfRuntimeForward` |
| **Pipeline** | `export-pdf-runtime.ts` | `resolvePdfExportPipelineContext` |
| **Adapter** | `export-pdf-runtime.ts` | `resolvePdfExportRuntimeLayout` |
| **Renderer** | `factory-proof-pdf-template.ts` | PDF page render |

| Control | Behavior |
|---------|----------|
| Production lock | `normalizeProofSubmitRuntimeContext` → V1 |
| Dev toggle | `effectiveVersions.pdf` from `proofRuntimeContext` wire |

---

### Submit Mockup

| Layer | Module | Function |
|-------|--------|----------|
| **Entry** | `mockup-generator.ts` | `generateMockupPng` |
| **Forward** | `product-mockup-submit-runtime.ts` | `resolveProofMockupRuntimeForward` |
| **Pipeline** | `export-pipeline-context.ts` | `resolveExportPipelineContext(surface: "png")` |
| **Adapter** | `product-mockup-runtime.ts` | `resolveProductMockupRuntimePlacement` |
| **Renderer** | V1: `mockup-export.ts` / V2: `product-mockup-submit-render.ts` | `renderMockupPreviewPng` / `renderProofSubmitProductMockupPng` |

| Control | Behavior |
|---------|----------|
| Production lock | `normalizeProofSubmitRuntimeContext` → V1 |
| Dev toggle | `effectiveVersions.mockup` from `proofRuntimeContext` wire |

---

## Approved `resolveExportPipelineContext` Call Sites

| Module | Purpose |
|--------|---------|
| `export-pipeline-context.ts` | Canonical implementation |
| `runtime-download-forward.ts` | Download artwork/mockup forward |
| `export-zip-runtime.ts` | ZIP pipeline wrapper |
| `export-pdf-runtime.ts` | PDF pipeline wrapper |
| `product-mockup-submit-runtime.ts` | Submit mockup forward |
| `export-artwork-runtime.ts` | Shadow compare log only (line 153) |

**Not allowed:** `geometry-runtime-export.ts` (orchestration only after 73.1)

---

## Before / After (Phase 73.1)

| Surface | Before | After |
|---------|--------|-------|
| Download Artwork | Inline `withResolvedPipelineContext` | `resolveArtworkRuntimeForwardFromEffectiveVersion` |
| Download Mockup | Inline `withResolvedPipelineContext` | `resolveProductMockupRuntimeForwardFromEffectiveVersion` |
| Download ZIP | Direct `resolveExportPipelineContext` | `resolveZipRuntimeForwardFromEffectiveVersion` |
| Download PDF | `resolveProofPdfRuntimeForwardFromEffectiveVersion` | Unchanged ✅ |
| Submit PDF | `resolveProofPdfRuntimeForward` | Unchanged ✅ |
| Submit Mockup | `resolveProofMockupRuntimeForward` | Unchanged ✅ |

---

## Remaining Production Blockers

1. **Production lock** — All surfaces still default to V1 in production (`NODE_ENV === "production"`).
2. **Dev toggles** — Runtime V2 requires per-surface `exportRuntime.*` toggle ON.
3. **Stale regressions** — `export-pipeline-context.regression.ts` assertion on PDF template void-only (pre-71.4).
4. **Snapshot drift** — `product-factory-anchor`, `geometry-factory-origin-calibration` suites.
5. **Print submit runtime** — Not migrated (intentionally out of scope).

---

## Regression

```bash
npx tsx lib/designer-geometry-v2/runtime-forward-canonicalization.regression.ts
```

Verifies forward == legacy inline path, production lock, dev toggle, delegate-only, and `geometry-runtime-export.ts` has no inline pipeline calls.
