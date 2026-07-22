# Phase 71.0 — Export Geometry Source Audit

## PNG Export (Artwork + Product)

```
ResultPanelDownloadSection
  ↓ getEffectiveGeometryVersion("png")  [toggle → still V1 in practice]
  ↓ downloadArtworkExportWithGeometryRuntime / downloadProductExportWithGeometryRuntime
  ↓ geometry-runtime-export.ts (guard only — logs V2, calls V1 engine)
  ↓ product-export.ts
  ↓
  Artwork PNG:
    renderProductFactoryArtworkPng → export-artwork-factory.ts
      → resolveExportGarmentLayerCmRect (export-runtime.ts)
      → designer-coordinate-facade (V1 Projection)
      → factory placement cm (Garment Metrics / print area)

  Product PNG:
    renderMockupArtworkPng → print-export-system.ts
      → getExportCanvasSpec (export-coordinates.ts — V1)
    renderProductMockupOnProduct → ProductMockupEngine
      → composeProductMockup → product-placement-scale + visual-compensation (V1 Legacy)
```

**Geometry source today:** V1 Factory Placement + Garment Metrics + Legacy calibration  
**NOT using:** `resolveGeometryRuntimeSnapshot()`

---

## ZIP Export (Bundle)

```
downloadProductExportBundle → buildProductExportFiles
  → same paths as PNG (artwork + product mockup)
```

**Geometry source:** V1 (identical to PNG)

---

## PDF Proof

```
factory-proof-pdf-template.ts
  ↓ resolveDesignerPreviewLayout / designer-layout.ts
  ↓ COLLAR_ANCHOR_Y_PX_BY_SIDE (V1 template)
  ↓ getDesignerPrintAreaCmBounds (V1)
  ↓ resolveProductPreviewVisualCompensationPdfOffsetY (V1 legacy ±8%)
```

**Geometry source:** V1 Designer Layout + Legacy visual compensation  
**NOT using:** Geometry Runtime Snapshot

---

## Email Preview

```
lib/email.ts — sends HTML with order data / attachments
Proof/mockup images from separate render paths (V1 mockup compose)
```

**Geometry source:** V1 (no Runtime Snapshot)

---

## Second Geometry Copy?

| Surface | Uses resolveGeometryRuntimeSnapshot? | Second geometry? |
|---------|--------------------------------------|------------------|
| Designer V2 | ✅ | No |
| ResultPanel V2 | ✅ | No |
| PNG Export | ❌ V1 export-runtime + factory | **Yes — separate V1 path** |
| ZIP Export | ❌ | **Yes** |
| PDF Proof | ❌ | **Yes** |
| Email | ❌ | **Yes** |

---

## Phase 71.0 Infrastructure (NEW)

```
resolveEffectiveExportGeometryVersion()  [guard: prod=V1, dev toggle]
        ↓
resolveExportRuntimeSnapshot(side, version)
        ↓
resolveGeometryRuntimeSnapshot()  [same as Designer/ResultPanel]
        ↓
(Phase 71.1 — wire to PNG/ZIP/PDF/Email engines)
```

Export engines **unchanged** this phase.
