"use client";

import { useEffect, useState } from "react";
import type { Gender, Side } from "@/lib/constants";
import { ModelTemplatePlaceholder } from "./ModelTemplatePlaceholder";

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
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setMissing(false);
  }, [src]);

  if (missing) {
    return (
      <ModelTemplatePlaceholder
        gender={gender}
        side={side}
        className={className}
        showGuide={showPlaceholderGuide}
      />
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setMissing(true)}
    />
  );
}
