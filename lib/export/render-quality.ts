/**
 * Product Export render quality — preview vs export only.
 * Used by Product Export pipeline; not exposed to Designer runtime.
 */

export type RenderQuality = "preview" | "export";

export type ProductAssetVariant = "preview" | "export";

export function renderQualityToAssetVariant(
  quality: RenderQuality,
): ProductAssetVariant {
  return quality === "export" ? "export" : "preview";
}

export function isExportRenderQuality(quality: RenderQuality): boolean {
  return quality === "export";
}
