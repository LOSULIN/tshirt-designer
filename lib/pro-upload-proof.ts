import type { ModelType, Product } from "./constants";
import type { ProUploadInspection } from "./pro-upload-inspect";

export type ProUploadFit = ModelType;

export type ProUploadProductSelection = {
  product: Product;
  fit: ProUploadFit;
};

export type ProofCheckItem = {
  label: string;
  value: string;
  passed: boolean;
};

export const PRO_UPLOAD_PRODUCT_OPTIONS = [
  { id: "basic-tshirt" as const, label: "成人短袖 T-Shirt" },
  { id: "sweatshirt" as const, label: "成人大學T" },
];

export const PRO_UPLOAD_FIT_OPTIONS: { id: ProUploadFit; label: string }[] = [
  { id: "male", label: "男款" },
  { id: "female", label: "女款" },
  { id: "child", label: "兒童款" },
];

const PRO_UPLOAD_PRODUCT_LABELS: Record<Product, string> = {
  "basic-tshirt": "成人短袖 T-Shirt",
  sweatshirt: "成人大學T",
};

const PRO_UPLOAD_FIT_LABELS: Record<ProUploadFit, string> = {
  male: "男款",
  female: "女款",
  child: "兒童款",
};

export function getProductLabel(product: Product): string {
  return PRO_UPLOAD_PRODUCT_LABELS[product];
}

export function getFitLabel(fit: ProUploadFit): string {
  return PRO_UPLOAD_FIT_LABELS[fit];
}

export function deriveProofChecks(inspection: ProUploadInspection): ProofCheckItem[] {
  return inspection.checks.map((check) => ({
    label: check.label,
    value: check.value,
    passed: check.passed,
  }));
}

export function getProofFileInfo(inspection: ProUploadInspection) {
  const productSize =
    inspection.checks.find((check) => check.label === "商品尺寸")?.value ?? "—";

  return {
    name: inspection.name,
    format: inspection.format,
    size: inspection.size,
    productSize,
  };
}
