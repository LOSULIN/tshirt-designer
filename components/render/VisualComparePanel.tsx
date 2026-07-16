"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createCalibrationArtworkCanvas } from "@/lib/render/calibration-artwork";
import type { CalibrationRect, ProductCalibration, ProductSide } from "@/lib/render/render-types";
import {
  composeGarmentWithArtwork,
  createDifferenceCanvas,
  createOpacityBlendCanvas,
  getDesignerTemplateSrc,
  loadImageElement,
  resolveDesignerArtworkPlacement,
  resolveProductArtworkPlacement,
  type VisualCompareOverlayMode,
} from "@/lib/render/visual-compare";
import { validateVisualCalibration } from "@/lib/render/visual-calibration-validation";

export interface VisualComparePanelProps {
  productCode: string;
  color: string;
  side: ProductSide;
  productImageUrl: string;
  productWidth: number;
  productHeight: number;
  calibration: ProductCalibration;
}

const OVERLAY_MODES: { id: VisualCompareOverlayMode; label: string }[] = [
  { id: "split", label: "Split" },
  { id: "overlay", label: "Overlay" },
  { id: "difference", label: "Difference" },
  { id: "opacity", label: "50% Opacity" },
  { id: "blink", label: "Blink Compare" },
];

export function VisualComparePanel({
  color,
  side,
  productImageUrl,
  productWidth,
  productHeight,
  calibration,
}: VisualComparePanelProps) {
  const [overlayMode, setOverlayMode] = useState<VisualCompareOverlayMode>("split");
  const [designerCanvas, setDesignerCanvas] = useState<HTMLCanvasElement | null>(null);
  const [productCanvas, setProductCanvas] = useState<HTMLCanvasElement | null>(null);
  const [blinkShowDesigner, setBlinkShowDesigner] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const designerPlacement = useMemo(
    () => resolveDesignerArtworkPlacement(calibration, side),
    [calibration, side],
  );

  const productPlacement = useMemo(
    () => resolveProductArtworkPlacement(calibration, side),
    [calibration, side],
  );

  const validation = useMemo(
    () => validateVisualCalibration(calibration, side),
    [calibration, side],
  );

  const composeViews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const templateSrc = getDesignerTemplateSrc(color, side);
      const [templateImg, productImg] = await Promise.all([
        loadImageElement(templateSrc),
        loadImageElement(productImageUrl),
      ]);

      const artwork = createCalibrationArtworkCanvas(designerPlacement);
      const designer = composeGarmentWithArtwork(
        templateImg,
        templateImg.naturalWidth,
        templateImg.naturalHeight,
        artwork,
        designerPlacement,
      );

      const productRect = productPlacement ?? ({ x: 0, y: 0, width: 0, height: 0 } as CalibrationRect);
      const product = composeGarmentWithArtwork(
        productImg,
        productWidth,
        productHeight,
        artwork,
        productRect,
      );

      setDesignerCanvas(designer);
      setProductCanvas(product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Visual compare failed");
      setDesignerCanvas(null);
      setProductCanvas(null);
    } finally {
      setLoading(false);
    }
  }, [color, designerPlacement, productImageUrl, productPlacement, productWidth, productHeight, side]);

  useEffect(() => {
    void composeViews();
  }, [composeViews]);

  useEffect(() => {
    if (overlayMode !== "blink") return;
    const timer = window.setInterval(() => {
      setBlinkShowDesigner((current) => !current);
    }, 600);
    return () => window.clearInterval(timer);
  }, [overlayMode]);

  const compositeCanvas = useMemo(() => {
    if (!designerCanvas || !productCanvas) return null;
    if (overlayMode === "difference") {
      return createDifferenceCanvas(designerCanvas, productCanvas);
    }
    if (overlayMode === "opacity" || overlayMode === "overlay") {
      return createOpacityBlendCanvas(
        designerCanvas,
        productCanvas,
        overlayMode === "opacity" ? 0.5 : 0.5,
      );
    }
    return null;
  }, [designerCanvas, overlayMode, productCanvas]);

  const designerDataUrl = designerCanvas?.toDataURL("image/png") ?? null;
  const productDataUrl = productCanvas?.toDataURL("image/png") ?? null;
  const compositeDataUrl = compositeCanvas?.toDataURL("image/png") ?? null;
  const blinkDataUrl = blinkShowDesigner ? designerDataUrl : productDataUrl;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Visual Compare Mode</h2>
          <p className="mt-1 text-xs text-zinc-500">
            左：Designer Template · 右：Product Flat · 同一張 Calibration Artwork
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {OVERLAY_MODES.map((mode) => (
            <label
              key={mode.id}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
            >
              <input
                type="radio"
                name="overlay-mode"
                checked={overlayMode === mode.id}
                onChange={() => setOverlayMode(mode.id)}
              />
              {mode.label}
            </label>
          ))}
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div
        className={
          overlayMode === "split"
            ? "grid min-h-[480px] gap-3 lg:grid-cols-2"
            : "flex min-h-[480px] items-center justify-center"
        }
      >
        {loading ? (
          <div className="col-span-2 h-[480px] animate-pulse rounded-lg bg-zinc-100" />
        ) : overlayMode === "split" ? (
          <>
            <figure className="flex flex-col gap-2">
              <figcaption className="text-xs font-medium text-zinc-600">
                Designer Template (/templates)
              </figcaption>
              {designerDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={designerDataUrl}
                  alt="Designer template compare"
                  className="w-full rounded-lg border border-zinc-100 bg-zinc-50 object-contain"
                />
              ) : null}
            </figure>
            <figure className="flex flex-col gap-2">
              <figcaption className="text-xs font-medium text-zinc-600">
                Product Flat (UA35001/assets)
              </figcaption>
              {productDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={productDataUrl}
                  alt="Product flat compare"
                  className="w-full rounded-lg border border-zinc-100 bg-zinc-50 object-contain"
                />
              ) : null}
            </figure>
          </>
        ) : (
          <figure className="flex w-full max-w-md flex-col gap-2">
            <figcaption className="text-xs font-medium text-zinc-600">
              {overlayMode === "blink"
                ? blinkShowDesigner
                  ? "Blink · Designer"
                  : "Blink · Product"
                : OVERLAY_MODES.find((m) => m.id === overlayMode)?.label}
            </figcaption>
            {(overlayMode === "blink" ? blinkDataUrl : compositeDataUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(overlayMode === "blink" ? blinkDataUrl : compositeDataUrl) ?? ""}
                alt="Visual compare composite"
                className="w-full rounded-lg border border-zinc-100 bg-zinc-50 object-contain"
              />
            ) : null}
          </figure>
        )}
      </div>

      <div
        className={`rounded-lg border px-3 py-2 text-xs ${
          validation.passed
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <p className="font-semibold">
          Visual Validation: {validation.passed ? "PASS" : "PENDING / FAIL"} (≤ 1px)
        </p>
        <ul className="mt-1 space-y-0.5">
          {validation.details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
