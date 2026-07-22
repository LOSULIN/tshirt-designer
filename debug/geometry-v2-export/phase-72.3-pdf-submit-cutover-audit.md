# Phase 72.3 — PDF Runtime Submit Cutover Audit

## Goal

Submit PDF and Download PDF share the same runtime placement pipeline via `export-pdf-runtime`.

```
DesignerApp / Download
        │
        ▼
ProofSubmitRuntimeContext  (submit)  |  effective pdf version (download)
        │
        ▼
resolveProofPdfRuntimeForward()     [export-pdf-submit-runtime.ts]
        │
        ▼
resolvePdfExportPipelineContext()   [export-pdf-runtime.ts]
        │
        ▼
resolvePdfExportRuntimeLayout()     [export-pdf-runtime.ts]
        │
        ▼
factory-proof-pdf-template.ts
```

---

## Submit PDF Geometry Read Points

| Step | File | Geometry reads |
|------|------|----------------|
| Client resolve | `ProofSubmitRuntimeContextBridge` | `resolveProofSubmitRuntimeContext` — versions only |
| FormData | `proofRuntimeContext` JSON | No snapshot |
| Server normalize | `normalizeProofSubmitRuntimeContext` | Production → V1 |
| PDF forward | `resolveProofPdfRuntimeForward` | Delegates `resolvePdfExportPipelineContext` per side |
| Orchestrator | `generateProofDocuments` | Forwards to `generateProofPdf` |
| PDF generator | `proof-pdf-generator.ts` | Passthrough only |
| Template | `factory-proof-pdf-template.ts` | `resolvePdfExportRuntimeLayout`, `resolvePdfExportRuntimePresentationOffsetY` |
| Fallback in template | `resolveSidePdfPipelineContext` | If `pipelineContextBySide[side]` set → use as-is; else `resolvePdfExportPipelineContext` (still adapter) |

**No direct calls to:** `resolveGeometryRuntimeSnapshot`, `resolveDesignerPreviewLayout` (outside adapter), `resolveGeometryRuntimePhotoBridge` in submit orchestration layer.

---

## Download PDF Path (Unified)

```
generateProofPdfWithGeometryRuntime(input, geometryVersion)
  ↓
resolveProofPdfRuntimeForwardFromEffectiveVersion(order, geometryVersion)
  ↓
applyProofPdfRuntimeForward(input, forward)
  ↓
generateProofPdf(forwarded input)
```

Same `pipelineContextBySide` as submit when `effectiveVersions.pdf` matches.

---

## Production Safety

- `normalizeProofSubmitRuntimeContext()` forces all effective versions V1 when `productionLocked`
- `resolveProofPdfRuntimeForward` returns `{ geometryVersion: V1 }` with no `pipelineContextBySide`
- Template adapter falls back to legacy `resolveDesignerPreviewLayout` via `export-pdf-runtime` V1 path
- **Byte-compatible** with pre-runtime production PDF

---

## Dev Runtime (`exportRuntime.pdf = ON`)

1. Client sends `proofRuntimeContext` with `effectiveVersions.pdf = V2`
2. Server `resolveProofPdfRuntimeForward` builds per-side `pipelineContextBySide`
3. `generateProofPdf` receives forward — **does not bypass adapter**
4. `factory-proof-pdf-template` uses `resolvePdfExportRuntimeLayout(side, context)`

---

## Shadow Compare

`EXPORT_PRODUCT_RUNTIME_COMPARE=true`:

- `maybeLogProofSubmitPdfRuntimeCompare` in `generateProofDocuments` (submit path)
- `maybeLogPdfExportRuntimeCompare` in `factory-proof-pdf-template` (per page, existing 71.4)

Both log V1 vs V2 placement Δ; **no output change**.

---

## Files Modified (72.3)

| File | Change |
|------|--------|
| `export-pdf-submit-runtime.ts` | **New** — canonical forward + download unification + submit shadow compare |
| `proof-submit-runtime-context.ts` | PDF forward moved to cutover module |
| `generate-proof.ts` | Uses `resolveProofPdfRuntimeForward` + shadow compare |
| `geometry-runtime-export.ts` | Download PDF uses same forward |
| `index.ts` | Exports |
| `export-pdf-submit-runtime.regression.ts` | **New** |
| `proof-submit-runtime-context.regression.ts` | Import path update |

**Not modified:** Geometry runtime core, calibration, PhotoBridge, print-export-system, ZIP, Email, artifact producer internals.

---

## Remaining Work

| Item | Phase |
|------|-------|
| Client mockup runtime (proof mockup-export → product mockup) | 72.4+ |
| Artifact cache fingerprint + geometry version | 72.4 |
| UI Download Proof PDF button wired to `generateProofPdfWithGeometryRuntime` | Optional |
| `proofPackage` record `geometry_runtime_version` audit field | Optional |
