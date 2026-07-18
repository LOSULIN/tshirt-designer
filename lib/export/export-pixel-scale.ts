import { loadAsset } from "@/lib/render/asset-loader";
import { fetchProductProfile } from "@/lib/products/product-loader";
import type { RenderQuality } from "./render-quality";
import { isExportRenderQuality } from "./render-quality";

/**
 * Pixel scale for export-quality re-render (derived from garment asset vs reference size).
 * Not hardcoded — supports 2×, 4×, etc. as export assets grow.
 */
export async function resolveProductExportPixelScale(
  productCode: string,
  side: "front" | "back",
  color: string,
  quality: RenderQuality,
): Promise<number> {
  if (!isExportRenderQuality(quality)) return 1;

  const asset = await loadAsset(productCode, color, side, { quality: "export" });
  return Math.max(1, asset.calibrationScale);
}

export async function resolveProductExportPixelScaleFromProfile(
  productCode: string,
  quality: RenderQuality,
): Promise<number> {
  if (!isExportRenderQuality(quality)) return 1;

  const profile = await fetchProductProfile(productCode);
  const sample = profile.previewAssets[0];
  if (!sample) return 1;

  return resolveProductExportPixelScale(
    productCode,
    sample.side,
    sample.color,
    quality,
  );
}
