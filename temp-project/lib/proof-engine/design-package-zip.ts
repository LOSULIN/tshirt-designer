/**
 * 完整設計包 ZIP — 供管理端下載。
 */

import JSZip from "jszip";
import { serializeOrderJson, type OrderJsonDocument } from "./order-json";
import { serializeValidationReport, type ValidationReport } from "./validation-report";
import { PROOF_STORAGE_FILES } from "./types";

export interface DesignPackageZipInput {
  submissionNo: string;
  proofPdf: Buffer;
  orderJson: OrderJsonDocument;
  validationReport: ValidationReport;
  mockupFront?: Buffer;
  mockupBack?: Buffer;
  printFront?: Buffer;
  printBack?: Buffer;
  original?: { buffer: Buffer; filename: string };
}

export async function buildDesignPackageZip(
  input: DesignPackageZipInput,
): Promise<Buffer> {
  const zip = new JSZip();
  const { submissionNo } = input;

  zip.file(`${submissionNo}-proof.pdf`, input.proofPdf);
  zip.file(PROOF_STORAGE_FILES.orderJson, serializeOrderJson(input.orderJson));
  zip.file(
    PROOF_STORAGE_FILES.validationReport,
    serializeValidationReport(input.validationReport),
  );

  if (input.mockupFront?.length) {
    zip.file(PROOF_STORAGE_FILES.mockupFront, input.mockupFront);
  }
  if (input.mockupBack?.length) {
    zip.file(PROOF_STORAGE_FILES.mockupBack, input.mockupBack);
  }
  if (input.printFront?.length) {
    zip.file(PROOF_STORAGE_FILES.printFront, input.printFront);
  }
  if (input.printBack?.length) {
    zip.file(PROOF_STORAGE_FILES.printBack, input.printBack);
  }
  if (input.original?.buffer.length) {
    zip.file(input.original.filename, input.original.buffer);
  }

  return Buffer.from(
    await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
  );
}
