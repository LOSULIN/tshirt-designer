# T-Shirt Designer — Coordinate Architecture

**Version:** 14.0B (Architecture Freeze)  
**Status:** Official reference — all future development must follow this document  
**Prior verification:** Phase 14.0A (`docs/production-verification.md`)

---

## 1. Runtime Overview

The designer uses **two coordinate spaces** at runtime. Only one is persisted.

```
Designer UI (components/designer)
        ↓
Designer Coordinate (current garment Blue printable area @ size)
        ↓
Designer Coordinate Controller (lib/designer-coordinate-controller.ts)
        ↓
Designer Coordinate Facade (lib/designer-coordinate-facade.ts)
        ↓
Workspace Canonical Storage (Workspace M cm)
        ↓
Read Pipelines (Export / Mockup / Factory / Proof)
        ↓
Display Projection (lib/designer-display-projection.ts)
        ↓
Canvas (CSS % rendering)
```

### Invariants

| Rule | Detail |
|------|--------|
| **Storage is always Workspace Canonical** | All `DesignLayer` fields (`x_cm`, `y_cm`, `width_cm`, `height_cm`, `rotation`, `scale`) are Workspace M |
| **Designer Coordinate never persists** | Exists only during interaction, projection, and display read paths |
| **Writes go Controller → Workspace** | Controller returns `WorkspaceLayerPatch` or workspace `DesignLayer`; never serializes designer coords |
| **Reads may use Display Projection** | UI shows Designer-space values derived from storage without mutating storage |

### Write path (canonical)

```
Pointer / Inspector / Toolbar / Hydration
  → Designer Coordinate (ephemeral)
  → Controller
  → WorkspaceLayerPatch
  → setLayers() / storage
```

### Read path (canonical)

```
Workspace Storage
  → Export / Preview / Factory (Workspace M)
  → Display Projection (optional, read-only)
  → CSS % → Canvas
```

---

## 2. Canonical Rules

1. **Workspace M is the only persistent coordinate system.**  
   Fixed reference frame per side (front M: 35×50 cm, back M: 38×45 cm via `lib/designer-workspace.ts`).

2. **Designer Coordinate exists only during interaction.**  
   Current garment Blue printable area at the active size (`resolveGarmentPrintAreaCm`).

3. **Export reads Workspace Storage.**  
   `lib/export-coordinates.ts`, `lib/coordinate-runtime.ts` — no designer fields in output schema.

4. **History stores Workspace Storage.**  
   `lib/design-history.ts` snapshots workspace layers verbatim.

5. **Preview reads Workspace Storage.**  
   Display may project to Designer for UI; storage unchanged.

6. **Factory reads Workspace Storage.**  
   Proof engine / factory PDF consume `layersByTemplate` in Workspace M.

7. **No Designer coordinate is serialized.**  
   Forbidden: `designer_x_cm`, `designer_y_cm`, or parallel designer storage fields.

---

## 3. Responsibilities

### Facade (`lib/designer-coordinate-facade.ts`)

| Responsible for | Not responsible for |
|-----------------|---------------------|
| Projection | Business logic |
| Coordinate conversion | React / DOM / Canvas / Pointer |
| Workspace ↔ Designer | Storage writes |
| `createDesignerCoordinateContext` | Interaction routing |

Pure functions only. Single source of projection math.

### Controller (`lib/designer-coordinate-controller.ts`)

| Responsible for | Not responsible for |
|-----------------|---------------------|
| All Designer **write** paths | Persisting Designer coordinate |
| Interaction routing to geometry | React / DOM / Canvas |
| Projection boundary | Direct UI rendering |
| Returning `WorkspaceLayerPatch` / workspace layers | Duplicate projection math (delegates to Facade) |

Entry points: drag, resize, snap, gesture, alignment, floating move, placement, fit, hydration, inspector patches.

### Display Projection (`lib/designer-display-projection.ts`)

| Responsible for | Not responsible for |
|-----------------|---------------------|
| Designer display values | Storage writes |
| CSS % for canvas | Interaction routing |
| Inspector / status display reads | Coordinate conversion math (delegates to Facade) |

Read-only adapters. Writes delegate to Controller (at UI boundary).

### Geometry Runtime (`lib/geometry.ts`, `lib/layer-constraints.ts`, `lib/layer-alignment.ts`)

| Responsible for | Not responsible for |
|-----------------|---------------------|
| Geometry (snap, resize, align, fit, clamp) | Knowing Designer vs Workspace |
| Constraint application | Importing Facade / Controller / Display |
| Coordinate-agnostic algorithms | Storage schema |

Receives `PrintAreaCmBounds` from caller. Controller passes **Designer** printable area for interaction fit/align; Canonical boundaries pass **Workspace** M where documented.

### Direct Manipulation (`lib/direct-manipulation.ts`)

Handle resize math only. Coordinate-agnostic. Frozen with geometry layer.

---

## 4. Forbidden Rules

### UI components must not call Facade write/projection APIs directly

The following components **may not** call:

- `designerRectToWorkspaceRect()`
- `workspaceRectToDesignerRect()`
- `projectLayerToWorkspace()`
- `projectLayerToDesigner()`
- `designerPointToWorkspacePoint()`
- `workspacePointToDesignerPoint()`

