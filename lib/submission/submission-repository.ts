/**
 * Submission Repository — wraps existing Supabase operations (Phase 29-1C).
 * Does not change DB schema or route behavior until wired in a future phase.
 */

import { formatDbWriteError } from "@/lib/db-error";
import {
  allocateSubmissionNo,
  isSubmissionNoConflict,
} from "@/lib/submission-no";
import { lifecycleToDesignDbStatus, lifecycleToProDbStatus } from "./status";
import { createSubmissionLogger } from "./logger";
import { submissionProfiler } from "./profiler";
import type {
  CreateDesignSubmissionInput,
  CreateProSubmissionInput,
  CreateSubmissionResult,
  DesignSubmissionRow,
  ProSubmissionRow,
  SubmissionRepository,
  SubmissionRepositoryContext,
  SubmissionTable,
  UpdateDesignSubmissionInput,
} from "./types";
import type { SubmissionLifecycleStatus } from "./status";

const DEFAULT_MAX_ATTEMPTS = 8;

export class SupabaseSubmissionRepository implements SubmissionRepository {
  private readonly log = createSubmissionLogger({ phase: "repository" });

  async createDesignSubmission(
    ctx: SubmissionRepositoryContext,
    input: CreateDesignSubmissionInput,
    options?: {
      prefix?: "FD" | "CT";
      maxAttempts?: number;
      fixedSubmissionNo?: boolean;
      resolveStoragePath?: (submissionNo: string) => string;
      insertFailureLog?: "prefixed" | "raw";
    },
  ): Promise<CreateSubmissionResult> {
    return submissionProfiler.run("Repository", "server-sync", async () => {
    const prefix = options?.prefix ?? "FD";
    const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const fixedSubmissionNo = options?.fixedSubmissionNo ?? false;
    const insertFailureLog = options?.insertFailureLog ?? "raw";
    let submissionNo = fixedSubmissionNo ? input.submission_no : "";
    let lastError: { code?: string; message?: string } | null = null;

    const logInsertFailure = (error: unknown) => {
      if (insertFailureLog === "prefixed") {
        this.log.errorRaw("design_submissions insert failed:", error);
      } else {
        this.log.errorRaw(error);
      }
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (!fixedSubmissionNo) {
        submissionNo = await allocateSubmissionNo(ctx.supabase, prefix);
      }
      const storage_path = options?.resolveStoragePath
        ? options.resolveStoragePath(submissionNo)
        : input.storage_path;
      const { error } = await ctx.supabase.from("design_submissions").insert({
        id: input.id,
        created_at: input.created_at,
        template_type: input.template_type,
        side: input.side,
        status: "submitted",
        storage_path,
        expires_at: input.expires_at ?? null,
        submission_type: input.submission_type,
        review_status: input.review_status ?? null,
        submission_no: submissionNo,
        shirt_color: input.shirt_color,
        proof_version: input.proof_version ?? null,
        preview_front_url: input.preview_front_url ?? null,
        preview_back_url: input.preview_back_url ?? null,
        design_name: input.design_name ?? null,
        description: input.description ?? null,
        author_name: input.author_name ?? null,
        author_email: input.author_email ?? null,
        product_type: input.product_type ?? null,
      });

      if (!error) {
        return { id: input.id, submissionNo };
      }

      lastError = error;
      if (!isSubmissionNoConflict(error) || attempt === maxAttempts - 1) {
        logInsertFailure(error);
        throw new Error(formatDbWriteError(error));
      }
    }

    logInsertFailure(lastError);
    throw new Error(formatDbWriteError(lastError ?? { message: "insert failed" }));
    });
  }

