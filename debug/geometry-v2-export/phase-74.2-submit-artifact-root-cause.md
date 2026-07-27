# Phase 74.2 — Submit Artifact Root Cause Analysis

**Date:** 2026-07-23  
**Scope:** Audit only — no code changes  
**Symptom:** Designer preview correct; Submit Proof PDF and ZIP Mockup PNG show old garment template and shifted front/back print area  
**Download runtime:** Previously certified separately (uses same export surface gating as submit mockup)

---

## 1. Executive Summary

Submit artifacts diverge from Designer preview because **submit and preview resolve different effective geometry versions from the same `GeometryRuntimeState`**.

| Surface key | Toggle group | Default | Typical dev state |
|-------------|--------------|---------|-------------------|
| Designer canvas | `preview.designer` | **ON** | V2 when `geometryVersion=V2` |
| Result panel preview | `preview.resultPanel` | **ON** | V2 when `geometryVersion=V2` |
| Submit mockup | `exportRuntime.png` | **OFF** | **V1** |
| Submit PDF | `exportRuntime.pdf` | **OFF** | **V1** |

**First module that no longer matches Designer state:**

`lib/designer-geometry-v2/proof-submit-runtime-context.ts` → `resolveEffectiveVersions()` → `resolveEffectiveGeometryVersion(state, "png" | "pdf")`

This runs **before** any forward resolver, adapter, or renderer. When `exportRuntime.png` and `exportRuntime.pdf` are `false` (factory default), submit effective versions are **V1** while preview effective versions are **V2**.

**Why both PDF and mockup fail the same way:** Both submit paths read the same misaligned effective versions from `proofRuntimeContext` and independently fall back to legacy V1 stacks that share the same old flat garment template (`/templates/adult-tshirt-*.png`) and legacy print-area layout (`designer-layout.ts` / `mockup-export.ts`).

**Root cause classification:** ⚠️ **Intentional architecture** (separate Preview vs Export Runtime toggles) producing an **unintended user-visible gap** when V2 preview is enabled without enabling Export Runtime toggles.

**Not the root cause:** Stale cache, broken forward resolvers, missing `proofRuntimeContext` wire, or server failing to parse context (secondary factors only).

---

## 2. Pipeline Trace

### Stage 0 — Designer State (`GeometryRuntimeState`)

| Field | Input | Output | Geometry source | Product master | Garment template | PipelineContext | Version | Path |
|-------|-------|--------|-----------------|----------------|------------------|-----------------|---------|------|
| React state | User / dev console | `geometryVersion`, `preview.*`, `exportRuntime.*` | N/A (flags only) | N/A | N/A | None | Often **V2** in dev | Runtime |

**Default state** (`createDefaultGeometryRuntimeState`):
- `geometryVersion`: V1 (until user selects V2 in console)
- `preview.designer`: **true**
- `preview.resultPanel`: **true**
- `exportRuntime.png/pdf/zip/email`: **false**

---

### Stage 1 — Designer Preview (reference — correct)

#### A. Design canvas

| | |
|--|--|
| **Module** | `DesignCanvas.tsx` |
| **Effective version** | `getEffectiveGeometryVersion("designer")` |
| **Gate** | `preview.designer` |
| **Garment template** | `resolveDesignerTemplateAsset` → V2: `/products/UA35001/assets/*` |
| **Geometry** | `resolveDesignerRuntimeWorkspace` + designer display projection |
| **PipelineContext** | None (preview uses photo bridge / workspace directly) |
| **Legacy/V2** | **V2** when toggle on |

#### B. Result panel product preview

| | |
|--|--|
| **Module** | `ResultPanelProductPreviewDesigner.tsx` |
| **Effective version** | `getEffectiveGeometryVersion("resultPanel")` |
| **Gate** | `preview.resultPanel` |
| **Garment template** | UA product photo via `display.garmentAssetUrl` / product loader |
| **Geometry** | `resolveGeometryRuntimePhotoBridge` |
| **Placement** | PhotoBridge `photoArtworkStage` + runtime visual compensation |
| **Legacy/V2** | **V2** when toggle on |

