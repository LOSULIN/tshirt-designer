"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { formatInspectorCm } from "@/lib/design-inspector";
import type { Size } from "@/lib/constants";
import {
  buildLiveDesignState,
  getElementStatusLabel,
  type LiveDesignStateElement,
} from "@/lib/live-design-state";
import type { DesignLayer } from "@/lib/types";
import { LayerInspectorEditor } from "./LayerInspectorEditor";

function InfoRow({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd
        className={`text-right text-zinc-900 ${mono ? "font-mono font-medium tabular-nums" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
        {title}
      </h4>
      <dl className="space-y-1">{children}</dl>
    </section>
  );
}

function ElementInspectorCard({
  element,
  selected,
}: {
  element: LiveDesignStateElement;
  selected: boolean;
}) {
  const typeLabel = element.type === "text" ? "Text" : "Image";
  const sizeLabel = `${formatInspectorCm(element.width_cm)} × ${formatInspectorCm(element.height_cm)}`;
  const positionLabel = `${formatInspectorCm(element.x_cm)}, ${formatInspectorCm(element.y_cm)}`;
  const statusLabel = getElementStatusLabel(element);
  const statusTone =
    element.exceedsPrintArea
      ? "text-red-700"
      : element.status === "warning"
        ? "text-amber-700"
        : "text-emerald-700";

  return (
    <article
      className={`rounded-md border px-2 py-2 ${
        selected
          ? "border-sky-400 bg-sky-50/60 ring-1 ring-sky-200"
          : "border-zinc-200 bg-zinc-50/50"
      }`}
      aria-label={`Element ${element.index}`}
    >
      <h5 className="mb-1.5 text-[10px] font-semibold text-zinc-800">
        Element {element.index}
        <span className="ml-1 font-normal text-zinc-500">({element.name})</span>
      </h5>
      <dl className="space-y-1">
        <InfoRow label="Type" value={typeLabel} mono={false} />
        <InfoRow label="Size (cm)" value={sizeLabel} />
        <InfoRow label="Position (cm)" value={positionLabel} />
        <div className="flex items-baseline justify-between gap-2 text-[11px]">
          <dt className="shrink-0 text-zinc-500">Status</dt>
          <dd className={`text-right font-medium ${statusTone}`}>{statusLabel}</dd>
        </div>
      </dl>
    </article>
  );
}

export function PreviewInfoPanel({
  size,
  layers,
  selectedLayerId,
  readOnly = false,
  isBusy = false,
  onTextPatch,
  onImageTransform,
  onImageResize,
  onRotationChange,
  className = "",
}: {
  size: Size;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  readOnly?: boolean;
  isBusy?: boolean;
  onTextPatch: (
    id: string,
    patch: {
      text?: string;
      fontSize_cm?: number;
      x_cm?: number;
      y_cm?: number;
      rotation?: number;
    },
  ) => void;
  onImageTransform: (
    id: string,
    patch: { x_cm?: number; y_cm?: number; scale?: number; rotation?: number },
  ) => void;
  onImageResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
  ) => void;
  onRotationChange: (id: string, rotation: number) => void;
  className?: string;
}) {
  const designState = useMemo(
    () => buildLiveDesignState(layers, size, selectedLayerId),
    [layers, size, selectedLayerId],
  );
  const { garment, elements } = designState;
  const selectedLayer = selectedLayerId
    ? (layers.find((layer) => layer.id === selectedLayerId) ?? null)
    : null;
  const otherElements = elements.filter(
    (element) => element.id !== selectedLayerId,
  );

  const printAreaLabel = `${formatInspectorCm(garment.printArea.width_cm, 0)} × ${formatInspectorCm(garment.printArea.height_cm, 0)}`;
  const inspectorDisabled = readOnly || isBusy;

  return (
    <div
      className={`flex flex-col gap-4 overflow-y-auto px-3 py-3 ${className}`}
      aria-label="設計數據資訊"
    >
      <InfoSection title="Garment Info">
        <InfoRow label="Size" value={size} mono={false} />
        <InfoRow
          label="Chest width"
          value={formatInspectorCm(garment.chestWidth, 0)}
        />
        <InfoRow label="Length" value={formatInspectorCm(garment.length, 0)} />
        <InfoRow label="Print area" value={printAreaLabel} />
      </InfoSection>

      <section className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
          Inspector
        </h4>
        {readOnly && (
          <p className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-600">
            已送出 — 設計已鎖定，僅供檢視
          </p>
        )}
        {selectedLayer ? (
          <div className="rounded-md border border-sky-300 bg-sky-50/40 px-2 py-2">
            <p className="mb-2 text-[10px] font-semibold text-zinc-800">
              {selectedLayer.name}
              <span className="ml-1 font-normal text-zinc-500">
                ({selectedLayer.type === "text" ? "Text" : "Image"})
              </span>
            </p>
            <LayerInspectorEditor
              layer={selectedLayer}
              disabled={inspectorDisabled}
              onTextPatch={onTextPatch}
              onImageTransform={onImageTransform}
              onImageResize={onImageResize}
              onRotationChange={onRotationChange}
            />
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500">請選取圖層以編輯屬性</p>
        )}
      </section>

      {otherElements.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
            Other Elements ({otherElements.length})
          </h4>
          <div className="space-y-2">
            {otherElements.map((element) => (
              <ElementInspectorCard
                key={element.id}
                element={element}
                selected={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
