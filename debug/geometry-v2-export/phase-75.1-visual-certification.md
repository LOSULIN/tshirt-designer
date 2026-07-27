# Phase 75.1 — Production Garment Visual Certification

**Date:** 2026-07-27  
**Scope:** Audit only — no production code changes  
**Fixture:** UA35001 · white · M · front · text layer `雙擊輸入文字` + circle layer  
**Session:** `http://localhost:3000/designer`  
**Submit ref:** `FD-20260727-0003` / Phase751 Cert

---

## Executive Decision

| Area | Result |
|------|--------|
| **Garment source / Network (runtime)** | **PASS** |
| **Full pixel-identical garment across all 5 composed outputs** | **BLOCKED** (artifacts incomplete) |
| **Overall Phase 75.1** | **BLOCKED** until PDF + submit-mockup PNG captures and garment-layer diff |

---

## 1. Screenshots Captured

| Surface | Captured | Path / Notes |
|---------|----------|--------------|
| Designer Canvas | ✅ | `phase-75.1-designer-canvas.png` (browser capture) — UA35001 photographic garment, collar/wrinkles/shadows visible |
| Result Panel | ⚠️ Partial | `phase-75.1-result-panel.png` — download section visible; hero preview not fully in viewport |
| Download Mockup PNG | ❌ | Download triggered (`商品圖 PNG`); file saved to browser downloads — not extracted to workspace |
| Submit Mockup PNG | ❌ | Submit succeeded server-side; PNG not retrieved from API response in this session |
| Submit PDF | ❌ | Server-side `generateFactoryProofPdf` → `loadRegistryGarmentBytes`; no PDF file opened in browser |

Post-submit success: `phase-75.1-after-submit.png` — submission `FD-20260727-0003`.

---

## 2. Network Log (Runtime Evidence)

Captured via CDP `Runtime.evaluate` on `performance.getEntriesByType('resource')` after Designer load, Download Mockup click, and Submit.

**Full log:** `debug/geometry-v2-export/phase-75.1-cert/network-log.json`

### Summary

| Check | Result |
|-------|--------|
| Requests to `/templates/adult-tshirt-*` | **0** |
| Requests to `/products/UA35001/assets/` | **11+** (preview + export variants) |
| Designer `<img>` garment src | `/products/UA35001/assets/adult-tshirt-white-front.png` |
| Result Panel garment layer src | `/products/UA35001/assets/adult-tshirt-white-front.png?t=…` |
| Download Mockup | `…/assets/export/adult-tshirt-white-front.png` (×3 during export) |
| Submit flow (additional fetch) | `…/assets/adult-tshirt-white-front.png?t=1785126694441` |

### Registry garment URLs observed

```
http://localhost:3000/products/UA35001/assets/adult-tshirt-white-front.png
http://localhost:3000/products/UA35001/assets/adult-tshirt-white-front.png?t=…
http://localhost:3000/products/UA35001/assets/export/adult-tshirt-white-front.png
```

### Support requests (not garment)

```
/products/UA35001/profile.json
/products/UA35001/calibration.json
/products/UA35001/visual-compensation.json
```

---

## 3. Garment File Identity (Filesystem)

| File | MD5 | Size |
|------|-----|------|
| `public/products/UA35001/assets/adult-tshirt-white-front.png` | `6a29cde6f6fcc836cf692ca6dcff01cb` | 435,237 B |
| `public/templates/adult-tshirt-white-front.png` (legacy) | `b286bd546877b4fc92c4992f7335370a` | 389,467 B |

**Different files** — runtime loads registry file only (network confirms).

---

## 4. Per-Surface Garment Loader (Runtime)

| Surface | Runtime branch | Final garment path | Evidence |
|---------|----------------|-------------------|----------|
| Designer | V1 geometry (default) | `/products/UA35001/assets/adult-tshirt-white-front.png` | DOM `img[src]` + network |
| Result Panel | N/A (always registry) | `/products/UA35001/assets/adult-tshirt-white-front.png` | DOM `.result-panel-photo-garment` |
| Download Mockup | V1 placement | `/products/UA35001/assets/export/adult-tshirt-white-front.png` | Network during download |
| Submit Mockup | V1 placement | `/products/UA35001/assets/adult-tshirt-white-front.png` | Network during submit (`t=1785126694441`) |
| Submit PDF | Server FS | `public/products/UA35001/assets/adult-tshirt-white-front.png` | `loadRegistryGarmentAssetBytes()` in `factory-proof-pdf-template.ts` (no browser request) |

