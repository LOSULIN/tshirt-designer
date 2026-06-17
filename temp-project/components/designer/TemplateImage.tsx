"use client";

import type { Gender, Side } from "@/lib/constants";
import { ProcessedTemplateImage } from "./ProcessedTemplateImage";

export function TemplateImage({
  gender,
  side,
  src,
  alt,
  className = "",
  showPlaceholderGuide = true,
}: {
  gender: Gender;
  side: Side;
  src: string;
  alt: string;
  className?: string;
  showPlaceholderGuide?: boolean;
}) {
  return (
    <ProcessedTemplateImage
      gender={gender}
      side={side}
      src={src}
      alt={alt}
      className={className}
      showPlaceholderGuide={showPlaceholderGuide}
    />
  );
}
