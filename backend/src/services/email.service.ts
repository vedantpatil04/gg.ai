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

export function passwordResetEmailHtml(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reset your GreenGuard AI password</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<style>table, td { border-collapse: collapse; }</style>
<![endif]-->
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
