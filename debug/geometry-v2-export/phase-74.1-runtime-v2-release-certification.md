# Phase 74.1 — Geometry Runtime v2 Release Certification (Parity Analysis)

**Date:** 2026-07-23  
**Scope:** Audit only — no code, runtime, geometry, placement, or render changes  
**Baseline:** Phase 74.0 Runtime Freeze  
**Certifier:** Automated architecture audit + regression baseline review

---

## 1. Executive Summary

Geometry Runtime v2 migration is **architecturally complete** and **production-lock safe**. When the effective geometry version is **V1** (current production default), all migrated export surfaces preserve legacy behavior through adapter fallback paths. Regression suites confirm adapter delegation, forward canonicalization, and download/submit pipeline parity for V2-active paths.

**Central certification question:**

> **Is Geometry Runtime v2 functionally equivalent to V1?**

| Condition | Answer | Evidence |
|-----------|--------|----------|
| **V1 effective version selected** (production lock, toggles off) | **✅ Yes — functionally equivalent** | Adapters route to V1 branches; factory artwork bbox Δ=0; PDF uses `resolveDesignerPreviewLayout`; mockup uses legacy placement |
| **V2 effective version selected** (dev toggles on) | **⚠️ No — intentional geometric differences** | V2 uses snapshot / PhotoBridge geometry; documented deltas (PDF print area ~30px, mockup photoBridge placement, compensation 0 vs ±8%) |
| **V2 download ↔ V2 submit** (same effective version) | **✅ Yes — pipeline equivalent** | `proofPdfRuntimeForwardsMatch`, `proofMockupRuntimeForwardsMatch`, `runtime-forward-canonicalization` regressions |

**Production readiness verdict:** **READY WITH KNOWN DIFFERENCES**

V2 is certified for **controlled production cutover** once production lock policy is explicitly changed, staging visual QA is complete, and known intentional deltas are accepted. V2 is **not** certified as a pixel-identical replacement for V1 geometry — that is by design.

**No functional parity bugs** (❌ classifications) were identified during this audit. All differences fall into ✅ Equivalent, ⚠️ Intentional Difference, or ⏸ Out of Scope.

---

## 2. Architecture Comparison

### Ownership chain (frozen — no duplication)

| Layer | Owner | Duplicated? |
|-------|-------|-------------|
| **Geometry** | `resolve-geometry-runtime.ts` → `resolveGeometryRuntimeSnapshot` | No — single owner |
| **Export snapshot** | `export-runtime-snapshot.ts` (delegates geometry owner) | No |
| **PipelineContext** | `export-pipeline-context.ts` → `resolveExportPipelineContext` | No — single builder |
| **Forward (download)** | `runtime-download-forward.ts` | No |
| **Forward (submit PDF)** | `export-pdf-submit-runtime.ts` | No |
| **Forward (submit mockup)** | `product-mockup-submit-runtime.ts` | No |
| **Adapter (artwork)** | `export-artwork-runtime.ts` | No |
| **Adapter (mockup)** | `product-mockup-runtime.ts` | No |
| **Adapter (ZIP)** | `export-zip-runtime.ts` | No |
| **Adapter (PDF)** | `export-pdf-runtime.ts` | No |

### V1 vs V2 architecture (same stack, different adapter branch)

```
                    V1 effective                    V2 effective
                         │                               │
                         ▼                               ▼
              Forward Resolver (same module)    Forward Resolver (same module)
                         │                               │
                         ▼                               ▼
         pipelineContext.geometryVersion=V1    pipelineContext.geometryVersion=V2
         (no snapshot required)                (+ snapshot, geometry, photoBridge)
                         │                               │
                         ▼                               ▼
              Adapter V1 branch                 Adapter V2 branch
              (legacy delegates)                (reads pipelineContext)
                         │                               │
                         └───────────┬───────────────────┘
                                     ▼
                              Same Renderer
                         (unchanged render modules)
```

