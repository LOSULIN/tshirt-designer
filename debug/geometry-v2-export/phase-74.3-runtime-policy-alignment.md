# Phase 74.3 — Runtime Policy Alignment

**Date:** 2026-07-23  
**Scope:** Effective version policy only — no geometry, renderer, or placement changes

---

## Problem (74.2)

Preview used `preview.designer` / `preview.resultPanel` gates. Submit/Download used `exportRuntime.png` / `exportRuntime.pdf` gates (default OFF). Same `GeometryRuntimeState` produced V2 preview and V1 submit artifacts.

---

## Solution

Single authoritative policy module:

`lib/designer-geometry-v2/runtime-effective-version-policy.ts`

```
resolveRuntimePolicyEffectiveGeometryVersion(state)
```

### Policy rules

| Condition | Effective version |
|-----------|-------------------|
| Production lock | V1 (unchanged) |
| `geometryVersion === V1` | V1 |
| V2 + any preview surface enabled (`designer` OR `resultPanel`) | V2 |
| V2 + all preview surfaces disabled | V1 |

**`exportRuntime.png` / `pdf` / `zip` no longer gate user-facing surfaces.**

**`exportRuntime.email` unchanged** — email flow still gated separately.

---

## Policy Flow Diagram

```
GeometryRuntimeState
        │
        ▼
┌───────────────────────────────────────┐
│ resolveRuntimePolicyEffectiveGeometryVersion │
│  (single user-facing policy)          │
└───────────────────────────────────────┘
        │
        ├─► getEffectiveGeometryVersion(designer|resultPanel|png|zip|pdf)
        │         Preview + Download
        │
        └─► resolveProofSubmitRuntimeContext → effectiveVersions.pdf/mockup
                  Submit

        ├─► exportRuntime.email (unchanged, separate gate)
        │
        ▼
Forward Resolver (unchanged)
        ▼
ExportPipelineContext (unchanged)
        ▼
Runtime Adapter (unchanged)
        ▼
Renderer (unchanged)
```

---

## Changed Modules

| Module | Change |
|--------|--------|
| `runtime-effective-version-policy.ts` | **New** — canonical policy |
| `geometry-runtime-state.ts` | User-facing surfaces delegate to policy |
| `proof-submit-runtime-context.ts` | Submit pdf/mockup use policy |
| `runtime-effective-version-policy.regression.ts` | **New** — 74.3 regression |
| `index.ts` | Export policy API |

**Unchanged:** Forward resolvers, adapters, renderers, PhotoBridge, calibration, ZIP packaging, email HTML, print export.

---

## Before / After (default dev V2 + preview ON)

| Surface | Before (74.2) | After (74.3) |
|---------|---------------|--------------|
| Designer preview | V2 | V2 |
| Result panel | V2 | V2 |
| Submit mockup | **V1** | **V2** |
| Submit PDF | **V1** | **V2** |
| Download mockup | **V1** | **V2** |
| Download artwork/ZIP | **V1** | **V2** |
| Email | V1 (export off) | V1 (unchanged) |
| Production | V1 | V1 (unchanged) |

---

## Regression

```bash
npx tsx lib/designer-geometry-v2/runtime-effective-version-policy.regression.ts
```

Verifies:
- Preview == Submit == Download effective version
- Production lock → V1
- Missing context → V1
- exportRuntime off does not block V2 when preview on
- Policy module delegate-only

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Submit artifacts change in dev (V2 when preview on) | Expected | Fixes 74.2 symptom |
| Email still on separate gate | Low | Intentional per constraints |
| Preview toggles OR semantics | Low | Both default ON; disabling both disables user-facing V2 |
| Production lock bypass | None | Policy checks production first |
| Geometry recompute | None | Policy is version flags only |

---

## Migration Impact

- **Developers:** No need to enable Export Runtime PNG/PDF toggles for submit to match preview.
- **Export Runtime toggles:** Retained in dev console for email and future surfaces; non-authoritative for user-facing png/pdf/zip.
- **Production:** No behavior change (still V1 everywhere).
- **74.1 parity certification:** Still valid — V2 intentional geometry differences unchanged; only policy alignment fixed.

---

## Runtime Freeze Integrity

✅ Architecture unchanged: State → Policy → Forward → PipelineContext → Adapter → Renderer  
✅ No new geometry owners  
✅ No duplicated pipeline resolution  
✅ Forward canonicalization (73.1) intact  
✅ Freeze rules (74.0) respected — policy layer only

---

## Related

- Root cause: `phase-74.2-submit-artifact-root-cause.md`
- Freeze: `phase-74.0-runtime-freeze.md`
- Forward map: `phase-73.1-runtime-forward-map.md`
