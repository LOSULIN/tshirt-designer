"use client";

import type { ShapeDesignLayer } from "@/lib/types";

export function ShapeLayerContent({ layer }: { layer: ShapeDesignLayer }) {
  const strokeWidth =
    layer.strokeWidth_cm > 0
      ? `${(layer.strokeWidth_cm / Math.max(layer.width_cm, 0.01)) * 100}%`
      : "0";

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
      aria-hidden
    >
      {layer.shapeKind === "rectangle" && (
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill={layer.fill}
          stroke={layer.stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          opacity={layer.opacity}
        />
      )}
      {layer.shapeKind === "circle" && (
        <ellipse
          cx="50"
          cy="50"
          rx="50"
          ry="50"
          fill={layer.fill}
          stroke={layer.stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          opacity={layer.opacity}
        />
      )}
      {layer.shapeKind === "line" && (
        <line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke={layer.stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          opacity={layer.opacity}
          strokeLinecap="round"
        />
      )}
      {layer.shapeKind === "arrow" && (
        <>
          <line
            x1="0"
            y1="50"
            x2="78"
            y2="50"
            stroke={layer.stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
            opacity={layer.opacity}
            strokeLinecap="round"
          />
          <polygon
            points="100,50 78,35 78,65"
            fill={layer.fill === "transparent" ? layer.stroke : layer.fill}
            stroke={layer.stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
            opacity={layer.opacity}
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
