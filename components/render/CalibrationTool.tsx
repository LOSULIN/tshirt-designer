"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listProducts } from "@/components/render/AssetLibrary";
import { CalibrationHelper } from "@/components/render/CalibrationHelper";
import { CalibrationRectEditor } from "@/components/render/CalibrationRectEditor";
import { VisualComparePanel } from "@/components/render/VisualComparePanel";
import { VisualOffsetComparePanel } from "@/components/render/VisualOffsetComparePanel";
import {
  loadArtworkFromBlob,
} from "@/components/render/RenderEngine";
import {
  renderProductMockupWithCalibration,
} from "@/components/render/ProductMockupEngine";
import { RenderCanvas } from "@/components/render/RenderCanvas";
import { loadAsset } from "@/lib/render/asset-loader";
import { createCalibrationArtworkCanvas } from "@/lib/render/calibration-artwork";
import { getEditableProductRectForSide, getEditableVisualAdjustmentForSide } from "@/lib/render/calibration";
import { getDefaultDesignerPrintAreaRect } from "@/lib/render/designer-template-reference";
import {
  DEFAULT_FINE_CALIBRATION,
  getFineCalibrationForSide,
  normalizeFineCalibrationMapping,
} from "@/lib/render/fine-calibration";
import {
  clampCalibrationRect,
  resolveEditableCalibrationRect,
} from "@/lib/render/calibration-rect";
import { validateVisualCalibration } from "@/lib/render/visual-calibration-validation";
import {
  MOCKUP_VISUAL_OFFSET_PRESETS,
  MOCKUP_VISUAL_OFFSET_STEP,
  UA35001_RECOMMENDED_VISUAL_OFFSET_Y,
} from "@/lib/render/mockup-visual-calibration";
import {
  DEFAULT_VISUAL_ADJUSTMENT,
  normalizeVisualAdjustment,
} from "@/lib/render/visual-adjustment";
import type {
  CalibrationRect,
  FineCalibrationMapping,
  GarmentColorSlug,
  ProductCalibration,
  ProductCatalogEntry,
  ProductSide,
  RenderAsset,
  RenderResult,
  VisualAdjustment,
} from "@/lib/render/render-types";

const COLOR_LABELS: Record<string, string> = {
  black: "Black",
  white: "White",
};

const SIDE_LABELS: Record<ProductSide, string> = {
  front: "Front",
  back: "Back",
};

type CalibrationViewMode = "rect" | "visual" | "offset";

function labelColor(slug: GarmentColorSlug): string {
  return COLOR_LABELS[slug] ?? slug;
}

interface CalibrationNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

function CalibrationNumberField({
  label,
  value,
  onChange,
  step = 1,
}: CalibrationNumberFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-600">
      <span className="font-medium uppercase tracking-wide">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900"
      />
    </label>
  );
}

