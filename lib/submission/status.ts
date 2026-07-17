/**
 * Submission lifecycle status — TypeScript only (Phase 29-1C).
 * Does not alter existing DB check constraints.
 */

/** Future pipeline states + mapping targets for reliable submission. */
export type SubmissionLifecycleStatus =
  | "draft"
  | "pending"
  | "uploading"
  | "submitted"
  | "proof_processing"
  | "completed"
  | "failed";

/** Current `design_submissions.status` values (schema constraint). */
export type DesignSubmissionDbStatus = "draft" | "submitted";

/** Current `submissions.status` values (pro upload, schema constraint). */
export type ProSubmissionDbStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected";

/**
 * Maps lifecycle intent to the closest writable DB status today.
 * Routes are unchanged; this is for future wiring only.
 */
export function lifecycleToDesignDbStatus(
  status: SubmissionLifecycleStatus,
): DesignSubmissionDbStatus | null {
  switch (status) {
    case "draft":
      return "draft";
    case "submitted":
    case "uploading":
    case "proof_processing":
    case "completed":
      return "submitted";
    case "pending":
    case "failed":
      return null;
    default:
      return null;
  }
}

export function lifecycleToProDbStatus(
  status: SubmissionLifecycleStatus,
): ProSubmissionDbStatus | null {
  switch (status) {
    case "pending":
    case "uploading":
      return "pending";
    case "submitted":
    case "proof_processing":
    case "completed":
      return "reviewing";
    case "failed":
      return "rejected";
    case "draft":
      return null;
    default:
      return null;
  }
}
