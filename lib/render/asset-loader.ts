import {
  fetchProductCalibrationFile,
  resolveRegistryGarmentAssetUrl,
} from "@/lib/products/product-loader";
import type {
  GarmentColorSlug,
  ProductSide,
  RenderAsset,
} from "./render-types";

async function loadImage(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load image: ${url} (${response.status})`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to decode image: ${url}`));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function naturalSize(source: CanvasImageSource): {
  width: number;
  height: number;
} {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth,
      height: source.naturalHeight,
    };
  }
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return { width: source.width, height: source.height };
  }
  if (
    typeof OffscreenCanvas !== "undefined" &&
    source instanceof OffscreenCanvas
  ) {
    return { width: source.width, height: source.height };
  }
  return { width: 0, height: 0 };
}

async function assetImagePath(
  productCode: string,
  color: GarmentColorSlug,
  side: ProductSide,
): Promise<string> {
  return resolveRegistryGarmentAssetUrl(productCode, side, color);
}

/**
 * Load garment asset image + calibration for a product variant.
 * Asset paths resolved via Product Registry previewAssets.
 *
 * @example loadAsset("UA35001", "black", "front")
 */
export async function loadAsset(
  productCode: string,
  color: GarmentColorSlug,
  side: ProductSide,
): Promise<RenderAsset> {
  const imageUrl = await assetImagePath(productCode, color, side);
  const [image, calibration] = await Promise.all([
    loadImage(imageUrl),
    fetchProductCalibrationFile(productCode),
  ]);
  const { width, height } = naturalSize(image);

  return {
    productCode,
    color,
    side,
    imageUrl,
    image,
    naturalWidth: width,
    naturalHeight: height,
    calibration,
  };
}

export { assetImagePath };
