import {
  DEFAULT_PRODUCT_ID,
  type DefaultProductId,
  type ModelType,
} from "./product-api-constants";
import { validateCaseForm, type ProUploadCaseFormData } from "./pro-upload-case";
import type { ProUploadInspection } from "./pro-upload-inspect";
import { isAllowedProUploadFile } from "./pro-upload";

const ALLOWED_FITS = new Set<ModelType>(["male", "female", "child"]);

export const PRO_UPLOAD_DEFAULT_PRINT_SIDE = "front" as const;

export type ProUploadSubmissionPayload = {
  product: DefaultProductId;
  fit: ModelType;
  inspection: ProUploadInspection;
  caseForm: ProUploadCaseFormData;
};

export function parseSubmissionPayload(
  raw: string,
): { ok: true; data: ProUploadSubmissionPayload } | { ok: false; error: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "申請資料格式錯誤" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "申請資料格式錯誤" };
  }

  const record = parsed as Record<string, unknown>;
  const fit = record.fit;
  const inspection = record.inspection;
  const caseForm = record.caseForm;

  if (typeof fit !== "string" || !ALLOWED_FITS.has(fit as ModelType)) {
    return { ok: false, error: "版型資料不正確" };
  }

  if (!inspection || typeof inspection !== "object") {
    return { ok: false, error: "檔案檢查資料不完整" };
  }

  const inspectionRecord = inspection as ProUploadInspection;
  if (
    typeof inspectionRecord.name !== "string" ||
    typeof inspectionRecord.format !== "string" ||
    typeof inspectionRecord.size !== "string" ||
    !Array.isArray(inspectionRecord.checks)
  ) {
    return { ok: false, error: "檔案檢查資料不完整" };
  }

  if (!caseForm || typeof caseForm !== "object") {
    return { ok: false, error: "客戶資料不完整" };
  }

  const form = caseForm as ProUploadCaseFormData;
  const validation = validateCaseForm(form);
  if (!validation.valid) {
    return { ok: false, error: "客戶資料不完整" };
  }

  return {
    ok: true,
    data: {
      product: DEFAULT_PRODUCT_ID,
      fit: fit as ModelType,
      inspection: inspectionRecord,
      caseForm: form,
    },
  };
}

export function getDesignFileContentType(file: File): string {
  if (file.type) return file.type;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "psd") return "image/vnd.adobe.photoshop";
  if (ext === "ai") return "application/postscript";
  return "application/octet-stream";
}

export function getDesignFileExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "bin";
}

export function validateDesignFile(file: File | null): file is File {
  return file instanceof File && file.size > 0 && isAllowedProUploadFile(file);
}