**Affected components:**

| Component | Allowed | Forbidden |
|-----------|---------|-----------|
| `DesignerApp` | `designer-coordinate-controller` | Facade projection writes |
| `PrintAreaElement` | Controller + Facade **types only** | Facade projection calls |
| `LayerFloatingControls` | Controller + Facade **types only** | Facade projection calls |
| `DesignCanvas` | Controller (snap targets) + Display Projection | Facade projection writes |
| `LayerInspectorEditor` | Controller + Display Projection | Facade projection writes |

**All writes must go through Controller.**

### Geometry runtime must never import

- `designer-coordinate-controller`
- `designer-coordinate-facade`
- `designer-display-projection`

Applies to: `geometry.ts`, `layer-constraints.ts`, `layer-alignment.ts`, `placement-presets.ts`, `direct-manipulation.ts`.

### Display Projection must never write Storage

No `setLayers`, `setLayersByTemplate`, `mergeWorkspacePatchIntoLayer`, `projectLayerToWorkspace`, or `applyDesignerLayerPatch` inside `designer-display-projection.ts`.

### Controller must never import React or DOM

No `react`, `document.`, `window.`, `getBoundingClientRect`, `PointerEvent`, or canvas component imports.

### Facade must never import React or DOM

Pure projection module only.

---

## 5. Future Development Rules

Every new interactive feature **must** follow:

```
Designer Interaction
        ↓
Controller (new API if needed — requires architecture review)
        ↓
Workspace Patch
        ↓
Storage
        ↓
Read Pipeline (if applicable)
```

### Never

- **Never bypass Controller** for coordinate writes
- Introduce new coordinate systems or storage fields
- Duplicate projection math outside Facade
- Add Designer-persisted fields to `DesignLayer`
- Import Controller into geometry modules

### Projection math

**Projection math belongs only inside Facade.**  
Belongs **only** inside `lib/designer-coordinate-facade.ts`. Controller and Display delegate to Facade.

### Adding Controller APIs

Frozen file `lib/designer-coordinate-controller.ts` — changes require **explicit architecture review** and regression run (`scripts/validate-production-runtime-14-0a.mjs` + 13.0C–13.0N suite).

---

## 6. Runtime Classification

| Category | Name | Coordinate | Persisted | Examples |
|----------|------|------------|-----------|----------|
| **A** | Designer Runtime (write) | Designer → Controller → Workspace | No (ephemeral) | Drag, resize, snap, align, fit, inspector patch |
| **B** | Workspace Canonical | Workspace M | **Yes** | Storage, history, post-snap clamp, placement preset anchors |
| **C** | Display Runtime | Designer (read) | No | CSS %, grid, guides render, inspector display |
| **D** | Export / Preview / Factory | Workspace M (read) | N/A | Mockup, print, factory PDF, proof engine |

### Category A — all migrated (13.0C–13.0M)

All Category A writes route through Controller. No remaining direct `fit*Layer` / `alignDesignLayers` in `DesignerApp`.

### Category B — intentional workspace usage

- `fitLayerTransform` post-snap in `PrintAreaElement`
- `applyClampedLayerPatch` after controller gesture patch
- `placement-presets.ts` workspace anchors

### Category C / D — read-only

Never mutate storage. May use Display Projection or garment anchor at read time.

---

## 7. Frozen Runtime Files

The following files are **frozen** as of Step 14.0B. Changes require **explicit architecture review**:

| File | Role |
|------|------|
| `lib/designer-coordinate-controller.ts` | Write boundary |
| `lib/designer-coordinate-facade.ts` | Projection math |
| `lib/designer-display-projection.ts` | Display read adapters |
| `lib/geometry.ts` | Coordinate-agnostic geometry |
| `lib/layer-constraints.ts` | Fit / clamp |
| `lib/layer-alignment.ts` | Alignment geometry |
| `lib/placement-presets.ts` | Workspace M presets |
| `lib/direct-manipulation.ts` | Resize handle math |
| `lib/designer-workspace.ts` | Workspace M reference frame |
| `lib/garment-anchor-runtime.ts` | Garment Blue print area |

Related frozen reference (14.0A): see also `docs/designer-coordinate-runtime-audit.md`, `docs/production-verification.md`.

### Validation

```bash
node scripts/validate-architecture-freeze-14-0b.mjs
node scripts/validate-production-runtime-14-0a.mjs
```

### Regression suite

`scripts/validate-designer-*-13-0*.mjs` (13.0C through 13.0N) must pass after any approved change.

---

## Appendix: Module Dependency Graph

```
components/designer/*
    → designer-coordinate-controller
    → designer-display-projection (read)
        → designer-coordinate-facade
            → designer-workspace
            → garment-anchor-runtime

designer-coordinate-controller
    → designer-coordinate-facade
    → geometry / layer-constraints / layer-alignment (coordinate-agnostic)

geometry / layer-constraints / layer-alignment / placement-presets / direct-manipulation
    → (no designer-coordinate imports)

export-coordinates / proof-engine / coordinate-runtime
    → storage (Workspace M read)
```

---

**Architecture frozen:** Step 14.0B · Official reference for all future development.
