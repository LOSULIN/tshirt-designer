import {
  formatFileSize,
  getFileFormat,
} from "./pro-upload";
import { MAX_FILE_SIZE_BYTES } from "./constants";

export type ProUploadFileKind = "pdf" | "psd" | "ai";

export type ProUploadCheckResult = {
  label: string;
  value: string;
  passed: boolean;
};

export type ProUploadInspection = {
  kind: ProUploadFileKind;
  name: string;
  format: string;
  size: string;
  checks: ProUploadCheckResult[];
};

function buildChecks(
  format: string,
  size: string,
  fileSizeBytes: number,
): ProUploadCheckResult[] {
  const sizeOk = fileSizeBytes <= MAX_FILE_SIZE_BYTES;
  return [
    { label: "檔案格式", value: format, passed: true },
    { label: "檔案大小", value: size, passed: sizeOk },
    {
      label: "商品尺寸",
      value: "深度解析即將支援",
      passed: false,
    },
  ];
}

export function getProUploadFileKind(file: File): ProUploadFileKind | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "psd") return "psd";
  if (ext === "ai") return "ai";
  return null;
}

function inspectPdf(file: File): ProUploadInspection {
  const size = formatFileSize(file.size);
  const format = getFileFormat(file);

  return {
    kind: "pdf",
    name: file.name,
    format,
    size,
    checks: buildChecks(format, size, file.size),
  };
}

function inspectPsd(file: File): ProUploadInspection {
  const size = formatFileSize(file.size);
  const format = getFileFormat(file);

  return {
    kind: "psd",
    name: file.name,
    format,
    size,
    checks: buildChecks(format, size, file.size),
  };
}

function inspectAi(file: File): ProUploadInspection {
  const size = formatFileSize(file.size);
  const format = getFileFormat(file);

  return {
    kind: "ai",
    name: file.name,
    format,
    size,
    checks: buildChecks(format, size, file.size),
  };
}

export async function inspectProUploadFile(file: File): Promise<ProUploadInspection> {
  const kind = getProUploadFileKind(file);

  switch (kind) {
    case "pdf":
      return inspectPdf(file);
    case "psd":
      return inspectPsd(file);
    case "ai":
      return inspectAi(file);
    default:
      throw new Error("Unsupported pro upload file type");
  }
}
