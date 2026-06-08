import { Resend } from "resend";

export type EmailSkipReason =
  | "missing_admin_email"
  | "missing_resend_key"
  | "send_failed";

export type EmailSendResult =
  | { sent: true; recipients: string[] }
  | { sent: false; reason: EmailSkipReason; message: string };

export function describeEmailSkipReason(reason: EmailSkipReason): string {
  switch (reason) {
    case "missing_admin_email":
      return "未設定 ADMIN_EMAIL，略過 Email 通知";
    case "missing_resend_key":
      return "未設定 RESEND_API_KEY，略過 Email 通知";
    case "send_failed":
      return "Email 寄送失敗";
  }
}

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
}): Promise<EmailSendResult> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!adminEmail) {
    console.warn("ADMIN_EMAIL 未設定，略過寄信");
    return {
      sent: false,
      reason: "missing_admin_email",
      message: describeEmailSkipReason("missing_admin_email"),
    };
  }

  if (!resendKey) {
    console.warn("RESEND_API_KEY 未設定，略過寄信");
    return {
      sent: false,
      reason: "missing_resend_key",
      message: describeEmailSkipReason("missing_resend_key"),
    };
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

  const recipients = [adminEmail];
  if (params.applicant?.applicantEmail) {
    recipients.push(params.applicant.applicantEmail);
  }

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
    });

    return { sent: true, recipients };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "未知寄信錯誤";
    console.error("Email 寄送失敗", error);
    return {
      sent: false,
      reason: "send_failed",
      message: `${describeEmailSkipReason("send_failed")}：${message}`,
    };
  }
}

function formatEmailDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

export async function sendProUploadSubmittedEmail(params: {
  submissionId: string;
  createdAt: string;
  productLabel: string;
  marketplaceApply: boolean;
  applicant: {
    name: string;
    email: string;
    phone: string;
  };
}): Promise<EmailSendResult> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!adminEmail) {
    console.warn("ADMIN_EMAIL 未設定，略過寄信");
    return {
      sent: false,
      reason: "missing_admin_email",
      message: describeEmailSkipReason("missing_admin_email"),
    };
  }

  if (!resendKey) {
    console.warn("RESEND_API_KEY 未設定，略過寄信");
    return {
      sent: false,
      reason: "missing_resend_key",
      message: describeEmailSkipReason("missing_resend_key"),
    };
  }

  const subject = "TIIIGO 新案件通知";
  const html = `
    <h2>TIIIGO 新案件通知</h2>
    <p><strong>案件編號：</strong>${params.submissionId}</p>
    <p><strong>姓名：</strong>${params.applicant.name}</p>
    <p><strong>Email：</strong>${params.applicant.email}</p>
    <p><strong>手機：</strong>${params.applicant.phone}</p>
    <p><strong>商品：</strong>${params.productLabel}</p>
    <p><strong>Marketplace 申請：</strong>${params.marketplaceApply ? "是" : "否"}</p>
    <p><strong>建立時間：</strong>${formatEmailDateTime(params.createdAt)}</p>
  `;

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject,
      html,
    });

    return { sent: true, recipients: [adminEmail] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "未知寄信錯誤";
    console.error("專業交稿 Email 寄送失敗", error);
    return {
      sent: false,
      reason: "send_failed",
      message: `${describeEmailSkipReason("send_failed")}：${message}`,
    };
  }
}