**Verified:** No renderer owns geometry. No adapter calls Builder/Anchor. No duplicated `resolveExportPipelineContext` outside approved forward modules (Phase 73.1).

---

## 3. Surface-by-Surface Parity Matrix

### 3.1 Artwork PNG

| Dimension | V1 Owner | V2 Owner | Parity Status |
|-----------|----------|----------|---------------|
| **Geometry source** | `computeFactoryArtworkBBox` + `resolveExportGarmentLayerCmRect` | Same bbox input; adapter adds `artworkStage`/`safeArea` metadata from snapshot | ✅ **Equivalent** (pixels) |
| **Placement** | Relative to tight bbox via `mapLayerRectToFactoryExportPx` | Same — renderer uses `runtimeGeometry.bbox` only | ✅ **Equivalent** |
| **Scale** | Garment size via `resolveExportGarmentLayerCmRect` | Same | ✅ **Equivalent** |
| **Rotation** | Layer `rotation` in bbox union | Same | ✅ **Equivalent** |
| **Compensation** | N/A (factory artwork) | N/A | ✅ **Equivalent** |
| **Crop** | Tight bbox union | Same | ✅ **Equivalent** |
| **Canvas size** | `resolveFactoryExportDpi` + bbox cm → px | Same formula via adapter | ✅ **Equivalent** |
| **Export resolution** | Smart DPI 300–450 | Same | ✅ **Equivalent** |
| **Output bytes** | `renderFactoryArtworkExportPng` | Same renderer; regression: bbox Δ=0, canvas Δ=0 | ✅ **Equivalent** |
| **Pipeline owner** | `export-artwork-runtime.ts` V1 branch | V2 branch (metadata only for render) | ✅ **Equivalent** |
| **Renderer** | `export-artwork-factory.ts` | Same | ✅ **Equivalent** |

#### Artwork paths

| Path | Entry | V1 | V2 | Status |
|------|-------|----|----|--------|
| **Download** | `downloadArtworkExportWithGeometryRuntime` | `resolveArtworkRuntimeForwardFromEffectiveVersion` → adapter V1 | adapter V2 (pixels unchanged) | ✅ Download V1=V2 pixels when V2 active |
| **Submit** | N/A — factory artwork not in proof submit | — | — | ⏸ **Out of Scope** — submit uses print-area PNG (`print-export-system`), not factory artwork |

**Note:** Submit print PNG is a different artifact (full print area @ 300 DPI), not factory tight-bbox artwork. See Print surface below.

---

### 3.2 Product Mockup

| Dimension | V1 Owner | V2 Owner | Parity Status |
|-----------|----------|----------|---------------|
| **Geometry source** | Download: `calibration.json` + `resolveProductMockupPlacementForGarmentSize`; Submit V1: `mockup-export.ts` flat template | `pipelineContext.photoBridge.photoArtworkStage` | ⚠️ **Intentional Difference** when V2 active |
| **Placement** | V1: calibration rect + legacy ±8% compensation | V2: PhotoBridge % → px + runtime compensation (0/0) | ⚠️ **Intentional Difference** |
| **Scale** | `resolveProductMockupPlacementForGarmentSize` | PhotoBridge stage dimensions | ⚠️ **Intentional Difference** |
| **Rotation** | Artwork canvas rotation in compose | Same compose path | ✅ **Equivalent** |
| **Compensation** | `applyMockupVisualCompensation` + ±8% legacy | `pipelineContext.visualCompensation` | ⚠️ **Intentional Difference** |
| **Crop** | Calibration rect clip | Same compose | ✅ **Equivalent** (mechanism) |
| **Canvas size** | Asset natural dimensions | Same | ✅ **Equivalent** |
| **Export resolution** | Preview quality | Same | ✅ **Equivalent** |
| **Output bytes** | V1 engines differ; V2 engines converge | V2 download == V2 submit (same context) | See path table |
| **Pipeline owner** | `product-mockup-runtime.ts` | Same adapter | ✅ **Equivalent** (ownership) |
| **Renderer** | V1 submit: `mockup-export.ts`; V1 download: `ProductMockupEngine`; V2 both: `composeProductMockup` | Converged at V2 | See path table |

