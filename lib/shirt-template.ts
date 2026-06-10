import type { ShirtColor, Side } from "./constants";
import { isShirtColor, SHIRT_COLORS } from "./constants";

/** 成人 T 恤平面／預覽模板路徑：/templates/adult-tshirt-{color}-{side}.png */
export function getAdultTshirtTemplateSrc(
  color: ShirtColor,
  side: Side,
): string {
  return `/templates/adult-tshirt-${color}-${side}.png`;
}

export function getShirtColorName(color: ShirtColor): string {
  return SHIRT_COLORS.find((c) => c.id === color)?.name ?? color;
}

export function normalizeShirtColor(value: unknown): ShirtColor {
  return isShirtColor(value) ? value : "white";
}

export function extractShirtColorFromDesignJson(
  designJson: string,
): ShirtColor | null {
  try {
    const parsed = JSON.parse(designJson) as { shirtColor?: unknown };
    if (isShirtColor(parsed.shirtColor)) {
      return parsed.shirtColor;
    }
  } catch {
    // ignore invalid JSON
  }
  return null;
}

/** 淺色衣服（SVG 備援時用較深描邊） */
export function isLightShirtColor(color: ShirtColor): boolean {
  return (
    color === "white" ||
    color === "heather-grey" ||
    color === "sky-blue" ||
    color === "pink" ||
    color === "light-yellow"
  );
}
