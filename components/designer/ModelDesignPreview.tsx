"use client";

import { getAdultTshirtTemplateSrc, type ShirtColor } from "@/lib/constants";
import {
  getLayerEffectiveCmRect,
  getPrintAreaCmBounds,
} from "@/lib/design-cm";
import { getPrintAreaContainerStyle } from "@/lib/printArea";
import type { Gender, Side, Size } from "@/lib/constants";
import { sortLayersByZIndex } from "@/lib/layers";
import { resolveFontFamily } from "@/lib/text-layer";
import type { DesignLayer } from "@/lib/types";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import { ShirtVisualScale } from "./ShirtVisualScale";
import { TemplateImage } from "./TemplateImage";

function StaticDesignLayer({
  layer,
  printArea,
}: {
  layer: DesignLayer;
  printArea: ReturnType<typeof getPrintAreaCmBounds>;
}) {
  const rect = getLayerEffectiveCmRect(layer);

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${(rect.x_cm / printArea.width) * 100}%`,
        top: `${(rect.y_cm / printArea.height) * 100}%`,
        width: `${(rect.width_cm / printArea.width) * 100}%`,
        height: `${(rect.height_cm / printArea.height) * 100}%`,
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
              fontSize: `calc(${(layer.fontSize_cm * layer.scale) / printArea.height} * 100cqh)`,
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
  shirtColor,
  size = "M",
  layers,
  zoom = 1,
  fitRatio,
}: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size?: Size;
  layers: DesignLayer[];
  zoom?: number;
  fitRatio?: number;
}) {
  const templateSrc = getAdultTshirtTemplateSrc(shirtColor, side);
  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);
  const printArea = getPrintAreaCmBounds();
  const printAreaStyle = getPrintAreaContainerStyle(side);

  return (
    <ShirtContainerFrame
      className={
        fitRatio != null ? "transition-transform duration-200" : "w-full"
      }
      fitRatio={fitRatio}
      width={fitRatio == null ? "100%" : undefined}
      zoom={zoom}
    >
      <ShirtVisualScale size={size}>
        <TemplateImage
          gender={gender}
          side={side}
          src={templateSrc}
          alt={side === "front" ? "正面模特呈現" : "背面模特呈現"}
          className="absolute inset-0 z-0 h-full w-full object-contain"
          showPlaceholderGuide={false}
        />
      </ShirtVisualScale>
      <div
        data-print-area
        className="absolute overflow-hidden [container-type:size]"
        style={printAreaStyle}
      >
        {visibleLayers.map((layer) => (
          <StaticDesignLayer
            key={layer.id}
            layer={layer}
            printArea={printArea}
          />
        ))}
      </div>
    </ShirtContainerFrame>
  );
}