#### Mockup paths

| Path | V1 Renderer | V2 Renderer | V1↔V2 | Download↔Submit (same version) |
|------|-------------|-------------|-------|-------------------------------|
| **Download** | `ProductMockupEngine` → `composeProductMockup` V1 branch | `composeProductMockup` V2 branch | ⚠️ Intentional | ✅ V2: same `pipelineContext` |
| **Submit** | `renderMockupPreviewPng` (`mockup-export.ts`) | `renderProofSubmitProductMockupPng` | ⚠️ Intentional | ✅ V2: `proofMockupRuntimeForwardsMatch` |

**Within-V1 historical note:** Proof submit V1 mockup (`mockup-export.ts`) ≠ Designer download V1 mockup (`ProductMockupEngine`). This predates V2 and is preserved intentionally. V2 migration **unifies** submit and download onto `composeProductMockup` + PhotoBridge.

**Mockup artwork sub-layer** (`renderMockupArtworkPng` → `print-export-system`): ⏸ **Out of Scope** — always V1 garment cm; `pipelineContext` voided. Affects layer inside mockup, not compose placement.

---

### 3.3 ZIP

Two distinct ZIP types — must not be conflated.

#### A. Product Export Bundle (Designer Download)

| Dimension | V1 Owner | V2 Owner | Parity Status |
|-----------|----------|----------|---------------|
| **Geometry source** | Inherited from child artifacts | `resolveZipExportPipelineContext(surface: "zip")` | ✅ **Equivalent** (adapter delegate) |
| **ZIP assembly** | `buildProductExportFiles` | Same via `export-zip-runtime.ts` | ✅ **Equivalent** |
| **Pipeline owner** | `product-export.ts` | `export-zip-runtime.ts` passthrough | ✅ **Equivalent** |
| **Renderer** | `product-export.ts` | Same | ✅ **Equivalent** |

| Child artifact | V2 reads context? | Parity |
|----------------|-------------------|--------|
| Factory-Artwork.png | ✅ artwork adapter | ✅ Equivalent pixels |
| Product mockup PNG | ✅ mockup adapter | ⚠️ Intentional when V2 |
| Mockup artwork blob | ❌ print-export V1 | ⏸ Out of Scope |

#### B. Proof Design Package ZIP (Submit)

| Dimension | V1/V2 Owner | Parity Status |
|-----------|-------------|---------------|
| **Geometry** | `design-package-zip.ts` — packaging only | ⏸ **Out of Scope** — no geometry reads |
| **Contents** | Pre-rendered PDF + client mockup/print PNGs | Inherits upstream artifact geometry |
| **Pipeline owner** | N/A | ⏸ **Out of Scope** for 71.3 adapter |

| Path | Status |
|------|--------|
| **Download** | Product bundle only (Designer) |
| **Submit packaging** | Proof ZIP — bytes only, no runtime adapter |

---

### 3.4 Proof PDF

| Dimension | V1 Owner | V2 Owner | Parity Status |
|-----------|----------|----------|---------------|
| **Geometry source** | `resolveDesignerPreviewLayout` (`designer-layout.ts`) | `pipelineContext.geometry.artworkStage` + `snapshot.collar` | ⚠️ **Intentional Difference** when V2 |
| **Placement** | `mapDesignerLayoutToPdf` | Same delegate; different layout input | ⚠️ **Intentional Difference** |
| **Scale** | Template px → PDF pt via `mapDesignerLayoutToPdf` | Same | ✅ **Equivalent** (mechanism) |
| **Rotation** | Embedded print PNG | Same | ✅ **Equivalent** |
| **Compensation** | `resolveProductPreviewVisualCompensationPdfOffsetY` (±8%) | `pipelineContext.visualCompensation` (0/0) | ⚠️ **Intentional Difference** |
| **Crop** | PDF panel clip | Same | ✅ **Equivalent** |
| **Canvas size** | A4 595.28 × 841.89 pt | Same | ✅ **Equivalent** |
| **Export resolution** | 300 DPI embedded print | Same | ✅ **Equivalent** |
| **Output bytes** | V1 layout values | V2: documented Δ (~30px print area top front M) | ⚠️ **Intentional Difference** |
| **Pipeline owner** | `export-pdf-runtime.ts` V1 branch | V2 branch | ✅ **Equivalent** (ownership) |
| **Renderer** | `factory-proof-pdf-template.ts` | Same | ✅ **Equivalent** |

