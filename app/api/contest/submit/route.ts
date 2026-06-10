import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  contestFormToDbFields,
  parseContestFormJson,
  parseDesignJsonField,
} from "@/lib/contest-submission";
import {
  extractShirtColorFromDesignJson,
  GENDER_OPTIONS,
  getProductName,
  normalizeShirtColor,
  PRODUCT_ID,
  type Gender,
} from "@/lib/constants";
import { sendContestSubmittedEmails } from "@/lib/email";
import {
  allocateSubmissionNo,
  isSubmissionNoConflict,
} from "@/lib/submission-no";
import { formatDbWriteError } from "@/lib/db-error";
import { createAdminClient, DESIGNS_BUCKET } from "@/lib/supabase/admin";

function formatContestProductLabel(productType: string | null): string {
  if (!productType || productType === PRODUCT_ID) return getProductName();
  return productType;
}

function formatContestTemplateLabel(templateType: string): string {
  return (
    GENDER_OPTIONS.find((option) => option.id === (templateType as Gender))
      ?.label ?? templateType
  );
}

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

async function uploadFile(
  supabase: ReturnType<typeof createAdminClient>,
  path: string,
  body: Buffer,
  contentType: string,
) {
  const { error } = await supabase.storage
    .from(DESIGNS_BUCKET)
    .upload(path, body, {
      contentType,
      upsert: false,
    });

  if (error) throw new Error(error.message);
}

async function uploadPreviewAndGetUrl(
  supabase: ReturnType<typeof createAdminClient>,
  path: string,
  file: File,
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadFile(
    supabase,
    path,
    buffer,
    file.type || "image/png",
  );

  const { data, error } = await supabase.storage
    .from(DESIGNS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "無法建立預覽連結");
  }

  return data.signedUrl;
}

