# RELEASE-14.0 — Designer Coordinate Runtime

| Field | Value |
|-------|-------|
| **Product** | Designer Coordinate Runtime |
| **Version** | **v14.0** |
| **Status** | **RELEASED** |
| **Architecture** | **FROZEN** |
| **Release date** | 2026-06-08 |
| **Acceptance** | Phase 14.0C |

---

## Release Summary

Designer Coordinate Runtime migration is **complete**.

| Milestone | Status |
|-----------|--------|
| Architecture frozen | ✅ Step 14.0B (`docs/ARCHITECTURE.md`) |
| Production verified | ✅ Phase 14.0A |
| Regression suite | ✅ **PASS** (13.0C–14.0B) |
| Storage preserved | ✅ Workspace M canonical |
| Controller write boundary | ✅ Established |
| Facade projection boundary | ✅ Established |
| Geometry coordinate-agnostic | ✅ Verified |
| Display read-only | ✅ Verified |

### Coordinate model (released)

```
Designer UI → Designer Coordinate → Controller → Facade → Workspace Storage (M)
                                                              ↓
                                        Read Pipelines (Export / Preview / Factory)
                                                              ↓
                                        Display Projection → Canvas
```

**Designer Coordinate never persists.** Storage is always Workspace Canonical.

---

## Architecture Baseline

All components below are **Frozen Baseline** as of v14.0. Changes require explicit architecture review.

| Component | Module / Step | Baseline |
|-----------|---------------|----------|
| Controller | `lib/designer-coordinate-controller.ts` | Frozen Baseline · 13.0E–13.0M |
| Facade | `lib/designer-coordinate-facade.ts` | Frozen Baseline · 13.0C |
| Display Projection | `lib/designer-display-projection.ts` | Frozen Baseline · 13.0D |
| Workspace Canonical | `lib/designer-workspace.ts`, `lib/types.ts` | Frozen Baseline |
| Geometry | `lib/geometry.ts` | Frozen Baseline |
| Alignment | `lib/layer-alignment.ts` + Controller 13.0K | Frozen Baseline |
| Constraint | `lib/layer-constraints.ts` | Frozen Baseline |
| Placement | Controller 13.0H + `lib/placement-presets.ts` | Frozen Baseline |
| Snap | Controller 13.0I | Frozen Baseline |
| Gesture | Controller 13.0J | Frozen Baseline |
| Floating Controls | Controller 13.0L | Frozen Baseline |
| Fit | Controller 13.0M | Frozen Baseline |
| Hydration | Controller 13.0M | Frozen Baseline |
| Export | `lib/export-coordinates.ts`, `lib/coordinate-runtime.ts` | Frozen Baseline · read Workspace M |
| Preview | Display Projection + read pipelines | Frozen Baseline |
| Factory | `lib/proof-engine/` generators | Frozen Baseline · read Workspace M |

Official reference: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)

---

## Supported Sizes

**Source of truth:** `lib/designer-print-area-config.ts` → `DESIGNER_PRINT_AREA_ROWS`

Sizes are **not hardcoded** in release validation. The release script parses `DESIGNER_PRINT_AREA_ROWS` at verification time.

**Current runtime (auto-discovered at release):**

| Line | Size codes |
|------|------------|
| Children | 90, 110, 130, 150, 160 |
| Fit | GS, GM, GL |
| Adult Standard | S, M, L, XL, XXL, XXXL |

**Total:** 14 sizes × front/back. New rows in `DESIGNER_PRINT_AREA_ROWS` are included automatically in validation.

**Workspace M reference:** `DESIGNER_WORKSPACE_REFERENCE_SIZE = "M"` (front 35×50 cm, back 38×45 cm).

---

## Supported Layer Types

