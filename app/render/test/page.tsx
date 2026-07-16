import { RenderValidation } from "@/components/render/RenderValidation";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata = {
  title: "Render Validation | TIIIGO",
  description: "Render Engine 商品渲染驗證（RC-1）",
};

export default function RenderTestPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <LandingNav />
      <RenderValidation />
    </div>
  );
}
