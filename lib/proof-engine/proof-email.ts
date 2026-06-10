/**
 * Proof Engine Email — 校稿完成後發送 mockup / pdf / print 連結。
 */

import { getShirtColorName } from "../shirt-template";
import { formatSubmissionDisplayLabel } from "../submission-no";
import type { EmailSendResult } from "../email";
import { Resend } from "resend";
import type { ProofOrder, ProofPackage } from "./types";

export interface ProofEmailRecipients {
  customer: string[];
  internal: string[];
  factory: string[];
}

export function resolveProofEmailRecipients(
  order: ProofOrder,
): ProofEmailRecipients {
  const internal = process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : [];
  const factoryEmail = process.env.FACTORY_EMAIL ?? process.env.ADMIN_EMAIL;
  const factory = factoryEmail ? [factoryEmail] : [];

  const customerEmail = order.applicant?.applicantEmail?.trim();
  const customer = customerEmail ? [customerEmail] : [];

  return { customer, internal, factory };
}

function buildProofEmailHtml(params: {
  order: ProofOrder;
  proofPackage: ProofPackage;
  audience: "customer" | "internal" | "factory";
}): string {
  const { order, proofPackage, audience } = params;
  const displayLabel = formatSubmissionDisplayLabel(
    order.submission_no ?? order.order_id,
    order.applicant?.applicantName,
  );

  const intro =
    audience === "customer"
      ? "您的設計校稿文件已產生，請查閱以下連結（7 天有效）。"
      : audience === "factory"
        ? "新訂單校稿文件已就緒，請使用印刷檔進行生產。"
        : "新設計校稿已透過 Proof Engine 產生。";

  const links = [
    proofPackage.mockup_front_url
      ? `<li><a href="${proofPackage.mockup_front_url}">Mockup — Front</a></li>`
      : "",
    proofPackage.mockup_back_url
      ? `<li><a href="${proofPackage.mockup_back_url}">Mockup — Back</a></li>`
      : "",
    proofPackage.print_file_url
      ? `<li><a href="${proofPackage.print_file_url}">Print File（主面向）</a></li>`
      : "",
    proofPackage.print_back_url
      ? `<li><a href="${proofPackage.print_back_url}">Print File — 另一面向</a></li>`
      : "",
    `<li><a href="${proofPackage.pdf_url}">Proof PDF</a></li>`,
  ].join("");

  return `
    <h2>ZIIIGO Proof Engine</h2>
    <p>${intro}</p>
    <p><strong>訂單／編號：</strong>${displayLabel}</p>
    <p><strong>Order ID：</strong>${proofPackage.order_id}</p>
    <p><strong>Version：</strong>v${proofPackage.version}</p>
    <p><strong>尺碼：</strong>${order.size}</p>
    <p><strong>衣服顏色：</strong>${getShirtColorName(order.shirt_color)}</p>
    <h3>校稿檔案</h3>
    <ul>${links}</ul>
  `;
}

async function sendProofEmailToRecipients(params: {
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
      message: "無收件人，略過寄信",
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

export interface ProofEmailResults {
  customer: EmailSendResult;
  internal: EmailSendResult;
  factory: EmailSendResult;
}

export async function sendProofPackageEmails(params: {
  order: ProofOrder;
  proofPackage: ProofPackage;
}): Promise<ProofEmailResults> {
  const { order, proofPackage } = params;
  const recipients = resolveProofEmailRecipients(order);
  const displayLabel = formatSubmissionDisplayLabel(
    order.submission_no ?? order.order_id,
    order.applicant?.applicantName,
  );

  const [customer, internal, factory] = await Promise.all([
    sendProofEmailToRecipients({
      recipients: recipients.customer,
      subject: `【ZIIIGO】設計校稿已就緒｜${displayLabel}`,
      html: buildProofEmailHtml({ order, proofPackage, audience: "customer" }),
    }),
    sendProofEmailToRecipients({
      recipients: recipients.internal,
      subject: `【ZIIIGO】Proof Engine｜${displayLabel}`,
      html: buildProofEmailHtml({ order, proofPackage, audience: "internal" }),
    }),
    sendProofEmailToRecipients({
      recipients: recipients.factory,
      subject: `【ZIIIGO】工廠印刷檔｜${displayLabel}`,
      html: buildProofEmailHtml({ order, proofPackage, audience: "factory" }),
    }),
  ]);

  return { customer, internal, factory };
}
