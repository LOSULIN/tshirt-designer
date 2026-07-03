/**
 * Product Metadata — presentation-only copy (names, labels, product sheet fields).
 * Not used for coordinates, validation, export sizing, or runtime decisions.
 */

export const PRODUCT_PRESENTATION = {
  brand: "TIIIGO",
  code: "UA35001",
  displayName: "TIIIGO CORE COTTON 5.6oz | CLASSIC FIT",
  material: "100% Cotton",
  weight: "5.6 oz",
  printMethod: "DTF－直噴膠膜印刷",
  fit: "CLASSIC FIT",
} as const;

export type ProductPresentation = typeof PRODUCT_PRESENTATION;

export function getProductBrand(): string {
  return PRODUCT_PRESENTATION.brand;
}

export function getProductCode(): string {
  return PRODUCT_PRESENTATION.code;
}

export function getProductDisplayName(): string {
  return PRODUCT_PRESENTATION.displayName;
}

export function getProductMaterialLabel(): string {
  return PRODUCT_PRESENTATION.material;
}

export function getProductWeightLabel(): string {
  return PRODUCT_PRESENTATION.weight;
}

export function getProductPrintMethodLabel(): string {
  return PRODUCT_PRESENTATION.printMethod;
}

export function getProductFitLabel(): string {
  return PRODUCT_PRESENTATION.fit;
}

/** UI / legacy combined label (材質 / 克重) */
export function getProductMaterialWeightLabel(): string {
  return `${PRODUCT_PRESENTATION.material} | ${PRODUCT_PRESENTATION.weight}`;
}
