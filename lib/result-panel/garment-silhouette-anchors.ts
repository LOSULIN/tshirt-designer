/**
 * UA35001 garment silhouette anchors @ 1024×1536 (M reference photo).
 * Used only for localized warp weights — not Designer template profile.
 */

export interface GarmentSilhouetteAnchors {
  canvasWidth: number;
  canvasHeight: number;
  centerX: number;
  collarY: number;
  shoulderY: number;
  armpitY: number;
  hemY: number;
  sleeveEndY: number;
  bodyHalfWidth: number;
  shoulderHalfWidth: number;
  sleeveHalfWidth: number;
}

/** United Athle adult-tshirt M mockup @ preview resolution. */
export const UA35001_SILHOUETTE_ANCHORS: GarmentSilhouetteAnchors = {
  canvasWidth: 1024,
  canvasHeight: 1536,
  centerX: 512,
  collarY: 248,
  shoulderY: 318,
  armpitY: 468,
  hemY: 1218,
  sleeveEndY: 612,
  bodyHalfWidth: 248,
  shoulderHalfWidth: 214,
  sleeveHalfWidth: 318,
};
