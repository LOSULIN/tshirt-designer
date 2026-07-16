"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createCalibrationArtworkCanvas } from "@/lib/render/calibration-artwork";
import {
  MOCKUP_VISUAL_COMPARE_OFFSETS,
  buildMockupVisualCalibrationReport,
} from "@/lib/render/mockup-visual-calibration";
import { resolveProductMockupPlacementWithOffset } from "@/lib/render/visual-adjustment";
import type { ProductCalibration, ProductSide } from "@/lib/render/render-types";
import {
  composeGarmentWithArtwork,
  getDesignerTemplateSrc,
  loadImageElement,
  resolveDesignerArtworkPlacement,
} from "@/lib/render/visual-compare";

export interface VisualOffsetComparePanelProps {
  color: string;
  side: ProductSide;
  productImageUrl: string;
  productWidth: number;
  productHeight: number;
  calibration: ProductCalibration;
  activeOffsetY: number;
}

interface CompareFrame {
  key: string;
  label: string;
  dataUrl: string | null;
  highlighted: boolean;
}

export function VisualOffsetComparePanel({
  color,
  side,
  productImageUrl,
  productWidth,
  productHeight,
  calibration,
  activeOffsetY,
}: VisualOffsetComparePanelProps) {
  const [frames, setFrames] = useState<CompareFrame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const report = useMemo(
    () => buildMockupVisualCalibrationReport(calibration, side),
    [calibration, side],
  );

  const compareOffsets = useMemo(
    () =>
      Array.from(
        new Set([...MOCKUP_VISUAL_COMPARE_OFFSETS, activeOffsetY]),
      ).sort((a, b) => a - b),
    [activeOffsetY],
  );

  const composeFrames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const templateSrc = getDesignerTemplateSrc(color, side);
      const [templateImg, productImg] = await Promise.all([
        loadImageElement(templateSrc),
        loadImageElement(productImageUrl),
      ]);

      const designerPlacement = resolveDesignerArtworkPlacement(calibration, side);
      const artwork = createCalibrationArtworkCanvas(designerPlacement);

      const designerCanvas = composeGarmentWithArtwork(
        templateImg,
        templateImg.naturalWidth,
        templateImg.naturalHeight,
        artwork,
        designerPlacement,
      );

      const nextFrames: CompareFrame[] = [
        {
          key: "designer",
          label: "Designer",
          dataUrl: designerCanvas.toDataURL("image/png"),
          highlighted: false,
        },
      ];

      for (const offsetY of compareOffsets) {
        const placement =
          resolveProductMockupPlacementWithOffset(calibration, side, {
            offsetX: 0,
            offsetY,
          }) ?? { x: 0, y: 0, width: 0, height: 0 };

        const productCanvas = composeGarmentWithArtwork(
          productImg,
          productWidth,
          productHeight,
          artwork,
          placement,
        );

        nextFrames.push({
          key: `product-${offsetY}`,
          label: offsetY === 0 ? "Product (0px)" : `Product (+${offsetY}px)`,
          dataUrl: productCanvas.toDataURL("image/png"),
          highlighted: offsetY === activeOffsetY,
        });
      }

      setFrames(nextFrames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Visual offset compare failed");
      setFrames([]);
    } finally {
      setLoading(false);
    }
  }, [
    activeOffsetY,
    calibration,
    color,
    compareOffsets,
    productHeight,
    productImageUrl,
    productWidth,
    side,
  ]);

  useEffect(() => {
    void composeFrames();
  }, [composeFrames]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header>
        <h2 className="text-sm font-semibold text-zinc-900">Visual Offset Preview</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Designer → Product mockup at multiple offsetY · Anatomy Δ{" "}
          {report.anatomyDeltaPx}px ({report.anatomyDeltaCm.toFixed(2)} cm)
        </p>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-[520px] animate-pulse rounded-lg bg-zinc-100" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {frames.map((frame) => (
            <figure
              key={frame.key}
              className={`flex flex-col gap-2 rounded-lg border p-2 ${
                frame.highlighted
                  ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300"
                  : "border-zinc-100 bg-zinc-50"
              }`}
            >
              <figcaption className="text-xs font-medium text-zinc-700">
                {frame.label}
                {frame.highlighted ? " · 目前" : ""}
              </figcaption>
              {frame.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={frame.dataUrl}
                  alt={frame.label}
                  className="w-full rounded-md object-contain"
                />
              ) : null}
            </figure>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        <p className="font-semibold text-zinc-900">Offset 建議（Anatomy + Designer 視覺間距）</p>
        <ul className="mt-2 space-y-1">
          {report.candidates.map((candidate) => (
            <li
              key={candidate.offsetY}
              className={
                candidate.offsetY === report.bestOffsetY
                  ? "font-medium text-emerald-700"
                  : undefined
              }
            >
              +{candidate.offsetY}px — 領口至印刷頂 {candidate.gapFromProductCollarCm.toFixed(2)} cm
              {candidate.matchesDesignerVisualGap ? " · 與 Designer 視覺間距一致" : ""}
              {candidate.offsetY === report.bestOffsetY ? " · 建議" : ""}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-zinc-600">
          建議 offsetY：<span className="font-semibold text-zinc-900">+{report.recommendedOffsetY}</span>
          （領口差 {report.anatomyDeltaPx}px）
        </p>
      </div>
    </section>
  );
}
