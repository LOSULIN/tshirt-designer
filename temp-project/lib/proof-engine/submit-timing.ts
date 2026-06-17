/**
 * 送出申請流程耗時記錄（sync / background 分開統計）。
 */

export type SubmitTimingStep =
  | "parseFormData"
  | "saveDatabase"
  | "uploadFiles"
  | "generatePdf"
  | "generateMockup"
  | "generateZip"
  | "uploadProofFiles"
  | "sendEmail"
  | "updateDatabase"
  | "total";

const STEP_LABELS: Record<SubmitTimingStep, string> = {
  parseFormData: "Parse FormData",
  saveDatabase: "Save Database",
  uploadFiles: "Upload Files",
  generatePdf: "Generate PDF",
  generateMockup: "Generate Mockup",
  generateZip: "Generate ZIP",
  uploadProofFiles: "Upload Proof Files",
  sendEmail: "Send Email",
  updateDatabase: "Update Database",
  total: "Total Time",
};

export class SubmitTiming {
  private readonly label: string;
  private orderRef: string;
  private readonly startedAt = Date.now();
  private readonly marks = new Map<SubmitTimingStep, number>();
  private lastMark = this.startedAt;

  constructor(label: string, orderRef: string) {
    this.label = label;
    this.orderRef = orderRef;
    this.marks.set("total", this.startedAt);
  }

  setOrderRef(orderRef: string): void {
    this.orderRef = orderRef;
  }

  mark(step: SubmitTimingStep): void {
    const now = Date.now();
    this.marks.set(step, now - this.lastMark);
    this.lastMark = now;
  }

  /** 記錄最後一步到結束的耗時 */
  finish(step: SubmitTimingStep): void {
    this.marks.set(step, Date.now() - this.lastMark);
  }

  getDurations(): Partial<Record<SubmitTimingStep, number>> {
    const total = Date.now() - this.startedAt;
    return { ...Object.fromEntries(this.marks), total };
  }

  log(): void {
    const durations = this.getDurations();
    const lines = (Object.keys(STEP_LABELS) as SubmitTimingStep[])
      .filter((step) => durations[step] !== undefined)
      .map((step) => `  ${STEP_LABELS[step]}: ${durations[step]}ms`);

    console.log(
      `[submit-timing] ${this.label} order=${this.orderRef}\n${lines.join("\n")}`,
    );
  }
}

export function formatSubmitTimingSummary(
  sync: Partial<Record<SubmitTimingStep, number>>,
  background?: Partial<Record<SubmitTimingStep, number>>,
): string {
  const formatBlock = (
    title: string,
    durations: Partial<Record<SubmitTimingStep, number>>,
  ) => {
    const lines = (Object.keys(STEP_LABELS) as SubmitTimingStep[])
      .filter((step) => durations[step] !== undefined)
      .map((step) => `- ${STEP_LABELS[step]}: ${durations[step]}ms`);
    return `${title}\n${lines.join("\n")}`;
  };

  return [
    formatBlock("Sync (blocks user response)", sync),
    background
      ? formatBlock("Background (after success)", background)
      : "Background: scheduled",
  ].join("\n\n");
}
