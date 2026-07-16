"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { renderArtworkWithCalibration } from "@/components/render/RenderEngine";
import { RenderCompare } from "@/components/render/RenderCompare";
import { RenderResultCard } from "@/components/render/RenderResultCard";
import { RenderTestCaseRow } from "@/components/render/RenderTestCase";
import { CalibrationHelper } from "@/components/render/CalibrationHelper";
import { loadAsset } from "@/lib/render/asset-loader";
import { composeArtwork } from "@/lib/render/compose-artwork";
import {
  resolveValidationCalibration,
  summarizeValidation,
  validateRenderTestCase,
  type RenderValidationOutcome,
} from "@/lib/render/render-validation";
import {
  RENDER_TEST_CASES,
  RENDER_VALIDATION_COLOR,
  RENDER_VALIDATION_PRODUCT,
  RENDER_VALIDATION_SIDE,
} from "@/lib/render/render-testcases";
import type { RenderAsset, RenderResult } from "@/lib/render/render-types";

interface TestRunState {
  artwork: HTMLCanvasElement;
  renderResult: RenderResult;
  garmentBaseline: HTMLCanvasElement;
  outcome: RenderValidationOutcome;
}

export function RenderValidation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asset, setAsset] = useState<RenderAsset | null>(null);
  const [runs, setRuns] = useState<Record<string, TestRunState>>({});
  const [selectedId, setSelectedId] = useState(RENDER_TEST_CASES[0]?.id ?? "");

  const runAllTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loadedAsset = await loadAsset(
        RENDER_VALIDATION_PRODUCT,
        RENDER_VALIDATION_COLOR,
        RENDER_VALIDATION_SIDE,
      );
      const fileCalibration = await CalibrationHelper.read(RENDER_VALIDATION_PRODUCT);
      const { calibration, printRect, designerPrintRect, mapping } =
        resolveValidationCalibration(
        fileCalibration,
        RENDER_VALIDATION_SIDE,
        {
          width: loadedAsset.naturalWidth,
          height: loadedAsset.naturalHeight,
        },
      );

      const garmentBaseline = composeArtwork({
        asset: { ...loadedAsset, calibration },
        artwork: document.createElement("canvas"),
        artworkWidth: 0,
        artworkHeight: 0,
      }).canvas;

      const nextRuns: Record<string, TestRunState> = {};

      for (const testCase of RENDER_TEST_CASES) {
        const context = {
          designerPrintRect,
          productPrintRect: printRect,
          garmentWidth: loadedAsset.naturalWidth,
          garmentHeight: loadedAsset.naturalHeight,
        };
        const artwork = testCase.createArtwork(context);
        const renderResult = await renderArtworkWithCalibration({
          productCode: RENDER_VALIDATION_PRODUCT,
          color: RENDER_VALIDATION_COLOR,
          side: RENDER_VALIDATION_SIDE,
          artwork,
          artworkWidth: artwork.width,
          artworkHeight: artwork.height,
          calibration,
        });
        const outcome = validateRenderTestCase(
          testCase,
          renderResult,
          garmentBaseline,
          printRect,
          designerPrintRect,
          mapping,
        );
        nextRuns[testCase.id] = {
          artwork,
          renderResult,
          garmentBaseline,
          outcome,
        };
      }

      setAsset(loadedAsset);
      setRuns(nextRuns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
      setRuns({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runAllTests();
  }, [runAllTests]);

  const summary = useMemo(
    () => summarizeValidation(Object.values(runs).map((run) => run.outcome)),
    [runs],
  );

  const selected = runs[selectedId] ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Render RC-2 — Coordinate Mapping Validation
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Designer Print Area → Mapping → Product Print Area · {RENDER_VALIDATION_PRODUCT}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runAllTests()}
          disabled={loading}
          className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "驗證中…" : "重新執行"}
        </button>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <RenderResultCard
          title="Designer Artwork"
          subtitle={selected ? `Test ${selected.outcome.testId}` : "選擇測試案例"}
          canvas={selected?.artwork ?? null}
        />
        <RenderResultCard
          title="商品素材"
          subtitle={`${RENDER_VALIDATION_PRODUCT} · ${RENDER_VALIDATION_COLOR} · ${RENDER_VALIDATION_SIDE}`}
          imageUrl={asset?.imageUrl ?? null}
        />
        <RenderResultCard
          title="Render Result"
          subtitle="Render Engine 輸出"
          canvas={selected?.renderResult.canvas ?? null}
        />
      </div>

      <RenderCompare
        artworkCanvas={selected?.artwork ?? null}
        renderCanvas={selected?.renderResult.canvas ?? null}
        garmentCanvas={selected?.garmentBaseline ?? null}
        printRect={selected?.outcome.printRect ?? null}
      />

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Validation Result</h2>
            <p className="text-xs text-zinc-500">每項 Test 獨立驗證</p>
          </div>
          <p
            className={`text-sm font-semibold ${
              summary.failed === 0 && summary.passed === summary.total
                ? "text-emerald-700"
                : "text-amber-700"
            }`}
          >
            Summary：{summary.passed} / {summary.total} PASS
          </p>
        </div>
        <div className="grid gap-2">
          {RENDER_TEST_CASES.map((testCase) => (
            <RenderTestCaseRow
              key={testCase.id}
              testCase={testCase}
              outcome={runs[testCase.id]?.outcome ?? null}
              selected={selectedId === testCase.id}
              onSelect={() => setSelectedId(testCase.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
