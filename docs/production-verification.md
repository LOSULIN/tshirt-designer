# Production Verification — Phase 14.0A

**Architecture Freeze Version:** 13.0N  
**Verification Phase:** 14.0A (read-only)  
**Status:** Production Hardening & End-to-End Verification  
**Date:** 2026-06-08

---

## Purpose

Designer Coordinate Runtime Migration (Steps 13.0C–13.0N) is **complete** and **frozen**. Phase 14.0A verifies production readiness without modifying runtime behavior, coordinate math, or storage schema.

**Validation command:**

```bash
node scripts/validate-production-runtime-14-0a.mjs
```

---

## Architecture Freeze

The following modules are **frozen**. Changes require explicit approval:

| Module | Role |
|--------|------|
| `lib/designer-coordinate-controller.ts` | Sole Designer → Workspace write boundary |
| `lib/designer-coordinate-facade.ts` | Workspace ↔ Designer projection |
| `lib/designer-display-projection.ts` | Read-only display adapters |
| `lib/geometry.ts` | Coordinate-agnostic geometry |
| `lib/layer-constraints.ts` | Fit / clamp (receives print area from caller) |
| `lib/layer-alignment.ts` | Alignment geometry (coordinate-agnostic) |
| `lib/placement-presets.ts` | Workspace M preset anchors |
| `lib/designer-workspace.ts` | Fixed workspace M reference frame |
| `lib/garment-anchor-runtime.ts` | Garment Blue print area resolution |

Reference audit: [`docs/designer-coordinate-runtime-audit.md`](designer-coordinate-runtime-audit.md)

---

## Supported Garment Sizes (Auto-Discovered)

Sizes are **not hardcoded** in validation. The canonical source is:

```
lib/designer-print-area-config.ts
  └── DESIGNER_PRINT_AREA_ROWS        (front Blue print areas)
  └── DESIGNER_PRINT_AREA_ROWS_BACK   (back Blue print areas)
  └── DESIGNER_PRINT_AREA_SIZE_CODES  (derived from rows)
```

At verification time, the script parses `DESIGNER_PRINT_AREA_ROWS` and iterates every `size` entry. Current runtime includes:

| Line | Sizes |
|------|-------|
| Children | 90, 110, 130, 150, 160 |
| Fit | GS, GM, GL |
| Adult Standard | S, M, L, XL, XXL, XXXL |

**Total:** 14 sizes (auto-counted). Any new row added to `DESIGNER_PRINT_AREA_ROWS` is automatically included in verification.

Workspace M baseline (`DESIGNER_WORKSPACE_REFERENCE_SIZE` from `lib/designer-workspace.ts`):

| Side | Workspace M (cm) |
|------|------------------|
| Front | 35 × 50 |
| Back | 38 × 45 |

---

## Coordinate Flow

```
Designer Coordinate (Garment Blue @ current size)
        ↓
designer-coordinate-controller
        ↓
Workspace Storage (Workspace M cm — canonical)
        ↓
designer-display-projection (read only)
        ↓
CSS % → Canvas Rendering
        ↓
Read Pipelines (Export / Mockup / Factory / Proof)
```

**Tolerance:** `< 0.0001 cm` for all projection round-trips.  
**Display invariant:** `left% = x_cm / workspaceWidth` equals `designerLeft% = designerX / garmentBlueWidth` (linear scale).

---

## Production Checklist

| # | Check | Method |
|---|-------|--------|
| 1 | All frozen files present | Static file audit |
| 2 | Geometry coordinate-agnostic | Import scan |
| 3 | Controller pure (no React/DOM) | Import scan |
| 4 | Display projection read-only | Pattern scan |
| 5 | Storage schema unchanged | `lib/types.ts` field audit |
| 6 | Every supported size × front/back | Auto-discovered matrix |
| 7 | Image / Text / Shape round-trip | Numeric matrix |
| 8 | All 19 interaction runtimes routed | Static token audit |
| 9 | Display surfaces use Designer coords | Component token audit |
| 10 | Export pipelines read Workspace M | Pipeline import audit |
| 11 | No duplicate projection implementations | Grep boundary |
| 12 | Performance static (no render-loop fit) | Hot-path scan |
| 13 | Regression 13.0C–13.0N | Script suite |

