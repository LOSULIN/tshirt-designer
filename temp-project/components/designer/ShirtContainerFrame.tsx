"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  getShirtContainerAspectRatio,
  getShirtContainerWidthOverHeight,
} from "@/lib/printArea";
import { SHIRT_PREVIEW_BACKGROUND } from "@/lib/preview-background";
import { ShirtPreviewStack } from "./ShirtPreviewStack";

/**
 * 固定尺寸外框 + `data-shirt-container`。
 * 不接受 size。shirt 視覺縮放請用 ShirtVisualScale；print area 置於外層不受 scale 影響。
 */
export function ShirtContainerFrame({
  children,
  className = "",
  fitRatio,
  width,
  zoom = 1,
  canvasRoot = false,
  onPointerDown,
}: {
  children: ReactNode;
  className?: string;
  /** 設計器主畫布：限制在 viewport 內的縮放比例 */
  fitRatio?: number;
  /** 自訂寬度（例如預覽面板 max-w-md 內 100%） */
  width?: string;
  zoom?: number;
  canvasRoot?: boolean;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
}) {
  const aspect = getShirtContainerAspectRatio();
  const widthOverHeight = getShirtContainerWidthOverHeight();

  let sizeStyle: CSSProperties = { aspectRatio: aspect };
  if (fitRatio != null) {
    sizeStyle = {
      aspectRatio: aspect,
      width: `min(calc(100cqw * ${fitRatio}), calc(100cqh * ${widthOverHeight} * ${fitRatio}))`,
      transform: zoom !== 1 ? `scale(${zoom})` : undefined,
      transformOrigin: zoom !== 1 ? "center center" : undefined,
    };
  } else if (width) {
    sizeStyle = {
      aspectRatio: aspect,
      width,
      transform: zoom !== 1 ? `scale(${zoom})` : undefined,
      transformOrigin: zoom !== 1 ? "top center" : undefined,
    };
  }

  return (
    <div
      {...(canvasRoot ? { "data-canvas-root": true } : {})}
      className={`relative shrink-0 ${className}`}
      style={sizeStyle}
      onPointerDown={onPointerDown}
    >
      <div data-shirt-container className="absolute inset-0">
        <ShirtPreviewStack
          className="absolute inset-0"
          backgroundColor={SHIRT_PREVIEW_BACKGROUND}
        >
          {children}
        </ShirtPreviewStack>
      </div>
    </div>
  );
}
