/**
 * CSS adapter for Visible Garment Proportion — viewport crop + top anchor.
 * Presentation only; does not scale/zoom the composed mockup PNG.
 */

import type { CSSProperties } from "react";
import type { VisibleGarmentProportionProfile } from "./visible-garment-proportion";
import {
  computeVisibleGarmentLayout,
  resolveVisibleGarmentFrameAspectRatio,
} from "./visible-garment-proportion-layout";

export interface VisibleGarmentProportionStyles {
  stageStyle: CSSProperties;
  frameStyle: CSSProperties;
  viewportStyle: CSSProperties;
  imageStyle: CSSProperties;
  layout: ReturnType<typeof computeVisibleGarmentLayout>;
}

export function visibleGarmentProportionToCss(
  profile: VisibleGarmentProportionProfile,
): VisibleGarmentProportionStyles {
  const layout = computeVisibleGarmentLayout(profile);
  const frameAspect = resolveVisibleGarmentFrameAspectRatio(profile);

  return {
    layout,
    stageStyle: {
      paddingBottom: `${profile.stagePaddingBottomPercent}%`,
      paddingLeft: `${profile.sideMarginPercent}%`,
      paddingRight: `${profile.sideMarginPercent}%`,
      width: "100%",
      display: "flex",
      justifyContent: "center",
    },
    frameStyle: {
      aspectRatio: frameAspect,
      width: "100%",
      maxWidth: "100%",
      overflow: "visible",
    },
    viewportStyle: {
      overflow: "hidden",
      width: "100%",
      height: "100%",
      position: "relative",
    },
    imageStyle: {
      display: "block",
      width: "100%",
      height: "auto",
      maxWidth: "none",
    },
  };
}
