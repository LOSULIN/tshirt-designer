import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";

export function ContestMaintenanceView() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <LandingNav />
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="max-w-md text-center">
          <p className="text-lg font-medium text-zinc-800">
            徵選投稿專區維護中，敬請期待。
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline"
          >
            返回首頁
          </Link>
        </div>
      </main>
    </div>
  );
}