---

## 5. Visual Garment Checklist (Designer capture)

From `phase-75.1-designer-canvas.png` — garment matches UA35001 registry photo (not flat legacy template):

| Check | Designer | Notes |
|-------|----------|-------|
| Collar shape | ✅ Photographic crew neck | Legacy template is flatter |
| Shoulder / sleeve | ✅ Natural drape | |
| Wrinkles / shadows | ✅ Present | Legacy lacks photo depth |
| Silhouette | ✅ UA35001 product photo | |

**Cross-surface pixel diff:** Not performed — composed outputs use different scales (preview vs export) and overlays.

---

## 6. Placement Verification

| Check | Status |
|-------|--------|
| Artwork visible on Designer | ✅ Text `雙擊輸入文字` centered on chest grid |
| Same design submitted | ✅ Submit `FD-20260727-0003` succeeded |
| Pixel-measured placement parity (Designer → Download → Submit → PDF) | **Not measured** in this session |

Geometry/policy unchanged — placement governed by frozen V1 forward on default dev session.

---

## 7. Remaining Legacy References (Production `lib/` + `components/`)

| File | Symbol / pattern | Classification | Production garment path? |
|------|------------------|----------------|-------------------------|
| `lib/mockup-export.ts` | `renderMockupPreviewPng` → `getAdultTshirtTemplateSrc` | **Minor** (dead code) | No active caller after Phase 75 |
| `lib/design-export-system.ts` | `renderMockupPreviewPng` | **Minor** (orphan modal) | No — `DesignExportModal` not mounted |
| `lib/shirt-template.ts` | `getAdultTshirtTemplateSrc` | **Minor** (definition) | No production caller for garment |
| `lib/constants.ts` | re-export | **Minor** | Barrel only |
| `lib/render/visual-compare.ts` | `/templates/adult-tshirt-*` | **Debug only** | Calibration tool |
| `lib/designer-geometry-v2/geometry-overlay-constants.ts` | `public/templates/...` | **Debug only** | Overlay scripts |
| `lib/template-profile/*.ts` | `pathPattern` metadata | **Documentation** | V1 metrics metadata |
| `lib/designer-geometry-v2/product-mockup-submit-runtime.regression.ts` | asserts no `renderMockupPreviewPng` | **Regression** | Test only |
| `public/templates/README.md` | docs | **Documentation** | — |
| `debug/geometry-v2-export/*.md` | historical audits | **Documentation** | — |
| `temp-project/**` | legacy copies | **Excluded** | Not production |

**`loadShirtTemplateBytes`:** **0 hits** in production codebase (removed Phase 75).

---

## 8. Does Production Runtime Still Reach `public/templates/`?

**No** — for all five user-facing surfaces:

- Browser session: **0** network requests to `/templates/`
- `components/**`: **0** `getAdultTshirtTemplateSrc` callers
- Submit PDF: `loadRegistryGarmentBytes` → `public/products/UA35001/assets/...`

---

## 9. PASS Criteria Matrix

| Criterion | Result |
|-----------|--------|
| Every visible garment identical (pixel) | **BLOCKED** — no 5-way image diff |
| Designer uses Product Registry | **PASS** (runtime) |
| Result Panel uses Product Registry | **PASS** (runtime) |
| Download Mockup uses Product Registry | **PASS** (runtime, export variant) |
| Submit Mockup uses Product Registry | **PASS** (runtime, submit fetch) |
| Submit PDF uses Product Registry | **PASS** (server loader; PDF file not opened) |
| Network ZERO `/templates/adult-tshirt-*` | **PASS** |
| No placement differences | **Not verified** (no measurement) |
| No geometry/policy differences | **PASS** (out of scope; unchanged) |

---

## 10. Required Follow-Up to Close 75.1

1. Save Download Mockup PNG + extract submit mockup PNG from proof package to workspace.
2. Open generated Submit PDF and screenshot factory proof garment panel.
3. Run garment-layer SSIM/MD5 diff (registry preview PNG vs extracted garment from each composed output).
4. Re-capture Result Panel hero with product preview fully in viewport.
