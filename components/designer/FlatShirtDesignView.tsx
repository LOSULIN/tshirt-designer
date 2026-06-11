"use client";

import { useEffect, useState } from "react";
import {
  getAdultTshirtTemplateSrc,
  getShirtColorHex,
  isLightShirtColor,
  type Gender,
  type ShirtColor,
  type Side,
  type Size,
} from "@/lib/constants";
import {
  getLayerEffectiveCmRect,
  getPrintAreaCmBounds,
  type PrintAreaCmBounds,
} from "@/lib/design-cm";
import {
  DEFAULT_PRINT_MODE,
  getPrintAreaContainerStyle,
  resolvePreviewPrintPositionMode,
  type PreviewPrintPositionMode,
} from "@/lib/printArea";
import { sortLayersByZIndex } from "@/lib/layers";
import type { DesignLayer } from "@/lib/types";
import { LayerPreviewContent } from "./LayerPreviewContent";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import { ShirtVisualScale } from "./ShirtVisualScale";

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 460;

function shadeHex(hex: string, amount: number): string {
  const normalized = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) =>
    parseInt(normalized.slice(i, i + 2), 16),
  );
  const shaded = channels.map((c) =>
    Math.max(0, Math.min(255, Math.round(c + amount))),
  );
  return `#${shaded.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function FlatShirtSvg({
  side,
  fill,
  stroke,
  rib,
}: {
  side: Side;
  fill: string;
  stroke: string;
  rib: string;
}) {
  if (side === "front") {
    return (
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-full w-full"
        aria-hidden
      >
        <path
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinejoin="round"
          d="
            M 74 118
            C 74 94 98 76 132 66
            L 168 56
            C 186 50 214 50 232 56
            L 268 66
            C 302 76 326 94 326 118
            L 354 131
            L 382 147
            L 382 172
            L 354 185
            L 354 398
            C 354 416 278 426 200 426
            C 122 426 46 416 46 398
            L 46 185
            L 18 172
            L 18 147
            L 46 131
            Z
          "
        />
        <path
          d="M 158 64 Q 200 82 242 64"
          stroke={rib}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="h-full w-full"
      aria-hidden
    >
      <path
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="
          M 74 118
          C 74 94 98 76 132 66
          L 168 56
          C 186 50 214 50 232 56
          L 268 66
          C 302 76 326 94 326 118
          L 354 131
          L 382 147
          L 382 172
          L 354 185
          L 354 398
          C 354 416 278 426 200 426
          C 122 426 46 416 46 398
          L 46 185
          L 18 172
          L 18 147
          L 46 131
          Z
        "
      />
      <path
        d="M 158 64 Q 200 82 242 64"
        stroke={rib}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StaticDesignLayer({
  layer,
  printArea,
}: {
  layer: DesignLayer;
  printArea: PrintAreaCmBounds;
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
        <LayerPreviewContent layer={layer} printArea={printArea} />
      </div>
    </div>
  );
}

/** 平面衣服設計預覽（無模特；可替換為素材 PNG） */
export function FlatShirtDesignView({
  gender: _gender,
  side,
  shirtColor,
  size = "M",
  layers,
  previewPrintPositionMode = DEFAULT_PRINT_MODE,
  className = "",
  compact = false,
}: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size?: Size;
  layers: DesignLayer[];
  previewPrintPositionMode?: PreviewPrintPositionMode;
  className?: string;
  /** 右側預覽欄：限制在可用高度內 */
  compact?: boolean;
}) {
  const assetSrc = getAdultTshirtTemplateSrc(shirtColor, side);
  const [assetFailed, setAssetFailed] = useState(false);
  const useAsset = !assetFailed;

  useEffect(() => {
    setAssetFailed(false);
  }, [assetSrc]);

  const fill = getShirtColorHex(shirtColor);
  const isLight = isLightShirtColor(shirtColor);
  const stroke = isLight ? "#d4d4d8" : shadeHex(fill, -30);
  const rib = isLight ? "#e4e4e7" : shadeHex(fill, -18);

  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);
  const printArea = getPrintAreaCmBounds();
  const printAreaStyle = getPrintAreaContainerStyle(side, {
    mode: resolvePreviewPrintPositionMode(previewPrintPositionMode),
    size,
  });

  return (
    <div
      className={`relative overflow-hidden bg-zinc-100 ${
        compact
          ? "@container flex h-full w-full items-center justify-center"
          : "w-full"
      } ${className}`}
    >
      <ShirtContainerFrame
        width={compact ? undefined : "100%"}
        fitRatio={compact ? 0.95 : undefined}
      >
        <ShirtVisualScale size={size}>
          {useAsset ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={assetSrc}
              alt={side === "front" ? "T 恤正面" : "T 恤背面"}
              className="absolute inset-0 z-0 h-full w-full object-contain"
              onError={() => setAssetFailed(true)}
            />
          ) : (
            <FlatShirtSvg side={side} fill={fill} stroke={stroke} rib={rib} />
          )}
        </ShirtVisualScale>
        <div
          data-print-area
          className="absolute z-10 overflow-hidden [container-type:size]"
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
    </div>
  );
}
