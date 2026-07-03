"use client";

import { getPreviewGarmentVisualScale } from "@/lib/preview-runtime";
import type { CSSProperties, ReactNode } from "react";

/**
 * Preview-only garment silhouette wrapper.
 * Keeps shirt PNG at a fixed visual height for every size; artwork scales inside print area.
 */
export function PreviewGarmentVisual({
  children,
  className = "absolute inset-0",
  style,
  transformOrigin = "center center",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  transformOrigin?: string;
}) {
  const garmentScale = getPreviewGarmentVisualScale();
  const transform = `scale(${garmentScale})`;

  return (
    <div
      data-preview-garment-visual
      data-shirt-scale={transform}
      className={className}
      style={{
        transform,
        transformOrigin,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
