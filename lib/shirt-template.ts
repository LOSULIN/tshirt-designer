import type { ShirtColor, Side } from "./constants";
import { isShirtColor, SHIRT_COLORS } from "./constants";

/** 設計器／mockup 平面模板畫布規格（與 SHIRT_CONTAINER_* 一致） */
export const ADULT_TSHIRT_TEMPLATE_SPEC = {
  widthPx: 1024,
  heightPx: 1536,
  format: "png" as const,
  pathPattern: "/templates/adult-tshirt-{color}-{side}.png",
} as const;

/**
 * adult-tshirt 模板實測比例（M 胸寬 50 cm ↔ 腋下量測 612 px）。
 * 僅用於 Preview UI；Production / 匯出仍為 10 mm = 1 design unit。
 */
export const ADULT_TSHIRT_TEMPLATE_CHEST_PX = 612;
export const ADULT_TSHIRT_TEMPLATE_PX_PER_CM = 12.24;

/** Preview 視覺換算：模板上 1 cm 對應多少 px */
export function getTemplatePxPerCm(): number {
  return ADULT_TSHIRT_TEMPLATE_PX_PER_CM;
}

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
