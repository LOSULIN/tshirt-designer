"use client";

import type { CSSProperties, ReactNode } from "react";
import { SHIRT_PREVIEW_BACKGROUND } from "@/lib/preview-background";

/**
 * 預覽分層容器：
 * background → mockup PNG → design artwork → guides
 */
export function ShirtPreviewStack({
  children,
  className = "",
  style,
  backgroundColor = SHIRT_PREVIEW_BACKGROUND,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  backgroundColor?: string;
}) {
  return (
    <div
      data-shirt-preview-stack
      className={className || "relative"}
      style={style}
    >
      <div
        data-shirt-preview-background
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor }}
        aria-hidden
      />
      {children}
    </div>
  );
}