---

### Stage 2 — Submit context bridge

| | |
|--|--|
| **Module** | `ProofSubmitRuntimeContextBridge.tsx` |
| **Input** | Full `GeometryRuntimeState` from context |
| **Output** | `ProofSubmitRuntimeContext` via `resolveProofSubmitRuntimeContext` |
| **Wire** | `DesignerApp` → `proofSubmitRuntimeContextRef` |

**`resolveEffectiveVersions` output (typical dev: V2 geometry, export toggles OFF):**

```json
{
  "geometryVersion": "v2",
  "effectiveVersions": {
    "pdf": "v1",
    "mockup": "v1",
    "print": "v1",
    "email": "v1"
  }
}
```

| Field | Resolution | Gate |
|-------|------------|------|
| `effectiveVersions.mockup` | `resolveEffectiveGeometryVersion(state, "png")` | `exportRuntime.png` |
| `effectiveVersions.pdf` | `resolveEffectiveGeometryVersion(state, "pdf")` | `exportRuntime.pdf` |
| `effectiveVersions.print` | Hardcoded V1 | Always |

**⚠️ FIRST DIVERGENCE from Designer preview occurs here.**

**Initial ref hazard (secondary):** `proofSubmitRuntimeContextRef` initializes to `createDefaultProofSubmitRuntimeContext()` (all V1) until bridge `useEffect` runs. Unlikely on user submit, but possible on instantaneous auto-submit.

---

### Stage 3 — `prepareProofSubmission(proofOrder, proofRuntimeContext)`

| | |
|--|--|
| **Module** | `lib/proof-engine/client.ts` |
| **Input** | `ProofOrder` + ref snapshot of `proofRuntimeContext` |
| **Output** | `ProofArtifactsInput` `{ mockups, prints }` |
| **Geometry** | Delegates to generators with context |

---

### Stage 4 — `generateProofArtifacts(order, proofRuntimeContext)`

| | |
|--|--|
| **Module** | `lib/proof-engine/generate-artifacts.ts` |
| **Cache fingerprint** | Design payload; `+ :mockup:v2` suffix only when mockup forward is V2 |
| **Cache risk** | ⚠️ Secondary — V1 artifacts cached under base key; toggling export ON later busts V2 key. Does not explain preview vs submit mismatch. |
| **Output** | Client-side mockup + print PNG blobs |

---

### Stage 5a — `generateMockupsForOrder` → Submit mockup PNG

| Step | Module | Geometry source | Garment template | PipelineContext | Version |
|------|--------|-----------------|------------------|-----------------|---------|
| Forward | `resolveProofMockupRuntimeForward` | `effectiveVersions.mockup` | — | Built if V2 | **V1** (default) |
| V1 branch | `mockup-export.ts` `renderMockupPreviewPng` | `getFlatMockupPrintAreaRectPx` + `resolvePrintAreaCm` | `/templates/adult-tshirt-{color}-{side}.png` | None | **Legacy V1** |
| V2 branch | `product-mockup-submit-render.ts` | `product-mockup-runtime` + PhotoBridge | `/products/UA35001/` via `loadAsset` | `surface: "png"` | Not reached when toggle OFF |

**ZIP mockup bytes** = these client blobs packaged by `buildDesignPackageZip` (no server re-render).

---

### Stage 5b — `generatePrintsForOrder` → Print PNG (embedded in PDF)

| | |
|--|--|
| **Module** | `print-generator.ts` → `print-export-system.ts` |
| **Geometry** | `getExportCanvasSpec` + legacy garment cm |
| **PipelineContext** | `void` — always ignored |
| **Version** | **V1 always** (`print: V1` hardcoded) |

⏸ Out of scope for mockup symptom; affects artwork inside PDF print area.

---

### Stage 6 — FormData upload → Server

| | |
|--|--|
| **Route** | `app/api/designs/submit/route.ts` |
| **Parse** | `parseProofSubmitRuntimeContextFromFormData` → `normalizeProofSubmitRuntimeContext` |
| **Production lock** | Server re-forces V1 in production (`NODE_ENV === "production"`) |
| **Artifacts** | Client PNGs passed through (not re-rendered) |

