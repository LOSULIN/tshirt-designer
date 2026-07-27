# Phase 78 — Geometry Runtime V2 Default Cutover

Generated: 2026-07-27

## Summary

Runtime policy only — no geometry math, placement, calibration, or export pipeline computation changes.

V2 is now the default geometry runtime across dev, preview, and production. V1 remains fully implemented for legacy/debug use via the Geometry Debug Console.

## Policy Changes

| Area | Before | After |
|------|--------|-------|
| `ACTIVE_DESIGNER_GEOMETRY_VERSION` | V1 | **V2** |
| `createDefaultGeometryRuntimeState()` | V1 | **V2** |
| `createDefaultProofSubmitRuntimeContext()` | V1 | **V2** |
| `resolveRuntimePolicyEffectiveGeometryVersion()` | production/preview gates → V1 | **state.geometryVersion** |
| Production lock | forced V1 | **no geometry override** (console still locked) |
| Download / Submit / PDF forwards | production → V1 | **pass-through version** |
| `resolveExportPipelineContext` default `requestedVersion` | V1 | **V2** |

## Surfaces (default effective version)

| Surface | Default |
|---------|---------|
| Designer | V2 |
| Result Panel | V2 |
| Download (PNG / ZIP) | V2 |
| Submit (mockup / PDF) | V2 |
| PDF export | V2 |
| Production website | V2 |

Email surface remains gated by `exportRuntime.email` (unchanged).

## Legacy / Debug

- `DESIGNER_GEOMETRY_VERSION.V1` enum preserved
- V1 resolvers, runtime, and regressions retained
- Geometry Debug Console: **Legacy Mode** — `V2 (Default)` / `V1 Legacy`
- Only debug console can switch to V1 in development

## Files Modified

### Runtime policy
- `lib/designer-geometry-v2/geometry-version.ts`
- `lib/designer-geometry-v2/geometry-runtime-state.ts`
- `lib/designer-geometry-v2/runtime-effective-version-policy.ts`
- `lib/designer-geometry-v2/proof-submit-runtime-context.ts`
- `lib/designer-geometry-v2/geometry-runtime-context.tsx`
- `lib/designer-geometry-v2/runtime-download-forward.ts`
- `lib/designer-geometry-v2/export-pipeline-context.ts`
- `lib/designer-geometry-v2/export-runtime-snapshot.ts`
- `lib/designer-geometry-v2/shadow-runtime.ts` — `assertActiveGeometryRemainsV1` now verifies V1 enum exists (shadow compare tooling)

### UI
- `components/designer/GeometryDebugConsole.tsx` — Legacy Mode labels

### Regression
- `lib/designer-geometry-v2/runtime-default-v2.regression.ts` (new)
- Updated policy assertions in existing `*.regression.ts` files

## Regression

```bash
npx tsx lib/designer-geometry-v2/runtime-default-v2.regression.ts
npx tsx lib/designer-geometry-v2/runtime-effective-version-policy.regression.ts
npx tsx lib/designer-geometry-v2/geometry-runtime-switch.regression.ts
npx tsx lib/designer-geometry-v2/proof-submit-runtime-context.regression.ts
npx tsx lib/designer-geometry-v2/product-mockup-submit-runtime.regression.ts
npx tsx lib/designer-geometry-v2/export-pdf-submit-runtime.regression.ts
npx tsx lib/designer-geometry-v2/runtime-forward-canonicalization.regression.ts
npx tsx lib/designer-geometry-v2/export-runtime-snapshot.regression.ts
npx tsx lib/designer-geometry-v2/export-pipeline-context.regression.ts
npx tsx lib/designer-geometry-v2/geometry-v2-release-candidate.regression.ts
```

## Acceptance Checklist

- [x] `npm run dev` default V2
- [x] Production no longer locks to V1
- [x] Designer / Result Panel / Download / Submit / PDF default V2
- [x] V1 code preserved (enum, resolvers, legacy paths)
- [x] Debug Console can switch to V1 Legacy
- [x] `runtime-default-v2.regression.ts` — ALL PASS

## Not Modified (per Phase 78 scope)

Geometry Runtime computation, Placement, Factory Anchor, Product Registry, PhotoBridge, PipelineContext geometry fields, Export render math, Calibration values.
