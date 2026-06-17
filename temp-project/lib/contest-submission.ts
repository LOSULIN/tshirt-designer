export type ContestSubmissionFormData = {
  authorName: string;
  designerName: string;
  contact: string;
  email: string;
};

export type ContestSubmissionFormErrors = Partial<
  Record<keyof ContestSubmissionFormData, string>
>;

export function createEmptyContestSubmissionForm(): ContestSubmissionFormData {
  return {
    authorName: "",
    designerName: "",
    contact: "",
    email: "",
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validateContestSubmissionForm(
  form: ContestSubmissionFormData,
): { valid: boolean; errors: ContestSubmissionFormErrors } {
  const errors: ContestSubmissionFormErrors = {};

  if (!form.authorName.trim()) {
    errors.authorName = "請填寫作者名稱";
  }

  if (!form.designerName.trim()) {
    errors.designerName = "請填寫設計人";
  }

  if (!form.contact.trim()) {
    errors.contact = "請填寫聯繫方式";
  }

  if (!form.email.trim()) {
    errors.email = "請填寫 Email";
  } else if (!isValidEmail(form.email)) {
    errors.email = "Email 格式不正確";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function contestFormToApplicantPayload(form: ContestSubmissionFormData) {
  return {
    mode: "contest" as const,
    authorName: form.authorName.trim(),
    designerName: form.designerName.trim(),
    contact: form.contact.trim(),
    applicantEmail: form.email.trim(),
  };
}

export function contestFormToDbFields(
  form: ContestSubmissionFormData,
  productType: string | null,
) {
  return {
    submission_type: "contest" as const,
    design_name: form.designerName.trim(),
    description: form.contact.trim(),
    author_name: form.authorName.trim(),
    author_email: form.email.trim(),
    product_type: productType,
    review_status: "pending" as const,
  };
}

export function parseContestFormJson(
  raw: string,
): { ok: true; data: ContestSubmissionFormData } | { ok: false; error: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "投稿資料格式錯誤" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "投稿資料格式錯誤" };
  }

  const record = parsed as Record<string, unknown>;
  const form: ContestSubmissionFormData = {
    authorName: typeof record.authorName === "string" ? record.authorName : "",
    designerName: typeof record.designerName === "string" ? record.designerName : "",
    contact: typeof record.contact === "string" ? record.contact : "",
    email: typeof record.email === "string" ? record.email : "",
  };

  const validation = validateContestSubmissionForm(form);
  if (!validation.valid) {
    return { ok: false, error: "投稿資料不完整" };
  }

  return { ok: true, data: form };
}

export function parseDesignJsonField(
  raw: string | null,
): Record<string, unknown> | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