---

### Stage 7 — `generateProofDocuments` → Submit PDF

| Step | Module | Geometry source | Garment template | PipelineContext | Version |
|------|--------|-----------------|------------------|-----------------|---------|
| Forward | `resolveProofPdfRuntimeForward` | `effectiveVersions.pdf` | — | Per-side if V2 | **V1** (default) |
| Adapter | `export-pdf-runtime.ts` | V1: `resolveDesignerPreviewLayout` | — | From forward | **Legacy V1** |
| Renderer | `factory-proof-pdf-template.ts` | `resolvePdfExportRuntimeLayout` | `getAdultTshirtTemplateSrc` → `/templates/adult-tshirt-*.png` | Per-side optional | **Legacy V1** |
| Print embed | Same template | Client `printBytes` from V1 print-export | — | — | V1 |

**V2 path (only when `exportRuntime.pdf` ON):** `pipelineContext.geometry.artworkStage` + snapshot collar + UA-calibrated placement — **not active under default toggles**.

---

### Stage 8 — ZIP packaging

| | |
|--|--|
| **Module** | `design-package-zip.ts` |
| **Geometry** | None — packages pre-rendered bytes |
| **Mockup source** | Stage 5a client blobs (V1 path under default toggles) |
| **PDF source** | Stage 7 server PDF (V1 path under default toggles) |

---

## 3. Data Ownership Map

```
GeometryRuntimeState (single React state)
        │
        ├─ preview.designer / preview.resultPanel ──► Designer Preview (V2)
        │         resolveGeometryRuntimePhotoBridge
        │         resolveDesignerTemplateAsset (UA35001 assets)
        │
        └─ exportRuntime.png / exportRuntime.pdf ─────► Submit artifacts (V1 default)
                  resolveProofMockupRuntimeForward
                  resolveProofPdfRuntimeForward
                          │
                          ▼ (when V1 effective)
                  ┌───────────────────────────────────────┐
                  │ LEGACY STACK (shared visual family)    │
                  │ • shirt-template /templates/adult-*    │
                  │ • designer-layout.ts (PDF print area)  │
                  │ • mockup-export.ts (flat print rect)     │
                  │ • legacy ±8% visual compensation       │
                  └───────────────────────────────────────┘
```

| Asset / geometry | Designer V2 preview | Submit V1 (default) |
|------------------|---------------------|------------------------|
| Garment PNG | `/products/UA35001/assets/*` | `/templates/adult-tshirt-*` |
| Print area | PhotoBridge / snapshot stage | `designer-layout` / flat mockup rect |
| Product master | `resolveGeometryRuntimeSnapshot` (preview path) | Not used on submit V1 |
| Calibration | UA35001 `calibration.json` (V2 compose) | Legacy template calibration |
| Visual compensation | Runtime 0/0 (V2) | Legacy ±8% |

---

## 4. Comparison Table

| Dimension | Designer Preview | Submit PDF | Submit Mockup (ZIP) |
|-----------|------------------|------------|---------------------|
| **Effective version gate** | `preview.designer` / `preview.resultPanel` | `exportRuntime.pdf` | `exportRuntime.png` |
| **Default effective version** | V2 (when geometry=V2, preview ON) | **V1** | **V1** |
| **Garment template** | UA35001 product photo assets | `/templates/adult-tshirt-*.png` | `/templates/adult-tshirt-*.png` |
| **Print area source** | PhotoBridge / runtime workspace | `designer-layout.ts` | `mockup-export.ts` flat rect |
| **Geometry owner** | `geometry-runtime-photo-bridge` | `export-pdf-runtime` V1 branch | `mockup-export.ts` (bypasses runtime) |
| **Product master** | Snapshot (V2 preview) | Not used (V1) | Not used (V1) |
| **PipelineContext** | N/A (direct bridge) | None (V1 forward empty) | None (V1 forward empty) |
| **Renderer** | CSS + `PreviewDesignLayer` | `factory-proof-pdf-template.ts` | `renderMockupPreviewPng` |
| **Matches designer?** | ✓ Reference | ✗ Old template + shift | ✗ Old template + shift |

