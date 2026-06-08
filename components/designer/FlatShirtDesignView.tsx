"use client";

import { useState } from "react";
import {
  FLAT_SHIRT_PRINT_AREA,
  FLAT_SHIRT_TEMPLATES,
  getShirtColorHex,
  PRINT_AREA,
  type ShirtColor,
  type Side,
} from "@/lib/constants";
import { getScaledSize } from "@/lib/geometry";
import { sortLayersByZIndex } from "@/lib/layers";
import { resolveFontFamily } from "@/lib/text-layer";
import type { DesignLayer } from "@/lib/types";

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
        <ellipse cx="200" cy="74" rx="40" ry="20" fill={rib} />
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
          M 74 112
          C 74 90 98 74 132 66
          L 168 58
          C 186 54 214 54 232 58
          L 268 66
          C 302 74 326 90 326 112
          L 354 125
          L 382 141
          L 382 166
          L 354 179
          L 354 398
          C 354 416 278 426 200 426
          C 122 426 46 416 46 398
          L 46 179
          L 18 166
          L 18 141
          L 46 125
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
  textScale = 1,
}: {
  layer: DesignLayer;
  textScale?: number;
}) {
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
              fontSize: `${layer.fontSize * layer.scale * textScale}px`,
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

/** 平面衣服設計預覽（無模特；可替換為素材 PNG） */
export function FlatShirtDesignView({
  side,
  shirtColor,
  layers,
  className = "",
  textScale = 1,
}: {
  side: Side;
  shirtColor: ShirtColor;
  layers: DesignLayer[];
  className?: string;
  textScale?: number;
}) {
  const assetSrc = FLAT_SHIRT_TEMPLATES[side];
  const [assetFailed, setAssetFailed] = useState(false);
  const useAsset = assetSrc != null && !assetFailed;

  const fill = getShirtColorHex(shirtColor);
  const isLight =
    shirtColor === "white" ||
    shirtColor === "light-gray" ||
    shirtColor === "beige" ||
    shirtColor === "pink" ||
    shirtColor === "lavender" ||
    shirtColor === "light-blue" ||
    shirtColor === "green";
  const stroke = isLight ? "#d4d4d8" : shadeHex(fill, -30);
  const rib = isLight ? "#e4e4e7" : shadeHex(fill, -18);

  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);
  const printBox = FLAT_SHIRT_PRINT_AREA[side];

  return (
    <div
      className={`relative w-full overflow-hidden bg-zinc-100 ${className}`}
      style={{ aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
    >
      <div className="absolute inset-0 p-3">
        {useAsset ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={assetSrc}
            alt={side === "front" ? "平面衣服正面" : "平面衣服背面"}
            className="h-full w-full object-contain"
            onError={() => setAssetFailed(true)}
          />
        ) : (
          <FlatShirtSvg side={side} fill={fill} stroke={stroke} rib={rib} />
        )}
      </div>
      <div
        className="absolute overflow-hidden"
        style={{
          left: printBox.left,
          top: printBox.top,
          width: printBox.width,
          aspectRatio: `${PRINT_AREA.width} / ${PRINT_AREA.height}`,
        }}
      >
        {visibleLayers.map((layer) => (
          <StaticDesignLayer
            key={layer.id}
            layer={layer}
            textScale={textScale}
          />
        ))}
      </div>
    </div>
  );
}
