import { NextResponse } from "next/server";
import { createAdminClient, DESIGNS_BUCKET } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET 未設定，拒絕執行清理" },
      { status: 503 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: drafts, error } = await supabase
      .from("design_submissions")
      .select("id, storage_path")
      .eq("status", "draft")
      .lt("expires_at", now);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let deleted = 0;

    for (const draft of drafts ?? []) {
      const folder = draft.storage_path as string;
      const { data: files } = await supabase.storage
        .from(DESIGNS_BUCKET)
        .list(folder);

      if (files?.length) {
        const paths = files.map((f) => `${folder}/${f.name}`);
        await supabase.storage.from(DESIGNS_BUCKET).remove(paths);
      }

      await supabase.from("design_submissions").delete().eq("id", draft.id);
      deleted += 1;
    }

    return NextResponse.json({ deleted, checkedAt: now });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "清理失敗",
      },
      { status: 500 },
    );
  }
}
