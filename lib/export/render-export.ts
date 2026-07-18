import {
  loadArtworkFromBlob,
} from "@/components/render/RenderEngine";
import {
  renderProductMockupOnProduct,
} from "@/components/render/ProductMockupEngine";
import type { ProductSideSlug } from "@/lib/products/product-types";
import type { GarmentColorSlug, ProductSide } from "@/lib/render/render-types";
import type { RenderQuality } from "./render-quality";

export async function artworkBlobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const image = await loadArtworkFromBlob(blob);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立 Artwork canvas");
  ctx.drawImage(image, 0, 0);
  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG 編碼失敗"));
      },
      "image/png",
    );
  });
}

export interface RenderProductExportInput {
  productCode: string;
  color: GarmentColorSlug;
  side: ProductSide | ProductSideSlug;
  artworkBlob: Blob;
  quality?: RenderQuality;
}

export async function renderProductPngFromArtwork(
  input: RenderProductExportInput,
): Promise<Blob> {
  const artworkCanvas = await artworkBlobToCanvas(input.artworkBlob);
  const result = await renderProductMockupOnProduct({
    productCode: input.productCode,
    color: input.color,
    side: input.side as ProductSide,
    artwork: artworkCanvas,
    artworkWidth: artworkCanvas.width,
    artworkHeight: artworkCanvas.height,
    quality: input.quality ?? "export",
  });
  return canvasToPngBlob(result.canvas);
}

export async function renderProductPreviewFromArtwork(
  input: RenderProductExportInput,
): Promise<string> {
  const artworkCanvas = await artworkBlobToCanvas(input.artworkBlob);
  const result = await renderProductMockupOnProduct({
    productCode: input.productCode,
    color: input.color,
    side: input.side as ProductSide,
    artwork: artworkCanvas,
    artworkWidth: artworkCanvas.width,
    artworkHeight: artworkCanvas.height,
    quality: input.quality ?? "preview",
  });
  return result.dataUrl;
}
