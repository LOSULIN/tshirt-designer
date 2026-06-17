export type BulkQuantityRange =
  | "1-10"
  | "11-30"
  | "31-50"
  | "51-100"
  | "100+"
  | "";

export const BULK_QUANTITY_OPTIONS: { value: BulkQuantityRange; label: string }[] = [
  { value: "1-10", label: "1-10件" },
  { value: "11-30", label: "11-30件" },
  { value: "31-50", label: "31-50件" },
  { value: "51-100", label: "51-100件" },
  { value: "100+", label: "100件以上" },
];

export type ProUploadCaseFormData = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  taxId: string;
  bulkOrder: boolean;
  quantityRange: BulkQuantityRange;
  marketplaceApply: boolean;
  notes: string;
};

export type ProUploadCaseFormErrors = Partial<
  Record<"name" | "email" | "phone", string>
>;

export function createEmptyCaseForm(): ProUploadCaseFormData {
  return {
    name: "",
    email: "",
    phone: "",
    companyName: "",
    taxId: "",
    bulkOrder: false,
    quantityRange: "",
    marketplaceApply: false,
    notes: "",
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validateCaseForm(form: ProUploadCaseFormData): {
  valid: boolean;
  errors: ProUploadCaseFormErrors;
} {
  const errors: ProUploadCaseFormErrors = {};

  if (!form.name.trim()) {
    errors.name = "請填寫姓名";
  }

  if (!form.email.trim()) {
    errors.email = "請填寫 Email";
  } else if (!isValidEmail(form.email)) {
    errors.email = "Email 格式不正確";
  }

  if (!form.phone.trim()) {
    errors.phone = "請填寫手機";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getQuantityLabel(range: BulkQuantityRange): string {
  return BULK_QUANTITY_OPTIONS.find((option) => option.value === range)?.label ?? "未填寫";
}
