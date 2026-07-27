# Phase 74.4 — End-to-End Visual Certification Report

**Date:** 2026-07-27  
**Scope:** Audit only — no code, runtime, geometry, or renderer changes  
**Prerequisites:** Phases 74.0–74.3 complete (freeze, parity cert, RCA, policy alignment)  
**Certifier:** Automated regression + static pipeline audit  
**Manual visual QA:** **Not executed in this session** (requires human operator + browser)

---

## 1. Executive Summary

| Item | Status |
|------|--------|
| Runtime policy alignment (74.3) | ✅ Verified by regression |
| Forward / adapter architecture | ✅ Unchanged, regressions green |
| Automated visual pixel diff | ❌ Not available in this audit |
| Manual screenshot capture | ❌ Not performed (no browser session) |
| **Production visual certification** | **⏸ BLOCKED — pending manual QA** |

**Decision:** **BLOCKED** for production visual sign-off until a human operator completes the manual verification matrix below and attaches screenshots.

**Technical readiness:** Architecture and policy are aligned post-74.3. There is no evidence of remaining policy drift between Preview, Download, and Submit under the same `GeometryRuntimeState`. Visual equivalence must still be confirmed by eye.

---

## 2. Regression Verification (Automated)

Re-run **2026-07-27**:

| Suite | Result | Checks |
|-------|--------|--------|
| `runtime-effective-version-policy.regression.ts` | ✅ **PASS** | 26 |
| `runtime-forward-canonicalization.regression.ts` | ✅ **PASS** | 19 |
| `product-mockup-runtime.regression.ts` | ✅ **PASS** | 37 |
| `product-mockup-submit-runtime.regression.ts` | ✅ **PASS** | 18 |
| `export-pdf-submit-runtime.regression.ts` | ✅ **PASS** | 19 |
| `proof-submit-runtime-context.regression.ts` | ✅ **PASS** | 19 |
| `export-pdf-runtime.regression.ts` | ⚠️ **1 stale assertion** | 28/29 |

### Stale regression (not a visual defect)

```
FAIL: pdf export toggle default OFF → V1
```

**Cause:** Test calls `resolveEffectiveExportGeometryVersion` which now delegates to 74.3 user-facing policy. With default preview ON + geometry V2, pdf surface returns **V2** (correct per 74.3). Test expectation predates policy alignment.

**Impact on visual certification:** None — adapter behavior unchanged; assertion text is outdated.

**Action for engineering (post-74.4):** Update `export-pdf-runtime.regression.ts` toggle assertions to match 74.3 policy (not required for this audit phase).

---

## 3. Runtime Verification (Automated)

### Effective version policy (74.3)

Under dev `GeometryRuntimeState` with `geometryVersion=V2` and default preview toggles ON:

| Surface | Resolver | Expected effective version |
|---------|----------|---------------------------|
| Designer canvas | `getEffectiveGeometryVersion("designer")` | V2 |
| Result panel | `getEffectiveGeometryVersion("resultPanel")` | V2 |
| Download artwork/mockup | `getEffectiveGeometryVersion("png")` | V2 |
| Download ZIP | `getEffectiveGeometryVersion("zip")` | V2 |
| Download PDF | `getEffectiveGeometryVersion("pdf")` | V2 |
| Submit mockup | `effectiveVersions.mockup` | V2 |
| Submit PDF | `effectiveVersions.pdf` | V2 |
| Email | `effectiveVersions.email` | V1 (exportRuntime.email gate unchanged) |

**Policy drift:** ✅ None detected between Preview, Download, Submit (pdf/mockup) post-74.3.

### Production lock

| Condition | All user-facing surfaces |
|-----------|--------------------------|
| `NODE_ENV === "production"` | V1 |

Anti-spoof / production normalization unchanged.

### PipelineContext parity (when V2 effective)

| Pair | Regression proof |
|------|------------------|
| Submit mockup ↔ Download mockup | `proofMockupRuntimeForwardsMatch` |
| Submit PDF ↔ Download PDF | `proofPdfRuntimeForwardsMatch` |
| Download forwards ↔ legacy inline | `runtime-forward-canonicalization` |

---

## 4. Verification Matrix — Pipeline Map

