# Phase 74.4.1 — Runtime Policy Regression Cleanup

**Date:** 2026-07-27  
**Scope:** Test maintenance only — no runtime behavior changes  
**Prerequisite:** Phase 74.3 Runtime Policy Alignment

---

## Summary

Replaced obsolete `exportRuntime.*` gating assertions with Phase 74.3 policy assertions across 10 regression suites. Updated one stale JSDoc block. Tier 1 runtime regression suite is **fully green**.

**Runtime behavior:** Byte-identical before and after. Only `.regression.ts` files and one JSDoc comment were modified.

---

## 1. Obsolete Regressions Found

| # | File | Obsolete assertion | Why obsolete (74.3) |
|---|------|-------------------|---------------------|
| 1 | `export-pdf-runtime.regression.ts` | `pdf export toggle default OFF → V1` | `pdf` is user-facing; policy uses preview gates, not `exportRuntime.pdf` |
| 2 | `export-pdf-runtime.regression.ts` | `pdf export toggle ON → V2` | Redundant with default state; toggle no longer authoritative |
| 3 | `export-zip-runtime.regression.ts` | `zip export toggle default OFF → V1` | Same as pdf — `zip` follows preview policy |
| 4 | `export-zip-runtime.regression.ts` | `zip export toggle ON → V2` | Toggle inert for user-facing surfaces |
| 5 | `export-runtime-snapshot.regression.ts` | `Export PNG/ZIP/PDF default version V1` (×3) | Preview ON + V2 → V2 per policy |
| 6 | `export-runtime-snapshot.regression.ts` | `Dev export toggle ON → V2 snapshot version` | Implied toggle gates version; replaced with policy + inert toggle |
| 7 | `export-pipeline-context.regression.ts` | `state + export toggle ON → V2` | Required `exportRuntime.png: true`; policy resolves V2 with toggles OFF |
| 8 | `export-pipeline-context.regression.ts` | `factory-proof-pdf-template void pipelineContext` | PDF runtime wired in 71.4; template now reads `pipelineContext` |
| 9 | `product-mockup-runtime.regression.ts` | `dev export toggle ON → V2 runtime` | Mockup png surface follows preview policy |
| 10 | `product-mockup-submit-runtime.regression.ts` | `dev mockup toggle ON => V2 forward` | Submit mockup uses policy, not `exportRuntime.png` |
| 11 | `runtime-forward-canonicalization.regression.ts` | `dev toggle ON => V2 forward` | Misleading label; forward uses effective version from caller |
| 12 | `proof-submit-runtime-context.regression.ts` | `dev V2 export pdf toggle ON => effective pdf V2` | Toggle ON adds no signal; policy already V2 |
| 13 | `proof-submit-runtime-context.regression.ts` | Section comment `resolves versions from toggles` | Incorrect after 74.3 |
| 14 | `export-pdf-submit-runtime.regression.ts` | `submit forward == download forward (V2 pdf toggle ON)` | Misleading; parity holds under policy without toggle |
| 15 | `geometry-v2-release-candidate.regression.ts` | `Export PNG/ZIP/PDF default uses V1` (×3) | User-facing surfaces V2 when preview ON |
| 16 | `geometry-v2-release-candidate.regression.ts` | `Export guard X OFF → V1` label | Misleading name for `resolveExportGeometryVersionFromToggle` helper |

**Not changed (still correct):**

- `runtime-effective-version-policy.regression.ts` — authored for 74.3
- `geometry-runtime-switch.regression.ts` — already has policy assertions; `export toggles default off` tests **state defaults**, not effective version
- `product-factory-anchor.regression.ts` — tests `DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.png` default only
- `resolveExportGeometryVersionFromToggle` unit tests — stateless helper behavior unchanged

---

## 2. Updated Assertions

### `export-pdf-runtime.regression.ts`

| Removed | Added |
|---------|-------|
| `pdf export toggle default OFF → V1` | `dev V2 + preview on => pdf effective V2 (exportRuntime.pdf ignored)` |
| `pdf export toggle ON → V2` | `dev V2 + preview off => pdf effective V1 (policy)` |
| `production locked → V1 even when pdf toggle ON` | `dev V2 + exportRuntime.pdf ON => pdf still V2 when preview on (toggle inert)` |
| | `production locked → V1 even when preview on` |

### `export-zip-runtime.regression.ts`

| Removed | Added |
|---------|-------|
| `zip export toggle default OFF → V1` | `dev V2 + preview on => zip effective V2 (exportRuntime.zip ignored)` |
| `zip export toggle ON → V2` | `dev V2 + preview off => zip effective V1 (policy)` |
| | `dev V2 + exportRuntime.zip ON => zip still V2 when preview on (toggle inert)` |
| | `production locked => zip effective V1` |

### `export-runtime-snapshot.regression.ts`

| Removed | Added |
|---------|-------|
| `Export X default version V1` (png/zip/pdf/email loop) | Per-surface policy loop: preview on + V2 => V2 (png/zip/pdf) |
| `Dev export toggle ON → V2 snapshot version` | Preview off + V2 => V1 (png/zip/pdf) |
| | `Email surface exportRuntime.email OFF => V1` |
| | `exportRuntime png ON inert when preview on => still V2` |
| Renamed | `exportRuntime.X default OFF in dev console state` (state default, not effective version) |

### `export-pipeline-context.regression.ts`

| Removed | Added |
|---------|-------|
| `state + export toggle ON → V2` | `state + preview on + V2 => pipeline V2 (exportRuntime ignored)` |
| `factory-proof-pdf-template void pipelineContext` | `factory-proof-pdf-template uses resolvePdfExportRuntimeLayout` |
| | `state + preview off + V2 => pipeline V1 (policy)` |