---

## 5. Gap Matrix

### ✅ Equivalent (when configured correctly)

| Scenario | Notes |
|----------|-------|
| All surfaces V1 | Preview OFF or geometry V1 — submit matches legacy preview |
| Export toggles ON + geometry V2 | Submit uses V2 forwards (if user enables PNG + PDF in dev console) |
| V2 submit mockup ↔ V2 download | Same `surface: "png"` forward (certified 73.1/74.1) |
| V2 submit PDF ↔ V2 download PDF | Same `surface: "pdf"` forward (certified 72.3) |
| Forward/adapters when given V2 context | Architecture works — not exercised under default toggles |

### ⚠️ Intentional Difference (root of observed bug)

| Item | Why |
|------|-----|
| **Separate Preview vs Export Runtime toggles** | Phase 69.6 design — preview can be V2 while export remains V1 for staged rollout |
| **Default `exportRuntime.* = false`** | Production-safe default; submit stays V1 until explicit enable |
| **V1 submit mockup engine ≠ V1 designer product mockup** | Historical: `mockup-export` vs `ProductMockupEngine` (pre-V2 debt) |
| **V2 ≠ V1 pixel output** | Documented in 74.1 certification |

### ⏸ Out of Scope

| Item | Why |
|------|-----|
| Print PNG in PDF | Always V1; `print-export-system` not migrated |
| Proof ZIP packaging geometry | Bytes-only assembly |
| Email | Passive URL inheritance |
| Factory artwork download | Not in proof submit path |

### ❌ Functional Difference (unintended bug)

**None proven.** Observed behavior is **consistent with documented architecture** under default toggle state. The gap is a **configuration / policy wiring issue**, not a broken adapter or stale legacy reference bug.

---

## 6. Root Cause (Single Authoritative Source)

**Authoritative source:** `resolveEffectiveGeometryVersion()` surface gating in `lib/designer-geometry-v2/geometry-runtime-state.ts`, invoked for submit via `resolveEffectiveVersions()` in `lib/designer-geometry-v2/proof-submit-runtime-context.ts`.

**Mechanism:**

1. Developer enables **V2** + **Preview toggles** (default ON) → Designer shows UA35001 garment + PhotoBridge placement.
2. **Export Runtime toggles** remain **OFF** (factory default) → submit resolves `effectiveVersions.pdf = v1`, `effectiveVersions.mockup = v1`.
3. Submit mockup forward returns V1 → `renderMockupPreviewPng` → legacy flat template + legacy print rect.
4. Submit PDF forward returns V1 → `resolveDesignerPreviewLayout` + `getAdultTshirtTemplateSrc` → same legacy visual family.
5. ZIP contains client mockup bytes + server PDF → **both exhibit old garment + shifted print area**.

**Why download certification did not catch this for the user:** Download uses the **same** `exportRuntime.png` gate as submit mockup. Download is correct only when PNG export toggle is ON. Designer preview uses a **different** gate (`preview.resultPanel`). User likely validated preview vs download with PNG toggle enabled, or conflated preview correctness with submit correctness.

---

## 7. Minimal Fix Recommendation (do not implement in 74.2)

**Option A — Policy alignment (smallest behavior change):** When `geometryVersion === V2` and preview toggles are on, default or auto-sync `exportRuntime.png` and `exportRuntime.pdf` to match preview intent for submit surfaces.

**Option B — Surface mapping change:** Map submit `effectiveVersions.mockup` to `resolveEffectiveGeometryVersion(state, "resultPanel")` instead of `"png"`, and submit PDF to a preview-aligned surface — decouple submit from separate export toggles for proof path only.

**Option C — Documentation / dev UX only:** Require enabling **Export Runtime → PNG + PDF** in Geometry Debug Console before submit testing; show warning when `geometryVersion=V2` but export toggles off.

**Recommended:** **Option B or A** for proof submit path — proof artifacts should inherit the same effective version the user sees in preview, without requiring a second manual toggle set.

