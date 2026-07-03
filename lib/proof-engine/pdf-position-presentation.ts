/**
 * Proof PDF — artwork position presentation (formatting only).
 * Distances and sizes are read from design-inspector + garment print area metadata.
 */

import { getPrintAreaOffsetCm } from "../coordinates/print-area-offset";
import type { DesignLayer } from "../types";
import type { Side } from "./proof-domain";

export interface PdfArtworkPositionPresentation {
  sideLabel: string;
  printSizeLabel: string;
  collarDistanceLabel: string;
  leftDistanceLabel: string;
  rightDistanceLabel: string;
  /** Rounded cm — for mockup annotation layout only */
  collarDistanceCm: number;
  leftDistanceCm: number;
  rightDistanceCm: number;
  printWidthCm: number;
  printHeightCm: number;
  artworkTopCm: number;
  artworkBottomCm: number;
  artworkLeftCm: number;
  artworkRightCm: number;
  printAreaWidthCm: number;
  printAreaHeightCm: number;
}

const SIDE_POSITION_LABEL: Record<Side, string> = {
  front: "正面",
  back: "背面",
};

export function formatRoundedDistanceCm(value: number): string {
  return `${Math.round(value)} cm`;
}

export function formatPrintSizeCm(widthCm: number, heightCm: number): string {
  return `${Math.round(widthCm)} × ${Math.round(heightCm)} cm`;
}

function unionInspectorAabbs(
  aabbs: Array<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    width_cm: number;
    height_cm: number;
  }>,
) {
  if (aabbs.length === 0) {
    return null;
  }

  const left = Math.min(...aabbs.map((aabb) => aabb.left));
  const top = Math.min(...aabbs.map((aabb) => aabb.top));
  const right = Math.max(...aabbs.map((aabb) => aabb.right));
  const bottom = Math.max(...aabbs.map((aabb) => aabb.bottom));

  return {
    left,
    top,
    right,
    bottom,
    width_cm: right - left,
    height_cm: bottom - top,
  };
}

export async function buildPdfArtworkPositionPresentation(
  layers: DesignLayer[],
  side: Side,
  size: string,
): Promise<PdfArtworkPositionPresentation | null> {
  const { getBluePrintAreaBoundsForSize, inspectDesignLayers } = await import(
    "../design-inspector"
  );

  const visibleLayers = layers.filter((layer) => layer.visible);
  if (visibleLayers.length === 0) {
    return null;
  }

  const reports = inspectDesignLayers(visibleLayers, { side, size });
  const artworkAabb = unionInspectorAabbs(reports.map((report) => report.aabb));
  if (!artworkAabb) {
    return null;
  }

  const printArea = getBluePrintAreaBoundsForSize(size, side);
  const collarDistanceCm = getPrintAreaOffsetCm(side) + artworkAabb.top;
  const leftDistanceCm = artworkAabb.left;
  const rightDistanceCm = printArea.width - artworkAabb.right;

  return {
    sideLabel: SIDE_POSITION_LABEL[side],
    printSizeLabel: formatPrintSizeCm(
      artworkAabb.width_cm,
      artworkAabb.height_cm,
    ),
    collarDistanceLabel: formatRoundedDistanceCm(collarDistanceCm),
    leftDistanceLabel: formatRoundedDistanceCm(leftDistanceCm),
    rightDistanceLabel: formatRoundedDistanceCm(rightDistanceCm),
    collarDistanceCm: Math.round(collarDistanceCm),
    leftDistanceCm: Math.round(leftDistanceCm),
    rightDistanceCm: Math.round(rightDistanceCm),
    printWidthCm: Math.round(artworkAabb.width_cm),
    printHeightCm: Math.round(artworkAabb.height_cm),
    artworkTopCm: artworkAabb.top,
    artworkBottomCm: artworkAabb.bottom,
    artworkLeftCm: artworkAabb.left,
    artworkRightCm: artworkAabb.right,
    printAreaWidthCm: printArea.width,
    printAreaHeightCm: printArea.height,
  };
}
