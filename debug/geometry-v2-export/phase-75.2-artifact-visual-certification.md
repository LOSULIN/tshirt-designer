# Phase 75.2 — Artifact Visual Diff Certification

**Date:** 2026-07-27  
**Fixture:** UA35001 · white · M · front · text layer `CERT752`  
**Reference:** `public/products/UA35001/assets/adult-tshirt-white-front.png` (preview 1024×1536)  
**Export reference:** `public/products/UA35001/assets/export/adult-tshirt-white-front.png` (2048×3072)

## Verdict: **PASS**

All four production surfaces match the Product Registry garment bitmap within rendering tolerance. No unexpected scaling, crop, or legacy template substitution detected.

---

## Artifacts (generated, not inferred)

| Surface | Artifact | Bytes | Source |
|---------|----------|-------|--------|
| Designer | `artifacts/designer-garment.png` | 435,237 | Registry URL fetched from live Designer DOM |
| Download Mockup | `artifacts/download-mockup.png` | 3,165,795 | Playwright download (`商品圖 PNG`, 2048×3072) |
| Submit Mockup | `artifacts/submit-mockup.png` | 438,714 | FormData intercept `proof-mockup-front` |
| Submit PDF | `artifacts/submit-pdf.pdf` | 476,998 | Live submit `FD-20260727-0004` → Supabase `proof_pdf_url` |

**Scripts:** `generate-artifacts.mjs`, `capture-submit-pdf.mjs`, `garment-diff.mjs`  
**Diff outputs:** `diff-output/*-{heatmap,overlay,garment-mask,reference-masked}.png`, `difference-report.json`

---

## Pixel statistics

| Surface | Ref WxH | Cand WxH | Scale | Interpolation | Rotation | Garment mask px | Diff px | Diff % | Legacy diff % | Template sub? | Pass |
|---------|---------|----------|-------|---------------|----------|-----------------|---------|--------|---------------|---------------|------|
| designer-garment | 1024×1536 | 1024×1536 | 1×1 | none | 0° | 648,425 | 0 | **0.000%** | 17.52% | No | ✓ |
| download-mockup | 2048×3072 | 2048×3072 | 1×1 | none | 0° | 6,268,809 | 14 | **0.0002%** | 17.00% | No | ✓ |
| submit-mockup | 1024×1536 | 1024×1536 | 1×1 | none | 0° | 642,611 | 10 | **0.0016%** | 18.45% | No | ✓ |
| submit-pdf-garment | 1024×1536 | 1024×1536 | 1×1 | none | 0° | 648,425 | 0 | **0.000%** | 17.52% | No | ✓ |

**Tolerance:** per-channel Δ ≤ 0.12 (≈30/255)  
**Pass threshold:** ≤ 3.5% garment-mask pixels differing  
**Legacy check:** registry closer than `/templates/adult-tshirt-white-front.png` on all surfaces (substitution = legacy diff < 60% of registry diff)

---

## Bounding boxes (alpha silhouette)

| Surface | Reference BBox | Candidate BBox | Unexpected crop |
|---------|----------------|----------------|-----------------|
| designer-garment | 24,260 → 999,1250 (976×991) | identical | No |
| download-mockup | 0,0 → 2047,3071 (full frame) | identical | No |
| submit-mockup | 24,260 → 999,1250 | identical | No |
| submit-pdf-garment | 24,260 → 999,1250 | identical (mask-derived) | No |

---

## Garment region extraction method

1. **PNG surfaces:** Direct file compare; mask = registry alpha silhouette with chest artwork region excluded (high Δ heuristic).
2. **PDF surface:** Extract embedded 1024×1536 `DeviceRGB` / `FlateDecode` stream from production PDF (pdf-lib `embedPng` storage format), convert to PNG, same mask pipeline.

PDF embedded images in `submit-pdf.pdf`:
- 1024×1536 RGB — preview mockup panel (garment + artwork) ← **cert target**
- 4134×5906 RGB — print artwork
- 1024×1536 Gray + 4134×5906 Gray — companion masks

---

## Visual outputs

Per surface in `diff-output/`:

- `{surface}-heatmap.png` — red = garment-mask pixel over tolerance
- `{surface}-overlay.png` — 45% candidate over reference
- `{surface}-garment-mask.png` — compared candidate region
- `{surface}-reference-masked.png` — reference garment region

---

## Constraints honored

- No runtime / geometry / placement / policy changes
- All artifacts from live production paths (Designer, export download, submit mockup FormData, submit background PDF pipeline)
- No inference from call-chain alone — only measured pixels from generated files
