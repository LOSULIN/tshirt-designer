# Phase 76.2 — Product Mockup Render Parity

## Summary

**Status: PASS**

Download Product PNG now composes at the same preview resolution and placement as the Result Panel, then applies a uniform pixel scale for higher output (2048×3072). No second placement calculation, no export-quality garment re-compose, transparent PNG background preserved.

---

## Render flow (all surfaces)

```
renderProductMockupOnProduct()
  → composeProductMockup()        [preview assets @ 1024×1536, shared pipelineContext]
  → scaleCanvasUniform()          [download only — placement-neutral 2×]
  → canvas.toBlob("image/png")
```

| Surface | Engine | Compose quality | Output scale |
|---------|--------|-----------------|--------------|
| Result Panel (legacy URL path) | ProductMockupEngine | preview | 1× |
| Result Panel (designer projection) | PhotoBridge CSS | — | — |
| Download PNG | ProductMockupEngine | preview | 2× (2048×3072) |
| Submit Mockup | ProductMockupEngine | preview | 1× |
| Submit PDF preview | ProductMockupEngine (via submit render) | preview | 1× |

Factory Artwork PNG export remains on the separate `export` quality path (unchanged).

---

## Files modified

| File | Change |
|------|--------|
| `lib/render/canvas-scale.ts` | New — uniform canvas upscale (no placement recalc) |
| `lib/export/product-export.ts` | Preview compose + `outputPixelScale` for download |
| `lib/render/product-mockup-compose.ts` | Alpha canvas + `clearRect` (no background fill) |
| `lib/result-panel/build-result-panel-product-preview.ts` | Pass `pipelineContext` through mockup path |
| `components/designer/ResultPanel.tsx` | Resolve shared `pipelineContext` for preview + download |
| `lib/render/index.ts` | Export `scaleCanvasUniform` |
| `lib/export/product-mockup-render-parity.regression.ts` | Parity regression (20 checks) |
| `scripts/verify-product-export-ultra-hd.mjs` | Updated wiring assertions |

---

## Acceptance criteria

| Criterion | Result |
|-----------|--------|
| Download reuses ProductMockupEngine | ✓ |
| Flow: engine → compose → toBlob | ✓ |
| No second placement / PhotoBridge / PipelineContext | ✓ (single `pipelineContext` from Result Panel) |
| Transparent PNG background | ✓ (no `fillRect`, alpha canvas) |
| Registry garment `/products/UA35001/assets/` | ✓ |
| Placement = Result Panel (preview compose) | ✓ |
| Higher resolution = scale only | ✓ `scaleCanvasUniform` |

---

## Regression

```bash
npx tsx lib/export/product-mockup-render-parity.regression.ts   # 20/20 PASS
node scripts/verify-product-export-ultra-hd.mjs                 # 24/24 PASS
npx tsx lib/designer-geometry-v2/product-mockup-runtime.regression.ts
npx tsx lib/designer-geometry-v2/product-mockup-submit-runtime.regression.ts
```
