"use client";

import { useEffect, useMemo, useState } from "react";
import { RenderResultCard } from "@/components/render/RenderResultCard";
import { createDifferenceOverlay } from "@/lib/render/render-validation";

export interface RenderCompareProps {
  artworkCanvas: HTMLCanvasElement | null;
  renderCanvas: HTMLCanvasElement | null;
  garmentCanvas: HTMLCanvasElement | null;
  printRect: { x: number; y: number; width: number; height: number } | null;
}

export function RenderCompare({
  artworkCanvas,
  renderCanvas,
  garmentCanvas,
  printRect,
}: RenderCompareProps) {
  const [differenceCanvas, setDifferenceCanvas] =
    useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!renderCanvas || !garmentCanvas || !printRect) {
      setDifferenceCanvas(null);
      return;
    }
    setDifferenceCanvas(
      createDifferenceOverlay(renderCanvas, garmentCanvas, printRect),
    );
  }, [garmentCanvas, printRect, renderCanvas]);

  const steps = useMemo(
    () => [
      { title: "Artwork", canvas: artworkCanvas },
      { title: "Render Result", canvas: renderCanvas },
      {
        title: "Difference",
        canvas: differenceCanvas,
        subtitle: "Overlay 預留（Print Area 熱力圖）",
      },
    ],
    [artworkCanvas, differenceCanvas, renderCanvas],
  );

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-900">Render Compare</h2>
        <p className="text-xs text-zinc-500">Artwork → Render Result → Difference</p>
      </header>
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <RenderResultCard
            key={step.title}
            title={step.title}
            subtitle={step.subtitle}
            canvas={step.canvas}
            emptyLabel="執行測試後顯示"
          />
        ))}
      </div>
    </section>
  );
}
