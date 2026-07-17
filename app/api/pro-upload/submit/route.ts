import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sendProUploadSubmittedEmail } from "@/lib/email";
import {
  getDesignFileContentType,
  getDesignFileExtension,
  parseSubmissionPayload,
  PRO_UPLOAD_DEFAULT_PRINT_SIDE,
  validateDesignFile,
} from "@/lib/pro-upload-submit";
import { getFitLabel, getProductLabel } from "@/lib/pro-upload-proof";
import {
  createSubmissionLogger,
  defaultSubmissionRepository,
  defaultSubmissionUploadManager,
} from "@/lib/submission";
import { createAdminClient, DESIGNS_BUCKET } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const log = createSubmissionLogger({ phase: "pro-upload" });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const designFile = formData.get("designFile");
    const submissionJson = formData.get("submissionJson");

    if (typeof submissionJson !== "string") {
      return NextResponse.json({ error: "缺少申請資料" }, { status: 400 });
    }

    const parsed = parseSubmissionPayload(submissionJson);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!(designFile instanceof File) || !validateDesignFile(designFile)) {
      return NextResponse.json({ error: "缺少或無效的設計檔案" }, { status: 400 });
    }

    const file = designFile;
    const { product, fit, inspection, caseForm } = parsed.data;
    const submissionId = nanoid(12);
    const createdAt = new Date().toISOString();
    const ext = getDesignFileExtension(file);
    const basePath = `pro-uploads/${submissionId}`;
    const designPath = `${basePath}/design.${ext}`;
    const supabase = createAdminClient();
    const ctx = { supabase };

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(DESIGNS_BUCKET)
      .upload(designPath, fileBuffer, {
        contentType: getDesignFileContentType(file),
        upsert: false,
      });

    if (uploadError) {
      log.errorRaw(uploadError);
      return NextResponse.json({ error: "檔案上傳失敗" }, { status: 500 });
    }

    let submissionNo: string;
    try {
      const created = await defaultSubmissionRepository.createProSubmission(
        ctx,
        {
          id: submissionId,
          created_at: createdAt,
          submission_no: "",
          storage_path: basePath,
          product,
          fit,
          print_side: PRO_UPLOAD_DEFAULT_PRINT_SIDE,
          file_name: inspection.name,
          file_format: inspection.format,
          file_size_bytes: file.size,
          file_size_label: inspection.size,
          inspection_checks: inspection.checks,
          applicant_name: caseForm.name.trim(),
          applicant_email: caseForm.email.trim(),
          applicant_phone: caseForm.phone.trim(),
          company_name: caseForm.companyName.trim() || null,
          tax_id: caseForm.taxId.trim() || null,
          bulk_order: caseForm.bulkOrder,
          quantity_range:
            caseForm.bulkOrder && caseForm.quantityRange
              ? caseForm.quantityRange
              : null,
          marketplace_apply: caseForm.marketplaceApply,
          notes: caseForm.notes.trim() || null,
        },
      );
      submissionNo = created.submissionNo;
    } catch (error) {
      await defaultSubmissionUploadManager.rollback(ctx, [designPath]);
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "寫入資料庫失敗：未知錯誤",
        },
        { status: 500 },
      );
    }

    const emailResult = await sendProUploadSubmittedEmail({
      submissionNo,
      createdAt,
      productLabel: `${getProductLabel()} · ${getFitLabel(fit)}`,
      marketplaceApply: caseForm.marketplaceApply,
      applicant: {
        name: caseForm.name.trim(),
        email: caseForm.email.trim(),
        phone: caseForm.phone.trim(),
      },
    });

    return NextResponse.json({
      submissionNo,
      createdAt,
      email: emailResult.sent
        ? { sent: true, recipients: emailResult.recipients }
        : {
            sent: false,
            reason: emailResult.reason,
            message: emailResult.message,
          },
    });
  } catch (error) {
    log.errorRaw(error);
    return NextResponse.json({ error: "送出失敗" }, { status: 500 });
  }
}
