"use client";

import { getGarmentVisualRenderScale } from "@/lib/garment-visual-profile";
import { debugGarmentScale } from "@/lib/shirtScale";
import type { ApparelSize } from "@/lib/sizes";
import { useEffect, type CSSProperties, type ReactNode } from "react";

/**
 * 僅縮放 shirt 視覺（模板圖／SVG）；print area 與 design layer 置於外層，不受影響。
 */
export function ShirtVisualScale({
  size = "M",
  children,
  className = "absolute inset-0",
  style,
}: {
  size?: ApparelSize | string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const garmentScale = getGarmentVisualRenderScale(size);
  const transform = `scale(${garmentScale})`;

  useEffect(() => {
    debugGarmentScale(size);
  }, [size]);

  return (
    <div
      data-shirt-visual
      data-shirt-scale={transform}
      className={className}
      style={{
        transform,
        transformOrigin: "center center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
