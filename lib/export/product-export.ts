import { getProductProfile, getProducts } from "@/lib/products/product-registry";
import type { ShirtColor, Side, Size } from "@/lib/constants";
import { hasExportablePrintableDesign } from "@/lib/print-export";
import { renderPrintExportPng } from "@/lib/print-export-system";
import type { DesignLayer } from "@/lib/types";
import { downloadBlob } from "./download";
import {
  renderProductPngFromArtwork,
  renderProductPreviewFromArtwork,
} from "./render-export";

export const DEFAULT_PRODUCT_EXPORT_CODE = "UA35001";

export interface ProductExportInput {
  layers: DesignLayer[];
  side: Side;
  size: Size;
  shirtColor: ShirtColor;
  productCode?: string;
}

export interface ProductExportPreview {
  productCode: string;
  color: string;
  side: Side;
  artworkUrl: string;
  productUrl: string;
  artworkFileName: string;
  productFileName: string;
}

export interface ProductExportFiles {
  artwork: Blob;
  product: Blob;
  artworkFileName: string;
  productFileName: string;
  productCode: string;
  color: string;
  side: Side;
}

export function buildArtworkFileName(): string {
  return "Artwork.png";
}

export function buildProductExportFileName(
  productCode: string,
  side: Side,
  color: string,
): string {
  return `${productCode}-${side}-${color}.png`;
}

export async function resolveExportProductCode(
  productCode?: string,
): Promise<string> {
  if (productCode) return productCode;
  const products = await getProducts();
  const enabled = products.find((item) => item.enabled);
  return enabled?.code ?? DEFAULT_PRODUCT_EXPORT_CODE;
}

export function resolveRegistryColorSlug(
  shirtColor: ShirtColor,
  availableSlugs: string[],
): string {
  if (availableSlugs.includes(shirtColor)) return shirtColor;
  if (shirtColor === "black" && availableSlugs.includes("black")) return "black";
  if (shirtColor === "white" && availableSlugs.includes("white")) return "white";
  if (availableSlugs.includes("white")) return "white";
  return availableSlugs[0] ?? "white";
}

export async function exportArtworkPng(
  input: ProductExportInput,
): Promise<Blob> {
  if (!hasExportablePrintableDesign(input.layers)) {
    throw new Error("尚無可匯出的設計內容");
  }
  return renderPrintExportPng(input.layers, {
    side: input.side,
    size: input.size,
  });
}

export async function buildProductExportFiles(
  input: ProductExportInput,
): Promise<ProductExportFiles> {
  const productCode = await resolveExportProductCode(input.productCode);
  const profile = await getProductProfile(productCode);
  const availableSlugs = profile.availableColors.map((color) => color.slug);
  const color = resolveRegistryColorSlug(input.shirtColor, availableSlugs);

  if (!profile.availableSides.includes(input.side)) {
    throw new Error(`${productCode} 不支援 ${input.side} 面匯出`);
  }

  const artwork = await exportArtworkPng(input);
  const product = await renderProductPngFromArtwork({
    productCode,
    color,
    side: input.side,
    artworkBlob: artwork,
  });

  return {
    artwork,
    product,
    artworkFileName: buildArtworkFileName(),
    productFileName: buildProductExportFileName(productCode, input.side, color),
    productCode,
    color,
    side: input.side,
  };
}

export async function buildProductExportPreview(
  input: ProductExportInput,
): Promise<ProductExportPreview | null> {
  if (!hasExportablePrintableDesign(input.layers)) return null;

  const productCode = await resolveExportProductCode(input.productCode);
  const profile = await getProductProfile(productCode);
  const availableSlugs = profile.availableColors.map((color) => color.slug);
  const color = resolveRegistryColorSlug(input.shirtColor, availableSlugs);

  const artworkBlob = await exportArtworkPng(input);
  const artworkUrl = URL.createObjectURL(artworkBlob);
  const productUrl = await renderProductPreviewFromArtwork({
    productCode,
    color,
    side: input.side,
    artworkBlob: artworkBlob,
  });

  return {
    productCode,
    color,
    side: input.side,
    artworkUrl,
    productUrl,
    artworkFileName: buildArtworkFileName(),
    productFileName: buildProductExportFileName(productCode, input.side, color),
  };
}

export async function downloadArtworkExport(
  input: ProductExportInput,
): Promise<void> {
  const artwork = await exportArtworkPng(input);
  downloadBlob(artwork, buildArtworkFileName());
}

export async function downloadProductExport(
  input: ProductExportInput,
): Promise<void> {
  const files = await buildProductExportFiles(input);
  downloadBlob(files.product, files.productFileName);
}

export async function downloadProductExportBundle(
  input: ProductExportInput,
): Promise<ProductExportFiles> {
  const files = await buildProductExportFiles(input);
  downloadBlob(files.artwork, files.artworkFileName);
  downloadBlob(files.product, files.productFileName);
  return files;
}

/** First-version variants: UA35001 front black / white */
export async function buildSupportedProductVariants(
  input: Omit<ProductExportInput, "shirtColor">,
): Promise<Array<{ color: string; fileName: string; blob: Blob }>> {
  const productCode = await resolveExportProductCode(input.productCode);
  const artwork = await exportArtworkPng({ ...input, shirtColor: "white" });
  const colors = ["black", "white"] as const;
  const variants: Array<{ color: string; fileName: string; blob: Blob }> = [];

  for (const color of colors) {
    const blob = await renderProductPngFromArtwork({
      productCode,
      color,
      side: input.side,
      artworkBlob: artwork,
    });
    variants.push({
      color,
      fileName: buildProductExportFileName(productCode, input.side, color),
      blob,
    });
  }

  return variants;
}
