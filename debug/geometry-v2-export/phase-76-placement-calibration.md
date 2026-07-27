# Phase 76 — UA35001 Placement Calibration

## Summary

**Status: PASS** (V2 back placement corrected; front unchanged)

Back printable area on V2 surfaces was **61 px too low** because the Product Factory Anchor used `collarBottom.y = 388` as the 5 cm offset origin instead of the actual collar seam at **y = 327**. Correcting the anchor moves V2 back `artworkStage.top` from **449.2 → 388.2**, aligning with registry calibration (`calibration.json` back top **y = 388**).

---

## 1. Files Modified

| File | Change |
|------|--------|
| `lib/designer-geometry-v2/product-factory-anchor.ts` | Back `collarBottom.y` / `factoryOrigin.y`: **388 → 327** |
| `lib/designer-geometry-v2/product-master-snapshot.ts` | Back collar, factory origin, `artworkStage.top`, `safeArea.top` synced to anchor; `derivation` → `product-factory-anchor` |
| `debug/geometry-v2-export/phase-76-placement-calibration.mjs` | Verification script (new/updated) |
| `debug/geometry-v2-export/phase-76-cert/render-placement-overlay.mjs` | Overlay screenshot generator |
| `debug/geometry-v2-export/phase-76-cert/surface-parity.regression.ts` | Cross-surface parity regression |

**Not modified (unchanged):**

- `public/products/UA35001/calibration.json` — back placement already correct
- Geometry Runtime resolver (`resolve-geometry-runtime.ts`)
- Forward Resolver / Runtime Policy
- PhotoBridge logic (`geometry-runtime-photo-bridge.ts`, `product-photo-bridge.ts`)
- PipelineContext resolution logic
- Placement algorithms (`product-placement-scale.ts`, render math)
- Export pipeline orchestration

---

## 2. Calibration Values — Before / After

### Registry (`public/products/UA35001/calibration.json`)

| Side | Field | Before | After | Notes |
|------|-------|--------|-------|-------|
| Front | `productReference.printArea.y` | 350 | 350 | unchanged |
| Front | `visualAdjustment.offsetY` | 150 | 150 | unchanged |
| Front | **Final placement y** | **500** | **500** | PASS — no visual change |
| Back | `productReference.printArea.y` | 325 | 325 | unchanged |
| Back | `visualAdjustment.offsetY` | 63 | 63 | unchanged |
| Back | **Final placement y** | **388** | **388** | already matched 5 cm spec |

### V2 Product Factory Anchor (`product-factory-anchor.ts`)

| Side | Field | Before | After |
|------|-------|--------|-------|
| Front | `collarBottom.y` / `factoryOrigin.y` | 416 | 416 |
| Front | `artworkStage.top` (7 cm) | 501.68 | 501.68 |
| Back | `collarBottom.y` / `factoryOrigin.y` | **388** | **327** |
| Back | `artworkStage.top` (5 cm) | **449.2** | **388.2** |

Official offsets (unchanged): front **7 cm**, back **5 cm** @ `12.24 px/cm`.

---

## 3. Pixel Offset — Before / After

| Surface | Back print top (before) | Back print top (after) | Δ (px) |
|---------|----------------------|------------------------|--------|
| V2 Designer / Result Panel / Download / Submit | 449.2 | 388.2 | **−61.0** (upward) |
| Registry calibration (V1 compose) | 388 | 388 | 0 |

Formula: `printTop = collarBottom.y + offsetCm × 12.24`  
Back: `327 + 5 × 12.24 = 388.2`

---

## 4. Live Verification Screenshots

Placement overlay on registry product photo (collar seam, 5 cm print top, printable rect):

- `debug/geometry-v2-export/phase-76-cert/back-placement-black.png`
- `debug/geometry-v2-export/phase-76-cert/back-placement-white.png`

Red line = collar seam (y=327). Blue line = print top (y=388.2, 61.2 px / 5 cm below collar). Green dashed rect = printable area (width/height unchanged).

---

## 5. Regression Report

| Suite | Result |
|-------|--------|
| `product-factory-anchor.regression.ts` | **25/25 anchor checks PASS** (3 export-default-V1 checks fail — pre-existing policy, unrelated to placement) |
| `product-mockup-runtime.regression.ts` | **ALL PASS (39 checks)** — V2 back `placementRect.y` == ResultPanel bridge |
| `phase-76-cert/surface-parity.regression.ts` | **ALL PASS** — Designer, PhotoBridge, Download mockup y ≈ 388 |
| `phase-76-placement-calibration.mjs` | **PASS** — front unchanged; V2 back aligned to registry |

**Confirmed unchanged:** placement algorithms, render math, export calculations, PhotoBridge resolution, PipelineContext, Forward Resolver, Runtime Policy.

---

## 6. Registry-Only Scope Note

`calibration.json` already encoded the correct back anchor (y=388). V2 production surfaces do **not** read `calibration.json` for placement — they use the **Product Factory Anchor** (`product-factory-anchor.ts`), which is the per-product official geometry definition in the Product Registry layer.

This phase corrected that anchor so V2 back matches the same 5 cm-below-collar specification already satisfied by registry calibration and front V2 placement. No algorithm, resolver, or pipeline code was modified.

---

## Acceptance Criteria

| Criterion | Result |
|-----------|--------|
| Front remains identical | ✓ |
| Back printable top = 5 cm below collar seam | ✓ (388.2 px) |
| Designer == Download == Submit Mockup == Submit PDF (V2) | ✓ (shared factory anchor / photo bridge) |
| No placement algorithm changes | ✓ |
| No render pipeline changes | ✓ |
| Only product calibration data changed | ✓ (factory anchor + frozen snapshot) |