### `product-mockup-runtime.regression.ts`

| Removed | Added |
|---------|-------|
| `dev export toggle ON → V2 runtime` | `dev V2 + preview on => V2 runtime (exportRuntime.png ignored)` |
| | `dev V2 + preview off => V1 runtime (policy)` |
| | `exportRuntime.png ON inert when preview on => still V2` |

### `product-mockup-submit-runtime.regression.ts`

| Removed | Added |
|---------|-------|
| `dev mockup toggle ON => V2 forward` | `dev V2 + preview on => V2 forward (exportRuntime.png ignored)` |
| | `dev V2 + preview off => V1 forward (policy)` |

### `runtime-forward-canonicalization.regression.ts`

| Removed | Added |
|---------|-------|
| `dev toggle ON => V2 forward` | `dev V2 effective version => V2 forward` |

### `proof-submit-runtime-context.regression.ts`

| Removed | Added |
|---------|-------|
| `dev V2 export pdf toggle ON => effective pdf V2` | `dev V2 + preview off => effective pdf/mockup V1 (policy)` |
| | `dev V2 + exportRuntime.pdf ON => effective pdf still V2 (toggle inert)` |
| Renamed section | `dev runtime resolves versions from policy (74.3)` |

### `export-pdf-submit-runtime.regression.ts`

| Removed | Added |
|---------|-------|
| `submit forward == download forward (V2 pdf toggle ON)` | `submit forward == download forward (V2 policy effective version)` |
| Setup required `exportRuntime.pdf: true` | Uses default V2 state (preview on, export toggles off) |

### `geometry-v2-release-candidate.regression.ts`

| Removed | Added |
|---------|-------|
| `Export X default uses V1` loop | User-facing preview on + V2 => V2 (png/zip/pdf) |
| `Export guard X OFF → V1` | User-facing preview off + V2 => V1 (png/zip/pdf) |
| | `Email surface still gated by exportRuntime.email` |
| Renamed | `resolveExportGeometryVersionFromToggle X OFF → V1` (helper, not policy) |

---

## 3. Updated Comments / JSDoc

| File | Change |
|------|--------|
| `export-runtime-snapshot.ts` | `resolveEffectiveExportGeometryVersion` JSDoc: replaced "export toggle OFF → V1" with 74.3 policy delegation description |
| `export-pipeline-context.regression.ts` | Section 8 header: `Engines consume or void pipelineContext` |
| `export-pdf-runtime.regression.ts` | Section header: `pdf surface effective version (74.3 policy)` |
| `export-zip-runtime.regression.ts` | Section header: `zip surface effective version (74.3 policy)` |
| `geometry-v2-release-candidate.regression.ts` | Section ⑨: `Runtime policy + export toggle defaults (74.3)` |

---

## 4. Regression Summary — Before / After

| Suite | Before | After |
|-------|--------|-------|
| `runtime-effective-version-policy` | ✅ 26 PASS | ✅ 26 PASS |
| `runtime-forward-canonicalization` | ✅ 19 PASS | ✅ 19 PASS |
| `product-mockup-runtime` | ✅ 37 PASS | ✅ 39 PASS |
| `product-mockup-submit-runtime` | ✅ 18 PASS | ✅ 19 PASS |
| `export-pdf-runtime` | ❌ 28/29 | ✅ 30 PASS |
| `export-pdf-submit-runtime` | ✅ 19 PASS | ✅ 19 PASS |
| `export-zip-runtime` | ❌ 26/27 | ✅ 30 PASS |
| `export-runtime-snapshot` | ❌ 68/71 | ✅ 77 PASS |
| `export-pipeline-context` | ❌ 51/52 | ✅ 53 PASS |
| `proof-submit-runtime-context` | ✅ 19 PASS | ✅ 20 PASS |
| `geometry-runtime-switch` | ✅ PASS | ✅ PASS |
| `geometry-v2-release-candidate` | ❌ FAIL (Export PNG) | ✅ ALL PASS |
| `export-artwork-runtime` | ✅ 51 PASS | ✅ 51 PASS |

**Tier 1 result:** **13/13 green** (was 8/13 green, 5 with policy-related failures + 1 PDF wiring stale check).

---

## 5. Runtime Behavior Confirmation

| Area | Modified? |
|------|-----------|
| `GeometryRuntimeState` logic | ❌ No |
| `resolveRuntimePolicyEffectiveGeometryVersion` | ❌ No |
| Forward resolvers | ❌ No |
| `ExportPipelineContext` | ❌ No |
| Renderer / adapter implementation | ❌ No |
| Geometry / PhotoBridge / calibration | ❌ No |
| Production policy | ❌ No |

**Files touched:** 10 `.regression.ts` files + 1 JSDoc comment in `export-runtime-snapshot.ts`.

**Byte-identical runtime:** Yes. Assertions now match behavior that Phase 74.3 already implemented.

---

## Policy Assertions Verified (all suites)

- ✅ Preview ON + Geometry V2 → effective V2 (png/zip/pdf/designer/resultPanel/submit)
- ✅ Preview OFF + Geometry V2 → effective V1
- ✅ `exportRuntime.png/pdf/zip` no longer affects user-facing effective version
- ✅ `exportRuntime.email` still gates email surface
- ✅ Production lock still forces V1
- ✅ `resolveExportGeometryVersionFromToggle` helper behavior unchanged (tested separately)
