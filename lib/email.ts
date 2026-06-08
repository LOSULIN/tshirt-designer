import { Resend } from "resend";

export async function sendDesignSubmittedEmail(params: {
  designId: string;
  createdAt: string;
  templateType: string;
  side: string;
  applicant?: {
    applicantName?: string;
    applicantEmail?: string;
    applicantPhone?: string;
    notes?: string;
  } | null;
  fileLinks: {
    completed: string;
    completedAll?: Record<string, string>;
    original: string;
    config: string;
    texts?: string;
    applicant?: string;
  };
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!adminEmail) {
    console.warn("ADMIN_EMAIL 未設定，略過寄信");
    return;
  }

  const applicantBlock = params.applicant
    ? `
    <h3>申請人資訊</h3>
    <p><strong>姓名：</strong>${params.applicant.applicantName ?? "-"}</p>
    <p><strong>Email：</strong>${params.applicant.applicantEmail ?? "-"}</p>
    <p><strong>電話：</strong>${params.applicant.applicantPhone ?? "-"}</p>
    <p><strong>備註：</strong>${params.applicant.notes ?? "-"}</p>
  `
    : "";

  const subject = `新設計申請 - ${params.designId}`;
  const html = `
    <h2>服飾設計申請已送出</h2>
    <p><strong>設計編號：</strong>${params.designId}</p>
    <p><strong>建立時間：</strong>${params.createdAt}</p>
    <p><strong>模板類型：</strong>${params.templateType}</p>
    <p><strong>面向：</strong>${params.side}</p>
    ${applicantBlock}
    <h3>雲端檔案連結（7 天有效）</h3>
    <ul>
      <li><a href="${params.fileLinks.completed}">設計完成圖（目前面向）</a></li>
      ${
        params.fileLinks.completedAll
          ? Object.entries(params.fileLinks.completedAll)
              .map(
                ([name, url]) =>
                  `<li><a href="${url}">設計完成圖 · ${name}</a></li>`,
              )
              .join("")
          : ""
      }
      <li><a href="${params.fileLinks.original}">原始圖片</a></li>
      <li><a href="${params.fileLinks.config}">設計設定 JSON</a></li>
      ${
        params.fileLinks.texts
          ? `<li><a href="${params.fileLinks.texts}">文字圖層 JSON</a></li>`
          : ""
      }
      ${
        params.fileLinks.applicant
          ? `<li><a href="${params.fileLinks.applicant}">申請人資訊 JSON</a></li>`
          : ""
      }
    </ul>
  `;

  if (!resendKey) {
    console.warn("RESEND_API_KEY 未設定，略過寄信", { subject, adminEmail });
    return;
  }

  const resend = new Resend(resendKey);
  const recipients = [adminEmail];
  if (params.applicant?.applicantEmail) {
    recipients.push(params.applicant.applicantEmail);
  }

  await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject,
    html,
  });
}
