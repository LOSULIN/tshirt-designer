import {
  fetchMockupVisualCompensationFile,
  fetchProductCalibrationFile,
  fetchProductProfile,
  resolveRegistryGarmentAssetUrl,
} from "@/lib/products/product-loader";
import {
  renderQualityToAssetVariant,
  type RenderQuality,
} from "@/lib/export/render-quality";
import {
  resolveCalibrationScaleFromAssetSize,
  scaleProductCalibration,
} from "./calibration-scale";
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

export interface LoadAssetOptions {
  quality?: RenderQuality;
}

/**
 * Load garment asset image + calibration for a product variant.
 * Preview uses preview assets; export uses export assets with scaled calibration.
 */
export async function loadAsset(
  productCode: string,
  color: GarmentColorSlug,
  side: ProductSide,
  options?: LoadAssetOptions,
): Promise<RenderAsset> {
  const quality = options?.quality ?? "preview";
  const variant = renderQualityToAssetVariant(quality);
  const imageUrl = await resolveRegistryGarmentAssetUrl(
    productCode,
    side,
    color,
    variant,
  );
  const profile = await fetchProductProfile(productCode);
  const [image, calibration, visualCompensation] = await Promise.all([
    loadImage(imageUrl),
    fetchProductCalibrationFile(productCode),
    fetchMockupVisualCompensationFile(productCode),
  ]);
  const { width, height } = naturalSize(image);
  const reference = profile.assetReferenceSize;
  const calibrationScale =
    quality === "export"
      ? resolveCalibrationScaleFromAssetSize(
          width,
          height,
          reference?.width,
          reference?.height,
        )
      : 1;

  return {
    productCode,
    color,
    side,
    imageUrl,
    image,
    naturalWidth: width,
    naturalHeight: height,
    calibration: scaleProductCalibration(calibration, calibrationScale),
    calibrationScale,
    mockupVisualScale: visualCompensation.mockupVisualScale,
  };
}

export async function assetImagePath(
  productCode: string,
  color: GarmentColorSlug,
  side: ProductSide,
  quality: RenderQuality = "preview",
): Promise<string> {
  return resolveRegistryGarmentAssetUrl(
    productCode,
    side,
    color,
    renderQualityToAssetVariant(quality),
  );
}
