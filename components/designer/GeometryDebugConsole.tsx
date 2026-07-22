"use client";

import { useState } from "react";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "@/lib/designer-geometry-v2/geometry-version";
import { useGeometryRuntime } from "@/lib/designer-geometry-v2/geometry-runtime-context";
import type { GeometryExportSurface } from "@/lib/designer-geometry-v2/geometry-runtime-types";

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </p>
  );
}

function RowLabel({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-700">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 rounded border-zinc-300"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function RadioRow({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-700">
      <input
        type="radio"
        className="h-3.5 w-3.5 border-zinc-300"
        checked={active}
        onChange={onSelect}
      />
      {label}
    </label>
  );
}

/**
 * Geometry Debug Console — Development only, top-right of Designer canvas.
 */
export function GeometryDebugConsole() {
  const runtime = useGeometryRuntime();
  const [open, setOpen] = useState(false);

  if (!runtime.isDevConsoleAvailable) {
    return null;
  }

  const setVersion = (version: DesignerGeometryVersion) => {
    runtime.setGeometryVersion(version);
  };

  const exportSurfaces: { key: GeometryExportSurface; label: string }[] = [
    { key: "png", label: "PNG" },
    { key: "zip", label: "ZIP" },
    { key: "pdf", label: "PDF" },
    { key: "email", label: "Email" },
  ];

  const debugLayerEntries: {
    key: keyof typeof runtime.debugLayers;
    label: string;
  }[] = [
    { key: "v1", label: "V1 Overlay" },
    { key: "v2", label: "V2 Overlay" },
    { key: "factoryOrigin", label: "Factory Origin" },
    { key: "artworkStage", label: "Artwork Stage" },
    { key: "safeArea", label: "Safe Area" },
    { key: "alphaBoundingBox", label: "Alpha BBox" },
    { key: "center", label: "Center" },
    { key: "shoulder", label: "Shoulder" },
    { key: "hem", label: "Hem" },
  ];

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-40 flex flex-col items-end gap-2">
      <button
        type="button"
        className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100"
        onClick={() => setOpen((value) => !value)}
        data-geometry-debug-console-toggle
      >
        Geometry Debug
        <span className="ml-1 rounded bg-amber-200 px-1 py-0.5 text-[10px] uppercase">
          {runtime.geometryVersion}
        </span>
      </button>

      {open ? (
        <div
          className="w-56 rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur"
          data-geometry-debug-console-panel
        >
          <SectionTitle>Geometry</SectionTitle>
          <div className="mb-3 space-y-1">
            <RadioRow
              label="V1 (Production)"
              active={runtime.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1}
              onSelect={() => setVersion(DESIGNER_GEOMETRY_VERSION.V1)}
            />
            <RadioRow
              label="V2 (Experimental)"
              active={runtime.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2}
              onSelect={() => setVersion(DESIGNER_GEOMETRY_VERSION.V2)}
            />
          </div>

          <hr className="my-2 border-zinc-100" />

          <SectionTitle>Preview</SectionTitle>
          <div className="mb-3 space-y-1">
            <RowLabel
              label="Designer"
              checked={runtime.preview.designer}
              onChange={(checked) =>
                runtime.setPreviewToggle("designer", checked)
              }
            />
            <RowLabel
              label="ResultPanel"
              checked={runtime.preview.resultPanel}
              onChange={(checked) =>
                runtime.setPreviewToggle("resultPanel", checked)
              }
            />
          </div>

          <hr className="my-2 border-zinc-100" />

          <SectionTitle>Export Runtime</SectionTitle>
          <div className="mb-3 space-y-1">
            {exportSurfaces.map(({ key, label }) => (
              <RowLabel
                key={key}
                label={label}
                checked={runtime.exportRuntime[key]}
                onChange={(checked) =>
                  runtime.setExportRuntimeToggle(key, checked)
                }
              />
            ))}
          </div>

          <hr className="my-2 border-zinc-100" />

          <SectionTitle>Debug Layer</SectionTitle>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {debugLayerEntries.map(({ key, label }) => (
              <RowLabel
                key={key}
                label={label}
                checked={runtime.debugLayers[key]}
                onChange={(checked) =>
                  runtime.setDebugLayerToggle(key, checked)
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
