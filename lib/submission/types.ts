/**
 * Submission foundation types — server-only (Phase 29-1C).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ProofArtifactsInput,
  ProofEngineContext,
  ProofInternalFiles,
  ProofPackage,
} from "@/lib/proof-engine/types";
import type { SubmissionLifecycleStatus } from "./status";

export type SubmissionTable = "design_submissions" | "submissions";

export interface SubmissionRepositoryContext {
  supabase: SupabaseClient;
}

export interface CreateDesignSubmissionInput {
  id: string;
  created_at: string;
  template_type: string;
  side: string;
  storage_path: string;
  submission_type: "normal" | "contest";
  submission_no: string;
  shirt_color: string;
  proof_version?: number;
  expires_at?: string | null;
  review_status?: string | null;
  preview_front_url?: string | null;
  preview_back_url?: string | null;
  design_name?: string | null;
  description?: string | null;
  author_name?: string | null;
  author_email?: string | null;
  product_type?: string | null;
}

export interface CreateProSubmissionInput {
  id: string;
  created_at: string;
  submission_no: string;
  storage_path: string;
  product: string;
  fit: string;
  print_side: string;
  file_name: string;
  file_format: string;
  file_size_bytes: number;
  file_size_label: string;
  inspection_checks: unknown;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  company_name: string | null;
  tax_id: string | null;
  bulk_order: boolean;
  quantity_range: string | null;
  marketplace_apply: boolean;
  notes: string | null;
}

export interface DesignSubmissionRow {
  id: string;
  created_at: string;
  template_type: string;
  side: string;
  status: string;
  storage_path: string;
  expires_at: string | null;
  submission_type: string;
  submission_no: string | null;
  shirt_color?: string | null;
  proof_version?: number | null;
  proof_package?: ProofPackage | null;
  proof_pdf_url?: string | null;
  review_status?: string | null;
}

export interface ProSubmissionRow {
  id: string;
  created_at: string;
  status: string;
  storage_path: string;
  submission_no: string | null;
}

export interface CreateSubmissionResult {
  submissionNo: string;
  id: string;
}

export interface UpdateDesignSubmissionInput {
  storage_path?: string;
  proof_pdf_url?: string | null;
  proof_package?: ProofPackage | null;
  mockup_front_url?: string | null;
  mockup_back_url?: string | null;
  print_file_url?: string | null;
  status?: string;
}

export interface SubmissionRepository {
  createDesignSubmission(
    ctx: SubmissionRepositoryContext,
    input: CreateDesignSubmissionInput,
    options?: {
      prefix?: "FD" | "CT";
      maxAttempts?: number;
      /** Contest: submission_no is fixed before upload (storage path). */
      fixedSubmissionNo?: boolean;
      /** Normal: storage_path derived from allocated submission_no. */
      resolveStoragePath?: (submissionNo: string) => string;
      /** Normal route uses prefixed insert-failure log line. */
      insertFailureLog?: "prefixed" | "raw";
    },
  ): Promise<CreateSubmissionResult>;

  createProSubmission(
    ctx: SubmissionRepositoryContext,
    input: CreateProSubmissionInput,
    options?: { maxAttempts?: number },
  ): Promise<CreateSubmissionResult>;

  findDesignSubmission(
    ctx: SubmissionRepositoryContext,
    id: string,
  ): Promise<DesignSubmissionRow | null>;

  findProSubmission(
    ctx: SubmissionRepositoryContext,
    id: string,
  ): Promise<ProSubmissionRow | null>;

  updateDesignSubmission(
    ctx: SubmissionRepositoryContext,
    id: string,
    patch: UpdateDesignSubmissionInput,
  ): Promise<void>;

  markSubmitted(
    ctx: SubmissionRepositoryContext,
    table: SubmissionTable,
    id: string,
    lifecycle?: SubmissionLifecycleStatus,
  ): Promise<void>;

  markFailed(
    ctx: SubmissionRepositoryContext,
    table: SubmissionTable,
    id: string,
    reason: string,
    lifecycle?: SubmissionLifecycleStatus,
  ): Promise<void>;
}

export interface SubmissionUploadInput {
  ctx: ProofEngineContext;
  submissionNo: string;
  internalFiles: ProofInternalFiles;
  artifacts: ProofArtifactsInput;
}

export interface SubmissionUploadManager {
  uploadFiles(input: SubmissionUploadInput): Promise<void>;
  rollback(ctx: ProofEngineContext, storagePaths: string[]): Promise<void>;
  cleanup(ctx: ProofEngineContext, storageFolder: string): Promise<void>;
}

export type { ProofEngineContext };
