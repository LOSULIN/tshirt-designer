"use client";

import { useEffect, useState } from "react";
import { formatInspectorCm } from "@/lib/design-inspector";
import {
  getImageInspectorValues,
  getTextInspectorValues,
  parseInspectorNumber,
} from "@/lib/inspector-sync";
import type { DesignLayer } from "@/lib/types";

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

const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-mono text-zinc-900 tabular-nums disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

export function LayerInspectorEditor({
  layer,
  disabled,
  onTextPatch,
  onImageTransform,
  onImageResize,
  onRotationChange,
}: {
  layer: DesignLayer;
  disabled: boolean;
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
}) {
  if (layer.type === "text") {
    return (
      <TextInspectorFields
        key={layer.id}
        layer={layer}
        disabled={disabled}
        onPatch={(patch) => onTextPatch(layer.id, patch)}
        onRotationChange={(rotation) => onRotationChange(layer.id, rotation)}
      />
    );
  }

  return (
    <ImageInspectorFields
      key={layer.id}
      layer={layer}
      disabled={disabled}
      onTransform={(patch) => onImageTransform(layer.id, patch)}
      onResize={(next) => onImageResize(layer.id, next)}
      onRotationChange={(rotation) => onRotationChange(layer.id, rotation)}
    />
  );
}

function TextInspectorFields({
  layer,
  disabled,
  onPatch,
  onRotationChange,
}: {
  layer: Extract<DesignLayer, { type: "text" }>;
  disabled: boolean;
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
  const [content, setContent] = useState(values.content);

  useEffect(() => {
    setContent(values.content);
  }, [values.content, layer.id]);

  return (
    <div className="space-y-2">
      <Field label="Content">
        <textarea
          className={`${inputClass} min-h-[3rem] resize-y font-sans`}
          value={content}
          disabled={disabled}
          onChange={(e) => {
            setContent(e.target.value);
            onPatch({ text: e.target.value });
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Font size (cm)">
          <input
            type="number"
            step="0.1"
            min="0.1"
            className={inputClass}
            disabled={disabled}
            value={values.fontSize_cm.toFixed(1)}
            onChange={(e) => {
              const fontSize_cm = parseInspectorNumber(
                e.target.value,
                values.fontSize_cm,
              );
              onPatch({ fontSize_cm });
            }}
          />
        </Field>
        <Field label="Rotation (°)">
          <input
            type="number"
            step="1"
            className={inputClass}
            disabled={disabled}
            value={values.rotation.toFixed(0)}
            onChange={(e) => {
              const rotation = parseInspectorNumber(e.target.value, values.rotation);
              onRotationChange(rotation);
            }}
          />
        </Field>
        <Field label="X (cm)">
          <input
            type="number"
            step="0.1"
            className={inputClass}
            disabled={disabled}
            value={values.x_cm.toFixed(1)}
            onChange={(e) => {
              onPatch({
                x_cm: parseInspectorNumber(e.target.value, values.x_cm),
              });
            }}
          />
        </Field>
        <Field label="Y (cm)">
          <input
            type="number"
            step="0.1"
            className={inputClass}
            disabled={disabled}
            value={values.y_cm.toFixed(1)}
            onChange={(e) => {
              onPatch({
                y_cm: parseInspectorNumber(e.target.value, values.y_cm),
              });
            }}
          />
        </Field>
      </div>
      <p className="text-[9px] text-zinc-400">
        Size: {formatInspectorCm(layer.width_cm)} ×{" "}
        {formatInspectorCm(layer.height_cm)}
      </p>
    </div>
  );
}

function ImageInspectorFields({
  layer,
  disabled,
  onTransform,
  onResize,
  onRotationChange,
}: {
  layer: Extract<DesignLayer, { type: "image" }>;
  disabled: boolean;
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
  const values = getImageInspectorValues(layer);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Width (cm)">
          <input
            type="number"
            step="0.1"
            min="0.1"
            className={inputClass}
            disabled={disabled}
            value={values.width_cm.toFixed(1)}
            onChange={(e) => {
              const width_cm = parseInspectorNumber(
                e.target.value,
                values.width_cm,
              );
              onResize({
                x_cm: values.x_cm,
                y_cm: values.y_cm,
                width_cm,
                height_cm: values.height_cm,
              });
            }}
          />
        </Field>
        <Field label="Height (cm)">
          <input
            type="number"
            step="0.1"
            min="0.1"
            className={inputClass}
            disabled={disabled}
            value={values.height_cm.toFixed(1)}
            onChange={(e) => {
              const height_cm = parseInspectorNumber(
                e.target.value,
                values.height_cm,
              );
              onResize({
                x_cm: values.x_cm,
                y_cm: values.y_cm,
                width_cm: values.width_cm,
                height_cm,
              });
            }}
          />
        </Field>
        <Field label="X (cm)">
          <input
            type="number"
            step="0.1"
            className={inputClass}
            disabled={disabled}
            value={values.x_cm.toFixed(1)}
            onChange={(e) => {
              onTransform({
                x_cm: parseInspectorNumber(e.target.value, values.x_cm),
              });
            }}
          />
        </Field>
        <Field label="Y (cm)">
          <input
            type="number"
            step="0.1"
            className={inputClass}
            disabled={disabled}
            value={values.y_cm.toFixed(1)}
            onChange={(e) => {
              onTransform({
                y_cm: parseInspectorNumber(e.target.value, values.y_cm),
              });
            }}
          />
        </Field>
        <Field label="Scale">
          <input
            type="number"
            step="0.01"
            min="0.01"
            className={inputClass}
            disabled={disabled}
            value={values.scale.toFixed(2)}
            onChange={(e) => {
              onTransform({
                scale: parseInspectorNumber(e.target.value, values.scale),
              });
            }}
          />
        </Field>
        <Field label="Rotation (°)">
          <input
            type="number"
            step="1"
            className={inputClass}
            disabled={disabled}
            value={values.rotation.toFixed(0)}
            onChange={(e) => {
              onRotationChange(
                parseInspectorNumber(e.target.value, layer.rotation),
              );
            }}
          />
        </Field>
      </div>
    </div>
  );
}
