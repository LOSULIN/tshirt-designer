/**
 * Shirt color helpers — leaf module for API routes.
 * No dependency on @/lib/constants or designer runtimes.
 */

export type ShirtColor =
  | "white"
  | "black"
  | "heather-grey"
  | "navy"
  | "royal-blue"
  | "sky-blue"
  | "pink"
  | "hot-pink"
  | "light-yellow"
  | "mustard-green";

const SHIRT_COLOR_IDS = [
  "white",
  "black",
  "heather-grey",
  "navy",
  "royal-blue",
  "sky-blue",
  "pink",
  "hot-pink",
  "light-yellow",
  "mustard-green",
] as const satisfies readonly ShirtColor[];

const SHIRT_COLOR_NAMES: Record<ShirtColor, string> = {
  white: "白色",
  black: "黑色",
  "heather-grey": "麻灰色",
  navy: "丈青色",
  "royal-blue": "翠藍色",
  "sky-blue": "水藍色",
  pink: "粉紅色",
  "hot-pink": "桃紅色",
  "light-yellow": "淺黃色",
  "mustard-green": "芥末綠色",
};

export function getShirtColorName(color: ShirtColor): string {
  return SHIRT_COLOR_NAMES[color] ?? color;
}

export function isShirtColor(value: unknown): value is ShirtColor {
  return (
    typeof value === "string" &&
    SHIRT_COLOR_IDS.some((color) => color === value)
  );
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
