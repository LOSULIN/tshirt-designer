"use client";

import type { Size } from "@/lib/constants";
import { realityCalibrationToCss } from "@/lib/result-panel/reality-calibration-css";
import type { ResultPanelDisplayLayer } from "@/lib/result-panel/result-panel-display-preview";
import type { VisibleGarmentProportionStyles } from "@/lib/result-panel/visible-garment-proportion-css";

export interface ResultPanelProductPreviewLegacyProps {
  productUrl: string;
  size: Size;
  display?: ResultPanelDisplayLayer;
  styles: VisibleGarmentProportionStyles;
  profileMeta: {
    visibleHeightRatio: number;
    visibleSourceHeightFraction: number;
    topAnchorPercent: number;
    applyTopAnchor: boolean;
    viewportHeightPercent: number;
  };
  alt?: string;
}

/** Phase 65 legacy path — UA photo + raster artwork overlay + reality calibration. */
export function ResultPanelProductPreviewLegacy({
  productUrl,
  size,
  display,
  styles,
  profileMeta,
  alt = "商品預覽圖",
}: ResultPanelProductPreviewLegacyProps) {
  const realityStyles = display
    ? realityCalibrationToCss(display.artworkPlacement, display.reality)
    : null;

  return (
    <div
      className="visible-garment-stage flex h-full w-full items-center justify-center"
      data-presentation-engine="reality-calibration-v1"
      data-result-panel-render-mode="legacy"
      data-presentation-size={size}
      data-visible-height-ratio={profileMeta.visibleHeightRatio}
      data-visible-height-measured={profileMeta.visibleSourceHeightFraction}
      data-top-anchor-percent={profileMeta.topAnchorPercent}
      data-top-anchor-applied={profileMeta.applyTopAnchor}
      data-viewport-height-percent={profileMeta.viewportHeightPercent}
      data-reality-width-comp={
        display?.reality.widthCompensation.toFixed(4) ?? "n/a"
      }
      data-reality-height-comp={
        display?.reality.heightCompensation.toFixed(4) ?? "n/a"
      }
      style={styles.stageStyle}
    >
      <div className="visible-garment-frame" style={styles.frameStyle}>
        <div
          className="visible-garment-viewport"
          style={
            realityStyles
              ? { ...styles.viewportStyle, ...realityStyles.viewportStyle }
              : styles.viewportStyle
          }
        >
          {display && realityStyles ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={display.garmentAssetUrl}
                alt=""
                aria-hidden
                className="visible-garment-base"
                style={realityStyles.garmentImageStyle}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={display.mockupArtworkUrl}
                alt={alt}
                className="visible-garment-artwork"
                style={realityStyles.artworkImageStyle}
              />
            </>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={productUrl}
              alt={alt}
              className="visible-garment-mockup"
              style={styles.imageStyle}
            />
          )}
        </div>
      </div>
    </div>
  );
}
