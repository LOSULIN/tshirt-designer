/**
 * 送件通知 — 僅寄一封至 ADMIN_EMAIL（Proof PDF + ZIP 下載連結）。
 */

import {
  GENDER_OPTIONS,
  getShirtColorName,
  type Gender,
} from "./proof-domain";
import {
  getProductCode,
  getProductDisplayName,
  getProductMaterialLabel,
  getProductPrintMethodLabel,
  getProductWeightLabel,
} from "../product-metadata";
import type { EmailSendResult } from "../email";
import { Resend } from "resend";
import type { ProofOrder, ProofPackage } from "./types";

function formatGenderLabel(gender: Gender): string {
  return GENDER_OPTIONS.find((g) => g.id === gender)?.label ?? gender;
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSubmissionAdminEmailHtml(params: {
  order: ProofOrder;
  proofPackage: ProofPackage;
}): string {
  const { order, proofPackage } = params;
  const applicant = order.applicant;

  const applicantBlock = applicant
    ? `
    <h3>申請人（僅存於系統與本信，不出現在 Proof PDF）</h3>
    <p><strong>姓名：</strong>${applicant.applicantName ?? "—"}</p>
    <p><strong>Email：</strong>${applicant.applicantEmail ?? "—"}</p>
    <p><strong>電話：</strong>${applicant.applicantPhone ?? "—"}</p>
    ${
      applicant.notes
        ? `<p><strong>備註：</strong>${applicant.notes}</p>`
        : ""
    }
  `
    : "";

  return `
    <h2>TIIIGO 新設計申請</h2>
    <p>客戶已送出自由設計申請，請使用下方連結下載校稿與完整設計包（7 天有效）。</p>

    <h3>案件資訊</h3>
    <p><strong>案件編號：</strong>${proofPackage.submission_no}</p>
    <p><strong>送件時間：</strong>${formatCreatedAt(proofPackage.created_at)}</p>

    <h3>商品資訊</h3>
    <p><strong>商品名稱：</strong>${getProductDisplayName()}</p>
    <p><strong>商品型號：</strong>${getProductCode()}</p>
    <p><strong>版型／模特：</strong>${formatGenderLabel(order.gender)}</p>
    <p><strong>尺碼：</strong>${order.size}</p>
    <p><strong>材質：</strong>${getProductMaterialLabel()}</p>
    <p><strong>克重：</strong>${getProductWeightLabel()}</p>
    <p><strong>印刷方式：</strong>${getProductPrintMethodLabel()}</p>
    <p><strong>衣服顏色：</strong>${getShirtColorName(order.shirt_color)}</p>
    <p><strong>主設計面向：</strong>${order.active_side === "front" ? "正面" : "背面"}</p>

    <h3>設計資訊</h3>
    <p><strong>Storage：</strong>${proofPackage.storage_path}</p>
    <p><strong>Proof 版本：</strong>v${proofPackage.version}</p>

    ${applicantBlock}

    <h3>下載檔案</h3>
    <ul>
      <li><a href="${proofPackage.pdf_url}" download>Proof PDF（${proofPackage.submission_no}-proof.pdf）</a></li>
      <li><a href="${proofPackage.zip_url}" download>完整設計包 ZIP（${proofPackage.submission_no}.zip）</a></li>
    </ul>
    <p style="color:#666;font-size:12px;">ZIP 內含：Proof PDF、mockup／print 圖檔、客戶原始上傳檔。</p>
  `;
}

async function sendAdminEmail(params: {
  recipients: string[];
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

  if (params.recipients.length === 0) {
    return {
      sent: false,
      reason: "missing_admin_email",
      message: "未設定 ADMIN_EMAIL，略過寄信",
    };
  }

  if (!resendKey) {
    return {
      sent: false,
      reason: "missing_resend_key",
      message: "未設定 RESEND_API_KEY",
    };
  }

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: params.recipients,
      subject: params.subject,
      html: params.html,
    });
    return { sent: true, recipients: params.recipients };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知寄信錯誤";
    return {
      sent: false,
      reason: "send_failed",
      message,
    };
  }
}

export interface ProofEmailResult {
  admin: EmailSendResult;
}

export async function sendSubmissionAdminEmail(params: {
  order: ProofOrder;
  proofPackage: ProofPackage;
}): Promise<ProofEmailResult> {
  const { order, proofPackage } = params;
  const adminEmail = process.env.ADMIN_EMAIL;
  const recipients = adminEmail ? [adminEmail] : [];

  const admin = await sendAdminEmail({
    recipients,
    subject: `【TIIIGO】新設計申請｜${proofPackage.submission_no}`,
    html: buildSubmissionAdminEmailHtml({ order, proofPackage }),
  });

  return { admin };
}

/** @deprecated 使用 sendSubmissionAdminEmail */
export async function sendProofPackageEmails(params: {
  order: ProofOrder;
  proofPackage: ProofPackage;
}): Promise<ProofEmailResult> {
  return sendSubmissionAdminEmail(params);
}
