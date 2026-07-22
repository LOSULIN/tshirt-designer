/**
 * Geometry Runtime — Photo Bridge adapter (presentation only).
 *
 * Wraps frozen `resolvePhotoArtworkStageBridge` without modifying Photo Bridge math.
 * When runtime version is V2, substitutes artwork stage rects from Product Master.
 */

import type { Side } from "@/lib/constants";
import { createDesignerDisplayContext } from "@/lib/designer-display-projection";
import {
  rectPxToPhotoBridgeRect,
  resolvePhotoArtworkStageBridge,
  type PhotoArtworkStageBridge,
  type ResolvePhotoArtworkStageBridgeInput,
} from "@/lib/presentation/product-photo-bridge";
import {
  GEOMETRY_V2_CANVAS_HEIGHT_PX,
  GEOMETRY_V2_CANVAS_WIDTH_PX,
} from "./constants";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";
import { resolveGeometryRuntimeSnapshot } from "./resolve-geometry-runtime";

export function resolveGeometryRuntimePhotoBridge(
  input: ResolvePhotoArtworkStageBridgeInput & {
    geometryVersion: DesignerGeometryVersion;
  },
): PhotoArtworkStageBridge {
  const v1Bridge = resolvePhotoArtworkStageBridge(input);

  if (input.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1) {
    return v1Bridge;
  }

  const snapshot = resolveGeometryRuntimeSnapshot(
    input.side,
    DESIGNER_GEOMETRY_VERSION.V2,
  );
  const stage = snapshot.artworkStage;
  const canvasWidth = input.canvasWidth ?? GEOMETRY_V2_CANVAS_WIDTH_PX;
  const canvasHeight = input.canvasHeight ?? GEOMETRY_V2_CANVAS_HEIGHT_PX;

  const v2StageRect = rectPxToPhotoBridgeRect(
    {
      x: stage.left,
      y: stage.top,
      width: stage.width,
      height: stage.height,
    },
    canvasWidth,
    canvasHeight,
  );

  return {
    ...v1Bridge,
    designerArtworkStage: v2StageRect,
    photoArtworkStage: v2StageRect,
    designerDisplayContext:
      v1Bridge.designerDisplayContext ??
      createDesignerDisplayContext(input.side, input.size),
  };
}
