import type { ModelType } from "./constants";
import { getProductName, PRODUCT_ID } from "./constants";
import type { ProUploadInspection } from "./pro-upload-inspect";

export type ProUploadFit = ModelType;

export type ProUploadFitSelection = {
  fit: ProUploadFit;
};

/** @deprecated Use ProUploadFitSelection */
export type ProUploadProductSelection = ProUploadFitSelection;

export type ProofCheckItem = {
  label: string;
  value: string;
  passed: boolean;
};

export const PRO_UPLOAD_FIT_OPTIONS: { id: ProUploadFit; label: string }[] = [
  { id: "male", label: "男款" },
  { id: "female", label: "女款" },
  { id: "child", label: "兒童款" },
];

const PRO_UPLOAD_FIT_LABELS: Record<ProUploadFit, string> = {
  male: "男款",
  female: "女款",
  child: "兒童款",
};

export function getProductLabel(): string {
  return getProductName();
}

export function getProductId(): typeof PRODUCT_ID {
  return PRODUCT_ID;
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
