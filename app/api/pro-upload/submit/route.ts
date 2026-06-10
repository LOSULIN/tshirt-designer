import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sendProUploadSubmittedEmail } from "@/lib/email";
import {
  allocateSubmissionNo,
  isSubmissionNoConflict,
} from "@/lib/submission-no";
import {
  getDesignFileContentType,
  getDesignFileExtension,
  parseSubmissionPayload,
  PRO_UPLOAD_DEFAULT_PRINT_SIDE,
  validateDesignFile,
} from "@/lib/pro-upload-submit";
import { getFitLabel, getProductLabel } from "@/lib/pro-upload-proof";
import { formatDbWriteError } from "@/lib/db-error";
import { createAdminClient, DESIGNS_BUCKET } from "@/lib/supabase/admin";

export const runtime = "nodejs";

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

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(DESIGNS_BUCKET)
      .upload(designPath, fileBuffer, {
        contentType: getDesignFileContentType(file),
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      return NextResponse.json({ error: "檔案上傳失敗" }, { status: 500 });
    }

    let submissionNo = "";
    let insertError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      submissionNo = await allocateSubmissionNo(supabase, "PD");
      const { error } = await supabase.from("submissions").insert({
        id: submissionId,
        created_at: createdAt,
        status: "pending",
        product,
        fit,
        print_side: PRO_UPLOAD_DEFAULT_PRINT_SIDE,
        file_name: inspection.name,
        file_format: inspection.format,
        file_size_bytes: file.size,
        file_size_label: inspection.size,
        storage_path: basePath,
        inspection_checks: inspection.checks,
        applicant_name: caseForm.name.trim(),
        applicant_email: caseForm.email.trim(),
        applicant_phone: caseForm.phone.trim(),
        company_name: caseForm.companyName.trim() || null,
        tax_id: caseForm.taxId.trim() || null,
        bulk_order: caseForm.bulkOrder,
        quantity_range: caseForm.bulkOrder && caseForm.quantityRange
          ? caseForm.quantityRange
          : null,
        marketplace_apply: caseForm.marketplaceApply,
        notes: caseForm.notes.trim() || null,
        submission_no: submissionNo,
      });

      if (!error) {
        insertError = null;
        break;
      }

      insertError = error;
      if (!isSubmissionNoConflict(error) || attempt === 7) {
        console.error(error);
        await supabase.storage.from(DESIGNS_BUCKET).remove([designPath]);
        return NextResponse.json(
          { error: formatDbWriteError(error) },
          { status: 500 },
        );
      }
    }

    if (insertError) {
      console.error(insertError);
      await supabase.storage.from(DESIGNS_BUCKET).remove([designPath]);
      return NextResponse.json(
        { error: formatDbWriteError(insertError) },
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
    console.error(error);
    return NextResponse.json({ error: "送出失敗" }, { status: 500 });
  }
}
