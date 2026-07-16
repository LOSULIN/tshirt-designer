"use client";

import { useEffect, useRef } from "react";
import type { RenderResult } from "@/lib/render/render-types";

export interface RenderCanvasProps {
  result: RenderResult | null;
  className?: string;
  alt?: string;
}

/**
 * Displays a Render Engine result on a canvas element.
 */
export function RenderCanvas({
  result,
  className,
  alt = "Rendered product mockup",
}: RenderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;

    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, result.width, result.height);
    ctx.drawImage(result.canvas, 0, 0);
  }, [result]);

  if (!result) {
    return (
      <div
        className={className}
        role="img"
        aria-label={alt}
        data-render-canvas-empty
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={result.width}
      height={result.height}
      aria-label={alt}
      data-render-canvas
    />
  );
}
