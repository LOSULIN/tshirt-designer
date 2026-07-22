# Phase 71.3 — ZIP Bundle Export Audit

## Flow A: Product Export Bundle (Designer)

```
downloadProductExportBundle()           [product-export.ts]
  ↓
buildProductExportFiles(input)          pipelineContext?: passthrough (Pre-71.1)
  ├─ exportArtworkPng()                 → 71.1 artwork adapter
  ├─ renderMockupArtworkPng()           → print-export (void context, unchanged)
  └─ renderProductMockupOnProduct()     → 71.2 mockup adapter
  ↓
downloadBlob(artwork) + downloadBlob(product)
```

**Geometry today:** Inherited from `ProductExportInput.pipelineContext` when set.
**Gap:** No `downloadProductExportBundleWithGeometryRuntime`; `withResolvedPipelineContext` uses surface `"png"` not `"zip"`.

## Flow B: Proof Design Package ZIP (Submit)

```
prepareProofSubmission()                [client.ts]
  ↓
generateProofArtifacts()              NO pipelineContext
  ├─ generateMockupsForOrder()          mockup-export (V1)
  └─ generatePrintsForOrder()           print-export-system (V1, void)
  ↓
generateProofDocuments()                [server]
  ├─ generateProofPdf()                 PDF (out of scope)
  └─ buildDesignPackageZip()            pure packaging, NO geometry
```

**Phase 71.3 scope:** Flow A only. Flow B packaging layer has no geometry reads.

## Geometry / Placement Read Points (Bundle contents)

| Artifact | Engine | Geometry source | pipelineContext |
|----------|--------|-----------------|-----------------|
| artwork PNG | export-artwork-factory | 71.1 adapter | ✅ read V2 |
| mockup artwork PNG | print-export-system | V1 garment cm | void |
| product PNG | composeProductMockup | 71.2 adapter | ✅ read V2 |

ZIP assembly itself: **no geometry**.

## Adapter Design

```
resolveExportPipelineContext(surface: "zip")
  ↓
resolveZipExportRuntimeInput(input, context)
  ↓
buildProductExportFiles(resolvedInput)   delegate only
```

Shadow: `EXPORT_PRODUCT_RUNTIME_COMPARE=true` logs V1 vs V2 context + mockup placement Δ.
