"use client";

import { getShirtScaleTransform } from "@/lib/shirtScale";
import type { ApparelSize } from "@/lib/sizes";
import { toApparelSize } from "@/lib/sizes";
import type { CSSProperties, ReactNode } from "react";

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
  const apparelSize = toApparelSize(size);

  return (
    <div
      data-shirt-visual
      data-shirt-scale={getShirtScaleTransform(apparelSize)}
      className={className}
      style={{
        transform: getShirtScaleTransform(apparelSize),
        transformOrigin: "center center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
