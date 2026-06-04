import { Resend } from "resend";

export async function sendDesignSubmittedEmail(params: {
  designId: string;
  createdAt: string;
  templateType: string;
  side: string;
  fileLinks: {
    completed: string;
    original: string;
    config: string;
    texts?: string;
  };
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!adminEmail) {
    console.warn("ADMIN_EMAIL 未設定，略過寄信");
    return;
  }

  const subject = `新設計已送出 - ${params.designId}`;
  const html = `
    <h2>服飾設計已送出</h2>
    <p><strong>設計編號：</strong>${params.designId}</p>
    <p><strong>建立時間：</strong>${params.createdAt}</p>
    <p><strong>模板類型：</strong>${params.templateType}</p>
    <p><strong>面向：</strong>${params.side}</p>
    <ul>
      <li><a href="${params.fileLinks.completed}">設計完成圖</a></li>
      <li><a href="${params.fileLinks.original}">原始圖片</a></li>
      <li><a href="${params.fileLinks.config}">設計設定 JSON</a></li>
      ${
        params.fileLinks.texts
          ? `<li><a href="${params.fileLinks.texts}">文字圖層 JSON</a></li>`
          : ""
      }
    </ul>
  `;

  if (!resendKey) {
    console.warn("RESEND_API_KEY 未設定，略過寄信", { subject, adminEmail });
    return;
  }

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject,
    html,
  });
}
