import { ContestPageClient } from "@/components/contest/ContestPageClient";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata = {
  title: "徵選投稿專區 | TIIIGO",
  description: "參加 TIIGO 官方設計徵選活動，投稿你的創意作品。",
};

export default function ContestPage() {
  return (
    <div className="flex h-screen flex-col">
      <LandingNav />
      <ContestPageClient />
    </div>
  );
}
