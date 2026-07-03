# Phase 15.1 — Export Runtime Audit Report

**Date:** 2026-07-03  
**Type:** Verification only — no runtime source files were modified.  
**Script:** `node scripts/validate-export-runtime-15-1.mjs`

---

## Executive Summary

| Area | Result |
|------|--------|
| Preview ↔ Export independence | **PASS** |
| Workspace canonical storage | **PASS** |
| 300 DPI export | **PASS** |
| Export ≡ Mockup internal consistency | **PASS** (168/168) |
| Designer ≡ Preview projection | **PASS** (168/168) |
| Reference size **M** cross-pipeline parity | **PASS** (12/12 presets) |
| Non-M cross-pipeline physical parity | **FAIL** (12/168) |
| All regression scripts | **1 pre-existing FAIL** (see Regression) |

### Primary Finding (not fixed in 15.1)

**Export / Mockup / Factory PDF label paths read Workspace M storage coordinates directly as garment-area centimeters, without applying Garment Physical Projection (`workspaceRectToDesignerRect`).**

- **Designer Inspector** and **Preview Runtime** (Phase 15.0A–15.0C) correctly project workspace → garment physical cm via Facade.
- **PNG Export**, **Mockup PNG**, and **Factory PDF element dimensions** use raw `x_cm / y_cm / width_cm / height_cm` from workspace storage.
- At reference size **M**, workspace and garment coordinates are 1:1 — all pipelines agree.
- At **non-M sizes** (90, XXXL, etc.), physical drift exceeds tolerance **0.0001 cm** in **156/168** preset×size cases.

**Worst observed case:** `back-center-a3-portrait` @ Kids **90** back — Designer/Preview **29.70×42.00 cm** vs Export implied **56.43×85.91 cm** (Δ **43.91 cm**).

**Recommended follow-up (future phase, not 15.1):** Apply read-only `workspaceRectToDesignerRect` in export/mockup read paths before `mapLayerCmRect`, without touching Controller write paths or Preview Runtime.

---

## Runtime Architecture

```
                    ┌─────────────────────────────────────┐
                    │     Workspace M Canonical Storage    │
                    │  x_cm, y_cm, width_cm, height_cm,    │
                    │  rotation, scale                     │
                    └──────────────┬──────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
   Designer Display          Preview Runtime         Export / Mockup
   (display-projection)      (preview-runtime)       (coordinate-runtime)
           │                       │                       │
           ▼                       ▼                       ▼
   Facade projection         Facade projection         ⚠ No projection
   workspaceRectToDesigner   workspaceRectToDesigner   raw workspace cm
           │                       │                       │
           ▼                       ▼                       ▼
   Garment physical cm        Garment physical cm      Treated as garment cm
   (size-aware)              (size-aware)             (incorrect at non-M)
```

### Correct target flow (Export)

```
Workspace Storage → Garment Physical Projection (Facade read-only) → Export
```

### Forbidden flow (verified absent)

```
Workspace Storage → Preview Runtime → Export   ✗ not present
```

---

## Dependency Audit

### Export pipeline files audited

| File | Role |
|------|------|
| `lib/export-coordinates.ts` | Export canvas spec, cm→px |
| `lib/print-export-system.ts` | PNG render @ 300 DPI |
| `lib/mockup-export.ts` | Mockup PNG overlay |
| `lib/design-export-system.ts` | Bundle: mockup + print + proof |
| `lib/proof-engine/generators/print-generator.ts` | Order print PNG |
| `lib/proof-engine/generators/mockup-generator.ts` | Order mockup PNG |
| `lib/proof-engine/generators/factory-proof-pdf-template.ts` | Factory PDF |
| `lib/coordinate-runtime.ts` | Unified `resolveLayerCmRect` / `mapLayerCmRect` |

### Forbidden imports — none found

Export / Factory / Mockup pipelines do **not** import:

- `preview-runtime`
- `designer-display-projection`
- `designer-display-scale`
- `designer-coordinate-controller`

**Preview Runtime remains fully independent from Export Runtime.** ✓

---

## Storage Audit

### Canonical workspace fields (verified)

- `x_cm`, `y_cm`, `width_cm`, `height_cm`, `rotation`, `scale`

### Forbidden fields — not read by export pipeline

- `designer_x_cm`, `designer_width_cm`, `designer_height_cm`
- `designerRect`, `designerCoordinate`, preview coordinate aliases

Export reads layers via `resolveLayerCmRect(layer, { purpose: "export" })` → workspace storage.

---

## DPI Verification

