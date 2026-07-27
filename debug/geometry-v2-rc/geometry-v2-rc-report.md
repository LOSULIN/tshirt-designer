# Geometry V2 RC Report — Phase 70.3.1

Generated: 2026-07-27T05:40:38.539Z

## Summary

| Status | Count |
|--------|-------|
| PASS | 81 |
| WARNING | 0 |
| FAIL | 0 |

## ② Stage Rects (V2 @ 1024×1536)

| Side | Surface | left | top | width | height |
|------|---------|------|-----|-------|--------|
| front | Designer | 297.80 | 501.68 | 428.40 | 612.00 |
| front | ResultPanel | 297.80 | 501.68 | 428.40 | 612.00 |
| back | Designer | 280.44 | 388.20 | 465.12 | 550.80 |
| back | ResultPanel | 280.44 | 388.20 | 465.12 | 550.80 |

## ③ Safe Area

### front
- Snapshot: left=316.16 top=501.68 width=391.68 height=563.04
- Designer: left=316.16 top=501.68 width=391.68 height=563.04
### back
- Snapshot: left=317.16 top=388.2 width=391.68 height=514.08
- Designer: left=317.16 top=388.20 width=391.68 height=514.08

## ④ Factory Origin

| Side | collarBottom Y | factoryOrigin Y | offsetCm | printTop | stageTop | formula Δ |
|------|----------------|-----------------|----------|----------|----------|-----------|
| front | 416 | 416 | 7 | 501.68 | 501.68 | 0.00 |
| back | 327 | 327 | 5 | 388.20 | 388.2 | 0.00 |

## ⑥ Multi-Color

| Color | Side | collarY | stageTop | safeTop | Status |
|-------|------|---------|----------|---------|--------|
| white | front | 401 | 486.68 | 486.68 | PASS |
| white | back | 386 | 447.20 | 447.20 | PASS |
| black | front | 436 | 521.68 | 521.68 | PASS |
| black | back | 397 | 458.20 | 458.20 | PASS |
| pink | front | 411 | 496.68 | 496.68 | PASS |
| pink | back | 388 | 449.20 | 449.20 | PASS |
| hotpink | front | 404 | 489.68 | 489.68 | PASS |
| hotpink | back | 379 | 440.20 | 440.20 | PASS |
| heathergray | front | 415 | 500.68 | 500.68 | PASS |
| heathergray | back | 396 | 457.20 | 457.20 | PASS |
| yellow | front | 422 | 507.68 | 507.68 | PASS |
| yellow | back | 380 | 441.20 | 441.20 | PASS |
| mint | front | 425 | 510.68 | 510.68 | PASS |
| mint | back | 403 | 464.20 | 464.20 | PASS |
| skyblue | front | 414 | 499.68 | 499.68 | PASS |
| skyblue | back | 382 | 443.20 | 443.20 | PASS |
| lightblue | front | 416 | 501.68 | 501.68 | PASS |
| lightblue | back | 400 | 461.20 | 461.20 | PASS |
| indigo | front | 418 | 503.68 | 503.68 | PASS |
| indigo | back | 387 | 448.20 | 448.20 | PASS |

## ⑤ Layer Projection (Logo / Title / Badge)

- front/rc-logo: designerTop=624.08 resultTop=624.08 Δ=0.00 rotation=12 scale=1.05
- front/rc-title: designerTop=770.96 resultTop=770.96 Δ=0.00 rotation=0 scale=1
- front/rc-badge: designerTop=673.04 resultTop=673.04 Δ=0.00 rotation=-8 scale=0.95
- back/rc-logo: designerTop=510.60 resultTop=510.60 Δ=0.00 rotation=12 scale=1.05
- back/rc-title: designerTop=657.48 resultTop=657.48 Δ=0.00 rotation=0 scale=1
- back/rc-badge: designerTop=559.56 resultTop=559.56 Δ=0.00 rotation=-8 scale=0.95

## ⑦ Multi-Size Stage Stability (front)

| Size | stageTop% | drift vs M | Status |
|------|-----------|------------|--------|
| 90 | 32.6615% | 0.0000% | PASS |
| 110 | 32.6615% | 0.0000% | PASS |
| 130 | 32.6615% | 0.0000% | PASS |
| 150 | 32.6615% | 0.0000% | PASS |
| 160 | 32.6615% | 0.0000% | PASS |
| XS | 32.6615% | 0.0000% | PASS |
| S | 32.6615% | 0.0000% | PASS |
| M | 32.6615% | 0.0000% | PASS |
| L | 32.6615% | 0.0000% | PASS |
| XL | 32.6615% | 0.0000% | PASS |
| 2XL | 32.6615% | 0.0000% | PASS |

## Completed

- Builder Calibration (Phase 70.3 front factory origin)
- Geometry Runtime Switch (V1/V2 dev toggle)
- Designer Runtime Workspace (snapshot-driven blue/orange rects)
- Stage Synchronization (Designer == ResultPanel stage ≤1px)
- ResultPanel Visual Compensation fully removed for V2 (Phase 70.3.5)
- Product Master snapshot frozen for V2 runtime
- Runtime isolation from frozen Projection/Coordinate/Export layers

## Incomplete / Deferred

- Production default is V2 (`ACTIVE_DESIGNER_GEOMETRY_VERSION`)
- Export pipeline V2 integration (guarded OFF)
- Phase 70.4 Product Factory Anchor (per-SKU official anchors)
- Multi-SKU beyond UA35001

## Recommended Improvements (can defer)

