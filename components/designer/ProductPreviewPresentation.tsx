"use client";

import type { Size } from "@/lib/constants";
import { resolveGarmentStageStyles } from "@/lib/presentation/product-preview-camera";

export interface ProductPreviewPresentationProps {
  productUrl: string;
  size: Size;
  alt?: string;
}

/**
 * Garment Stage → Garment Frame → Garment Viewport → Mockup PNG.
 * Silhouette framing only; export / artwork / mockup engine unchanged.
 */
export function ProductPreviewPresentation({
  productUrl,
  size,
  alt = "商品預覽圖",
}: ProductPreviewPresentationProps) {
  const styles = resolveGarmentStageStyles(size);

  return (
    <div
      className="garment-stage flex w-full justify-center"
      data-presentation-size={size}
      data-presentation-engine="garment-silhouette-v1"
    >
      <div className="garment-frame" style={styles.frameStyle}>
        <div className="garment-viewport" style={styles.viewportStyle}>
          <img
            src={productUrl}
            alt={alt}
            className="garment-mockup"
            style={styles.imageStyle}
          />
        </div>
      </div>
    </div>
  );
}