| Type | Storage fields | Controller fit path |
|------|----------------|---------------------|
| **Image** | `x_cm`, `y_cm`, `width_cm`, `height_cm`, `scale`, `rotation` | `fitDesignerLayer` |
| **Text** | + `fontSize_cm`, text styles | `fitDesignerLayer` |
| **Shape** | + `shapeKind`, fill/stroke | `fitDesignerLayer` |

---

## Supported Interactions

All interactions route through **Controller** → Workspace Patch → Storage.

| Interaction | Step | Status |
|-------------|------|--------|
| Drag | 13.0F | Released |
| Resize | 13.0G | Released |
| Rotate | 13.0J | Released |
| Placement | 13.0H | Released |
| Duplicate | 13.0H | Released |
| Auto Fit | 13.0M | Released |
| Snap | 13.0I | Released |
| Alignment | 13.0K | Released |
| Floating Toolbar | 13.0L | Released |
| Inspector | 13.0E | Released |
| Hydration | 13.0M | Released |
| Template | 13.0M | Released |
| Gender Change | 13.0M | Released |

---

## Storage Contract

**Persistent coordinate fields only:**

| Field | Type | Space |
|-------|------|-------|
| `x_cm` | number | Workspace M |
| `y_cm` | number | Workspace M |
| `width_cm` | number | Workspace M |
| `height_cm` | number | Workspace M |
| `rotation` | number | degrees |
| `scale` | number | layer scale |

**No Designer Coordinate is persisted.**  
Forbidden: `designer_x_cm`, `designer_y_cm`, or parallel designer storage fields.

Non-coordinate layer metadata (`visible`, `locked`, `text`, `image`, etc.) unchanged from pre-v14.0 schema.

---

## Regression Matrix

| Step | Script | Result |
|------|--------|--------|
| 13.0C | `validate-designer-coordinate-facade-13-0c.mjs` | **PASS** |
| 13.0D | `validate-designer-display-projection-13-0d.mjs` | **PASS** |
| 13.0E | `validate-designer-coordinate-controller-13-0e.mjs` | **PASS** |
| 13.0F | `validate-designer-pointer-projection-13-0f.mjs` | **PASS** |
| 13.0G | `validate-designer-resize-projection-13-0g.mjs` | **PASS** |
| 13.0H | `validate-designer-placement-projection-13-0h.mjs` | **PASS** |
| 13.0I | `validate-designer-snap-projection-13-0i.mjs` | **PASS** |
| 13.0J | `validate-designer-gesture-projection-13-0j.mjs` | **PASS** |
| 13.0K | `validate-designer-alignment-projection-13-0k.mjs` | **PASS** |
| 13.0L | `validate-designer-floating-controls-projection-13-0l.mjs` | **PASS** |
| 13.0M | `validate-designer-fit-projection-13-0m.mjs` | **PASS** |
| 13.0N | `validate-designer-runtime-audit-13-0n.mjs` | **PASS** |
| 14.0A | `validate-production-runtime-14-0a.mjs` | **PASS** |
| 14.0B | `validate-architecture-freeze-14-0b.mjs` | **PASS** |
| 14.0C | `validate-release-freeze-14-0c.mjs` | **PASS** |

---

## Release Artifacts

| Document | Purpose |
|----------|---------|
| [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | Official architecture reference |
| [`docs/production-verification.md`](production-verification.md) | Production checklist (14.0A) |
| [`docs/designer-coordinate-runtime-audit.md`](designer-coordinate-runtime-audit.md) | Architecture audit (13.0N) |
| [`docs/TEST-REPORT-14.0.md`](TEST-REPORT-14.0.md) | Final acceptance checklist |
| `scripts/validate-release-freeze-14-0c.mjs` | Release freeze validation |

---

## Phase 14.0C Scope

This release milestone is **verification and documentation only**.

- ✅ No runtime behavior changes  
- ✅ No UI changes  
- ✅ No storage schema changes  
- ✅ No geometry / controller / facade modifications  

---

**Designer Coordinate Runtime v14.0 — Production Ready — Architecture Frozen — Release Accepted**
