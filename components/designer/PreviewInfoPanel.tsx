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
      {element.warnings.length > 0 && (
        <p className="mt-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] leading-snug text-amber-950">
          {element.warnings.join(" · ")}
        </p>
      )}
      <p className="mt-1 truncate font-mono text-[9px] text-zinc-400" title={element.id}>
        ID: {element.id}
      </p>
    </article>
  );
}

export function PreviewInfoPanel({
  size,
  layers,
  selectedLayerId,
  className = "",
}: {
  size: Size;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  className?: string;
}) {
  const designState = useMemo(
    () => buildLiveDesignState(layers, size, selectedLayerId),
    [layers, size, selectedLayerId],
  );
  const { garment, elements } = designState;

  const printAreaLabel = `${formatInspectorCm(garment.printArea.width_cm, 0)} × ${formatInspectorCm(garment.printArea.height_cm, 0)}`;

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
          Elements ({elements.length})
        </h4>
        {elements.length === 0 ? (
          <p className="text-[11px] text-zinc-500">尚無設計元素</p>
        ) : (
          <div className="space-y-2">
            {elements.map((element) => (
              <ElementInspectorCard
                key={element.id}
                element={element}
                selected={element.isSelected}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
