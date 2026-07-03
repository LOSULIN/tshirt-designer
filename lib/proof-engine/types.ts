/**
 * Proof Engine — 標準化校稿輸出型別。
 */

import type { Gender, ShirtColor, Side, Size } from "./proof-domain";
import type { DesignLayersByTemplate } from "../types";

export interface ProofOrderApplicant {
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  notes?: string;
}

export interface ProofOrder {
  order_id: string;
  submission_no?: string;
  gender: Gender;
  active_side: Side;
  shirt_color: ShirtColor;
  size: Size;
  layers_by_template: DesignLayersByTemplate;
  applicant?: ProofOrderApplicant | null;
  design_meta?: Record<string, unknown>;
  created_at?: string;
}

export interface ProofArtifactsInput {
  mockups: Partial<Record<Side, Uint8Array | Buffer>>;
  prints: Partial<Record<Side, Uint8Array | Buffer>>;
}

export interface ProofInternalFiles {
  designJson: string;
  textJson?: string;
  applicantJson?: string;
  original?: { buffer: Buffer; filename: string };
}

/** 標準化輸出 schema */
export interface ProofPackage {
  order_id: string;
  submission_no: string;
  version: number;
  storage_path: string;
  pdf_url: string;
  zip_url: string;
  created_at: string;
}

export interface ProofEngineContext {
  supabase: ReturnType<
    typeof import("../supabase/admin").createAdminClient
  >;
  signedUrlTtlSeconds?: number;
}

export const PROOF_STORAGE_FILES = {
  mockupFront: "mockup-front.png",
  mockupBack: "mockup-back.png",
  printFront: "print-front.png",
  printBack: "print-back.png",
  proofPackage: "proof-package.json",
  orderJson: "order.json",
  validationReport: "validation-report.json",
  designJson: "design.json",
  textsJson: "texts.json",
  applicantJson: "applicant.json",
} as const;
