/**
 * Proof Engine domain types & leaf constants.
 * No dependency on @/lib/constants or coordinate runtimes.
 */

import type { ShirtColor } from "@/lib/shirt-color";
import { getShirtColorName } from "@/lib/shirt-color";

export type { ShirtColor };
export { getShirtColorName };

export type Gender = "male" | "female" | "child-male" | "child-female";
export type Side = "front" | "back";

export type Size =
  | "90"
  | "110"
  | "130"
  | "150"
  | "160"
  | "GS"
  | "GM"
  | "GL"
  | "S"
  | "M"
  | "L"
  | "XL"
  | "XXL"
  | "XXXL"
  | "XS"
  | "2XL";

export const EXPORT_DPI = 300;

export const PRODUCT_NAME = "TIIIGO 經典純棉短袖 T-Shirt";

export function getProductName(): string {
  return PRODUCT_NAME;
}

export const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: "male", label: "男生" },
  { id: "female", label: "女生" },
  { id: "child-male", label: "男生孩童" },
  { id: "child-female", label: "女生孩童" },
];

const MATERIAL_LABEL = "100% 精梳純棉｜重磅厚棉 290g";

export function resolveMaterialLabelFromDesignMeta(
  designMeta?: Record<string, unknown> | null,
): string {
  return designMeta?.material === "combed-cotton-180" ? MATERIAL_LABEL : MATERIAL_LABEL;
}