---

## Verification Matrix

### Dimensions

| Axis | Values |
|------|--------|
| Sizes | All `DESIGNER_PRINT_AREA_SIZE_CODES` (auto) |
| Sides | `front`, `back` |
| Layer types | `image`, `text`, `shape` |

### Interactions Verified (Static Routing)

| Interaction | Entry Component | Controller / Canonical Path |
|-------------|-----------------|---------------------------|
| Drag | `PrintAreaElement` | `applyDesignerDragSnap`, `clientPixelDeltaToDesignerCm` |
| Resize | `PrintAreaElement` | `resolveDesignerHandleResizeWorkspacePatch` |
| Rotate | `DesignerApp` | `resolveWorkspaceGestureForApplyClamped` → `applyClampedLayerPatch` |
| Snap | `PrintAreaElement` | `applyDesignerDragSnap` |
| Alignment | `DesignerApp` | `applyDesignerLayerAlignment` |
| Placement | `DesignerApp` | `applyDesignerPlacementPreset` |
| Upload | `DesignerApp` | `createDesignerUploadPlacement` |
| Duplicate | `DesignerApp` | `createDesignerDuplicateLayer` |
| Auto Fit | `DesignerApp` | `fitDesignerLayers`, `updateDesignerLayer`, `hydrateDesignerLayers` |
| Quick Rotate | `DesignerApp` | `rotateLayersQuick90` |
| Floating Controls | `LayerFloatingControls` | `applyDesignerFloatingMove` |
| History Undo/Redo | `DesignerApp` | `useDesignHistory` (workspace snapshots) |
| Gender Change | `DesignerApp` | `fitDesignerLayers` |
| Draft Restore | `DesignerApp` | `hydrateDesignerLayers` |
| Inspector Edit | `LayerInspectorEditor` | `applyDesignerLayerPatch` |
| Layer Creation | `DesignerApp` | `createDesignerDefault*Layer` |
| Layer Delete | `DesignerApp` | `handleDeleteLayer` |
| Visibility Toggle | `DesignerApp` | `updateLayer` |
| Lock / Unlock | `DesignerApp` | `updateLayer` |

### Numeric Checks (Per Matrix Cell)

For each `size × side × layerType`:

1. Workspace position → Designer → Workspace round-trip (`x_cm`, `y_cm`)
2. Display CSS `%` consistency (workspace % === designer %)
3. No accumulated drift across chained transforms

---

## Runtime Classification

| Class | Production Status |
|-------|-------------------|
| **A** Designer writes | ✅ All via Controller |
| **B** Workspace Canonical | ✅ Documented & intentional |
| **C** Display | ✅ Designer projection read path |
| **D** Read Pipeline | ✅ Workspace M from storage |

---

## Regression Matrix

| Step | Script | Scope |
|------|--------|-------|
| 13.0C | `validate-designer-coordinate-facade-13-0c.mjs` | Facade projection |
| 13.0D | `validate-designer-display-projection-13-0d.mjs` | Display read-only |
| 13.0E | `validate-designer-coordinate-controller-13-0e.mjs` | Controller APIs |
| 13.0F | `validate-designer-pointer-projection-13-0f.mjs` | Drag |
| 13.0G | `validate-designer-resize-projection-13-0g.mjs` | Resize |
| 13.0H | `validate-designer-placement-projection-13-0h.mjs` | Placement |
| 13.0I | `validate-designer-snap-projection-13-0i.mjs` | Snap |
| 13.0J | `validate-designer-gesture-projection-13-0j.mjs` | Gesture |
| 13.0K | `validate-designer-alignment-projection-13-0k.mjs` | Alignment |
| 13.0L | `validate-designer-floating-controls-projection-13-0l.mjs` | Floating |
| 13.0M | `validate-designer-fit-projection-13-0m.mjs` | Fit / Hydration |
| 13.0N | `validate-designer-runtime-audit-13-0n.mjs` | Architecture audit |
| 14.0A | `validate-production-runtime-14-0a.mjs` | Production verification |

All must **PASS** for production readiness.

---

## Known Canonical Boundaries

