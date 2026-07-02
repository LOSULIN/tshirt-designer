"use client";

import { getGarmentVisualRenderScale } from "@/lib/garment-visual-profile";
import { debugGarmentScale } from "@/lib/shirtScale";
import type { ApparelSize } from "@/lib/sizes";
import { useEffect, type CSSProperties, type ReactNode } from "react";

/**
 * 縮放 shirt 模板與 Factory Overlay（設計器 Blue／圖層與模板同源 scale）。
 * Flat Preview / Mockup 若 print area 置於外層則不受影響。
 */
export function ShirtVisualScale({
  size = "M",
  children,
  className = "absolute inset-0",
  style,
  transformOrigin = "center center",
}: {
  size?: ApparelSize | string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 預設 center；主畫布可設為 print-top 以固定 Blue 上緣 */
  transformOrigin?: string;
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
        transformOrigin,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