export async function POST(request: Request) {
  let uploadedPaths: string[] = [];

  try {
    const formData = await request.formData();

    const contestFormJson = formData.get("contestFormJson");
    const productType = formData.get("productType");
    const templateType = formData.get("templateType");
    const side = formData.get("side");
    const frontDesignJson = formData.get("frontDesignJson");
    const backDesignJson = formData.get("backDesignJson");
    const previewFront = formData.get("previewFront");
    const previewBack = formData.get("previewBack");

    if (typeof contestFormJson !== "string") {
      return NextResponse.json({ error: "缺少投稿資料" }, { status: 400 });
    }

    if (typeof templateType !== "string" || typeof side !== "string") {
      return NextResponse.json({ error: "缺少模板資訊" }, { status: 400 });
    }

    const parsedForm = parseContestFormJson(contestFormJson);
    if (!parsedForm.ok) {
      return NextResponse.json({ error: parsedForm.error }, { status: 400 });
    }

    const frontJson =
      typeof frontDesignJson === "string"
        ? parseDesignJsonField(frontDesignJson)
        : null;

    const backJson =
      typeof backDesignJson === "string"
        ? parseDesignJsonField(backDesignJson)
        : null;

    if (!frontJson && !backJson) {
      return NextResponse.json(
        { error: "缺少可送出的設計內容" },
        { status: 400 },
      );
    }

    // ======================================================
    // 1. 基本資料
    // ======================================================
    const submissionId = nanoid(12);
    const createdAt = new Date().toISOString();
    const date = createdAt.slice(0, 10).replace(/-/g, "");

    const supabase = createAdminClient();

    const resolvedProductType =
      typeof productType === "string" && productType.trim()
        ? productType.trim()
        : null;

    const dbFields = contestFormToDbFields(
      parsedForm.data,
      resolvedProductType,
    );

    // ======================================================
    // 2. 先產生 submissionNo（關鍵）
    // ======================================================
    const submissionNo = await allocateSubmissionNo(supabase, "CT");
    const random = nanoid(8);

    // ======================================================
    // 3. Storage Path（你要的格式）
    // submitted/20260610/CT-xxxx_xxxxxxxx
    // ======================================================
    const basePath = `submitted/${date}/${submissionNo}_${random}`;

    let previewFrontUrl: string | null = null;
    let previewBackUrl: string | null = null;

    // ======================================================
    // 4. Upload files
    // ======================================================
    if (previewFront instanceof File && previewFront.size > 0) {
      const path = `${basePath}/preview-front.png`;
      previewFrontUrl = await uploadPreviewAndGetUrl(
        supabase,
        path,
        previewFront,
      );
      uploadedPaths.push(path);
    }

    if (previewBack instanceof File && previewBack.size > 0) {
      const path = `${basePath}/preview-back.png`;
      previewBackUrl = await uploadPreviewAndGetUrl(
        supabase,
        path,
        previewBack,
      );
      uploadedPaths.push(path);
    }

    if (frontJson) {
      const path = `${basePath}/design-front.json`;
      await uploadFile(
        supabase,
        path,
        Buffer.from(JSON.stringify(frontJson), "utf-8"),
        "application/json",
      );
      uploadedPaths.push(path);
    }

    if (backJson) {
      const path = `${basePath}/design-back.json`;
      await uploadFile(
        supabase,
        path,
        Buffer.from(JSON.stringify(backJson), "utf-8"),
        "application/json",
      );
      uploadedPaths.push(path);
    }

    const shirtColor = normalizeShirtColor(
      extractShirtColorFromDesignJson(
        typeof frontDesignJson === "string" ? frontDesignJson : "",
      ) ??
        extractShirtColorFromDesignJson(
          typeof backDesignJson === "string" ? backDesignJson : "",
        ),
    );

    // ======================================================
    // 5. DB insert（帶 submissionNo + storagePath）
    // ======================================================
    let insertError: any = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const { error } = await supabase.from("design_submissions").insert({
        id: submissionId,
        created_at: createdAt,
        template_type: templateType,
        side,
        status: "submitted",
        storage_path: basePath,
        expires_at: null,
        preview_front_url: previewFrontUrl,
        preview_back_url: previewBackUrl,
        submission_no: submissionNo,
        shirt_color: shirtColor,
        ...dbFields,
      });

      if (!error) {
        insertError = null;
        break;
      }

      insertError = error;

      if (!isSubmissionNoConflict(error) || attempt === 7) {
        console.error(error);

        if (uploadedPaths.length > 0) {
          await supabase.storage
            .from(DESIGNS_BUCKET)
            .remove(uploadedPaths);
        }

        return NextResponse.json(
          { error: formatDbWriteError(error) },
          { status: 500 },
        );
      }
    }

    if (insertError) {
      console.error("design_submissions contest insert failed:", insertError);
      return NextResponse.json(
        { error: formatDbWriteError(insertError) },
        { status: 500 },
      );
    }

    // ======================================================
    // 6. Email
    // ======================================================
    let emailResult: Awaited<
      ReturnType<typeof sendContestSubmittedEmails>
    >;

    try {
      emailResult = await sendContestSubmittedEmails({
        submissionNo,
        createdAt,
        designName: parsedForm.data.designerName.trim(),
        authorName: parsedForm.data.authorName.trim(),
        authorEmail: parsedForm.data.email.trim(),
        contact: parsedForm.data.contact.trim(),
        productLabel: formatContestProductLabel(resolvedProductType),
        templateLabel: formatContestTemplateLabel(templateType),
        side,
        previewFrontUrl,
        previewBackUrl,
      });
    } catch (error) {
      console.error("EMAIL_FAILED", error);

      emailResult = {
        admin: {
          sent: false,
          reason: "send_failed",
          message: "Email error",
        },
        submitter: {
          sent: false,
          reason: "send_failed",
          message: "Email error",
        },
      };
    }

    // ======================================================
    // 7. Response
    // ======================================================
    return NextResponse.json({
      submissionNo,
      authorName: parsedForm.data.authorName.trim(),
      reviewStatus: "pending",
      storagePath: basePath,
      email: emailResult,
    });
  } catch (error) {
    console.error(error);

    if (uploadedPaths.length > 0) {
      try {
        const supabase = createAdminClient();
        await supabase.storage
          .from(DESIGNS_BUCKET)
          .remove(uploadedPaths);
      } catch (cleanupError) {
        console.error(cleanupError);
      }
    }

    return NextResponse.json(
      { error: "投稿送出失敗" },
      { status: 500 },
    );
  }
}