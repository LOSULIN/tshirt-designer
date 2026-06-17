import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  console.log("URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("KEY存在 =", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("缺少 Supabase 環境變數");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const DESIGNS_BUCKET = "designs";