import type { DesignLayer } from "@/lib/types";

function basenameWithoutExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function labelFromImageFileName(fileName: string): string {
  const base = basenameWithoutExtension(fileName).toLowerCase();

  if (base.endsWith(".svg") || fileName.toLowerCase().endsWith(".svg")) {
    return "SVG";
  }
  if (base.includes("logo")) return "Logo";
  if (base.includes("banner")) return "Banner";

  if (/^img[_\-\s]?\d+/i.test(base) || /^dsc\d+/i.test(base) || /^image\d*$/i.test(base)) {
    return "圖片";
  }

  const alpha = basenameWithoutExtension(fileName).replace(/[_\-\s]+/g, " ").trim();
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(alpha)) {
    return titleCaseWord(alpha);
  }

  return "圖片";
}

/** UI-only layer list label — does not mutate layer.name */
export function getLayerDisplayLabel(layer: DesignLayer): string {
  if (layer.type === "text") {
    const text = layer.text.trim() || "文字";
    if (text.length > 10) {
      return `${text.slice(0, 10)}…`;
    }
    return text;
  }

  if (layer.type === "image") {
    return labelFromImageFileName(layer.image.fileName);
  }

  if (layer.shapeKind === "rectangle") return "矩形";
  if (layer.shapeKind === "circle") return "圓形";
  if (layer.shapeKind === "line") return "線條";
  return "圖形";
}