```
┌─────────────────────────────────────────────────────────────────┐
│ Designer Preview (DesignCanvas)                                    │
│  surface: designer │ template: resolveDesignerTemplateAsset      │
│  V2 → /products/UA35001/assets/*                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ same policy effective version
┌────────────────────────────▼────────────────────────────────────┐
│ Result Panel Preview (ResultPanelProductPreviewDesigner)         │
│  surface: resultPanel │ PhotoBridge + PreviewDesignLayer         │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│ Download      │  │ Download        │  │ Download Proof PDF   │
│ Artwork PNG   │  │ Product Mockup  │  │ (dev server entry)   │
│ factory-artwork│ │ ProductMockupEng │  │ factory-proof-pdf    │
└───────────────┘  └─────────────────┘  └──────────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Submit (client prepareProofSubmission + server generateProof)    │
│  Mockup → mockup-generator → V2: product-mockup-submit-render    │
│  PDF    → generateProofDocuments → export-pdf-submit-runtime     │
│  ZIP    → design-package-zip (packages client mockup + server PDF)│
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Admin Download (signed URLs from storage)                        │
│  Same bytes as uploaded submit artifacts — no re-render          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Visual Comparison Table (Static Audit)

**Legend:**  
✅ Expected match (policy + pipeline aligned)  
⚠️ Requires manual visual confirm  
⏸ Out of matrix / legacy path  
❌ Known intentional or structural difference

| Stage | vs Designer Preview | Garment asset (V2 dev) | Placement source | Automated | Manual visual |
|-------|---------------------|------------------------|------------------|-----------|---------------|
| Result Panel Preview | Reference | UA35001 photo | PhotoBridge | ✅ Same policy | ⚠️ Confirm |
| Download Artwork PNG | Artwork only (no garment) | N/A | Factory bbox | ✅ Adapter | ⚠️ Confirm artwork bounds |
| Download Product Mockup | Product composite | UA35001 via `loadAsset` | `product-mockup-runtime` | ✅ Same forward as submit V2 | ⚠️ Confirm |
| Download Proof PDF | Factory proof layout | UA35001 shirt in PDF when V2 | `export-pdf-runtime` | ✅ Same forward as submit | ⚠️ Confirm |
| Submit Proof PDF | Same as download PDF path | Same | Same pipelineContext | ✅ Forward match | ⚠️ Confirm |
| Submit ZIP Mockup PNG | Client mockup bytes | Same as submit mockup gen | Same as download mockup V2 | ✅ Same generator | ⚠️ Confirm |
| Admin Download PDF/ZIP | Stored submit bytes | Inherited | Inherited | ✅ No re-render | ⚠️ Confirm URLs |

### When effective version is V1 (production or preview OFF)

All surfaces correctly fall back to legacy stack (`/templates/adult-tshirt-*`, `designer-layout`, `mockup-export`). Preview and submit remain **consistent with each other** but **not** V2 UA35001 — by design.

---

## 6. Template Verification (Static)

### V2 user-facing path (post-74.3, dev, preview ON)

| Artifact | Expected garment asset |
|----------|------------------------|
| Designer canvas V2 | `/products/UA35001/assets/adult-tshirt-{slug}-{side}.png` |
| Result panel | UA product photo URL from product loader |
| Download mockup V2 | `loadAsset(UA35001, …)` |
| Submit mockup V2 | Same `loadAsset` via `renderProductMockupOnProduct` |
| PDF V2 shirt frame | `getAdultTshirtTemplateSrc` in template — **⚠️ see note** |

**PDF shirt template note:** `factory-proof-pdf-template.ts` still loads shirt bytes via `getAdultTshirtTemplateSrc` → `/templates/adult-tshirt-*.png` for the **garment image embedded in PDF**. V2 **placement** (print area, collar) comes from snapshot via `export-pdf-runtime`; the **shirt bitmap** in PDF may still be legacy flat template unless separately updated. **Manual visual check required** — potential **Major** if PDF shirt photo ≠ result panel UA photo.

### Legacy paths still in codebase (not main proof matrix when V2 active)

| Module | Template | When used |
|--------|----------|-----------|
| `mockup-export.ts` | `/templates/adult-tshirt-*` | V1 submit mockup fallback |
| `FlatShirtDesignView.tsx` | Legacy flat | Clothing browse widget only |
| `DesignerApp` contest submit | `renderMockupPreviewPng` | Contest mode only |
| `factory-proof-pdf-template.ts` | `getAdultTshirtTemplateSrc` | PDF shirt bitmap (all versions) |

**Certification question:** Under V2 dev submit, ZIP mockup should **not** use legacy template if policy + runtime path active. PDF shirt **bitmap** may still differ from result panel — flag for manual inspection.

---

## 7. Visual Inspection Checklist (Manual — Operator Required)

Complete for **Front** and **Back** at size **M** minimum. Record PASS/FAIL per cell.

### Garment & placement

| Check | Designer | Result Panel | DL Mockup | DL PDF | Submit PDF | ZIP Mockup |
|-------|----------|--------------|-----------|--------|------------|------------|
| Garment template (UA35001) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Print area position | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Artwork X / Y | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Width / Height / Scale | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Rotation | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Collar offset | ☐ | — | ☐ | ☐ | ☐ | ☐ |
| Top margin | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Left / right alignment | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Artwork clipping | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Transparency | — | ☐ | ☐ | — | — | ☐ |
| Image quality | — | ☐ | ☐ | ☐ | ☐ | ☐ |
| Artwork resolution | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### Geometry verification statement (manual sign-off)

```
☐ No placement drift across matrix
☐ No scaling drift
☐ No PhotoBridge drift (result panel ↔ mockup)
☐ No runtime policy drift (74.3)
☐ No unexpected legacy adult-tshirt template on submit mockup (V2 dev)
```

---

## 8. Multi-Size Verification (Manual — Not Executed)

Architecture passes `size` through `ProofOrder`, forwards, and `pipelineContext`. Regression uses size **M** only.

| Size / product | Pipeline support | Visual verified |
|--------------|------------------|-----------------|
| S | ✅ `resolveExportPipelineContext({ size })` | ☐ Not executed |
| M | ✅ Regression baseline | ☐ Not executed |
| XL | ✅ Supported | ☐ Not executed |
| Children's (e.g. child-male) | ✅ Gender in order | ☐ Not executed |
| Sweatshirt | ⏸ Verify product code / template availability | ☐ Not executed |

**Recommendation:** Run same matrix at S, M, XL, one child template, one sweatshirt if SKU supported — record screenshots per size.

---

## 9. Per-Artifact Screenshots

| Artifact | Screenshot | Status |
|----------|------------|--------|
| Designer front | *Not captured — manual* | ⏸ Pending |
| Designer back | *Not captured — manual* | ⏸ Pending |
| Result panel front/back | *Not captured — manual* | ⏸ Pending |
| Download artwork | *Not captured — manual* | ⏸ Pending |
| Download mockup | *Not captured — manual* | ⏸ Pending |
| Download PDF | *Not captured — manual* | ⏸ Pending |
| Submit PDF | *Not captured — manual* | ⏸ Pending |
| ZIP mockup front/back | *Not captured — manual* | ⏸ Pending |
| Admin signed URL download | *Not captured — manual* | ⏸ Pending |

**Screenshot protocol for manual operator:**

1. Enable Geometry Debug → V2, ensure Preview toggles ON (default).
2. Load design with front + back artwork on UA35001 white (or standard test SKU).
3. Capture each stage at same zoom; use `EXPORT_PRODUCT_RUNTIME_COMPARE=true` in staging for shadow logs (optional).
4. Name files: `74.4-{stage}-{side}-{size}.png`
5. Store under `debug/geometry-v2-export/visual-cert-74.4/` (create on manual run).

---

## 10. Visual Deviations & Severity Classification

Based on static audit (not manual pixels). Items requiring human confirmation marked **Unconfirmed**.

| ID | Deviation | Severity | Surfaces | Root cause (if known) | Block production? |
|----|-----------|----------|----------|----------------------|-------------------|
| D1 | PDF shirt **bitmap** may be legacy `/templates/adult-tshirt-*` while placement is V2 snapshot | **Major** (unconfirmed) | Download PDF, Submit PDF | `factory-proof-pdf-template.ts` uses `getAdultTshirtTemplateSrc` for embedded shirt image | ⚠️ If visually different from UA photo |
| D2 | Print PNG embedded in PDF always V1 geometry | **Minor** | PDF print area content | `print-export-system` not runtime-migrated (74.1 out of scope) | No — documented |
| D3 | Artwork download is tight-bbox factory PNG, not garment composite | **N/A** | Download artwork | Different artifact type by design | No |
| D4 | Contest submit uses legacy `renderMockupPreviewPng` | **Minor** | Contest path only | Separate from proof matrix | No |
| D5 | `FlatShirtDesignView` legacy template in clothing browse | **Minor** | Browse widget only | Not proof/export path | No |
| D6 | Email links passive — no geometry | **N/A** | Email | By design | No |
| D7 | Pre-74.3 policy drift (submit V1, preview V2) | **Critical** (fixed) | Submit PDF, ZIP mockup | exportRuntime vs preview gates | ✅ Fixed in 74.3 — verify manually |

**No new Critical defects identified in static audit post-74.3.**

---

## 11. Geometry Verification Summary

| Check | Automated | Manual |
|-------|-----------|--------|
| Preview == Download effective version | ✅ Policy regression | ☐ Visual |
| Preview == Submit effective version | ✅ Policy regression | ☐ Visual |
| Submit PDF == Download PDF forward | ✅ `export-pdf-submit-runtime` | ☐ Visual |
| Submit mockup == Download mockup forward | ✅ `product-mockup-submit-runtime` | ☐ Visual |
| No PhotoBridge drift | — | ☐ Visual (result panel vs mockup) |
| No placement drift | — | ☐ Visual |
| No scaling drift | — | ☐ Visual |
| No clipping errors | — | ☐ Visual |

---

## 12. Production Readiness Decision

### Automated certification: **PASS** (policy + architecture)

- 74.3 policy alignment verified
- 6/7 critical regression suites fully green
- 1 stale assertion documented (test hygiene only)
- No runtime policy inconsistency detected in code paths

### Visual certification: **BLOCKED**

| Criterion | Status |
|-----------|--------|
| Designer == Download == Submit visually | ☐ Not verified |
| Screenshots attached | ❌ None |
| Multi-size visual pass | ❌ Not executed |
| No legacy template on V2 submit mockup | ☐ Manual confirm required |
| PDF garment bitmap vs UA photo | ☐ Manual confirm required (D1) |

### Overall Phase 74.4 decision: **BLOCKED**

**Unblock criteria:**

1. Human operator completes Section 7 checklist (M minimum; S/XL/child recommended).
2. Screenshots stored per Section 9 protocol.
3. D1 resolved or accepted with product sign-off (PDF shirt bitmap vs UA asset).
4. Optional: fix `export-pdf-runtime.regression.ts` stale assertion (engineering, not visual).

---

## 13. Manual QA Script (Copy-Paste for Operator)

```bash
# 1. Start dev server
npm run dev

