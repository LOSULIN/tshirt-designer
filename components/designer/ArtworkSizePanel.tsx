"use client";

import { getArtworkPixelSize } from "@/lib/image-bounds";
import { getLayerEffectiveCmRect } from "@/lib/design-cm";
import { getTextLayerPlacementCmRect } from "@/lib/text-layer";
import {
  workspaceRectToDesignerRect,
  type DesignerCoordinateContext,
} from "@/lib/designer-coordinate-facade";
import type { DesignLayer, ImageDesignLayer } from "@/lib/types";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { PrintReadyPanel } from "./PrintReadyPanel";
import { ArtworkSizeIntegerInput, clampArtworkSizeCm } from "./ArtworkSizeIntegerInput";

const ArtworkSizeCoordinateContext =
  createContext<DesignerCoordinateContext | null>(null);

export function ArtworkSizeCoordinateProvider({
  ctx,
  children,
}: {
  ctx: DesignerCoordinateContext;
  children: ReactNode;
}) {
  return (
    <ArtworkSizeCoordinateContext.Provider value={ctx}>
      {children}
    </ArtworkSizeCoordinateContext.Provider>
  );
}

function useArtworkSizeCoordinate(): DesignerCoordinateContext {
  const ctx = useContext(ArtworkSizeCoordinateContext);
  if (!ctx) {
    throw new Error(
      "ArtworkSizePanel must be used within ArtworkSizeCoordinateProvider",
    );
  }
  return ctx;
}

/** Designer（Garment）空間可視印刷尺寸，與畫布 Render 投影一致。 */
function getArtworkWorkspaceSizeRect(layer: DesignLayer) {
  if (layer.type === "text") {
    return getTextLayerPlacementCmRect(layer);
  }
  return getLayerEffectiveCmRect(layer);
}

export function getArtworkDesignerSizeCm(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
): { width_cm: number; height_cm: number } {
  const workspaceRect = getArtworkWorkspaceSizeRect(layer);
  return workspaceRectToDesignerRect(workspaceRect, ctx);
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="text-right font-mono tabular-nums text-zinc-900">{value}</span>
    </div>
  );
}

function SizeFieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px]">
      <span className="w-12 shrink-0 text-zinc-600">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
      <span className="shrink-0 text-zinc-400">cm</span>
    </label>
  );
}

function formatCurrentSizeCm(width_cm: number, height_cm: number): string {
  return `${clampArtworkSizeCm(width_cm)} × ${clampArtworkSizeCm(height_cm)} cm`;
}

export function ArtworkSizePanel({
  layer,
  disabled = false,
  boostingResolution = false,
  onPatch,
  onBoostResolution,
}: {
  layer: DesignLayer;
  disabled?: boolean;
  boostingResolution?: boolean;
  /** Designer（Garment）空間 cm；由 DesignerApp 經 Coordinate Runtime 寫回 Workspace */
  onPatch: (patch: { width_cm?: number; height_cm?: number }) => void;
  onBoostResolution?: (layer: ImageDesignLayer) => void | Promise<void>;
}) {
  const coordinateContext = useArtworkSizeCoordinate();

  const designerSize = useMemo(
    () => getArtworkDesignerSizeCm(layer, coordinateContext),
    [layer, coordinateContext],
  );

  if (layer.type !== "image" && layer.type !== "text" && layer.type !== "shape") {
    return null;
  }

  const widthCm = clampArtworkSizeCm(designerSize.width_cm);
  const heightCm = clampArtworkSizeCm(designerSize.height_cm);
  const pixelSize =
    layer.type === "image"
      ? getArtworkPixelSize(layer.image)
      : null;

  return (
    <section
      className="space-y-3 rounded-md border border-zinc-200 bg-white p-3 shadow-sm"
      aria-label="Artwork Size"
    >
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
        Artwork
      </h4>

      <div className="space-y-1.5 border-b border-zinc-100 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Artwork Info
        </p>
        {pixelSize ? (
          <InfoLine
            label="Pixel Size"
            value={`${pixelSize.artworkPixelWidth} × ${pixelSize.artworkPixelHeight} px`}
          />
        ) : null}
        <InfoLine
          label="Current Size"
          value={formatCurrentSizeCm(designerSize.width_cm, designerSize.height_cm)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Artwork Size
        </p>
        <SizeFieldRow label="Width">
          <ArtworkSizeIntegerInput
            value={widthCm}
            disabled={disabled}
            ariaLabel="Artwork width in centimeters"
            onCommit={(width_cm) => {
              if (width_cm !== widthCm) {
                onPatch({ width_cm });
              }
            }}
          />
        </SizeFieldRow>
        <SizeFieldRow label="Height">
          <ArtworkSizeIntegerInput
            value={heightCm}
            disabled={disabled}
            ariaLabel="Artwork height in centimeters"
            onCommit={(height_cm) => {
              if (height_cm !== heightCm) {
                onPatch({ height_cm });
              }
            }}
          />
        </SizeFieldRow>
      </div>

      <label className="flex items-center gap-2 text-[11px] text-zinc-500">
        <input
          type="checkbox"
          disabled
          checked={false}
          readOnly
          className="h-3.5 w-3.5 rounded border-zinc-300"
          aria-label="Lock ratio (not enabled)"
        />
        <span>Lock Ratio</span>
      </label>

      {layer.type === "image" && onBoostResolution ? (
        <PrintReadyPanel
          layer={layer}
          designerWidthCm={designerSize.width_cm}
          designerHeightCm={designerSize.height_cm}
          disabled={disabled}
          optimizing={boostingResolution}
          onOptimize={() => onBoostResolution(layer)}
        />
      ) : null}
    </section>
  );
}
