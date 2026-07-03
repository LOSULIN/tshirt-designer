import type { DesignLayer } from "@/lib/types";
import { ds } from "./design-ui";

const iconClass = `${ds.icon.md} shrink-0`;

function ImageIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        className="stroke-zinc-600"
        strokeWidth="1.5"
      />
      <circle cx="9" cy="10" r="1.5" className="fill-zinc-500" />
      <path
        d="M5 17l4.5-4.5 3 3L14 14l5 5"
        className="stroke-zinc-600"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8h12v8H6V8z"
        className="stroke-zinc-600"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 11h6M9 14h4"
        className="stroke-zinc-500"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 7h12M12 7v11M9 18h6"
        className="stroke-zinc-600"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RectangleIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="7"
        width="14"
        height="10"
        rx="1"
        className="stroke-zinc-600"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="6"
        className="stroke-zinc-600"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 17L19 7"
        className="stroke-zinc-600"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LayerTypeIcon({ layer }: { layer: DesignLayer }) {
  if (layer.type === "text") {
    return <TextIcon />;
  }

  if (layer.type === "image") {
    const fileName = layer.image.fileName.toLowerCase();
    const name = layer.name.toLowerCase();
    if (fileName.includes("logo") || name.includes("logo")) {
      return <LogoIcon />;
    }
    return <ImageIcon />;
  }

  if (layer.shapeKind === "rectangle") return <RectangleIcon />;
  if (layer.shapeKind === "circle") return <CircleIcon />;
  if (layer.shapeKind === "line") return <LineIcon />;
  return <RectangleIcon />;
}