export function CalibrationTool() {
  const [catalog, setCatalog] = useState<ProductCatalogEntry[]>([]);
  const [productCode, setProductCode] = useState("UA35001");
  const [color, setColor] = useState<GarmentColorSlug>("black");
  const [side, setSide] = useState<ProductSide>("front");
  const [viewMode, setViewMode] = useState<CalibrationViewMode>("offset");
  const [asset, setAsset] = useState<RenderAsset | null>(null);
  const [baseCalibration, setBaseCalibration] = useState<ProductCalibration>({});
  const [draftRect, setDraftRect] = useState<CalibrationRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [draftFineMapping, setDraftFineMapping] = useState<FineCalibrationMapping>({
    ...DEFAULT_FINE_CALIBRATION,
  });
  const [draftVisualAdjustment, setDraftVisualAdjustment] = useState<VisualAdjustment>({
    ...DEFAULT_VISUAL_ADJUSTMENT,
  });
  const [artwork, setArtwork] = useState<HTMLCanvasElement | null>(null);
  const [renderPreview, setRenderPreview] = useState<RenderResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const designerReference = useMemo(
    () => getDefaultDesignerPrintAreaRect(side),
    [side],
  );

  const productEntry = useMemo(
    () => catalog.find((entry) => entry.code === productCode),
    [catalog, productCode],
  );

  const colors = productEntry?.colors ?? ["black", "white"];
  const sides = productEntry?.sides ?? ["front"];

  const draftCalibration = useMemo(() => {
    const withRect = CalibrationHelper.mergeSide(baseCalibration, side, draftRect);
    const withFine = CalibrationHelper.mergeFine(withRect, side, draftFineMapping);
    return CalibrationHelper.mergeVisual(withFine, side, draftVisualAdjustment);
  }, [baseCalibration, side, draftRect, draftFineMapping, draftVisualAdjustment]);

  const visualValidation = useMemo(
    () => validateVisualCalibration(draftCalibration, side),
    [draftCalibration, side],
  );

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedAsset, calibration] = await Promise.all([
        loadAsset(productCode, color, side),
        CalibrationHelper.read(productCode),
      ]);
      const bounds = {
        width: loadedAsset.naturalWidth,
        height: loadedAsset.naturalHeight,
      };
      const existing = getEditableProductRectForSide(calibration, side);
      const editable = resolveEditableCalibrationRect(existing, bounds);

      setAsset(loadedAsset);
      setBaseCalibration(calibration);
      setDraftRect(editable);
      setDraftFineMapping(getFineCalibrationForSide(calibration, side));
      setDraftVisualAdjustment(
        normalizeVisualAdjustment(
          getEditableVisualAdjustmentForSide(calibration, side) ?? {
            offsetX: 0,
            offsetY: UA35001_RECOMMENDED_VISUAL_OFFSET_Y,
          },
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load asset");
      setAsset(null);
    } finally {
      setLoading(false);
    }
  }, [color, productCode, side]);

  useEffect(() => {
    let cancelled = false;
    listProducts()
      .then((products) => {
        if (!cancelled) setCatalog(products);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setArtwork(createCalibrationArtworkCanvas(designerReference));
  }, [designerReference]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!asset || !artwork) {
      setRenderPreview(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderProductMockupWithCalibration({
        productCode,
        color,
        side,
        artwork,
        artworkWidth: artwork.width,
        artworkHeight: artwork.height,
        calibration: draftCalibration,
      })
        .then((result) => {
          if (!cancelled) setRenderPreview(result);
        })
        .catch(() => {
          if (!cancelled) setRenderPreview(null);
        });
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [artwork, asset, color, draftCalibration, productCode, side]);

  const updateDraftRect = useCallback(
    (next: CalibrationRect) => {
      if (!asset) return;
      setDraftRect(
        clampCalibrationRect(next, {
          width: asset.naturalWidth,
          height: asset.naturalHeight,
        }),
      );
    },
    [asset],
  );

  const onArtworkUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const img = await loadArtworkFromBlob(file);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
      setArtwork(canvas);
    } catch {
      setError("Failed to load artwork file");
    }
  };

  const updateDraftFineMapping = useCallback(
    (patch: Partial<FineCalibrationMapping>) => {
      setDraftFineMapping((current) =>
        normalizeFineCalibrationMapping({ ...current, ...patch }),
      );
    },
    [],
  );

  const updateDraftVisualAdjustment = useCallback(
    (patch: Partial<VisualAdjustment>) => {
      setDraftVisualAdjustment((current) =>
        normalizeVisualAdjustment({ ...current, ...patch }),
      );
    },
    [],
  );

  const onResetFine = () => {
    setDraftFineMapping({ ...DEFAULT_FINE_CALIBRATION });
  };

  const onResetVisual = () => {
    setDraftVisualAdjustment({
      offsetX: 0,
      offsetY: UA35001_RECOMMENDED_VISUAL_OFFSET_Y,
    });
  };

  const onSaveVisual = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const merged = CalibrationHelper.saveVisualOnly(
        productCode,
        baseCalibration,
        side,
        draftVisualAdjustment,
        { download: false },
      );
      await CalibrationHelper.persist(productCode, merged);
      setBaseCalibration(merged);
      setSaveMessage(
        `已更新 visualAdjustment (offsetY=${draftVisualAdjustment.offsetY})`,
      );
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const adjustVisualOffsetY = (delta: number) => {
    setDraftVisualAdjustment((current) =>
      normalizeVisualAdjustment({
        ...current,
        offsetY: current.offsetY + delta,
      }),
    );
  };

  const onSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const merged = CalibrationHelper.saveDraft(
        productCode,
        baseCalibration,
        side,
        draftRect,
        draftFineMapping,
        draftVisualAdjustment,
        { download: false, persist: false },
      );
      await CalibrationHelper.persist(productCode, merged);
      setBaseCalibration(merged);
      setSaveMessage(`已更新 public/products/${productCode}/calibration.json`);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            UA35001 Mockup Visual Calibration
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Visual Offset Preview · Mockup only · Factory Coordinate 封版
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-zinc-200 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("offset")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                viewMode === "offset"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              Offset Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                viewMode === "visual"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              Visual Compare
            </button>
            <button
              type="button"
              onClick={() => setViewMode("rect")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                viewMode === "rect"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              Rect Editor
            </button>
          </div>

          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            <span className="font-medium">顏色</span>
            <select
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 min-w-[100px] rounded-md border border-zinc-200 bg-white px-2 text-sm"
            >
              {colors.map((slug) => (
                <option key={slug} value={slug}>
                  {labelColor(slug)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-zinc-600">
            <span className="font-medium">面</span>
            <select
              value={side}
              onChange={(event) => setSide(event.target.value as ProductSide)}
              className="h-9 min-w-[100px] rounded-md border border-zinc-200 bg-white px-2 text-sm"
            >
              {sides.map((value) => (
                <option key={value} value={value}>
                  {SIDE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-0 flex-col gap-4">
          {viewMode === "offset" && asset ? (
            <VisualOffsetComparePanel
              color={color}
              side={side}
              productImageUrl={asset.imageUrl}
              productWidth={asset.naturalWidth}
              productHeight={asset.naturalHeight}
              calibration={baseCalibration}
              activeOffsetY={draftVisualAdjustment.offsetY}
            />
          ) : viewMode === "visual" && asset ? (
            <VisualComparePanel
              productCode={productCode}
              color={color}
              side={side}
              productImageUrl={asset.imageUrl}
              productWidth={asset.naturalWidth}
              productHeight={asset.naturalHeight}
              calibration={draftCalibration}
            />
          ) : (
            <section className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
              <h2 className="mb-3 self-start text-sm font-semibold text-zinc-900">
                印刷區 Rect（拖曳 / Resize）
              </h2>
              {loading || !asset ? (
                <div className="h-[420px] w-full max-w-md animate-pulse rounded-lg bg-zinc-200" />
              ) : (
                <CalibrationRectEditor
                  imageUrl={asset.imageUrl}
                  imageWidth={asset.naturalWidth}
                  imageHeight={asset.naturalHeight}
                  rect={draftRect}
                  onChange={updateDraftRect}
                />
              )}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Fine Calibration</h2>
            <p className="mt-1 text-xs text-zinc-500">
              mapping · 座標映射後最後微調
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <CalibrationNumberField
                label="Offset X"
                value={draftFineMapping.offsetX}
                onChange={(value) => updateDraftFineMapping({ offsetX: value })}
              />
              <CalibrationNumberField
                label="Offset Y"
                value={draftFineMapping.offsetY}
                onChange={(value) => updateDraftFineMapping({ offsetY: value })}
              />
              <CalibrationNumberField
                label="Scale X"
                value={draftFineMapping.scaleX}
                step={0.001}
                onChange={(value) => updateDraftFineMapping({ scaleX: value })}
              />
              <CalibrationNumberField
                label="Scale Y"
                value={draftFineMapping.scaleY}
                step={0.001}
                onChange={(value) => updateDraftFineMapping({ scaleY: value })}
              />
            </div>
            <button
              type="button"
              onClick={onResetFine}
              className="mt-3 h-9 w-full rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Reset Fine Calibration
            </button>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Visual Offset</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Mockup only · 不影響 Artwork Export / Factory Coordinate
            </p>

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => adjustVisualOffsetY(-MOCKUP_VISUAL_OFFSET_STEP)}
                className="h-9 flex-1 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                ◀ −{MOCKUP_VISUAL_OFFSET_STEP}
              </button>
              <p className="min-w-[88px] text-center text-sm font-semibold text-zinc-900">
                {draftVisualAdjustment.offsetY >= 0 ? "+" : ""}
                {draftVisualAdjustment.offsetY} px
              </p>
              <button
                type="button"
                onClick={() => adjustVisualOffsetY(MOCKUP_VISUAL_OFFSET_STEP)}
                className="h-9 flex-1 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                +{MOCKUP_VISUAL_OFFSET_STEP} ▶
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {MOCKUP_VISUAL_OFFSET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateDraftVisualAdjustment({ offsetY: preset })}
                  className={`h-8 min-w-[40px] rounded-md border px-2 text-xs font-medium ${
                    draftVisualAdjustment.offsetY === preset
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <CalibrationNumberField
                label="Offset X"
                value={draftVisualAdjustment.offsetX}
                onChange={(value) => updateDraftVisualAdjustment({ offsetX: value })}
              />
              <CalibrationNumberField
                label="Offset Y"
                value={draftVisualAdjustment.offsetY}
                onChange={(value) => updateDraftVisualAdjustment({ offsetY: value })}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onResetVisual}
                className="h-9 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void onSaveVisual()}
                disabled={loading || !asset || saving}
                className="h-9 rounded-lg bg-amber-600 text-xs font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "儲存中…" : "Save"}
              </button>
            </div>
          </div>

          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              visualValidation.passed
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-semibold">
              Validation: {visualValidation.passed ? "PASS" : "ADJUST"} (≤ 1px)
            </p>
            <ul className="mt-1 space-y-0.5">
              {visualValidation.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-1 border-t border-zinc-100 pt-4 text-xs text-zinc-600">
            <h3 className="text-sm font-semibold text-zinc-900">Designer Reference</h3>
            <dl className="mt-2 grid grid-cols-2 gap-1">
              <div className="flex justify-between gap-2">
                <dt>X</dt>
                <dd className="font-medium text-zinc-900">{designerReference.x}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Y</dt>
                <dd className="font-medium text-zinc-900">{designerReference.y}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>W</dt>
                <dd className="font-medium text-zinc-900">{designerReference.width}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>H</dt>
                <dd className="font-medium text-zinc-900">{designerReference.height}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-2 border-t border-zinc-100 pt-4">
            <h3 className="text-sm font-semibold text-zinc-900">Render Preview</h3>
            <label className="flex cursor-pointer flex-col gap-1 text-xs text-zinc-600">
              <span>上傳 Artwork PNG（選用）</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  void onArtworkUpload(event.target.files?.[0] ?? null)
                }
                className="text-xs"
              />
            </label>
            <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50 p-2">
              <RenderCanvas
                result={renderPreview}
                className="max-h-[220px] max-w-full object-contain"
                alt="Render preview"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onSave()}
            disabled={loading || !asset || saving}
            className="mt-auto h-10 rounded-lg bg-zinc-900 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "儲存中…" : "儲存至 calibration.json"}
          </button>
          {saveMessage ? (
            <p className="text-center text-xs text-emerald-600">{saveMessage}</p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
