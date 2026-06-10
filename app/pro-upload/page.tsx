import { ProUploadPageClient } from "@/components/pro-upload/ProUploadPageClient";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata = {
  title: "專業設計師交稿 | TIIIGO",
  description:
    "提交正式設計檔案（PDF、AI、PSD）給 TIIIGO 生產，適用於設計師、品牌主理人、工作室與企業客戶。",
};

export default function ProUploadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <LandingNav />

      <ProUploadPageClient />
    </div>
  );
}
