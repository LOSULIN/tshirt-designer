"use client";

import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "@/lib/types";
import { ImagePropertiesPanel } from "./ImagePropertiesPanel";
import { ShapePropertiesPanel } from "./ShapePropertiesPanel";
import { TextPropertiesPanel } from "./TextPropertiesPanel";

export function PropertiesPanel({
  layer,
  disabled,
  largePrintModeEnabled,
  onTextPatch,
  onImagePatch,
  onShapePatch,
}: {
  layer: DesignLayer;
  disabled: boolean;
  largePrintModeEnabled: boolean;
  onTextPatch: (patch: Partial<TextDesignLayer>) => void;
  onImagePatch: (patch: Partial<ImageDesignLayer>) => void;
  onShapePatch: (patch: Partial<ShapeDesignLayer>) => void;
}) {
  if (layer.type === "text") {
    return (
      <TextPropertiesPanel
        layer={layer}
        disabled={disabled}
        onPatch={onTextPatch}
      />
    );
  }

  if (layer.type === "image") {
    return (
      <ImagePropertiesPanel
        layer={layer}
        disabled={disabled}
        largePrintModeEnabled={largePrintModeEnabled}
        onPatch={onImagePatch}
      />
    );
  }

  return (
    <ShapePropertiesPanel
      layer={layer}
      disabled={disabled}
      onPatch={onShapePatch}
    />
  );
}