| Constant | Value |
|----------|-------|
| `PRODUCTION_DPI` | **300** |
| `PRINT_EXPORT_DPI` | `PRODUCTION_DPI` |
| `FACTORY_PROOF_DPI` | **300** |
| `cmToExportPx` | `(cm / 2.54) × 300` |

Preview camera zoom does not participate in export paths. ✓

---

## Garment Sizes (auto-discovered)

Parsed from `DESIGNER_PRINT_AREA_ROWS` / `DESIGNER_PRINT_AREA_ROWS_BACK` — **14 sizes**, no hardcoded list:

`90, 110, 130, 150, 160, GS, GM, GL, S, M, L, XL, XXL, XXXL`

Workspace reference: **M** (`DESIGNER_WORKSPACE_REFERENCE_SIZE`)

---

## Preset Validation Matrix

All **12** placement presets × **14** sizes × applicable side:

| Preset | Physical size |
|--------|---------------|
| Left Chest 6×6 | 6 × 6 cm |
| Left Chest 8×8 | 8 × 8 cm |
| Left Chest 10×10 | 10 × 10 cm |
| Chest Text | 29 × 10 cm |
| Chest Logo | 25 × 25 cm |
| A4 Portrait | 21 × 29.7 cm |
| A4 Landscape | 29.7 × 21 cm |
| Back Text | 30 × 12 cm |
| Back A4 Portrait | 21 × 29.7 cm |
| Back A3 Portrait | 29.7 × 42 cm |
| Back 25×25 | 25 × 25 cm |

### Cross-pipeline physical comparison

| Pipeline | Projection | Matches Designer @ M | Matches Designer @ non-M |
|----------|------------|----------------------|-------------------------|
| Designer Inspector (display) | Facade | ✓ | ✓ |
| Preview Runtime | Facade | ✓ | ✓ |
| PNG Export | None (workspace) | ✓ | ✗ |
| Mockup PNG | None (workspace) | ✓ | ✗ |
| Factory PDF labels | Inspector workspace fields | ✓ | ✗ |

### Representative spot checks (Designer = Preview)

| Case | Designer / Preview | Export implied | Match |
|------|-------------------|----------------|-------|
| Kids 90 · A4 Portrait · Front | 21.0 × 29.7 cm | 40.8 × 54.9 cm | ✗ |
| M · A4 Portrait · Front | 21.0 × 29.7 cm | 21.0 × 29.7 cm | ✓ |
| XXXL · A4 Portrait · Front | 21.0 × 29.7 cm | 18.4 × 25.7 cm | ✗ |

---

## Color & Zoom

| Factor | Affects export coordinates? |
|--------|----------------------------|
| Garment color (10 colors) | **No** — only template texture |
| Preview zoom (0.75–1.5×) | **No** — export has no zoom path |

---

## Frozen Runtime

The following were **not modified** during Phase 15.1:

- `lib/designer-coordinate-controller.ts`
- `lib/designer-coordinate-facade.ts`
- `lib/designer-display-projection.ts`
- `lib/designer-display-scale.ts`
- `lib/preview-runtime.ts`
- `lib/geometry.ts`, `lib/layer-constraints.ts`, `lib/layer-alignment.ts`
- `lib/placement-presets.ts`, `lib/direct-manipulation.ts`

---

## Regression Summary

| Script | Result |
|--------|--------|
| validate-designer-coordinate-facade-13-0c | PASS |
| validate-designer-display-projection-13-0d | PASS |
| validate-designer-coordinate-controller-13-0e | PASS |
| validate-designer-display-refinement-14-1 | PASS |
| validate-designer-ux-refinement-14-2 | PASS |
| validate-designer-preset-physical-size-14-2-2 | PASS |
| validate-preview-runtime-15-0a | PASS |
| validate-preview-runtime-15-0b | PASS |
| validate-preview-consistency-15-0c | PASS |
| validate-production-runtime-14-0a | **FAIL** (pre-existing) |

### Pre-existing regression note

`validate-production-runtime-14-0a.mjs` fails because Phase **14.2** removed automatic `fitDesignerLayers` from hydration (manual fit only). This is unrelated to Export Runtime but should be addressed in a future Designer hydration audit update.

---

## Phase 15.1 Verdict

**FAIL** — Export Runtime independence and M-size parity are correct, but **non-M garment export does not match Designer / Preview physical dimensions**.

Per Phase 15.1 instructions: **no runtime changes were applied**. The coordinate gap is documented for a future Export Runtime alignment phase (Facade read-only projection in export read paths).

### To re-run audit

```bash
node scripts/validate-export-runtime-15-1.mjs
```