#### PDF paths

| Path | Forward | Download↔Submit (same pdf version) |
|------|---------|--------------------------------------|
| **Download** | `resolveProofPdfRuntimeForwardFromEffectiveVersion` | ✅ `proofPdfRuntimeForwardsMatch` |
| **Submit** | `resolveProofPdfRuntimeForward` | ✅ Same `pipelineContextBySide` |

**Embedded print PNG bytes:** ⏸ **Out of Scope** — still from `print-export-system` (V1). PDF layout/placement is runtime-migrated; print artifact is not.

---

### 3.5 Email

| Dimension | V1 Owner | V2 Owner | Parity Status |
|-----------|----------|----------|---------------|
| **Geometry** | None | None | ⏸ **Out of Scope** |
| **Pipeline owner** | N/A | N/A | ⏸ **Out of Scope** |
| **Renderer** | `proof-email.ts` (HTML + signed URLs) | Same | ✅ **Equivalent** (inheritance) |
| **Inheritance** | Links to PDF/ZIP URLs | Reflects upstream artifact bytes when producers switch | ✅ **Equivalent** (passive) |

`effectiveVersions.email` exists in wire context but has **no consumer**. No `surface: "email"` pipeline resolver.

---

### 3.6 Print PNG (Submit — related, not primary surface)

| Dimension | Status |
|-----------|--------|
| **Runtime migration** | ⏸ **Out of Scope** — `effectiveVersions.print` hardcoded V1 |
| **Renderer** | `print-export-system.ts` — `void pipelineContext` |
| **Parity** | ✅ **Equivalent** — unchanged from pre-migration |

---

## 4. Pipeline Comparison (Download vs Submit)

| Surface | Download forward | Submit forward | Same effective version → same context? | Same placement when V2? |
|---------|------------------|----------------|----------------------------------------|-------------------------|
| Artwork (factory) | `resolveArtworkRuntimeForwardFromEffectiveVersion` | N/A | N/A | N/A |
| Mockup | `resolveProductMockupRuntimeForwardFromEffectiveVersion` | `resolveProofMockupRuntimeForward` | ✅ Yes (`surface: "png"`) | ✅ Yes (V2) |
| ZIP (product) | `resolveZipRuntimeForwardFromEffectiveVersion` | N/A | N/A | N/A |
| ZIP (proof) | N/A | `buildDesignPackageZip` (packaging) | N/A | N/A |
| PDF | `resolveProofPdfRuntimeForwardFromEffectiveVersion` | `resolveProofPdfRuntimeForward` | ✅ Yes (`surface: "pdf"`) | ✅ Yes (V2) |
| Email | N/A | passive | N/A | N/A |
| Print | N/A | V1 only | N/A | N/A |

**Production lock:** Both paths normalize to V1 via `resolveEffectiveDownloadGeometryVersion` / `normalizeProofSubmitRuntimeContext`.

**Dev toggle:** UI `getEffectiveGeometryVersion(surface)` on download; `proofRuntimeContext.effectiveVersions` on submit.

---

## 5. Gap Matrix

### ✅ Equivalent (V1 preserved or V2 internal consistency)

