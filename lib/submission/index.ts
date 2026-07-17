/**
 * Submission Reliability Foundation — public API (Phase 29-1C).
 * Server-only; not wired into API routes yet.
 */

export type {
  SubmissionLifecycleStatus,
  DesignSubmissionDbStatus,
  ProSubmissionDbStatus,
} from "./status";
export {
  lifecycleToDesignDbStatus,
  lifecycleToProDbStatus,
} from "./status";

export type {
  SubmissionTable,
  SubmissionRepositoryContext,
  CreateDesignSubmissionInput,
  CreateProSubmissionInput,
  DesignSubmissionRow,
  ProSubmissionRow,
  CreateSubmissionResult,
  UpdateDesignSubmissionInput,
  SubmissionRepository,
  SubmissionUploadInput,
  SubmissionUploadManager,
  ProofEngineContext,
} from "./types";

export {
  SupabaseSubmissionRepository,
  defaultSubmissionRepository,
  createSubmissionRepository,
} from "./submission-repository";

export {
  ProofEngineSubmissionUploadManager,
  defaultSubmissionUploadManager,
  createSubmissionUploadManager,
} from "./upload-manager";

export {
  SubmissionLogger,
  createSubmissionLogger,
  type SubmissionLoggerContext,
} from "./logger";

export type {
  IdempotencyKey,
  IdempotencyClaimStatus,
  IdempotencyClaimResult,
  IdempotencyStore,
} from "./idempotency";
export {
  createNotImplementedIdempotencyStore,
  isIdempotencyImplemented,
} from "./idempotency";

export {
  SubmissionProfiler,
  submissionProfiler,
  createSubmissionProfiler,
  isSubmissionProfilingEnabled,
  type SubmissionProfileEntry,
  type SubmissionProfileScope,
} from "./profiler";
