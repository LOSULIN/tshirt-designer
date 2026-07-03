/**
 * Proof Engine — Server API entry (re-export facade only).
 * Submit routes and server scripts import from here, not from client runtime.
 */

export type {
  ProofOrder,
  ProofPackage,
  ProofArtifactsInput,
  ProofEngineContext,
  ProofOrderApplicant,
} from "./types";

export { PROOF_STORAGE_FILES } from "./types";

export type { Gender, ShirtColor, Side, Size } from "./proof-domain";

export {
  EXPORT_DPI,
  GENDER_OPTIONS,
  PRODUCT_NAME,
  getProductName,
  getShirtColorName,
  resolveMaterialLabelFromDesignMeta,
} from "./proof-domain";

export {
  generateProof,
  generateProofDocuments,
  uploadSubmissionFiles,
} from "./generate-proof";

export {
  parseProofArtifactsFromFormData,
  hasProofArtifacts,
} from "./parse-artifacts";

export {
  buildOrderStoragePath,
  buildProofStoragePath,
  buildOrderProofPdfFilename,
  buildOrderZipFilename,
  uploadOrderFile,
  createProofSignedUrl,
} from "./storage-manager";

export { SubmitTiming } from "./submit-timing";

export type { SubmitTimingStep } from "./submit-timing";

export { formatSubmitTimingSummary } from "./submit-timing";

export type { ProofEmailResult } from "./proof-email";

export {
  sendSubmissionAdminEmail,
  sendProofPackageEmails,
} from "./proof-email";