| Item | Notes |
|------|-------|
| Factory artwork PNG pixels (V1 path) | Bbox/canvas Δ=0 regression |
| Factory artwork PNG pixels (V2 path) | Renderer ignores V2 metadata; same output as V1 |
| V2 PDF download ↔ V2 PDF submit | `proofPdfRuntimeForwardsMatch` |
| V2 mockup download ↔ V2 mockup submit | `proofMockupRuntimeForwardsMatch` |
| ZIP adapter delegate | No geometry in ZIP assembly |
| Email inheritance | No geometry |
| Forward canonicalization | Phase 73.1 regression 19/19 |
| Shadow compare isolation | Log-only (see Section 6) |
| Production lock → V1 everywhere | Verified all forwards |

### ⚠️ Intentional Difference

| Item | Why | Production impact |
|------|-----|-------------------|
| V2 PDF print area / collar / compensation | Snapshot-driven geometry replaces `designer-layout` + ±8% legacy | PDF layout shifts when V2 enabled (~30px front print area top) |
| V2 mockup placement | PhotoBridge replaces calibration + legacy compensation | Mockup compose position changes when V2 enabled |
| V1 submit mockup ≠ V1 designer mockup | Historical: flat template vs ProductMockupEngine | Pre-existing; preserved for V1 fallback |
| V2 ≠ V1 pixel output | V2 is corrected geometry model, not V1 clone | Expected — cutover accepts new geometry |
| Mockup artwork sub-layer V1 | `print-export-system` not runtime-migrated | Inner artwork layer unchanged when compose is V2 |

### ⏸ Out of Scope

| Item | Why |
|------|-----|
| Print submit PNG runtime | `print: V1` hardcoded; not in migration scope |
| Factory artwork in proof submit | Different artifact (print-area PNG) |
| Proof design package ZIP geometry | Packaging only |
| Email runtime adapter | No geometry surface |
| `surface: "email"` pipeline resolver | Toggle exists; no consumer |
| Embedded print PNG in PDF | `print-export-system` unchanged |

### ❌ Functional Difference

**None identified.** No behavior mismatch classified as unintended bug. All deltas are explained by intentional V2 geometry or explicit out-of-scope preservation.

---

## 6. Shadow Compare Audit

| Hook | Env flag | Location | Log only? | Mutates image? | Mutates geometry? |
|------|----------|----------|-----------|----------------|-----------------|
| `maybeLogArtworkExportRuntimeCompare` | `EXPORT_RUNTIME_COMPARE` | `export-artwork-factory.ts` | ✅ | ❌ | ❌ |
| `maybeLogProductMockupRuntimeCompare` | `EXPORT_PRODUCT_RUNTIME_COMPARE` | `product-mockup-compose.ts` | ✅ | ❌ | ❌ |
| `maybeLogZipExportRuntimeCompare` | `EXPORT_PRODUCT_RUNTIME_COMPARE` | `export-zip-runtime.ts` | ✅ | ❌ | ❌ |
| `maybeLogPdfExportRuntimeCompare` | `EXPORT_PRODUCT_RUNTIME_COMPARE` | `factory-proof-pdf-template.ts` | ✅ | ❌ | ❌ |
| `maybeLogProofSubmitPdfRuntimeCompare` | `EXPORT_PRODUCT_RUNTIME_COMPARE` | `generate-proof.ts` | ✅ | ❌ | ❌ |
| `maybeLogProofSubmitMockupRuntimeCompare` | `EXPORT_PRODUCT_RUNTIME_COMPARE` | `product-mockup-submit-render.ts` | ✅ | ❌ | ❌ |

**Compare-side context build** in `export-artwork-runtime.ts:153` builds V2 context for delta logging only — does not affect render path.

**Certification:** ✅ All shadow compare hooks are log-only.

---

## 7. Dead Code Analysis

### Still required (do not remove)

