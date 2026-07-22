import type { ExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import type { DesignerGeometryVersion } from "@/lib/designer-geometry-v2/geometry-version";
import { getProductProfile, getProducts } from "@/lib/products/product-registry";
import type { ShirtColor, Side, Size } from "@/lib/constants";
import { hasExportablePrintableDesign } from "@/lib/print-export";
import type { DesignLayer } from "@/lib/types";
import { renderProductMockupOnProduct } from "@/components/render/ProductMockupEngine";
import type { ProductSide } from "@/lib/render/render-types";
import { downloadBlob } from "./download";
import { resolveProductExportPixelScale } from "./export-pixel-scale";
import { renderProductFactoryArtworkPng } from "./factory-artwork-export";
import { renderMockupArtworkPng } from "./mockup-artwork-export";
import type { RenderQuality } from "./render-quality";
import {
  artworkBlobToCanvas,
  canvasToPngBlob,
} from "./render-export";

export const DEFAULT_PRODUCT_EXPORT_CODE = "UA35001";

const PREVIEW_QUALITY: RenderQuality = "preview";
const DOWNLOAD_QUALITY: RenderQuality = "export";

/** Designer shirtColor → UA35001 product asset slug（僅商品圖 Registry） */
const DESIGNER_SHIRT_COLOR_TO_PRODUCT_SLUG: Record<ShirtColor, string> = {
  white: "white",
  black: "black",
  pink: "pink",
  "hot-pink": "hotpink",
  "sky-blue": "skyblue",
  "heather-grey": "heathergray",
  "light-yellow": "yellow",
  "mustard-green": "mint",
  navy: "indigo",
  "royal-blue": "lightblue",
};

export interface ProductExportInput {
  layers: DesignLayer[];
  side: Side;
  size: Size;
  shirtColor: ShirtColor;
  productCode?: string;
  geometryVersion?: DesignerGeometryVersion;
  pipelineContext?: ExportPipelineContext;
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
  return "Factory-Artwork.png";
}

export function buildProductExportFileName(
  productCode: string,
  side: Side,
  color: string,
): string {
  return `${productCode}-${side}-${color}.png`;
}

/** Product mockup PNG — Preview / Download share placement; quality differs only. */
async function renderProductMockupPngFromArtwork(input: {
  productCode: string;
  color: string;
  side: Side;
  artworkBlob: Blob;
  quality: RenderQuality;
  garmentSize: Size;
  pipelineContext?: ExportPipelineContext;
}): Promise<Blob> {
  const artworkCanvas = await artworkBlobToCanvas(input.artworkBlob);
  const result = await renderProductMockupOnProduct({
    productCode: input.productCode,
    color: input.color,
    side: input.side as ProductSide,
    artwork: artworkCanvas,
    artworkWidth: artworkCanvas.width,
    artworkHeight: artworkCanvas.height,
    quality: input.quality,
    garmentSize: input.garmentSize,
    pipelineContext: input.pipelineContext,
  });
  return canvasToPngBlob(result.canvas);
}

async function renderProductMockupPreviewFromArtwork(input: {
  productCode: string;
  color: string;
  side: Side;
  artworkBlob: Blob;
  quality: RenderQuality;
  garmentSize: Size;
  pipelineContext?: ExportPipelineContext;
}): Promise<string> {
  const artworkCanvas = await artworkBlobToCanvas(input.artworkBlob);
  const result = await renderProductMockupOnProduct({
    productCode: input.productCode,
    color: input.color,
    side: input.side as ProductSide,
    artwork: artworkCanvas,
    artworkWidth: artworkCanvas.width,
    artworkHeight: artworkCanvas.height,
    quality: input.quality,
    garmentSize: input.garmentSize,
    pipelineContext: input.pipelineContext,
  });
  return result.dataUrl;
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
  const mapped = DESIGNER_SHIRT_COLOR_TO_PRODUCT_SLUG[shirtColor] ?? shirtColor;
  if (availableSlugs.includes(mapped)) return mapped;
  if (availableSlugs.includes(shirtColor)) return shirtColor;
  if (availableSlugs.includes("white")) return "white";
  return availableSlugs[0] ?? "white";
}

async function resolveExportContext(
  input: ProductExportInput,
  quality: RenderQuality,
) {
  const productCode = await resolveExportProductCode(input.productCode);
  const profile = await getProductProfile(productCode);
  const availableSlugs = profile.availableColors.map((color) => color.slug);
  const color = resolveRegistryColorSlug(input.shirtColor, availableSlugs);

  if (!profile.availableSides.includes(input.side)) {
    throw new Error(`${productCode} 不支援 ${input.side} 面匯出`);
  }

  const pixelScale = await resolveProductExportPixelScale(
    productCode,
    input.side,
    color,
    quality,
  );

  return { productCode, color, pixelScale, quality };
}

export async function exportArtworkPng(
  input: ProductExportInput,
  quality: RenderQuality = DOWNLOAD_QUALITY,
): Promise<Blob> {
  if (!hasExportablePrintableDesign(input.layers)) {
    throw new Error("尚無可匯出的設計內容");
  }

  const ctx = await resolveExportContext(input, quality);

  return renderProductFactoryArtworkPng(input.layers, {
    side: input.side,
    size: input.size,
    quality: ctx.quality,
    pixelScale: ctx.pixelScale,
    pipelineContext: input.pipelineContext,
  });
}

/** Print-area artwork for product mockup compose — re-rendered per quality. */
async function exportPrintAreaArtworkForMockup(
  input: ProductExportInput,
  quality: RenderQuality,
  pixelScale: number,
): Promise<Blob> {
  return renderMockupArtworkPng(input.layers, {
    side: input.side,
    size: input.size,
    quality,
    pixelScale,
    pipelineContext: input.pipelineContext,
  });
}

export async function buildProductExportFiles(
  input: ProductExportInput,
): Promise<ProductExportFiles> {
  const ctx = await resolveExportContext(input, DOWNLOAD_QUALITY);
  const artwork = await exportArtworkPng(input, DOWNLOAD_QUALITY);
  const mockupArtwork = await exportPrintAreaArtworkForMockup(
    input,
    DOWNLOAD_QUALITY,
    ctx.pixelScale,
  );
  const product = await renderProductMockupPngFromArtwork({
    productCode: ctx.productCode,
    color: ctx.color,
    side: input.side,
    artworkBlob: mockupArtwork,
    quality: DOWNLOAD_QUALITY,
    garmentSize: input.size,
    pipelineContext: input.pipelineContext,
  });

  return {
    artwork,
    product,
    artworkFileName: buildArtworkFileName(),
    productFileName: buildProductExportFileName(
      ctx.productCode,
      input.side,
      ctx.color,
    ),
    productCode: ctx.productCode,
    color: ctx.color,
    side: input.side,
  };
}

export async function buildProductExportPreview(
  input: ProductExportInput,
): Promise<ProductExportPreview | null> {
  if (!hasExportablePrintableDesign(input.layers)) return null;

  const ctx = await resolveExportContext(input, PREVIEW_QUALITY);
  const artworkBlob = await exportArtworkPng(input, PREVIEW_QUALITY);
  const mockupArtwork = await exportPrintAreaArtworkForMockup(
    input,
    PREVIEW_QUALITY,
    1,
  );
  const artworkUrl = URL.createObjectURL(artworkBlob);
  const productUrl = await renderProductMockupPreviewFromArtwork({
    productCode: ctx.productCode,
    color: ctx.color,
    side: input.side,
    artworkBlob: mockupArtwork,
    quality: PREVIEW_QUALITY,
    garmentSize: input.size,
    pipelineContext: input.pipelineContext,
  });

  return {
    productCode: ctx.productCode,
    color: ctx.color,
    side: input.side,
    artworkUrl,
    productUrl,
    artworkFileName: buildArtworkFileName(),
    productFileName: buildProductExportFileName(
      ctx.productCode,
      input.side,
      ctx.color,
    ),
  };
}

export async function downloadArtworkExport(
  input: ProductExportInput,
): Promise<void> {
  const artwork = await exportArtworkPng(input, DOWNLOAD_QUALITY);
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

/** All registry colors for the active product (front/back per profile). */
export async function buildSupportedProductVariants(
  input: Omit<ProductExportInput, "shirtColor">,
): Promise<Array<{ color: string; fileName: string; blob: Blob }>> {
  const ctx = await resolveExportContext(
    { ...input, shirtColor: "white" },
    DOWNLOAD_QUALITY,
  );
  const mockupArtwork = await exportPrintAreaArtworkForMockup(
    { ...input, shirtColor: "white" },
    DOWNLOAD_QUALITY,
    ctx.pixelScale,
  );
  const profile = await getProductProfile(ctx.productCode);
  const colors = profile.availableColors.map((item) => item.slug);
  const variants: Array<{ color: string; fileName: string; blob: Blob }> = [];

  for (const color of colors) {
    const blob = await renderProductMockupPngFromArtwork({
      productCode: ctx.productCode,
      color,
      side: input.side,
      artworkBlob: mockupArtwork,
      quality: DOWNLOAD_QUALITY,
      garmentSize: input.size,
      pipelineContext: input.pipelineContext,
    });
    variants.push({
      color,
      fileName: buildProductExportFileName(ctx.productCode, input.side, color),
      blob,
    });
  }

  return variants;
}
