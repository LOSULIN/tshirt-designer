"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import {
  debugLayerRenderScale,
  getLayerEffectiveCmRect,
  type PrintAreaCmBounds,
} from "@/lib/design-cm";
import {
  areLayerPreviewContentPropsEqual,
  imageLayerPreviewVisualEqual,
  shapeLayerPreviewVisualEqual,
  textLayerPreviewVisualEqual,
  type LayerPreviewContentProps,
} from "@/lib/designer/layer-preview-memo";
import { getArtworkPreviewDomStyle } from "@/lib/image-artwork-render";
import { getRichTextDomStyle } from "@/lib/text-style";
import type {
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "@/lib/types";

const IMAGE_PREVIEW_CLASS = "h-full w-full select-none object-contain";
const TEXT_WRAPPER_CLASS = "block h-full w-full select-none px-1";
const SHAPE_SVG_CLASS = "h-full w-full overflow-visible";

const ImageLayerPreview = memo(
  function ImageLayerPreview({ layer }: { layer: ImageDesignLayer }) {
    const artworkStyle = useMemo(
      () => getArtworkPreviewDomStyle(layer.image),
      [layer.image],
    );

    if (artworkStyle) {
      return (
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={layer.image.previewUrl}
            alt={layer.name}
            draggable={false}
            className="select-none"
            style={artworkStyle}
          />
        </div>
      );
    }

    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={layer.image.previewUrl}
        alt={layer.name}
        draggable={false}
        className={IMAGE_PREVIEW_CLASS}
      />
    );
  },
  (prev, next) =>
    prev.layer === next.layer ||
    imageLayerPreviewVisualEqual(prev.layer, next.layer),
);

const ShapeLayerPreview = memo(
  function ShapeLayerPreview({ layer }: { layer: ShapeDesignLayer }) {
    const strokeWidth = useMemo(
      () =>
        layer.strokeWidth_cm > 0
          ? `${(layer.strokeWidth_cm / Math.max(layer.width_cm, 0.01)) * 100}%`
          : "0",
      [layer.strokeWidth_cm, layer.width_cm],
    );
    const shapeSvgStyle = useMemo(() => ({}), []);

    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={SHAPE_SVG_CLASS}
        style={shapeSvgStyle}
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
  },
  (prev, next) =>
    prev.layer === next.layer ||
    shapeLayerPreviewVisualEqual(prev.layer, next.layer),
);

const TextLayerPreview = memo(
  function TextLayerPreview({
    layer,
    printArea,
  }: {
    layer: TextDesignLayer;
    printArea: PrintAreaCmBounds;
  }) {
    const rect = getLayerEffectiveCmRect(layer);
    const debugLogged = useRef(false);
    useEffect(() => {
      if (debugLogged.current || process.env.NODE_ENV !== "development") return;
      debugLogged.current = true;
      debugLayerRenderScale(rect.width_cm);
    }, [rect.width_cm]);

    const textStyle = useMemo(
      () => getRichTextDomStyle(layer, printArea.height),
      [
        layer.text,
        layer.fontSize_cm,
        layer.fontFamily,
        layer.color,
        layer.opacity,
        layer.fontWeight,
        layer.fontStyle,
        layer.letterSpacing_cm,
        layer.lineHeight,
        layer.textAlign,
        layer.width_cm,
        layer.scale,
        layer.stroke,
        layer.shadow,
        printArea.height,
      ],
    );

    if (!layer.text) {
      return <span className="opacity-0"> </span>;
    }

    return (
      <span className={TEXT_WRAPPER_CLASS} style={textStyle}>
        {layer.text}
      </span>
    );
  },
  (prev, next) =>
    (prev.layer === next.layer && prev.printArea.height === next.printArea.height) ||
    (prev.printArea.height === next.printArea.height &&
      textLayerPreviewVisualEqual(prev.layer, next.layer)),
);

function LayerPreviewContentInner({
  layer,
  printArea,
}: LayerPreviewContentProps) {
  if (layer.type === "image") {
    return <ImageLayerPreview layer={layer} />;
  }

  if (layer.type === "shape") {
    return <ShapeLayerPreview layer={layer} />;
  }

  return <TextLayerPreview layer={layer} printArea={printArea} />;
}

export type { LayerPreviewContentProps } from "@/lib/designer/layer-preview-memo";

export const LayerPreviewContent = memo(
  LayerPreviewContentInner,
  areLayerPreviewContentPropsEqual,
);
