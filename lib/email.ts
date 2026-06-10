import { getShirtColorName, type ShirtColor } from "@/lib/constants";
import { Resend } from "resend";
import { formatSubmissionDisplayLabel } from "@/lib/submission-no";

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
  submissionNo: string;
  createdAt: string;
  templateType: string;
  side: string;
  shirtColor?: string;
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

  const applicantName = params.applicant?.applicantName?.trim();
  const displayLabel = formatSubmissionDisplayLabel(
    params.submissionNo,
    applicantName,
  );
  const subject = applicantName
    ? `【ZIIIGO】新設計投稿｜${applicantName}`
    : "【ZIIIGO】新設計投稿";
  const html = `
    <h2>服飾設計申請已送出</h2>
    <p><strong>設計編號：</strong>${displayLabel}</p>
    <p><strong>建立時間：</strong>${params.createdAt}</p>
    <p><strong>模板類型：</strong>${params.templateType}</p>
    <p><strong>面向：</strong>${params.side}</p>
    ${
      params.shirtColor
        ? `<p><strong>衣服顏色：</strong>${getShirtColorName(params.shirtColor as ShirtColor)}（${params.shirtColor}）</p>`
        : ""
    }
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

function formatResendError(error: unknown): string {
  if (!error) return "未知 Resend 錯誤";
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function logResendError(error: unknown): void {
  console.error("RESEND_ERROR", error);
}

function emailSendFailed(message: string): EmailSendResult {
  return {
    sent: false,
    reason: "send_failed",
    message: `${describeEmailSkipReason("send_failed")}：${message}`,
  };
}

export async function sendProUploadSubmittedEmail(params: {
  submissionNo: string;
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

  const displayLabel = formatSubmissionDisplayLabel(
    params.submissionNo,
    params.applicant.name,
  );
  const subject = "TIIIGO 新案件通知";
  const html = `
    <h2>TIIIGO 新案件通知</h2>
    <p><strong>案件編號：</strong>${displayLabel}</p>
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

export type ContestEmailSendResult = {
  admin: EmailSendResult;
  submitter: EmailSendResult;
};