**Not recommended:** Changing renderers, placement, or geometry core — forward/adapters already work when V2 effective version is supplied.

---

## 8. Risk Assessment

| Fix approach | Risk | Impact |
|--------------|------|--------|
| **Option A** (auto-sync toggles) | Medium — may enable V2 export surfaces unexpectedly in dev | Aligns submit with preview; may affect download/ZIP too |
| **Option B** (remap submit surfaces) | Low-Medium — scoped to `proof-submit-runtime-context` | Proof-only; download toggles unchanged |
| **Option C** (docs only) | Low — no code change | Does not fix user confusion |
| **No fix** | High UX risk — preview/submit permanently diverge in default dev state | Blocks confidence in V2 submit testing |
| **Artifact cache clear** | Low | Does not fix root cause; only helps if toggles were changed mid-session |

**Production note:** With production lock, **both** preview and submit are V1 — they match each other but neither shows V2. Observed bug requires **dev** environment with V2 preview enabled and export toggles off.

---

## 9. Special Investigation Answers

| Question | Answer |
|----------|--------|
| Legacy product master on submit? | **Yes (V1 path)** — submit V1 does not use snapshot; PDF/mockup use `designer-layout` / flat mockup |
| Legacy garment template? | **Yes** — `/templates/adult-tshirt-*.png` via `shirt-template.ts` / `mockup-export.ts` |
| Legacy calibration? | **Yes (V1 mockup)** — flat template rect, not UA35001 `calibration.json` |
| Legacy snapshot? | **No on submit V1** — snapshot only built when V2 forward active |
| Old designer layout? | **Yes (PDF V1)** — `resolveDesignerPreviewLayout` |
| Stale cache? | Possible secondary factor; not primary |
| Incorrect pipelineContext? | **Absent** on V1 forward (by design); not incorrect — simply not created |
| Why PDF **and** mockup both wrong? | **Same upstream effective version V1** from shared `proofRuntimeContext` |

---

## 10. Shadow Compare Audit (unchanged)

All compare hooks remain log-only per Phase 74.0/74.1. Not related to submit divergence.

---

## 11. Production Cutover Checklist (updated)

| 項目 | 狀態 | 備註 |
|------|------|------|
| Runtime 架構完成 | ✅ | |
| Forward Canonicalization | ✅ | |
| Regression Baseline | ✅ | Tier 1 9/9 |
| V1/V2 Parity（架構層） | ✅ | 74.1 認證 |
| **Preview ↔ Submit 一致** | ❌ | **74.2 根因：Export Runtime 預設 OFF** |
| Dev 需手動開 Export PNG/PDF 才能對齊 Preview | ⚠️ | 已知操作陷阱 |
| Production Lock 可解除 | ☐ | |
| Print Submit Runtime | ☐ | 永遠 V1 |
| Legacy 可移除 | ☐ | V1 fallback 仍必要 |
| Submit 與 Preview 政策統一 | ☐ | **74.2 建議修復項** |

---

## 12. Final Certification Statement

**Observed submit artifact incorrectness is explained and reproducible** under default `GeometryRuntimeState` with V2 geometry + Preview ON + Export Runtime OFF.

**This is not a forward resolver bug, adapter bug, or stale legacy code path accidentally invoked.** It is the **designed gating model** operating as implemented — with a **product policy gap** between what Preview shows and what Submit exports.

**Fix should target `proof-submit-runtime-context` effective version policy** — not renderers, PhotoBridge, calibration, or geometry core.

---

## Verification Steps (for engineers)

1. Open Geometry Debug Console on Designer.
2. Set Geometry → **V2**.
3. Leave Export Runtime → **PNG OFF, PDF OFF** (defaults).
4. Observe: Preview correct (UA product photo).
5. Submit proof → PDF + ZIP mockup use `/templates/adult-tshirt-*` (old template).
6. Enable Export Runtime → **PNG ON, PDF ON**.
7. Re-submit → artifacts should align with V2 runtime (subject to 74.1 intentional V2≠V1 deltas vs old V1 preview if comparing to step 4).

This confirms root cause without code changes.
