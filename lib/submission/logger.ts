/**
 * Submission logger — console wrapper with optional correlation context.
 */

export interface SubmissionLoggerContext {
  submissionId?: string;
  submissionNo?: string;
  phase?: string;
}

export class SubmissionLogger {
  private readonly base: SubmissionLoggerContext;

  constructor(context: SubmissionLoggerContext = {}) {
    this.base = context;
  }

  withContext(extra: SubmissionLoggerContext): SubmissionLogger {
    return new SubmissionLogger({ ...this.base, ...extra });
  }

  private format(level: string, message: string): string {
    const parts = [
      "[submission]",
      level,
      this.base.phase,
      this.base.submissionNo,
      this.base.submissionId,
      message,
    ].filter(Boolean);
    return parts.join(" ");
  }

  info(message: string, detail?: unknown): void {
    if (detail !== undefined) {
      console.info(this.format("INFO", message), detail);
    } else {
      console.info(this.format("INFO", message));
    }
  }

  warn(message: string, detail?: unknown): void {
    if (detail !== undefined) {
      console.warn(this.format("WARN", message), detail);
    } else {
      console.warn(this.format("WARN", message));
    }
  }

  error(message: string, detail?: unknown): void {
    if (detail !== undefined) {
      console.error(this.format("ERROR", message), detail);
    } else {
      console.error(this.format("ERROR", message));
    }
  }

  debug(message: string, detail?: unknown): void {
    if (process.env.NODE_ENV === "production") return;
    if (detail !== undefined) {
      console.debug(this.format("DEBUG", message), detail);
    } else {
      console.debug(this.format("DEBUG", message));
    }
  }

  /** Pass-through to console.error (behavior-preserving route refactors). */
  errorRaw(...args: unknown[]): void {
    console.error(...args);
  }

  /** Pass-through to console.warn (behavior-preserving route refactors). */
  warnRaw(...args: unknown[]): void {
    console.warn(...args);
  }
}

export function createSubmissionLogger(
  context?: SubmissionLoggerContext,
): SubmissionLogger {
  return new SubmissionLogger(context);
}
