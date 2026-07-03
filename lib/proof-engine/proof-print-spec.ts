/**
 * Proof Engine — print export metadata (pre-confirmed canonical values).
 * Static lookup only: no cm→px, no projection, no coordinate runtime.
 *
 * Values verified against getPrintExportSpec / getExportCanvasSpec
 * (Export Runtime, garment blue print area @ 300 DPI).
 */

import { EXPORT_DPI, type Side } from "./proof-domain";

export interface ProofPrintExportSpec {
  widthCm: number;
  heightCm: number;
  dpi: number;
  widthPx: number;
  heightPx: number;
  background: "transparent";
}

export interface ProofPrintExportDimensionsPx {
  widthPx: number;
  heightPx: number;
}

interface ProofPrintSpecRow {
  widthCm: number;
  heightCm: number;
  widthPx: number;
  heightPx: number;
}

/** Canonical export metadata keyed by side → size (includes XS / 2XL aliases). */
const PROOF_PRINT_SPEC_TABLE: Record<Side, Record<string, ProofPrintSpecRow>> = {
  front: {
    "90": { widthCm: 18, heightCm: 24, widthPx: 2126, heightPx: 2835 },
    "110": { widthCm: 22, heightCm: 30, widthPx: 2598, heightPx: 3543 },
    "130": { widthCm: 25, heightCm: 35, widthPx: 2953, heightPx: 4134 },
    "150": { widthCm: 29, heightCm: 41, widthPx: 3425, heightPx: 4843 },
    "160": { widthCm: 32, heightCm: 44, widthPx: 3780, heightPx: 5197 },
    GS: { widthCm: 29, heightCm: 41, widthPx: 3425, heightPx: 4843 },
    GM: { widthCm: 32, heightCm: 44, widthPx: 3780, heightPx: 5197 },
    GL: { widthCm: 35, heightCm: 46, widthPx: 4134, heightPx: 5433 },
    S: { widthCm: 35, heightCm: 46, widthPx: 4134, heightPx: 5433 },
    M: { widthCm: 35, heightCm: 50, widthPx: 4134, heightPx: 5906 },
    L: { widthCm: 38, heightCm: 52, widthPx: 4488, heightPx: 6142 },
    XL: { widthCm: 40, heightCm: 55, widthPx: 4724, heightPx: 6496 },
    XXL: { widthCm: 42, heightCm: 58, widthPx: 4961, heightPx: 6850 },
    XXXL: { widthCm: 45, heightCm: 60, widthPx: 5315, heightPx: 7087 },
    XS: { widthCm: 35, heightCm: 50, widthPx: 4134, heightPx: 5906 },
    "2XL": { widthCm: 42, heightCm: 58, widthPx: 4961, heightPx: 6850 },
  },
  back: {
    "90": { widthCm: 20, heightCm: 22, widthPx: 2362, heightPx: 2598 },
    "110": { widthCm: 24, heightCm: 27, widthPx: 2835, heightPx: 3189 },
    "130": { widthCm: 27, heightCm: 32, widthPx: 3189, heightPx: 3780 },
    "150": { widthCm: 31, heightCm: 37, widthPx: 3661, heightPx: 4370 },
    "160": { widthCm: 35, heightCm: 40, widthPx: 4134, heightPx: 4724 },
    GS: { widthCm: 31, heightCm: 37, widthPx: 3661, heightPx: 4370 },
    GM: { widthCm: 35, heightCm: 40, widthPx: 4134, heightPx: 4724 },
    GL: { widthCm: 38, heightCm: 41, widthPx: 4488, heightPx: 4843 },
    S: { widthCm: 38, heightCm: 41, widthPx: 4488, heightPx: 4843 },
    M: { widthCm: 38, heightCm: 45, widthPx: 4488, heightPx: 5315 },
    L: { widthCm: 41, heightCm: 47, widthPx: 4843, heightPx: 5551 },
    XL: { widthCm: 43, heightCm: 50, widthPx: 5079, heightPx: 5906 },
    XXL: { widthCm: 46, heightCm: 52, widthPx: 5433, heightPx: 6142 },
    XXXL: { widthCm: 49, heightCm: 54, widthPx: 5787, heightPx: 6378 },
    XS: { widthCm: 38, heightCm: 45, widthPx: 4488, heightPx: 5315 },
    "2XL": { widthCm: 46, heightCm: 52, widthPx: 5433, heightPx: 6142 },
  },
};

const DEFAULT_SIZE = "M";

function resolveProofPrintSpecRow(
  side: Side,
  size: string,
): ProofPrintSpecRow {
  const sideTable = PROOF_PRINT_SPEC_TABLE[side];
  return sideTable[size] ?? sideTable[DEFAULT_SIZE];
}

export function getProofPrintExportSpec(
  side: Side = "front",
  size: string = "M",
): ProofPrintExportSpec {
  const row = resolveProofPrintSpecRow(side, size);
  return {
    widthCm: row.widthCm,
    heightCm: row.heightCm,
    dpi: EXPORT_DPI,
    widthPx: row.widthPx,
    heightPx: row.heightPx,
    background: "transparent",
  };
}

export function getProofPrintExportDimensionsPx(
  side: Side = "front",
  size: string = "M",
): ProofPrintExportDimensionsPx {
  const row = resolveProofPrintSpecRow(side, size);
  return { widthPx: row.widthPx, heightPx: row.heightPx };
}