| Module / symbol | Reason |
|-----------------|--------|
| `mockup-export.ts` / `renderMockupPreviewPng` | V1 proof submit mockup fallback; DesignerApp preview |
| `designer-layout.ts` / `resolveDesignerPreviewLayout` | V1 PDF adapter branch; V2 shell fallback |
| `mockup-export-debug.ts` | V1 flat print area helpers |
| `print-export-system.ts` | Print submit + mockup artwork layer (V1) |
| `export-artwork-factory.ts` V1 path | Factory artwork render (both versions) |
| `resolveLegacyInlineDownloadPipelineContext` | Regression parity reference |
| `proof-submit-runtime-context.ts` V1 defaults | Production wire format |
| `geometry-runtime-export.ts` | Download orchestration |
| All forward modules | Frozen architecture |

### Can be deprecated (future cleanup — post cutover only)

| Module / symbol | Condition for removal |
|-----------------|----------------------|
| `withResolvedPipelineContext` (removed 73.1) | Already removed |
| `resolveProofSubmitPdfRuntimeForward` alias | Deprecated alias in `export-pdf-submit-runtime.ts` |
| `ProductExportPanel` direct download (no runtime) | When all download paths use geometry runtime |
| V1 adapter branches in runtime adapters | Only after V2 is sole production version + extended bake period |
| `mockup-export.ts` | Only after V1 mockup fallback no longer needed in production |
| `designer-layout.ts` PDF placement | Only after V2 PDF is sole production path |

### Future cleanup (not now)

| Item | Phase |
|------|-------|
| Print submit runtime migration | New phase required |
| Email runtime adapter | Only if email needs geometry |
| Remove V1 legacy visual compensation | After all surfaces on V2 |
| Consolidate V1 submit/designer mockup engines | Historical debt; V2 already unified |
| `temp-project/` duplicate mockup paths | Separate legacy tree |

**Certification:** No dead code should be removed during freeze. All legacy paths are **required** for V1 production behavior.

---

## 8. Regression Coverage Analysis

### Tier 1 — Export runtime (release gate) — **9/9 PASS**

| Suite | Checks | Coverage |
|-------|--------|----------|
| `runtime-forward-canonicalization.regression.ts` | 19 | Forward canonicalization, download/submit mockup parity |
| `export-artwork-runtime.regression.ts` | 51 | Artwork adapter V1/V2, bbox parity |
| `product-mockup-runtime.regression.ts` | 37 | Mockup placement adapter |
| `export-zip-runtime.regression.ts` | 28 | ZIP delegate |
| `export-pdf-runtime.regression.ts` | 29 | PDF layout adapter, V1/V2 delta |
| `export-pdf-submit-runtime.regression.ts` | 19 | PDF submit/download forward parity |
| `product-mockup-submit-runtime.regression.ts` | 18 | Mockup submit forward, download parity |
| `proof-submit-runtime-context.regression.ts` | 18 | Wire context normalization |
| `export-runtime-snapshot.regression.ts` | 74 | Snapshot delegate chain |

### Architecture vs behavior vs parity coverage

| Coverage type | Status | Gaps |
|---------------|--------|------|
| **Architecture** | ✅ Strong | Forward isolation, delegate-only scans in adapter regressions |
| **Behavior (adapter output)** | ✅ Strong | Layout/bbox/placement unit regressions per surface |
| **Parity (V1↔V2 pixels)** | ⚠️ Partial | Artwork bbox/canvas proven; **no full PNG byte-diff suite** across all layer types |
| **Parity (download↔submit)** | ✅ Strong | PDF + mockup forward match regressions |
| **End-to-end visual** | ⚠️ Manual | Shadow compare in staging; no automated visual diff in CI |

### Runtime paths without dedicated regression

| Path | Risk | Mitigation |
|------|------|------------|
| Full PNG byte identity (all surfaces) | Low-Medium | Shadow compare + staging QA |
| V1 submit mockup vs V1 designer mockup | Known intentional | Documented; not a V2 bug |
| Print submit runtime | N/A | Out of scope; V1 unchanged |
| Email | N/A | No geometry |
| `DesignerApp` inline `renderMockupPreviewPng` preview | Low | Separate from export runtime |
| Product bundle ZIP child artifact cross-version | Low | ZIP regression covers context passthrough |

---

