# Phase 70.4 — Product Factory Anchor System

## Architecture

```
Product Definition (UA35001)
        ↓
Product Factory Anchor          ← official collar / factory origin / shoulder / hem
        ↓
Product Master Snapshot         ← derivation: product-factory-anchor
        ↓
resolveGeometryRuntimeSnapshot()
        ↓
Designer / ResultPanel

Builder (alpha detect + calibration) → Fallback / QA only (NOT runtime when anchor exists)
```

## UA35001 Factory Anchor

| Side | collarBottom | factoryOrigin | printTop (7cm/5cm) |
|------|-------------|---------------|-------------------|
| front | (512, 416) | (512, 416) | 501.68 px |
| back | (513, 388) | (513, 388) | 449.20 px |

Front shoulder: scanY=348, width=578.9px  
Front hem: (511.95, 1270.9)  
Back hem: (512.95, 1285.1)

## Runtime Audit

| Layer | Factory Origin Source | Builder参与 |
|-------|----------------------|------------|
| `resolveGeometryRuntimeSnapshot()` V2 | Factory Anchor | ❌ |
| `UA35001_PRODUCT_MASTER_SNAPSHOT` | `buildProductMasterGeometryFromFactoryAnchor()` | ❌ |
| Designer workspace | Runtime Snapshot | ❌ |
| ResultPanel photo bridge | Runtime Snapshot | ❌ |
| Export (production) | V1 (unchanged) | N/A |

Builder white/front collar (with +125 calibration): **401 px** — differs from anchor **416 px**; runtime uses anchor only.

## New Files

- `lib/designer-geometry-v2/product-factory-anchor.ts`
- `lib/designer-geometry-v2/product-factory-anchor.regression.ts`

## Modified

- `resolve-geometry-runtime.ts` — V2 → `resolveFactoryAnchorRuntimeSnapshot()`
- `product-master-snapshot.ts` — derived from anchor (not builder calibration)
- `product-master-profile.ts` — `derivation: product-factory-anchor`
- `shadow-runtime.ts` — delegates to `productMasterGeometryToRuntimeSnapshot()`
- `index.ts` — exports

## Regression

```
npx tsx lib/designer-geometry-v2/product-factory-anchor.regression.ts  → 28 PASS
npx tsx lib/designer-geometry-v2/geometry-v2-release-candidate.regression.ts → 78 PASS / 0 WARNING / 0 FAIL
```

## Future Products (Gildan, AS Colour, Champion…)

1. Add `ProductFactoryAnchor` to registry in `product-factory-anchor.ts`
2. No builder calibration offsets required per SKU
3. Builder remains analyzer for products without anchor
