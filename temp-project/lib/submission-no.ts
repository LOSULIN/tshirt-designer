import type { createAdminClient } from "@/lib/supabase/admin";

export type SubmissionNoType = "FD" | "PD" | "CT";

const TAIPEI_TIME_ZONE = "Asia/Taipei";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export function formatSubmissionDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TAIPEI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";

  return `${year}${month}${day}`;
}

export function buildSubmissionNoPrefix(
  type: SubmissionNoType,
  date: Date = new Date(),
): string {
  return `${type}-${formatSubmissionDateKey(date)}`;
}

export function formatSubmissionDisplayLabel(
  submissionNo: string,
  applicantName?: string | null,
): string {
  const name = applicantName?.trim();
  return name ? `${submissionNo} / ${name}` : submissionNo;
}

function parseSequenceFromSubmissionNo(submissionNo: string): number | null {
  const match = submissionNo.match(/-(\d{4})$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

async function getLatestSubmissionNo(
  supabase: SupabaseAdmin,
  type: SubmissionNoType,
  datePrefix: string,
): Promise<string | null> {
  if (type === "PD") {
    const { data, error } = await supabase
      .from("submissions")
      .select("submission_no")
      .like("submission_no", `${datePrefix}-%`)
      .order("submission_no", { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    return data?.[0]?.submission_no ?? null;
  }

  const { data, error } = await supabase
    .from("design_submissions")
    .select("submission_no")
    .eq("submission_type", type === "FD" ? "normal" : "contest")
    .like("submission_no", `${datePrefix}-%`)
    .order("submission_no", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0]?.submission_no ?? null;
}

export async function allocateSubmissionNo(
  supabase: SupabaseAdmin,
  type: SubmissionNoType,
  date: Date = new Date(),
): Promise<string> {
  const datePrefix = buildSubmissionNoPrefix(type, date);
  const latest = await getLatestSubmissionNo(supabase, type, datePrefix);
  const nextSequence =
    latest && parseSequenceFromSubmissionNo(latest) !== null
      ? (parseSequenceFromSubmissionNo(latest) as number) + 1
      : 1;

  return `${datePrefix}-${String(nextSequence).padStart(4, "0")}`;
}

export function isSubmissionNoConflict(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "23505" &&
    Boolean(error.message?.includes("submission_no"))
  );
}
