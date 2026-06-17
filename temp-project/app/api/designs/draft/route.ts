import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  DRAFT_TTL_MS,
  extractShirtColorFromDesignJson,
  normalizeShirtColor,
} from "@/lib/constants";
import { validateOptionalUploadBlobSize } from "@/lib/upload-limits";
import { createAdminClient, DESIGNS_BUCKET } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const draftId = (formData.get("draftId") as string) || nanoid(12);
    const designJson = formData.get("designJson");
    const textJson = formData.get("textJson");
    const preview = formData.get("preview");

    if (typeof designJson !== "string") {
      return NextResponse.json({ error: "缺少設計設定" }, { status: 400 });
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + DRAFT_TTL_MS);
    const basePath = `drafts/${draftId}`;
    const supabase = createAdminClient();

    const configBuffer = Buffer.from(designJson, "utf-8");
    const { error: jsonError } = await supabase.storage
      .from(DESIGNS_BUCKET)
      .upload(`${basePath}/design.json`, configBuffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (jsonError) {
      return NextResponse.json(
        { error: jsonError.message },
        { status: 500 },
      );
    }

    if (typeof textJson === "string" && textJson.length > 0) {
      const textBuffer = Buffer.from(textJson, "utf-8");
      await supabase.storage
        .from(DESIGNS_BUCKET)
        .upload(`${basePath}/texts.json`, textBuffer, {
          contentType: "application/json",
          upsert: true,
        });
    }

    if (preview instanceof Blob && preview.size > 0) {
      const previewBuffer = Buffer.from(await preview.arrayBuffer());
      await supabase.storage
        .from(DESIGNS_BUCKET)
        .upload(`${basePath}/preview.png`, previewBuffer, {
          contentType: "image/png",
          upsert: true,
        });
    }

    const original = formData.get("original");
    if (original instanceof Blob && original.size > 0) {
      const sizeCheck = validateOptionalUploadBlobSize(original);
      if (!sizeCheck.ok) {
        return NextResponse.json({ error: sizeCheck.error }, { status: 400 });
      }

      const ext = original.type === "image/png" ? "png" : "jpg";
      const originalBuffer = Buffer.from(await original.arrayBuffer());
      await supabase.storage
        .from(DESIGNS_BUCKET)
        .upload(`${basePath}/original.${ext}`, originalBuffer, {
          contentType: original.type || "application/octet-stream",
          upsert: true,
        });
    }

    const parsed = JSON.parse(designJson) as {
      templateType: string;
      side: string;
      activeGender?: string;
      activeSide?: string;
    };

    const shirtColor = normalizeShirtColor(
      extractShirtColorFromDesignJson(designJson),
    );

    await supabase.from("design_submissions").upsert(
      {
        id: draftId,
        created_at: createdAt.toISOString(),
        template_type: parsed.activeGender ?? parsed.templateType,
        side: parsed.activeSide ?? parsed.side,
        status: "draft",
        storage_path: basePath,
        expires_at: expiresAt.toISOString(),
        submission_type: "normal",
        review_status: null,
        shirt_color: shirtColor,
      },
      { onConflict: "id" },
    );

    return NextResponse.json({
      draftId,
      savedAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "暫存失敗",
      },
      { status: 500 },
    );
  }
}