- Remove V1 legacy visual compensation when export migrates to V2
- V2 export engine wiring when production cutover planned
- Env-based `NEXT_PUBLIC_DESIGNER_GEOMETRY_VERSION` deprecation cleanup

## Release Readiness

**Geometry V2 as official production Runtime: NO**

**Geometry V2 RC for preview/designer path: YES (preview/designer path)**

### Remaining blockers for full production Runtime

- Per-SKU Product Factory Anchor not implemented (Phase 70.4)

## All Checks

PASS: V2 front: Designer uses resolveGeometryRuntimeSnapshot()
PASS: V2 front: ResultPanel snapshot stage top matches unified resolver
PASS: V2 front: single Safe Area source (no duplicate)
PASS: V2 front: single Factory Origin source (no duplicate)
PASS: V2 back: Designer uses resolveGeometryRuntimeSnapshot()
PASS: V2 back: ResultPanel snapshot stage top matches unified resolver
PASS: V2 back: single Safe Area source (no duplicate)
PASS: V2 back: single Factory Origin source (no duplicate)
PASS: V2 front Designer Stage == ResultPanel Stage
PASS: V2 back Designer Stage == ResultPanel Stage
PASS: V2 front Designer Safe Area == Snapshot Safe Area
PASS: V2 back Designer Safe Area == Snapshot Safe Area
PASS: V2 front: collarBottom == factoryOrigin
PASS: V2 front: factoryOrigin + 7cm == artworkStage.top
PASS: V2 back: collarBottom == factoryOrigin
PASS: V2 back: factoryOrigin + 5cm == artworkStage.top
PASS: V2 color white/front geometry valid
PASS: V2 color white/back geometry valid
PASS: V2 color black/front geometry valid
PASS: V2 color black/back geometry valid
PASS: V2 color pink/front geometry valid
PASS: V2 color pink/back geometry valid
PASS: V2 color hotpink/front geometry valid
PASS: V2 color hotpink/back geometry valid
PASS: V2 color heathergray/front geometry valid
PASS: V2 color heathergray/back geometry valid
PASS: V2 color yellow/front geometry valid
PASS: V2 color yellow/back geometry valid
PASS: V2 color mint/front geometry valid
PASS: V2 color mint/back geometry valid
PASS: V2 color skyblue/front geometry valid
PASS: V2 color skyblue/back geometry valid
PASS: V2 color lightblue/front geometry valid
PASS: V2 color lightblue/back geometry valid
PASS: V2 color indigo/front geometry valid
PASS: V2 color indigo/back geometry valid
PASS: Product Master front collar Y=416 (calibrated)
PASS: V2 front layer rc-logo: Designer Artwork == ResultPanel Artwork
PASS: V2 front/rc-logo: projection CSS % intact
PASS: V2 front layer rc-title: Designer Artwork == ResultPanel Artwork
PASS: V2 front/rc-title: projection CSS % intact
PASS: V2 front layer rc-badge: Designer Artwork == ResultPanel Artwork
PASS: V2 front/rc-badge: projection CSS % intact
PASS: V2 back layer rc-logo: Designer Artwork == ResultPanel Artwork
PASS: V2 back/rc-logo: projection CSS % intact
PASS: V2 back layer rc-title: Designer Artwork == ResultPanel Artwork
PASS: V2 back/rc-title: projection CSS % intact
PASS: V2 back layer rc-badge: Designer Artwork == ResultPanel Artwork
PASS: V2 back/rc-badge: projection CSS % intact
PASS: V2 front stage stable @ size 90 (top drift 0.0000%)
PASS: V2 front stage stable @ size 110 (top drift 0.0000%)
PASS: V2 front stage stable @ size 130 (top drift 0.0000%)
PASS: V2 front stage stable @ size 150 (top drift 0.0000%)
PASS: V2 front stage stable @ size 160 (top drift 0.0000%)
PASS: V2 front stage stable @ size XS (top drift 0.0000%)
PASS: V2 front stage stable @ size S (top drift 0.0000%)
PASS: V2 front stage stable @ size M (top drift 0.0000%)
PASS: V2 front stage stable @ size L (top drift 0.0000%)
PASS: V2 front stage stable @ size XL (top drift 0.0000%)
PASS: V2 front stage stable @ size 2XL (top drift 0.0000%)
PASS: Runtime default V2
PASS: V2: Designer and ResultPanel share effective version
PASS: V1→V2→V1 switch restores V1
PASS: Production runtime locked
PASS: Production uses V2
PASS: exportRuntime toggles default OFF in dev console state
PASS: User-facing PNG preview on + V2 => V2 (policy)
PASS: User-facing ZIP preview on + V2 => V2 (policy)
PASS: User-facing PDF preview on + V2 => V2 (policy)
PASS: User-facing PNG preview off + V2 => V2 (policy)
PASS: User-facing ZIP preview off + V2 => V2 (policy)
PASS: User-facing PDF preview off + V2 => V2 (policy)
PASS: Email surface still gated by exportRuntime.email (off => V1)
PASS: resolveExportGeometryVersionFromToggle PNG OFF → V1
PASS: resolveExportGeometryVersionFromToggle ZIP OFF → V1
PASS: resolveExportGeometryVersionFromToggle PDF OFF → V1
PASS: resolveExportGeometryVersionFromToggle EMAIL OFF → V1
PASS: Runtime isolation: 0 violations (0 found)
PASS: ACTIVE_DESIGNER_GEOMETRY_VERSION is V2
PASS: V2 front: resolveGeometryRuntime snapshot is SSOT
PASS: V2 back: resolveGeometryRuntime snapshot is SSOT

## ALL PASS