These Workspace-coordinate paths are **intentional** and **not defects**:

| Boundary | Location | Reason |
|----------|----------|--------|
| Storage `x_cm` / `y_cm` | `lib/types.ts` | Canonical Workspace M |
| `fitLayerTransform` post-snap | `PrintAreaElement.tsx` | Final workspace clamp |
| `applyClampedLayerPatch` | `DesignerApp.tsx` | Gesture snap+clamp after controller patch |
| `placement-presets.ts` | Preset anchors | Frozen workspace M geometry |
| `getAlignmentGuidesForSelection` (workspace) | `DesignCanvas.tsx` | Guide preview only; writes via controller |
| History snapshots | `design-history.ts` | Stores workspace layers verbatim |
| Export / Mockup / Factory | Read pipelines | Consumes canonical storage |

---

## Storage Contract

Canonical coordinate fields on `DesignLayer` (Workspace M):

| Field | Type | Notes |
|-------|------|-------|
| `x_cm` | number | Position |
| `y_cm` | number | Position |
| `width_cm` | number | Base width |
| `height_cm` | number | Base height |
| `rotation` | number | Degrees |
| `scale` | number | Image / text / shape scale |

**Forbidden:** `designer_x_cm`, `designer_y_cm`, or any parallel designer storage fields.

Non-coordinate fields (`visible`, `locked`, `text`, `image`, etc.) are unchanged.

---

## Display Validation

| Surface | Coordinate | Verified |
|---------|------------|----------|
| Blue Print Area | Designer (`designerPrintableArea`) | ✅ |
| Orange Safe Zone | Workspace % overlay | ✅ |
| Constraint Overlay | Workspace + garment ratio | ✅ |
| Alignment Guides (render) | Designer printable area | ✅ |
| Grid | Designer (`designerGridSizeCm`) | ✅ |
| Floating Controls | Designer display % + controller move | ✅ |
| Inspector | Designer display + controller write | ✅ |
| Status Bar | Garment constraint status | ✅ |
| Preview Panel | Designer display context | ✅ |

Storage remains Workspace M in all cases.

---

## Export Validation

| Pipeline | File | Reads |
|----------|------|-------|
| Artwork Export | `lib/export-coordinates.ts` | Workspace `x_cm` via `resolveLayerCmRect` |
| Coordinate Runtime | `lib/coordinate-runtime.ts` | `resolvePrintAreaCm({ runtime: "export" })` |
| Mockup | `proof-engine/generators/mockup-generator.ts` | `layersByTemplate` |
| Print | `proof-engine/generators/print-generator.ts` | `layersByTemplate` |
| Factory PDF | `proof-engine/generators/factory-proof-pdf-template.ts` | Garment anchor + storage |

Export pipelines **do not** import Controller or mutate storage. Projection uses Garment Blue at order size.

---

## Performance Validation (Static)

| Check | Expectation |
|-------|-------------|
| `PrintAreaElement` pointer move | No `projectLayerToDesigner` in hot path |
| `DesignCanvas` render | No `fitDesignerLayers` in render loop |
| `LayerFloatingControls` move | Single `applyDesignerFloatingMove` per delta |
| Controller | Delegates to Facade; no duplicate projection math |
| Per-frame conversions | One designer delta conversion per pointer event |

---

## Production Readiness Summary

| Criterion | Status |
|-----------|--------|
| Every supported garment size auto-verified | ✅ |
| Kids / GS–GL / Adult / future sizes included automatically | ✅ |
| Front / Back PASS | ✅ |
| Image / Text / Shape PASS | ✅ |
| All interaction runtimes PASS (static routing) | ✅ |
| Coordinate drift < 0.0001 cm | ✅ |
| Storage Canonical preserved | ✅ |
| Display Projection preserved | ✅ |
| Export consistency preserved | ✅ |
| Regression suite 13.0C–13.0N PASS | ✅ |
| Runtime frozen | ✅ |
| Architecture production-ready | ✅ |

**No runtime behavior was changed during Phase 14.0A.**

---

## Architecture Freeze Confirmation

Designer Coordinate Runtime Migration is **complete**. The architecture documented in Step 13.0N is **frozen** and **production-ready** as of Phase 14.0A.
