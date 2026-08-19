import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SMTP_USER) {
    logger.warn("Email service not configured — skipping send");
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "GreenGuard AI <noreply@greenguard.ai>",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info(`Email sent to ${options.to}`);
  } catch (err) {
    logger.error("Failed to send email:", err);
  }
}

// ─── Base Email Shell Helper ──────────────────────────────────────────────────

interface EmailShellOptions {
  title: string;
  recipientName: string;
  badgeText?: string;
  badgeColor?: string;
  heading: string;
  bodyParagraphs: string[];
  detailsTable?: Array<{ label: string; value: string }>;
  highlightBox?: {
    title?: string;
    content: string;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
  };
  ctaButton?: {
    text: string;
    url: string;
  };
  footerNote?: string;
}

function renderEmailShell(opts: EmailShellOptions): string {
  const badgeHtml = opts.badgeText
    ? `<tr>
        <td align="center" style="padding: 0 40px 16px 40px;">
          <span style="display:inline-block;padding:4px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:${opts.badgeColor || "#16A34A"};background-color:${opts.badgeColor ? opts.badgeColor + "18" : "#DCFCE7"};border:1px solid ${opts.badgeColor ? opts.badgeColor + "33" : "#86EFAC"};border-radius:9999px;text-transform:uppercase;letter-spacing:0.5px;">
            ${opts.badgeText}
          </span>
        </td>
      </tr>`
    : "";

  const paragraphsHtml = opts.bodyParagraphs
    .map(
      (p) =>
        `<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#1E293B;">${p}</p>`,
    )
    .join("");

  let tableHtml = "";
  if (opts.detailsTable && opts.detailsTable.length > 0) {
    const rows = opts.detailsTable
      .map(
        (row) =>
          `<tr>
            <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#475569;background-color:#F8FAFC;border-bottom:1px solid #E2E8F0;width:35%;">${row.label}</td>
            <td style="padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0F172A;background-color:#FFFFFF;border-bottom:1px solid #E2E8F0;">${row.value}</td>
          </tr>`,
      )
      .join("");

    tableHtml = `
      <tr>
        <td class="email-padding" style="padding:16px 40px 0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E2E8F0;border-radius:8px;overflow:hidden;border-collapse:collapse;">
            ${rows}
          </table>
        </td>
      </tr>`;
  }

  let highlightHtml = "";
  if (opts.highlightBox) {
    const bg = opts.highlightBox.bgColor || "#F1F5F9";
    const border = opts.highlightBox.borderColor || "#CBD5E1";
    const text = opts.highlightBox.textColor || "#334155";
    highlightHtml = `
      <tr>
        <td class="email-padding" style="padding:20px 40px 0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};border:1px solid ${border};border-radius:8px;">
            <tr>
              <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:22px;color:${text};">
                ${opts.highlightBox.title ? `<div style="font-weight:bold;margin-bottom:6px;font-size:14px;">${opts.highlightBox.title}</div>` : ""}
                <div>${opts.highlightBox.content}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  let buttonHtml = "";
  if (opts.ctaButton) {
    buttonHtml = `
      <tr>
        <td class="email-padding" style="padding:28px 40px 8px 40px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr>
              <td style="border-radius:8px;background-color:#16A34A;">
                <a href="${opts.ctaButton.url}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:8px;">
                  ${opts.ctaButton.text}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="email-padding" style="padding:12px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;text-align:center;">
          <p style="margin:0;font-size:12px;line-height:18px;color:#94A3B8;">Link not clickable? Copy and paste this URL into your browser:<br/><span style="color:#16A34A;word-break:break-all;">${opts.ctaButton.url}</span></p>
        </td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.title}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  body { margin: 0; padding: 0; width: 100% !important; background-color:#F4F7F9; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F7F9;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 1px 3px rgba(15,23,42,0.06);overflow:hidden;">

<!-- Header -->
<tr>
<td class="email-padding" style="padding:36px 40px 20px 40px;text-align:center;border-bottom:1px solid #E2E8F0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px auto;">
<tr>
<td style="width:40px;height:40px;background-color:#16A34A;border-radius:8px;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#FFFFFF;">G</td>
</tr>
</table>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#1E293B;">GreenGuard AI</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748B;margin-top:2px;">Intelligent Environmental Monitoring Platform</div>
</td>
</tr>

<!-- Badge & Heading -->
<tr>
<td class="email-padding" style="padding:28px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;">
  <div style="font-size:20px;font-weight:bold;color:#0F172A;margin-bottom:8px;">${opts.heading}</div>
  <p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#475569;">Hello ${opts.recipientName},</p>
</td>
</tr>
${badgeHtml}

<!-- Body Paragraphs -->
<tr>
<td class="email-padding" style="padding:0 40px;font-family:Arial,Helvetica,sans-serif;">
${paragraphsHtml}
</td>
</tr>

${tableHtml}
${highlightHtml}
${buttonHtml}

<!-- Footer Note -->
${
  opts.footerNote
    ? `<tr>
<td class="email-padding" style="padding:24px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #F1F5F9;margin-top:20px;">
<p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:#64748B;">${opts.footerNote}</p>
</td>
</tr>`
    : ""
}

<!-- Standard Footer -->
<tr>
<td class="email-padding" style="padding:32px 40px 36px 40px;text-align:center;border-top:1px solid #E2E8F0;margin-top:24px;">
<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E293B;">GreenGuard AI</p>
<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748B;">AI-powered Environmental Monitoring Platform</p>
<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94A3B8;">This is an automated operational notification. Please do not reply.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94A3B8;">&copy; 2026 GreenGuard AI. All rights reserved.</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}

// ─── Auth & Profile Email Templates (Preserved) ───────────────────────────────

export function passwordResetEmailHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reset your GreenGuard AI password</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  body { margin: 0; padding: 0; width: 100% !important; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .email-padding { padding-left: 24px !important; padding-right: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F7F9;">
<tr>
<td align="center" style="padding:40px 16px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 1px 3px rgba(15,23,42,0.06);">

<!-- Header -->
<tr>
<td class="email-padding" style="padding:40px 40px 24px 40px;text-align:center;border-bottom:1px solid #E2E8F0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px auto;">
<tr>
<td style="width:40px;height:40px;background-color:#16A34A;border-radius:8px;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#FFFFFF;">G</td>
</tr>
</table>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#1E293B;">GreenGuard AI</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748B;margin-top:4px;">Intelligent Environmental Monitoring Platform</div>
</td>
</tr>

<!-- Greeting -->
<tr>
<td class="email-padding" style="padding:36px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#1E293B;">Hello ${name},</p>
<p style="margin:0 0 8px 0;font-size:15px;line-height:24px;color:#1E293B;">We received a request to reset the password for your GreenGuard AI account.</p>
<p style="margin:0;font-size:15px;line-height:24px;color:#1E293B;">If you requested this action, click the secure button below.</p>
</td>
</tr>

<!-- CTA button -->
<tr>
<td class="email-padding" style="padding:28px 40px 8px 40px;text-align:center;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr>
<td style="border-radius:8px;background-color:#16A34A;">
<a href="${resetUrl}" target="_blank" style="display:inline-block;padding:14px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:8px;">Reset Password</a>
</td>
</tr>
</table>
</td>
</tr>

<!-- Security information -->
<tr>
<td class="email-padding" style="padding:28px 40px 0 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F7F9;border:1px solid #E2E8F0;border-radius:8px;">
<tr>
<td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:22px;color:#64748B;">
<div style="margin-bottom:4px;">&bull;&nbsp; This link expires in 1 hour.</div>
<div style="margin-bottom:4px;">&bull;&nbsp; This link can only be used once.</div>
<div>&bull;&nbsp; For your security, do not share this link with anyone.</div>
</td>
</tr>
</table>
</td>
</tr>

<!-- Fallback link -->
<tr>
<td class="email-padding" style="padding:24px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 8px 0;font-size:13px;line-height:20px;color:#64748B;">Button not working? Copy and paste this URL into your browser:</p>
<p style="margin:0;font-size:13px;line-height:20px;color:#16A34A;word-break:break-all;">${resetUrl}</p>
</td>
</tr>

<!-- Didn't request this -->
<tr>
<td class="email-padding" style="padding:32px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #E2E8F0;">
<p style="margin:24px 0 8px 0;font-size:14px;font-weight:bold;color:#1E293B;">Didn't request this?</p>
<p style="margin:0;font-size:13px;line-height:21px;color:#64748B;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged. If you believe someone attempted to access your account, we recommend changing your password after signing in.</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td class="email-padding" style="padding:32px 40px 40px 40px;text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="border-top:1px solid #E2E8F0;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<p style="margin:24px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E293B;">GreenGuard AI</p>
<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748B;">AI-powered Environmental Monitoring Platform</p>
<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;">This is an automated email. Please do not reply.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;">&copy; 2026 GreenGuard AI. All rights reserved.</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function emailChangeOtpEmailHtml(name: string, otp: string, newEmail: string): string {
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify your new GreenGuard AI email</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  body { margin: 0; padding: 0; width: 100% !important; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .email-padding { padding-left: 24px !important; padding-right: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F7F9;">
<tr>
<td align="center" style="padding:40px 16px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 1px 3px rgba(15,23,42,0.06);">

<tr>
<td class="email-padding" style="padding:40px 40px 24px 40px;text-align:center;border-bottom:1px solid #E2E8F0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px auto;">
<tr>
<td style="width:40px;height:40px;background-color:#16A34A;border-radius:8px;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#FFFFFF;">G</td>
</tr>
</table>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#1E293B;">GreenGuard AI</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748B;margin-top:4px;">Intelligent Environmental Monitoring Platform</div>
</td>
</tr>

<tr>
<td class="email-padding" style="padding:36px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#1E293B;">Hello ${name},</p>
<p style="margin:0;font-size:15px;line-height:24px;color:#1E293B;">Use the verification code below to confirm <strong>${newEmail}</strong> as your new GreenGuard AI account email.</p>
</td>
</tr>

<tr>
<td class="email-padding" style="padding:28px 40px 8px 40px;text-align:center;">
<div style="display:inline-block;padding:18px 36px;background-color:#F4F7F9;border:1px solid #E2E8F0;border-radius:8px;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:bold;letter-spacing:8px;color:#16A34A;">${otp}</div>
</td>
</tr>

<tr>
<td class="email-padding" style="padding:28px 40px 0 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F7F9;border:1px solid #E2E8F0;border-radius:8px;">
<tr>
<td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:22px;color:#64748B;">
<div style="margin-bottom:4px;">&bull;&nbsp; This code expires in 10 minutes.</div>
<div style="margin-bottom:4px;">&bull;&nbsp; Do not share this code with anyone.</div>
<div>&bull;&nbsp; GreenGuard AI staff will never ask you for this code.</div>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="email-padding" style="padding:32px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid #E2E8F0;">
<p style="margin:24px 0 8px 0;font-size:14px;font-weight:bold;color:#1E293B;">Didn't request this?</p>
<p style="margin:0;font-size:13px;line-height:21px;color:#64748B;">If you did not request an email change, you can safely ignore this message — your account email will not change unless this code is entered.</p>
</td>
</tr>

<tr>
<td class="email-padding" style="padding:32px 40px 40px 40px;text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="border-top:1px solid #E2E8F0;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<p style="margin:24px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E293B;">GreenGuard AI</p>
<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748B;">AI-powered Environmental Monitoring Platform</p>
<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;">This is an automated email. Please do not reply.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;">&copy; 2026 GreenGuard AI. All rights reserved.</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}

export function emailChangedNotificationHtml(
  name: string,
  oldEmail: string,
  newEmail: string,
): string {
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your GreenGuard AI email address changed</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  body { margin: 0; padding: 0; width: 100% !important; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .email-padding { padding-left: 24px !important; padding-right: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F7F9;">
<tr>
<td align="center" style="padding:40px 16px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;box-shadow:0 1px 3px rgba(15,23,42,0.06);">

<tr>
<td class="email-padding" style="padding:40px 40px 24px 40px;text-align:center;border-bottom:1px solid #E2E8F0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px auto;">
<tr>
<td style="width:40px;height:40px;background-color:#16A34A;border-radius:8px;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#FFFFFF;">G</td>
</tr>
</table>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#1E293B;">GreenGuard AI</div>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#64748B;margin-top:4px;">Intelligent Environmental Monitoring Platform</div>
</td>
</tr>

<tr>
<td class="email-padding" style="padding:36px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:#1E293B;">Hello ${name},</p>
<p style="margin:0 0 8px 0;font-size:15px;line-height:24px;color:#1E293B;">The email address on your GreenGuard AI account was just changed from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
<p style="margin:0;font-size:15px;line-height:24px;color:#1E293B;">You'll need to sign in again — future logins should use your new email address.</p>
</td>
</tr>

<tr>
<td class="email-padding" style="padding:28px 40px 0 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:8px;">
<tr>
<td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:22px;color:#991B1B;">
If you didn't make this change, your account may be compromised — contact an administrator immediately.
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="email-padding" style="padding:32px 40px 40px 40px;text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="border-top:1px solid #E2E8F0;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<p style="margin:24px 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#1E293B;">GreenGuard AI</p>
<p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748B;">AI-powered Environmental Monitoring Platform</p>
<p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;">This is an automated email. Please do not reply.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;">&copy; 2026 GreenGuard AI. All rights reserved.</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}

// ─── Automation 3 — Complaint Lifecycle Email Templates ───────────────────────

export function complaintSubmittedEmailHtml(params: {
  name: string;
  complaintId: string;
  title: string;
  issueType: string;
  cityId: string;
  locationAddress?: string;
  priority: string;
  viewUrl: string;
}): string {
  const shortId = params.complaintId.slice(-6).toUpperCase();
  return renderEmailShell({
    title: `Complaint Submitted: Ref #GG-${shortId}`,
    recipientName: params.name,
    badgeText: "Report Submitted",
    badgeColor: "#16A34A",
    heading: "Your complaint has been submitted",
    bodyParagraphs: [
      `Your environmental incident report <strong>"${params.title}"</strong> has been successfully registered on GreenGuard AI.`,
      `Our intelligent routing engine and municipal environmental authorities are reviewing your report. You can monitor progress and communicate directly through the portal.`,
    ],
    detailsTable: [
      { label: "Reference ID", value: `#GG-${shortId}` },
      { label: "Issue Category", value: formatIssueType(params.issueType) },
      { label: "Location / Jurisdiction", value: `${params.cityId.toUpperCase()}${params.locationAddress ? ` (${params.locationAddress})` : ""}` },
      { label: "Initial Severity", value: params.priority.toUpperCase() },
      { label: "Submission Date", value: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
    ],
    ctaButton: {
      text: "Track Complaint Status",
      url: params.viewUrl,
    },
    footerNote: "You will receive automatic notifications as your complaint advances through investigation and resolution.",
  });
}

export function complaintAssignedEmailHtml(params: {
  name: string;
  role: "authority" | "citizen";
  complaintId: string;
  title: string;
  issueType: string;
  cityId: string;
  locationAddress?: string;
  priority: string;
  assignmentSource: "automatic" | "manual";
  authorityName?: string;
  viewUrl: string;
}): string {
  const shortId = params.complaintId.slice(-6).toUpperCase();
  const isAuthority = params.role === "authority";

  return renderEmailShell({
    title: isAuthority
      ? `New Complaint Assigned: Ref #GG-${shortId}`
      : `Complaint Assigned for Investigation: Ref #GG-${shortId}`,
    recipientName: params.name,
    badgeText: isAuthority
      ? params.assignmentSource === "automatic" ? "Automated Assignment" : "Manual Assignment"
      : "Under Investigation",
    badgeColor: isAuthority ? "#2563EB" : "#16A34A",
    heading: isAuthority
      ? "A new complaint has been assigned to you"
      : "Your complaint has been assigned for investigation",
    bodyParagraphs: isAuthority
      ? [
          `Complaint <strong>"${params.title}"</strong> (Ref #GG-${shortId}) has been assigned to your department work queue.`,
          `Please begin the preliminary investigation and update the complaint status accordingly.`,
        ]
      : [
          `Your complaint <strong>"${params.title}"</strong> (Ref #GG-${shortId}) has been assigned to <strong>${params.authorityName || "the designated environmental authority"}</strong>.`,
          `Investigation is underway. You will be notified as updates or resolution proposals are submitted.`,
        ],
    detailsTable: [
      { label: "Reference ID", value: `#GG-${shortId}` },
      { label: "Title", value: params.title },
      { label: "Category", value: formatIssueType(params.issueType) },
      { label: "Jurisdiction", value: params.cityId.toUpperCase() },
      { label: "Priority", value: params.priority.toUpperCase() },
      { label: "Assignment Type", value: params.assignmentSource === "automatic" ? "Smart Routing Engine (Automated)" : "Administrator Assignment" },
      ...(isAuthority && params.locationAddress ? [{ label: "Location", value: params.locationAddress }] : []),
    ],
    ctaButton: {
      text: isAuthority ? "Open in Work Queue" : "View Complaint Details",
      url: params.viewUrl,
    },
  });
}

export function investigationStartedEmailHtml(params: {
  name: string;
  complaintId: string;
  title: string;
  cityId: string;
  viewUrl: string;
}): string {
  const shortId = params.complaintId.slice(-6).toUpperCase();
  return renderEmailShell({
    title: `Investigation Started: Ref #GG-${shortId}`,
    recipientName: params.name,
    badgeText: "Investigation in Progress",
    badgeColor: "#0284C7",
    heading: "Investigation is underway",
    bodyParagraphs: [
      `Field officers and authorities have officially commenced investigation into your complaint <strong>"${params.title}"</strong> (Ref #GG-${shortId}).`,
      `Any field findings or evidence logged will be reflected in your complaint timeline.`,
    ],
    detailsTable: [
      { label: "Reference ID", value: `#GG-${shortId}` },
      { label: "Complaint", value: params.title },
      { label: "City", value: params.cityId.toUpperCase() },
      { label: "Status", value: "IN-PROGRESS" },
    ],
    ctaButton: {
      text: "View Investigation Progress",
      url: params.viewUrl,
    },
  });
}

export function resolutionSubmittedEmailHtml(params: {
  name: string;
  role: "citizen" | "administrator" | "authority";
  complaintId: string;
  title: string;
  authorityName?: string;
  resolution: string;
  viewUrl: string;
}): string {
  const shortId = params.complaintId.slice(-6).toUpperCase();

  if (params.role === "citizen") {
    return renderEmailShell({
      title: `Action Required: Review Resolution for Ref #GG-${shortId}`,
      recipientName: params.name,
      badgeText: "Citizen Review Required",
      badgeColor: "#D97706",
      heading: "Resolution submitted for your complaint",
      bodyParagraphs: [
        `The authority <strong>${params.authorityName || "investigating officer"}</strong> has completed work on your complaint <strong>"${params.title}"</strong> and submitted a proposed resolution.`,
        `Please review the resolution below. You can accept the resolution to close the complaint, or request rework if the issue is not satisfactorily resolved.`,
      ],
      highlightBox: {
        title: "Submitted Resolution Summary",
        content: params.resolution,
        bgColor: "#FEF3C7",
        borderColor: "#FCD34D",
        textColor: "#92400E",
      },
      detailsTable: [
        { label: "Reference ID", value: `#GG-${shortId}` },
        { label: "Complaint Title", value: params.title },
        { label: "Submitted Date", value: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
      ],
      ctaButton: {
        text: "Review & Accept / Request Rework",
        url: params.viewUrl,
      },
    });
  }

  // Administrator verification path
  return renderEmailShell({
    title: `Verification Required: Resolution for Ref #GG-${shortId}`,
    recipientName: params.name,
    badgeText: "Admin Verification Required",
    badgeColor: "#7C3AED",
    heading: "Resolution awaiting administrative verification",
    bodyParagraphs: [
      `A revised resolution has been submitted for complaint <strong>"${params.title}"</strong> (Ref #GG-${shortId}) by <strong>${params.authorityName || "assigned authority"}</strong>.`,
      `This complaint has completed rework and requires administrator verification before formal closure.`,
    ],
    highlightBox: {
      title: "Resolution Details",
      content: params.resolution,
      bgColor: "#F5F3FF",
      borderColor: "#DDD6FE",
      textColor: "#5B21B6",
    },
    detailsTable: [
      { label: "Reference ID", value: `#GG-${shortId}` },
      { label: "Complaint Title", value: params.title },
    ],
    ctaButton: {
      text: "Verify Resolution",
      url: params.viewUrl,
    },
  });
}

export function reworkRequestedEmailHtml(params: {
  name: string;
  role: "authority" | "administrator";
  complaintId: string;
  title: string;
  reason: string;
  comments?: string;
  requestedByRole: "citizen" | "admin";
  viewUrl: string;
}): string {
  const shortId = params.complaintId.slice(-6).toUpperCase();
  const isAuthority = params.role === "authority";

  return renderEmailShell({
    title: `Rework Requested: Ref #GG-${shortId}`,
    recipientName: params.name,
    badgeText: "Rework Requested",
    badgeColor: "#DC2626",
    heading: isAuthority
      ? `Resolution returned for rework (${params.requestedByRole === "citizen" ? "Citizen Review" : "Administrator Review"})`
      : "Citizen requested rework on resolved complaint",
    bodyParagraphs: isAuthority
      ? [
          `The resolution submitted for <strong>"${params.title}"</strong> (Ref #GG-${shortId}) was not accepted by the ${params.requestedByRole === "citizen" ? "citizen" : "administrator"} and has been returned for corrective rework.`,
          `Please inspect the feedback below, take remedial action, and resubmit when resolved.`,
        ]
      : [
          `Citizen has requested rework on complaint <strong>"${params.title}"</strong> (Ref #GG-${shortId}).`,
          `The complaint has moved into the rework governance queue for administrative oversight.`,
        ],
    highlightBox: {
      title: "Rework Feedback / Reason",
      content: `${params.reason}${params.comments ? `<br/><br/><strong>Additional Comments:</strong> ${params.comments}` : ""}`,
      bgColor: "#FEF2F2",
      borderColor: "#FECACA",
      textColor: "#991B1B",
    },
    detailsTable: [
      { label: "Reference ID", value: `#GG-${shortId}` },
      { label: "Complaint Title", value: params.title },
      { label: "Returned By", value: params.requestedByRole === "citizen" ? "Citizen (Resolution Review)" : "Administrator" },
    ],
    ctaButton: {
      text: isAuthority ? "Open Case for Rework" : "Open Governance Queue",
      url: params.viewUrl,
    },
  });
}

export function complaintClosedEmailHtml(params: {
  name: string;
  role: "citizen" | "authority";
  complaintId: string;
  title: string;
  closedByReason?: string;
  viewUrl: string;
}): string {
  const shortId = params.complaintId.slice(-6).toUpperCase();
  const isCitizen = params.role === "citizen";

  return renderEmailShell({
    title: `Complaint Closed: Ref #GG-${shortId}`,
    recipientName: params.name,
    badgeText: "Closed & Resolved",
    badgeColor: "#16A34A",
    heading: isCitizen ? "Your complaint has been resolved and closed" : "Complaint successfully verified and closed",
    bodyParagraphs: isCitizen
      ? [
          `Complaint <strong>"${params.title}"</strong> (Ref #GG-${shortId}) has been successfully completed and closed.`,
          `Thank you for contributing to cleaner, healthier, and safer environmental governance with GreenGuard AI.`,
        ]
      : [
          `Resolution for complaint <strong>"${params.title}"</strong> (Ref #GG-${shortId}) has been approved and the complaint is now closed in the system.`,
        ],
    detailsTable: [
      { label: "Reference ID", value: `#GG-${shortId}` },
      { label: "Complaint Title", value: params.title },
      { label: "Closure Status", value: "CLOSED" },
      { label: "Closure Date", value: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
    ],
    ctaButton: {
      text: isCitizen ? "View Closed Record" : "View Case History",
      url: params.viewUrl,
    },
  });
}

export function routingFailedEmailHtml(params: {
  name: string;
  complaintId: string;
  title: string;
  cityId: string;
  reason: string;
  viewUrl: string;
}): string {
  const shortId = params.complaintId.slice(-6).toUpperCase();
  return renderEmailShell({
    title: `Smart Routing Alert: Ref #GG-${shortId}`,
    recipientName: params.name,
    badgeText: "Routing Intervention Required",
    badgeColor: "#EA580C",
    heading: "Complaint requires manual assignment",
    bodyParagraphs: [
      `The Smart Routing Engine could not automatically assign complaint <strong>"${params.title}"</strong> (Ref #GG-${shortId}).`,
      `Please review the incident in the Admin Complaint Management center and assign an eligible authority.`,
    ],
    highlightBox: {
      title: "Routing Diagnostic",
      content: params.reason,
      bgColor: "#FFF7ED",
      borderColor: "#FFEDD5",
      textColor: "#9A3412",
    },
    detailsTable: [
      { label: "Reference ID", value: `#GG-${shortId}` },
      { label: "Jurisdiction", value: params.cityId.toUpperCase() },
    ],
    ctaButton: {
      text: "Assign Authority Manually",
      url: params.viewUrl,
    },
  });
}

export function criticalEscalationEmailHtml(params: {
  name: string;
  role: "administrator" | "authority";
  complaintId: string;
  title: string;
  issueType: string;
  cityId: string;
  priorityScore: number;
  reasons: string[];
  viewUrl: string;
}): string {
  const shortId = params.complaintId.slice(-6).toUpperCase();
  return renderEmailShell({
    title: `CRITICAL ESCALATION: Ref #GG-${shortId}`,
    recipientName: params.name,
    badgeText: "CRITICAL ESCALATION",
    badgeColor: "#DC2626",
    heading: "Immediate Operational Attention Required",
    bodyParagraphs: [
      `Environmental incident <strong>"${params.title}"</strong> (Ref #GG-${shortId}) in <strong>${params.cityId.toUpperCase()}</strong> has been escalated to <strong>CRITICAL PRIORITY</strong> (Risk Score: ${params.priorityScore}/100).`,
      `Critical operational risk detected across multi-source intelligence signals. Please inspect the incident details immediately.`,
    ],
    highlightBox: {
      title: "Contributing Risk Signals",
      content: params.reasons.map((r) => `• ${r}`).join("<br/>"),
      bgColor: "#FEF2F2",
      borderColor: "#FEE2E2",
      textColor: "#991B1B",
    },
    detailsTable: [
      { label: "Reference ID", value: `#GG-${shortId}` },
      { label: "Issue Category", value: formatIssueType(params.issueType) },
      { label: "Jurisdiction", value: params.cityId.toUpperCase() },
      { label: "Priority Score", value: `${params.priorityScore} / 100 (CRITICAL)` },
    ],
    ctaButton: {
      text: params.role === "administrator" ? "Open Governance Escalation Workspace" : "View Assigned Critical Incident",
      url: params.viewUrl,
    },
  });
}

function formatIssueType(type: string): string {
  const map: Record<string, string> = {
    air_pollution: "Air Pollution",
    water_contamination: "Water Contamination",
    open_burning: "Open Burning",
    noise: "Noise Pollution",
    waste_dumping: "Waste Dumping",
    chemical_spill: "Chemical Spill",
    other: "General Environmental Issue",
  };
  return map[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

