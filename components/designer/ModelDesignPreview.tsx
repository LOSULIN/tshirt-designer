"use client";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PRINT_AREA,
  TEMPLATES,
} from "@/lib/constants";
import type { Gender, Side } from "@/lib/constants";
import { getScaledSize } from "@/lib/geometry";
import { sortLayersByZIndex } from "@/lib/layers";
import { resolveFontFamily } from "@/lib/text-layer";
import type { DesignLayer } from "@/lib/types";
import { TemplateImage } from "./TemplateImage";

const CANVAS_ASPECT = CANVAS_WIDTH / CANVAS_HEIGHT;

function StaticDesignLayer({ layer }: { layer: DesignLayer }) {
  const scale = layer.type === "image" ? layer.scale : layer.scale;
  const scaled = getScaledSize(layer.width, layer.height, scale);

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${(layer.x / PRINT_AREA.width) * 100}%`,
        top: `${(layer.y / PRINT_AREA.height) * 100}%`,
        width: `${(scaled.width / PRINT_AREA.width) * 100}%`,
        height: `${(scaled.height / PRINT_AREA.height) * 100}%`,
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          transform: `rotate(${layer.rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        {layer.type === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={layer.image.previewUrl}
            alt={layer.name}
            draggable={false}
            className="h-full w-full select-none object-contain"
          />
        ) : (
          <span
            className="whitespace-pre px-1 text-center leading-none select-none"
            style={{
              fontFamily: resolveFontFamily(layer.fontFamily),
              fontSize: `${layer.fontSize * layer.scale}px`,
              fontWeight: layer.fontWeight,
              color: layer.color,
              opacity: layer.opacity,
            }}
          >
            {layer.text || " "}
          </span>
        )}
      </div>
    </div>
  );
}

/** 模特上的設計呈現（無設計區框線、格線與控制項） */
export function ModelDesignPreview({
  gender,
  side,
  layers,
  zoom = 1,
  fitRatio,
}: {
  gender: Gender;
  side: Side;
  layers: DesignLayer[];
  zoom?: number;
  fitRatio?: number;
}) {
  const templateSrc = TEMPLATES[gender][side];
  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);

  const printAreaStyle = {
    left: `${(PRINT_AREA.x / CANVAS_WIDTH) * 100}%`,
    top: `${(PRINT_AREA.y / CANVAS_HEIGHT) * 100}%`,
    width: `${(PRINT_AREA.width / CANVAS_WIDTH) * 100}%`,
    height: `${(PRINT_AREA.height / CANVAS_HEIGHT) * 100}%`,
  };

  const sizeStyle =
    fitRatio != null
      ? {
          width: `min(calc(100cqw * ${fitRatio}), calc(100cqh * ${CANVAS_ASPECT} * ${fitRatio}))`,
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }
      : { width: "100%" };

  return (
    <div
      className={`relative ${fitRatio != null ? "shrink-0 transition-transform duration-200" : "w-full"}`}
      style={{
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        ...sizeStyle,
      }}
    >
      <TemplateImage
        gender={gender}
        side={side}
        src={templateSrc}
        alt={side === "front" ? "正面模特呈現" : "背面模特呈現"}
        className="absolute inset-0 h-full w-full object-contain"
        showPlaceholderGuide={false}
      />
      <div className="absolute overflow-hidden" style={printAreaStyle}>
        {visibleLayers.map((layer) => (
          <StaticDesignLayer key={layer.id} layer={layer} />
        ))}
      </div>
    </div>
  );
}