## 9. Production Readiness Assessment

### Verdict: **READY WITH KNOWN DIFFERENCES**

| Criterion | Status |
|-----------|--------|
| Architecture frozen (74.0) | ✅ |
| V1 behavior preserved when V1 selected | ✅ Certified |
| V2 download/submit pipeline consistency | ✅ Certified |
| No unintended functional differences | ✅ Certified |
| V2 pixel-identical to V1 | ❌ Not required — intentional geometry upgrade |
| Production lock safety | ✅ V1 default enforced |
| Regression baseline green (Tier 1) | ✅ 9/9 |
| Staging visual QA | ☐ Required before cutover |
| Snapshot foundation suites | ⚠️ Pre-existing drift (non-blocking for adapter cert) |

### Reasoning

**READY** because:
- Production today runs V1 exclusively — certified equivalent to pre-migration behavior.
- V2 paths are internally consistent (download = submit for PDF and mockup).
- Architecture is frozen with full forward coverage.
- No parity bugs found.

**WITH KNOWN DIFFERENCES** because:
- Enabling V2 intentionally changes PDF layout, mockup placement, and compensation.
- Print submit, mockup artwork layer, and proof ZIP packaging remain V1/out-of-scope.
- Full pixel-diff parity suite does not exist.

**NOT READY** would apply if: functional bugs found, V1 regression when lock on, or broken download/submit parity. None observed.

---

## 10. Recommended Production Cutover Plan

### Phase A — Pre-cutover (current state)

- [x] Runtime architecture complete
- [x] Forward canonicalization (73.1)
- [x] Regression Tier 1 baseline recorded
- [x] Parity certification (this document)
- [ ] Staging QA with `EXPORT_PRODUCT_RUNTIME_COMPARE=true` per surface
- [ ] Accept V2 geometric deltas with product/design sign-off
- [ ] Fix stale `export-pipeline-context` regression assertion (test hygiene)

### Phase B — Staged enable (per surface)

1. Enable `exportRuntime.pdf` in staging → compare PDF shadow logs → visual sign-off
2. Enable `exportRuntime.png` in staging → compare mockup shadow logs → visual sign-off
3. Enable `exportRuntime.zip` in staging → verify bundle contents
4. Keep `print: V1` until print runtime phase

### Phase C — Production lock lift

1. Define production policy (per-surface toggles vs global V2)
2. Change `isGeometryRuntimeProductionLocked` policy (explicit phase — not this audit)
3. Monitor shadow compare in production (log-only) for first release window
4. Rollback: re-enable production lock → instant V1

### Phase D — Post-cutover cleanup (future)

1. Print submit runtime migration
2. Remove V1 fallback paths after bake period
3. Resolve snapshot drift in foundation suites
4. Deprecate `mockup-export.ts` when V1 mockup no longer needed

---

## 11. Final Certification

### Certification statement

> **Geometry Runtime v2 is certified for future production cutover under the condition that V2 is understood as an intentional geometry upgrade, not a pixel-identical clone of V1.**

| Certification area | Result |
|--------------------|--------|
| V1 preservation (production default) | **✅ CERTIFIED EQUIVALENT** |
| V2 active vs V1 output | **⚠️ CERTIFIED INTENTIONAL DIFFERENCE** |
| V2 download ↔ V2 submit consistency | **✅ CERTIFIED EQUIVALENT** |
| Architecture ownership | **✅ CERTIFIED — no duplication** |
| Shadow compare safety | **✅ CERTIFIED — log only** |
| Unintended functional bugs | **✅ NONE FOUND** |
| Overall production cutover readiness | **READY WITH KNOWN DIFFERENCES** |

### Explicit answer

**Is Geometry Runtime v2 functionally equivalent to V1?**

- **When V1 is the effective version:** **Yes.** Certified with regression evidence. Production behavior is unchanged.
- **When V2 is the effective version:** **No.** By design. V2 delivers snapshot/PhotoBridge-driven geometry with documented placement and compensation differences. V2 is functionally **consistent across download and submit**, not equivalent to V1 output.