  async createProSubmission(
    ctx: SubmissionRepositoryContext,
    input: CreateProSubmissionInput,
    options?: { maxAttempts?: number },
  ): Promise<CreateSubmissionResult> {
    return submissionProfiler.run("Repository", "server-sync", async () => {
    const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    let submissionNo = "";
    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      submissionNo = await allocateSubmissionNo(ctx.supabase, "PD");
      const { error } = await ctx.supabase.from("submissions").insert({
        id: input.id,
        created_at: input.created_at,
        status: "pending",
        product: input.product,
        fit: input.fit,
        print_side: input.print_side,
        file_name: input.file_name,
        file_format: input.file_format,
        file_size_bytes: input.file_size_bytes,
        file_size_label: input.file_size_label,
        storage_path: input.storage_path,
        inspection_checks: input.inspection_checks,
        applicant_name: input.applicant_name,
        applicant_email: input.applicant_email,
        applicant_phone: input.applicant_phone,
        company_name: input.company_name,
        tax_id: input.tax_id,
        bulk_order: input.bulk_order,
        quantity_range: input.quantity_range,
        marketplace_apply: input.marketplace_apply,
        notes: input.notes,
        submission_no: submissionNo,
      });

      if (!error) {
        return { id: input.id, submissionNo };
      }

      lastError = error;
      if (!isSubmissionNoConflict(error) || attempt === maxAttempts - 1) {
        this.log.errorRaw(error);
        throw new Error(formatDbWriteError(error));
      }
    }

    this.log.errorRaw(lastError);
    throw new Error(formatDbWriteError(lastError ?? { message: "insert failed" }));
    });
  }

  async findDesignSubmission(
    ctx: SubmissionRepositoryContext,
    id: string,
  ): Promise<DesignSubmissionRow | null> {
    const { data, error } = await ctx.supabase
      .from("design_submissions")
      .select(
        "id, created_at, template_type, side, status, storage_path, expires_at, submission_type, submission_no, shirt_color, proof_version, proof_package, proof_pdf_url, review_status",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.log.error("findDesignSubmission failed", error);
      throw new Error(formatDbWriteError(error));
    }

    return (data as DesignSubmissionRow | null) ?? null;
  }

  async findProSubmission(
    ctx: SubmissionRepositoryContext,
    id: string,
  ): Promise<ProSubmissionRow | null> {
    const { data, error } = await ctx.supabase
      .from("submissions")
      .select("id, created_at, status, storage_path, submission_no")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.log.error("findProSubmission failed", error);
      throw new Error(formatDbWriteError(error));
    }

    return (data as ProSubmissionRow | null) ?? null;
  }

  async updateDesignSubmission(
    ctx: SubmissionRepositoryContext,
    id: string,
    patch: UpdateDesignSubmissionInput,
  ): Promise<void> {
    const { error } = await ctx.supabase
      .from("design_submissions")
      .update(patch)
      .eq("id", id);

    if (error) {
      this.log.error("updateDesignSubmission failed", { id, error });
      throw new Error(formatDbWriteError(error));
    }
  }

  async markSubmitted(
    ctx: SubmissionRepositoryContext,
    table: SubmissionTable,
    id: string,
    lifecycle: SubmissionLifecycleStatus = "submitted",
  ): Promise<void> {
    if (table === "design_submissions") {
      const dbStatus = lifecycleToDesignDbStatus(lifecycle) ?? "submitted";
      await this.updateDesignSubmission(ctx, id, { status: dbStatus });
      this.log.info("markSubmitted", { table, id, lifecycle, dbStatus });
      return;
    }

    const dbStatus = lifecycleToProDbStatus(lifecycle) ?? "pending";
    const { error } = await ctx.supabase
      .from("submissions")
      .update({ status: dbStatus })
      .eq("id", id);

    if (error) {
      this.log.error("markSubmitted pro failed", { id, error });
      throw new Error(formatDbWriteError(error));
    }

    this.log.info("markSubmitted", { table, id, lifecycle, dbStatus });
  }

  async markFailed(
    ctx: SubmissionRepositoryContext,
    table: SubmissionTable,
    id: string,
    reason: string,
    lifecycle: SubmissionLifecycleStatus = "failed",
  ): Promise<void> {
    this.log.error("markFailed (lifecycle only until schema supports failed)", {
      table,
      id,
      lifecycle,
      reason,
    });

    if (table === "submissions") {
      const dbStatus = lifecycleToProDbStatus(lifecycle);
      if (dbStatus) {
        const { error } = await ctx.supabase
          .from("submissions")
          .update({ status: dbStatus })
          .eq("id", id);
        if (error) {
          throw new Error(formatDbWriteError(error));
        }
      }
    }
    // design_submissions has no failed status — log only
  }
}

export const defaultSubmissionRepository: SubmissionRepository =
  new SupabaseSubmissionRepository();

export function createSubmissionRepository(): SubmissionRepository {
  return new SupabaseSubmissionRepository();
}