async function sendContestAdminEmail(params: {
  submissionNo: string;
  createdAt: string;
  designName: string;
  authorName: string;
  authorEmail: string;
  contact: string;
  productLabel: string;
  templateLabel: string;
  side: string;
  previewFrontUrl?: string | null;
  previewBackUrl?: string | null;
}): Promise<EmailSendResult> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!adminEmail) {
    console.warn("ADMIN_EMAIL 未設定，略過徵選投稿管理員通知");
    return {
      sent: false,
      reason: "missing_admin_email",
      message: describeEmailSkipReason("missing_admin_email"),
    };
  }

  if (!resendKey) {
    console.warn("RESEND_API_KEY 未設定，略過徵選投稿管理員通知");
    return {
      sent: false,
      reason: "missing_resend_key",
      message: describeEmailSkipReason("missing_resend_key"),
    };
  }

  const previewLinks = [
    params.previewFrontUrl
      ? `<li><a href="${params.previewFrontUrl}">正面預覽圖</a></li>`
      : "",
    params.previewBackUrl
      ? `<li><a href="${params.previewBackUrl}">背面預覽圖</a></li>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const displayLabel = formatSubmissionDisplayLabel(
    params.submissionNo,
    params.authorName,
  );
  const subject = `徵選投稿新作品 - ${params.submissionNo}`;
  const html = `
    <pre style="font-family: Menlo, Monaco, Consolas, monospace; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">====================
ZIIIGO 徵選投稿通知
====================

申請人：
${params.authorName}

Email：
${params.authorEmail}

投稿時間：
${formatEmailDateTime(params.createdAt)}

作品名稱：
${params.designName}</pre>
    <h2>徵選投稿新作品通知</h2>
    <p><strong>投稿編號：</strong>${displayLabel}</p>
    <p><strong>建立時間：</strong>${formatEmailDateTime(params.createdAt)}</p>
    <p><strong>作品名稱：</strong>${params.designName}</p>
    <p><strong>作者名稱：</strong>${params.authorName}</p>
    <p><strong>作者 Email：</strong>${params.authorEmail}</p>
    <p><strong>聯繫方式：</strong>${params.contact}</p>
    <p><strong>商品：</strong>${params.productLabel}</p>
    <p><strong>版型：</strong>${params.templateLabel}</p>
    <p><strong>印刷面：</strong>${params.side}</p>
    ${previewLinks ? `<h3>預覽圖連結（7 天有效）</h3><ul>${previewLinks}</ul>` : ""}
  `;

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: [adminEmail],
      subject,
      html,
    });

    if (result.error) {
      logResendError(result.error);
      return emailSendFailed(formatResendError(result.error));
    }

    return { sent: true, recipients: [adminEmail] };
  } catch (error) {
    logResendError(error);
    return emailSendFailed(formatResendError(error));
  }
}

async function sendContestSubmitterConfirmationEmail(params: {
  submissionNo: string;
  createdAt: string;
  designName: string;
  authorName: string;
  authorEmail: string;
}): Promise<EmailSendResult> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (!resendKey) {
    console.warn("RESEND_API_KEY 未設定，略過徵選投稿確認信");
    return {
      sent: false,
      reason: "missing_resend_key",
      message: describeEmailSkipReason("missing_resend_key"),
    };
  }

  const displayLabel = formatSubmissionDisplayLabel(
    params.submissionNo,
    params.authorName,
  );
  const subject = `徵選投稿已收到 - ${params.designName}`;
  const html = `
    <h2>投稿成功</h2>
    <p>${params.authorName} 您好，</p>
    <p>我們已收到您的徵選投稿，感謝您的參與！</p>
    <p><strong>投稿編號：</strong>${displayLabel}</p>
    <p><strong>作品名稱：</strong>${params.designName}</p>
    <p><strong>送出時間：</strong>${formatEmailDateTime(params.createdAt)}</p>
    <p>審核結果將另行通知，請耐心等候。</p>
  `;

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: [params.authorEmail],
      subject,
      html,
    });

    if (result.error) {
      logResendError(result.error);
      return emailSendFailed(formatResendError(result.error));
    }

    return { sent: true, recipients: [params.authorEmail] };
  } catch (error) {
    logResendError(error);
    return emailSendFailed(formatResendError(error));
  }
}

export async function sendContestSubmittedEmails(params: {
  submissionNo: string;
  createdAt: string;
  designName: string;
  authorName: string;
  authorEmail: string;
  contact: string;
  productLabel: string;
  templateLabel: string;
  side: string;
  previewFrontUrl?: string | null;
  previewBackUrl?: string | null;
}): Promise<ContestEmailSendResult> {
  console.log("EMAIL_START", {
    submissionNo: params.submissionNo,
    adminEmailConfigured: Boolean(process.env.ADMIN_EMAIL),
    resendKeyConfigured: Boolean(process.env.RESEND_API_KEY),
    submitterEmail: params.authorEmail,
  });

  try {
    const admin = await sendContestAdminEmail(params);
    const submitter = await sendContestSubmitterConfirmationEmail({
      submissionNo: params.submissionNo,
      createdAt: params.createdAt,
      designName: params.designName,
      authorName: params.authorName,
      authorEmail: params.authorEmail,
    });

    if (!admin.sent) {
      console.error("RESEND_ERROR", {
        target: "admin",
        message: admin.message,
      });
    }

    if (!submitter.sent) {
      console.error("RESEND_ERROR", {
        target: "submitter",
        message: submitter.message,
      });
    }

    const result = { admin, submitter };
    console.log("EMAIL_SUCCESS", result);
    return result;
  } catch (error) {
    console.error("RESEND_ERROR", error);
    console.error("EMAIL_FAILED", error);
    throw error;
  }
}
