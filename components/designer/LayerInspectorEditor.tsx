"use client";

import { useEffect, useMemo, useState } from "react";
import type { Side } from "@/lib/constants";
import {
  createDesignerDisplayContext,
  getLayerDesignerDisplayRect,
  projectWorkspaceLengthToDesignerDisplay,
  projectWorkspacePointToDesignerDisplay,
} from "@/lib/designer-display-projection";
import {
  applyDesignerLayerPatch,
  resizeLayerDesigner,
  setLayerDesignerRotation,
} from "@/lib/designer-coordinate-controller";
import {
  formatInspectorDimensionDisplay,
  formatInspectorDimensionPrecise,
  getScalableLayerInspectorValues,
  getTextInspectorValues,
} from "@/lib/inspector-sync";
import type { DesignLayer } from "@/lib/types";
import { ArtworkSizePanel } from "./ArtworkSizePanel";
import { ImagePrintQualityPanel } from "./ImagePrintQualityPanel";
import { InspectorProofDetails } from "./InspectorProofDetails";
import { InspectorNumberInput } from "./InspectorNumberInput";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function CompactRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] leading-tight">
      <span className="shrink-0 text-zinc-500">{label}:</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const textareaClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-mono text-zinc-900 tabular-nums disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

export function LayerInspectorEditor({
  layer,
  side,
  size,
  disabled,
  compact = false,
  onTextPatch,
  onImageTransform,
  onImageResize,
  onArtworkSizePatch,
  onBoostImageResolution,
  onRotationChange,
  largePrintModeEnabled = false,
}: {
  layer: DesignLayer;
  side: Side;
  size: string;
  disabled: boolean;
  compact?: boolean;
  largePrintModeEnabled?: boolean;
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
  onArtworkSizePatch: (
    id: string,
    patch: { width_cm?: number; height_cm?: number },
  ) => void;
  onBoostImageResolution?: (id: string) => void | Promise<void>;
  onRotationChange: (id: string, rotation: number) => void;
}) {
  if (layer.type === "text") {
    return (
      <div className="space-y-2">
        <ArtworkSizePanel
          layer={layer}
          disabled={disabled}
          onPatch={(patch) => onArtworkSizePatch(layer.id, patch)}
        />
        <TextInspectorFields
        key={layer.id}
        layer={layer}
        side={side}
        size={size}
        disabled={disabled}
        compact={compact}
        onPatch={(patch) => onTextPatch(layer.id, patch)}
        onRotationChange={(rotation) => onRotationChange(layer.id, rotation)}
        />
      </div>
    );
  }

  if (layer.type === "shape") {
    return (
      <div className="space-y-2">
        <ArtworkSizePanel
          layer={layer}
          disabled={disabled}
          onPatch={(patch) => onArtworkSizePatch(layer.id, patch)}
        />
        <ScalableInspectorFields
        key={layer.id}
        layer={layer}
        side={side}
        size={size}
        disabled={disabled}
        compact={compact}
        onTransform={(patch) => onImageTransform(layer.id, patch)}
        onResize={(next) => onImageResize(layer.id, next)}
        onRotationChange={(rotation) => onRotationChange(layer.id, rotation)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ArtworkSizePanel
        layer={layer}
        disabled={disabled}
        onPatch={(patch) => onArtworkSizePatch(layer.id, patch)}
        onBoostResolution={
          onBoostImageResolution
            ? () => onBoostImageResolution(layer.id)
            : undefined
        }
      />
      <ImageInspectorFields
      key={layer.id}
      layer={layer}
      side={side}
      size={size}
      disabled={disabled}
      compact={compact}
      largePrintModeEnabled={largePrintModeEnabled}
      onTransform={(patch) => onImageTransform(layer.id, patch)}
      onResize={(next) => onImageResize(layer.id, next)}
      onRotationChange={(rotation) => onRotationChange(layer.id, rotation)}
      />
    </div>
  );
}

function TextInspectorFields({
  layer,
  side,
  size,
  disabled,
  compact,
  onPatch,
  onRotationChange,
}: {
  layer: Extract<DesignLayer, { type: "text" }>;
  side: Side;
  size: string;
  disabled: boolean;
  compact: boolean;
  onPatch: (patch: {
    text?: string;
    fontSize_cm?: number;
    x_cm?: number;
    y_cm?: number;
    rotation?: number;
  }) => void;
  onRotationChange: (rotation: number) => void;
}) {
  const values = getTextInspectorValues(layer);
  const designerContext = useMemo(
    () => createDesignerDisplayContext(side, size),
    [side, size],
  );
  const bounds = useMemo(
    () => getLayerDesignerDisplayRect(layer, designerContext),
    [layer, designerContext],
  );
  const designerPosition = useMemo(
    () =>
      projectWorkspacePointToDesignerDisplay(
        { x_cm: values.x_cm, y_cm: values.y_cm },
        designerContext,
      ),
    [values.x_cm, values.y_cm, designerContext],
  );
  const designerFontSize = useMemo(
    () =>
      projectWorkspaceLengthToDesignerDisplay(
        values.fontSize_cm,
        designerContext,
        "y",
      ),
    [values.fontSize_cm, designerContext],
  );
  const [content, setContent] = useState(values.content);

  useEffect(() => {
    setContent(values.content);
  }, [values.content, layer.id]);

  if (compact) {
    return (
      <div className="space-y-0.5">
        <CompactRow label="Width">
          <span
            className="font-mono font-medium tabular-nums text-zinc-900"
            title={formatInspectorDimensionPrecise(bounds.width_cm)}
          >
            {formatInspectorDimensionDisplay(bounds.width_cm)} cm
          </span>
        </CompactRow>
        <CompactRow label="Height">
          <div className="flex items-center gap-1">
            <InspectorNumberInput
              compact
              value={bounds.height_cm}
              decimals={1}
              dimensionDisplay
              disabled={disabled}
              ariaLabel="Text height in centimeters"
              onCommit={(height_cm) => {
                const factor =
                  bounds.height_cm > 0 ? height_cm / bounds.height_cm : 1;
                if (Math.abs(factor - 1) < 1e-6) return;
                onPatch(
                  applyDesignerLayerPatch(layer, designerContext, {
                    fontSize_cm: designerFontSize * factor,
                  }),
                );
              }}
            />
            <span className="shrink-0 text-zinc-400">cm</span>
          </div>
        </CompactRow>
        <CompactRow label="Font">
          <div className="flex items-center gap-1">
            <InspectorNumberInput
              compact
              value={designerFontSize}
              decimals={1}
              disabled={disabled}
              ariaLabel="Font size in centimeters"
              onCommit={(fontSize_cm) =>
              onPatch(
                applyDesignerLayerPatch(layer, designerContext, { fontSize_cm }),
              )
            }
            />
            <span className="shrink-0 text-zinc-400">cm</span>
          </div>
        </CompactRow>
        <InspectorProofDetails layer={layer} side={side} size={size} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Field label="Content">
        <textarea
          className={`${textareaClass} min-h-[3rem] resize-y font-sans`}
          value={content}
          disabled={disabled}
          onChange={(e) => {
            setContent(e.target.value);
            onPatch({ text: e.target.value });
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width (cm)">
          <p
            className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] tabular-nums text-zinc-700"
            title={formatInspectorDimensionPrecise(bounds.width_cm)}
          >
            {formatInspectorDimensionDisplay(bounds.width_cm)}
          </p>
        </Field>
        <Field label="Height (cm)">
          <InspectorNumberInput
            value={bounds.height_cm}
            decimals={1}
            dimensionDisplay
            disabled={disabled}
            ariaLabel="Text height in centimeters"
            onCommit={(height_cm) => {
              const factor =
                bounds.height_cm > 0 ? height_cm / bounds.height_cm : 1;
              if (Math.abs(factor - 1) < 1e-6) return;
              onPatch(
                applyDesignerLayerPatch(layer, designerContext, {
                  fontSize_cm: designerFontSize * factor,
                }),
              );
            }}
          />
        </Field>
        <Field label="Font size (cm)">
          <InspectorNumberInput
            value={designerFontSize}
            decimals={1}
            disabled={disabled}
            ariaLabel="Font size in centimeters"
            onCommit={(fontSize_cm) =>
              onPatch(
                applyDesignerLayerPatch(layer, designerContext, { fontSize_cm }),
              )
            }
          />
        </Field>
        <Field label="Rotation (°)">
          <InspectorNumberInput
            value={values.rotation}
            decimals={0}
            disabled={disabled}
            ariaLabel="Rotation in degrees"
            onCommit={(rotation) =>
              onRotationChange(
                setLayerDesignerRotation(layer, designerContext, rotation)
                  .rotation!,
              )
            }
          />
        </Field>
        <Field label="X (cm)">
          <InspectorNumberInput
            value={designerPosition.x_cm}
            decimals={1}
            disabled={disabled}
            ariaLabel="X position in centimeters"
            onCommit={(x_cm) =>
              onPatch(applyDesignerLayerPatch(layer, designerContext, { x_cm }))
            }
          />
        </Field>
        <Field label="Y (cm)">
          <InspectorNumberInput
            value={designerPosition.y_cm}
            decimals={1}
            disabled={disabled}
            ariaLabel="Y position in centimeters"
            onCommit={(y_cm) =>
              onPatch(applyDesignerLayerPatch(layer, designerContext, { y_cm }))
            }
          />
        </Field>
      </div>
      <InspectorProofDetails layer={layer} side={side} size={size} />
    </div>
  );
}

function ScalableInspectorFields({
  layer,
  side,
  size,
  disabled,
  compact,
  onTransform,
  onResize,
  onRotationChange,
}: {
  layer: Extract<DesignLayer, { type: "image" | "shape" }>;
  side: Side;
  size: string;
  disabled: boolean;
  compact: boolean;
  onTransform: (patch: {
    x_cm?: number;
    y_cm?: number;
    scale?: number;
    rotation?: number;
  }) => void;
  onResize: (next: {
    x_cm: number;
    y_cm: number;
    width_cm: number;
    height_cm: number;
  }) => void;
  onRotationChange: (rotation: number) => void;
}) {
  const workspaceValues = getScalableLayerInspectorValues(layer);
  const designerContext = useMemo(
    () => createDesignerDisplayContext(side, size),
    [side, size],
  );
  const designerBounds = useMemo(
    () => getLayerDesignerDisplayRect(layer, designerContext),
    [layer, designerContext],
  );

  const commitDesignerResize = (patch: {
    width_cm?: number;
    height_cm?: number;
  }) => {
    const ws = resizeLayerDesigner(layer, designerContext, {
      width_cm: patch.width_cm ?? designerBounds.width_cm,
      height_cm: patch.height_cm ?? designerBounds.height_cm,
    });
    onResize({
      x_cm: ws.x_cm!,
      y_cm: ws.y_cm!,
      width_cm: ws.width_cm!,
      height_cm: ws.height_cm!,
    });
  };

  const commitDesignerTransform = (patch: { x_cm?: number; y_cm?: number }) => {
    onTransform(applyDesignerLayerPatch(layer, designerContext, patch));
  };

  if (compact) {
    return (
      <div className="space-y-0.5">
        <CompactRow label="Size">
          <div className="flex items-center gap-0.5">
            <InspectorNumberInput
              compact
              className="w-12"
              value={designerBounds.width_cm}
              decimals={1}
              dimensionDisplay
              disabled={disabled}
              ariaLabel="Width in centimeters"
              onCommit={(width_cm) => commitDesignerResize({ width_cm })}
            />
            <span className="shrink-0 text-zinc-400">×</span>
            <InspectorNumberInput
              compact
              className="w-12"
              value={designerBounds.height_cm}
              decimals={1}
              dimensionDisplay
              disabled={disabled}
              ariaLabel="Height in centimeters"
              onCommit={(height_cm) => commitDesignerResize({ height_cm })}
            />
            <span className="shrink-0 text-zinc-400">cm</span>
          </div>
        </CompactRow>
        <InspectorProofDetails layer={layer} side={side} size={size} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width (cm)">
          <InspectorNumberInput
            value={designerBounds.width_cm}
            decimals={1}
            dimensionDisplay
            disabled={disabled}
            ariaLabel="Width in centimeters"
            onCommit={(width_cm) => commitDesignerResize({ width_cm })}
          />
        </Field>
        <Field label="Height (cm)">
          <InspectorNumberInput
            value={designerBounds.height_cm}
            decimals={1}
            dimensionDisplay
            disabled={disabled}
            ariaLabel="Height in centimeters"
            onCommit={(height_cm) => commitDesignerResize({ height_cm })}
          />
        </Field>
        <Field label="X (cm)">
          <InspectorNumberInput
            value={designerBounds.x_cm}
            decimals={1}
            disabled={disabled}
            ariaLabel="X position in centimeters"
            onCommit={(x_cm) => commitDesignerTransform({ x_cm })}
          />
        </Field>
        <Field label="Y (cm)">
          <InspectorNumberInput
            value={designerBounds.y_cm}
            decimals={1}
            disabled={disabled}
            ariaLabel="Y position in centimeters"
            onCommit={(y_cm) => commitDesignerTransform({ y_cm })}
          />
        </Field>
        <Field label="Scale">
          <InspectorNumberInput
            value={workspaceValues.scale}
            decimals={2}
            disabled={disabled}
            ariaLabel="Scale"
            onCommit={(scale) => onTransform({ scale })}
          />
        </Field>
        <Field label="Rotation (°)">
          <InspectorNumberInput
            value={workspaceValues.rotation}
            decimals={0}
            disabled={disabled}
            ariaLabel="Rotation in degrees"
            onCommit={(rotation) =>
              onRotationChange(
                setLayerDesignerRotation(layer, designerContext, rotation)
                  .rotation!,
              )
            }
          />
        </Field>
      </div>
      <InspectorProofDetails layer={layer} side={side} size={size} />
    </div>
  );
}

function ImageInspectorFields({
  layer,
  side,
  size,
  disabled,
  compact,
  largePrintModeEnabled,
  onTransform,
  onResize,
  onRotationChange,
}: {
  layer: Extract<DesignLayer, { type: "image" }>;
  side: Side;
  size: string;
  disabled: boolean;
  compact: boolean;
  largePrintModeEnabled: boolean;
  onTransform: (patch: {
    x_cm?: number;
    y_cm?: number;
    scale?: number;
    rotation?: number;
  }) => void;
  onResize: (next: {
    x_cm: number;
    y_cm: number;
    width_cm: number;
    height_cm: number;
  }) => void;
  onRotationChange: (rotation: number) => void;
}) {
  if (compact) {
    return (
      <div className="space-y-0.5">
        <ScalableInspectorFields
          layer={layer}
          side={side}
          size={size}
          disabled={disabled}
          compact
          onTransform={onTransform}
          onResize={onResize}
          onRotationChange={onRotationChange}
        />
        <ImagePrintQualityPanel
          layer={layer}
          side={side}
          size={size}
          largePrintMode={largePrintModeEnabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ScalableInspectorFields
        layer={layer}
        side={side}
        size={size}
        disabled={disabled}
        compact={false}
        onTransform={onTransform}
        onResize={onResize}
        onRotationChange={onRotationChange}
      />
      <ImagePrintQualityPanel
        layer={layer}
        side={side}
        size={size}
        largePrintMode={largePrintModeEnabled}
      />
    </div>
  );
}