# 2. Optional shadow compare (staging)
EXPORT_PRODUCT_RUNTIME_COMPARE=true npm run dev

# 3. Regressions (confirm green before visual pass)
npx tsx lib/designer-geometry-v2/runtime-effective-version-policy.regression.ts
npx tsx lib/designer-geometry-v2/runtime-forward-canonicalization.regression.ts
npx tsx lib/designer-geometry-v2/product-mockup-submit-runtime.regression.ts
npx tsx lib/designer-geometry-v2/export-pdf-submit-runtime.regression.ts

# 4. In browser:
#    - Geometry Debug → V2
#    - Preview toggles ON (default)
#    - Design front + back on UA35001
#    - Capture: canvas, result panel, download mockup, submit ZIP mockup, submit PDF
#    - Compare collar line, print area, artwork position front/back

# 5. Production simulation (optional):
#    NODE_ENV=production npm run build && npm start
#    Confirm all surfaces V1 and consistent (no V2 expected)
```

---

## 14. Confirmation — Runtime Freeze Intact

| Freeze rule (74.0) | 74.4 status |
|--------------------|-------------|
| No geometry core changes | ✅ Audit only |
| No renderer changes | ✅ Audit only |
| No placement algorithm changes | ✅ Audit only |
| Forward → Adapter → Renderer stack | ✅ Unchanged |
| Policy layer (74.3) | ✅ Sole change since freeze |

---

## 15. Related Documents

| Phase | Document |
|-------|----------|
| 74.0 | `phase-74.0-runtime-freeze.md` |
| 74.1 | `phase-74.1-runtime-v2-release-certification.md` |
| 74.2 | `phase-74.2-submit-artifact-root-cause.md` |
| 74.3 | `phase-74.3-runtime-policy-alignment.md` |
| **74.4** | **`phase-74.4-end-to-end-visual-certification.md`** (this document) |

---

## Sign-Off (Manual)

| Role | Name | Date | Decision |
|------|------|------|----------|
| Engineering | | | ☐ PASS ☐ BLOCKED |
| Design / Product | | | ☐ PASS ☐ BLOCKED |
| QA | | | ☐ PASS ☐ BLOCKED |

**Visual certification complete when all three PASS and screenshots archived.**