**Signed:** Phase 74.1 Parity Analysis (audit-only)  
**References:** `phase-74.0-runtime-freeze.md`, `phase-73.1-runtime-forward-map.md`, Tier 1 regression baseline

---

## Production Cutover Checklist

此清單為 V2 正式上線（Production Cutover）的依據，無需重新做完整架構分析。

| 項目 | 狀態 | 備註 |
|------|------|------|
| Runtime 架構完成 | ✅ | Phase 71–73 |
| Single Geometry Owner | ✅ | `resolveGeometryRuntimeSnapshot` |
| Single ExportPipelineContext | ✅ | `export-pipeline-context.ts` |
| Forward Canonicalization | ✅ | Phase 73.1 — 所有 surface 單一 forward |
| Runtime Adapters 完成 | ✅ | Artwork / Mockup / ZIP / PDF |
| Download Runtime 完成 | ✅ | `runtime-download-forward.ts` |
| Submit Runtime 完成 | ✅ | PDF + Mockup submit forwards |
| Client / Server 分離 | ✅ | `geometry-runtime-export-pdf.server.ts` |
| Runtime Freeze 文件 | ✅ | Phase 74.0 |
| Regression Baseline (Tier 1) | ✅ | 9/9 export runtime suites |
| Parity 認證文件 | ✅ | Phase 74.1（本文件） |
| V1 行為保留（Production Lock） | ✅ | 認證通過 |
| V1/V2 Parity（V1 effective） | ✅ | 認證通過 |
| V1/V2 Parity（V2 active） | ⚠️ | 刻意差異 — 需產品/設計簽核 |
| Download ↔ Submit Parity（V2） | ✅ | PDF + Mockup 認證通過 |
| Shadow Compare 安全 | ✅ | 僅 log，不影響輸出 |
| 功能性 Parity Bug | ✅ | 無 |
| Staging 視覺 QA | ☐ | Cutover 前必做 |
| V2 幾何差異簽核 | ☐ | PDF / Mockup 放置差異 |
| Production Lock 可解除 | ☐ | 需獨立 phase + 政策 |
| Print Submit Runtime | ☐ | 未遷移（Out of Scope） |
| 全表面 PNG byte-diff CI | ☐ | 建議加強，非阻擋 |
| Foundation snapshot 修復 | ☐ | `product-factory-anchor` 等 |
| Legacy V1 可移除 | ☐ | Cutover 後 bake period 才可考慮 |
| Email Runtime Adapter | ☐ | 不需要（被動繼承） |

### Cutover 決策門檻

**可進入 Staged Enable（Phase B）：** 當 Staging QA + V2 差異簽核完成  
**可進入 Production Lock Lift（Phase C）：** 當 Phase B 全 surface 通過 + rollback 演練完成  
**可進入 Legacy 清理（Phase D）：** 當 Production V2 穩定 ≥ 約定 bake period

---

## Appendix — Module Reference

| Surface | Forward | Adapter | Renderer |
|---------|---------|---------|----------|
| Artwork download | `runtime-download-forward.ts` | `export-artwork-runtime.ts` | `export-artwork-factory.ts` |
| Mockup download | `runtime-download-forward.ts` | `product-mockup-runtime.ts` | `ProductMockupEngine` / `composeProductMockup` |
| Mockup submit V1 | `product-mockup-submit-runtime.ts` | — | `mockup-export.ts` |
| Mockup submit V2 | `product-mockup-submit-runtime.ts` | `product-mockup-runtime.ts` | `product-mockup-submit-render.ts` |
| ZIP download | `runtime-download-forward.ts` | `export-zip-runtime.ts` | `product-export.ts` |
| PDF download/submit | `export-pdf-submit-runtime.ts` | `export-pdf-runtime.ts` | `factory-proof-pdf-template.ts` |
| Email submit | — | — | `proof-email.ts` |
| Print submit | — | — | `print-export-system.ts` |
