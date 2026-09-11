import nodemailer from "nodemailer";
import { getBaseUrl } from "./utils";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.maileroo.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false, // 587 uses STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendSignupOtpEmail(email: string, otpCode: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .logo-box { display: inline-block; background-color: #84cc16; border-radius: 10px; padding: 6px 14px; font-weight: 800; color: #000; margin-bottom: 24px; font-size: 16px; letter-spacing: -0.02em; }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px; }
          .otp-box { background: linear-gradient(135deg, #0b1324 0%, #172554 100%); border: 2px dashed #84cc16; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0; }
          .otp-label { font-size: 12px; font-weight: 700; color: #84cc16; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
          .otp-code { font-family: monospace, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #ffffff; margin: 0; text-shadow: 0 2px 10px rgba(132, 204, 22, 0.4); }
          .expiry-note { font-size: 13px; color: #cbd5e1; margin-top: 12px; font-weight: 500; }
          .highlight { color: #84cc16; font-weight: 600; }
          .security-note { background-color: rgba(132, 204, 22, 0.08); border-left: 3px solid #84cc16; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #cbd5e1; line-height: 1.5; margin-top: 24px; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-box">Taped</div>
          <h1>Confirm your email address</h1>
          <p>Welcome to Taped! Please use the 6-digit verification code below to complete your registration and activate your account.</p>
          
          <div class="otp-box">
            <div class="otp-label">Verification Code</div>
            <div class="otp-code">${otpCode}</div>
            <div class="expiry-note">Valid for <span class="highlight">10 minutes</span></div>
          </div>

          <div class="security-note">
            <strong>Security Notice:</strong> Never share this code with anyone. Taped employees will never ask for your verification code.
          </div>

          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
            If you did not attempt to sign up for Taped, please disregard this email.
          </p>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Taped. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Taped" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `Your Taped verification code: ${otpCode}`,
    html,
  });
}

export async function sendPasswordResetOtpEmail(email: string, otpCode: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .logo-box { display: inline-block; background-color: #84cc16; border-radius: 10px; padding: 6px 14px; font-weight: 800; color: #000; margin-bottom: 24px; font-size: 16px; letter-spacing: -0.02em; }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px; }
          .otp-box { background: linear-gradient(135deg, #0b1324 0%, #172554 100%); border: 2px dashed #84cc16; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0; }
          .otp-label { font-size: 12px; font-weight: 700; color: #84cc16; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
          .otp-code { font-family: monospace, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #ffffff; margin: 0; text-shadow: 0 2px 10px rgba(132, 204, 22, 0.4); }
          .expiry-note { font-size: 13px; color: #cbd5e1; margin-top: 12px; font-weight: 500; }
          .highlight { color: #84cc16; font-weight: 600; }
          .security-note { background-color: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #fca5a5; line-height: 1.5; margin-top: 24px; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-box">Taped</div>
          <h1>Password Reset Request</h1>
          <p>We received a request to reset the password for your Taped account associated with <strong>${email}</strong>. Use the 6-digit code below to proceed:</p>
          
          <div class="otp-box">
            <div class="otp-label">Password Reset Code</div>
            <div class="otp-code">${otpCode}</div>
            <div class="expiry-note">Valid for <span class="highlight">10 minutes</span></div>
          </div>

          <div class="security-note">
            <strong>Important:</strong> If you did not request a password reset, please ignore this email or update your password immediately if you suspect unauthorized access.
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Taped. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Taped Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: `Your Taped password reset code: ${otpCode}`,
    html,
  });
}

export async function sendVerificationEmail(email: string, token: string, callbackUrl?: string) {
  const baseUrl = getBaseUrl();
  const callbackParam = callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
  const confirmLink = `${baseUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}${callbackParam}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .logo-box { display: inline-block; background-color: #84cc16; border-radius: 12px; padding: 8px 16px; font-weight: bold; color: #000; margin-bottom: 24px; font-size: 18px; }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px; }
          .button { display: inline-block; background-color: #84cc16; color: #09090b; font-weight: 600; font-size: 15px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(132, 204, 22, 0.3); }
          .link-box { background-color: #0f172a; padding: 12px; border-radius: 8px; border: 1px solid #334155; word-break: break-all; font-size: 13px; color: #84cc16; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo-box">Taped</div>
          <h1>Confirm your email address</h1>
          <p>Thank you for registering with Taped! Please click the button below to verify your email address and activate your account.</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${confirmLink}" class="button" target="_blank">Confirm Email Address</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <div class="link-box">${confirmLink}</div>
          <p style="margin-top: 20px;">This verification link will expire in 24 hours. If you did not sign up for Taped, you can safely ignore this email.</p>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Taped. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Taped" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: "Confirm your Taped email address",
    html,
  });
}

export interface SendShareEmailOptions {
  toEmail: string;
  senderName: string;
  organizationName: string;
  targetType: "video" | "folder" | "playlist";
  targetTitle: string;
  shareUrl: string;
  message?: string;
}

export async function sendShareEmail(options: SendShareEmailOptions) {
  const { toEmail, senderName, organizationName, targetType, targetTitle, shareUrl, message } = options;
  const isVideo = targetType === "video";
  const itemTypeName = targetType === "video" ? "video" : targetType === "playlist" ? "playlist" : "folder";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 580px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .org-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #000; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #ffffff; }
          p { font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px; }
          .card { background-color: #0b1324; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .item-title { font-size: 18px; font-weight: 700; color: #84cc16; margin-bottom: 6px; }
          .message-quote { border-left: 3px solid #84cc16; padding-left: 14px; font-style: italic; color: #cbd5e1; margin-top: 12px; font-size: 14px; }
          .button-wrap { text-align: center; margin: 28px 0; }
          .button { display: inline-block; background-color: #84cc16; color: #09090b; font-weight: 700; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(132, 204, 22, 0.4); }
          .link-box { background-color: #0b1324; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; word-break: break-all; font-size: 13px; color: #84cc16; }
          .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="org-badge">${organizationName}</div>
          <h1>${senderName} shared a ${itemTypeName} with you</h1>
          <p>You have been invited to view a ${itemTypeName} hosted by <strong>${organizationName}</strong>.</p>
          
          <div class="card">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700;">Shared ${itemTypeName}</div>
            <div class="item-title">${targetTitle}</div>
            ${message ? `<div class="message-quote">"${message}"</div>` : ''}
          </div>

          <div class="button-wrap">
            <a href="${shareUrl}" class="button" target="_blank">View Shared ${targetType === "video" ? 'Video' : targetType === "playlist" ? 'Playlist' : 'Folder'}</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <div class="link-box">${shareUrl}</div>

          <div class="footer">
            Shared via <strong>${organizationName}</strong> on Taped.<br/>
            &copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${organizationName} via Taped" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `${senderName} shared a ${itemTypeName} with you - ${organizationName}`,
    html,
  });
}

export interface SendOrgInviteEmailOptions {
  toEmail: string;
  senderName: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
}

export async function sendOrgInviteEmail(options: SendOrgInviteEmailOptions) {
  const { toEmail, senderName, organizationName, role, inviteUrl } = options;
  const formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 580px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .org-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #000; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #ffffff; }
          p { font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px; }
          .role-badge { display: inline-block; background-color: rgba(132, 204, 22, 0.15); color: #84cc16; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; margin: 0 2px; }
          .button-wrap { text-align: center; margin: 28px 0; }
          .button { display: inline-block; background-color: #84cc16; color: #09090b; font-weight: 700; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(132, 204, 22, 0.4); }
          .link-box { background-color: #0b1324; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; word-break: break-all; font-size: 13px; color: #84cc16; }
          .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="org-badge">${organizationName}</div>
          <h1>Join ${organizationName} on Taped</h1>
          <p><strong>${senderName}</strong> has invited you to join <strong>${organizationName}</strong> as a <span class="role-badge">${formattedRole}</span>.</p>
          
          <div class="button-wrap">
            <a href="${inviteUrl}" class="button" target="_blank">Accept Invitation</a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <div class="link-box">${inviteUrl}</div>

          <div class="footer">
            Invited to <strong>${organizationName}</strong> on Taped.<br/>
            &copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${organizationName} via Taped" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Invitation to join ${organizationName} on Taped`,
    html,
  });
}

export interface SendMeetingInvitationEmailOptions {
  toEmail: string;
  hostName: string;
  meetingTitle: string;
  meetingDescription?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  joinUrl: string;
  meetingId: string;
  organizationName: string;
}

export async function sendMeetingInvitationEmail(options: SendMeetingInvitationEmailOptions) {
  const {
    toEmail,
    hostName,
    meetingTitle,
    meetingDescription,
    scheduledStart,
    scheduledEnd,
    joinUrl,
    meetingId,
    organizationName,
  } = options;

  if (!toEmail || !toEmail.includes("@")) {
    throw new Error(`Invalid recipient email address: ${toEmail}`);
  }

  let formattedTime = "Instant Meeting (Happening Now)";
  if (scheduledStart) {
    const d = new Date(scheduledStart);
    if (!isNaN(d.getTime())) {
      try {
        formattedTime = new Intl.DateTimeFormat("en-US", {
          dateStyle: "full",
          timeStyle: "short",
        }).format(d);
      } catch {
        formattedTime = d.toLocaleString();
      }
    }
  }

  const cleanHostName = (hostName || "Host").replace(/["\r\n]/g, "'").trim();
  const cleanOrgName = (organizationName || "Taped").replace(/["\r\n]/g, "'").trim();
  const cleanMeetingTitle = (meetingTitle || "Video Meeting").replace(/[\r\n]/g, " ").trim();
  const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "support@taped.in";

  const textContent = [
    `Meeting Invitation: ${cleanMeetingTitle}`,
    `${cleanHostName} invited you to join a video conference on ${cleanOrgName}.`,
    ``,
    `When: ${formattedTime}`,
    meetingDescription ? `Agenda: ${meetingDescription}` : null,
    `Meeting ID: ${meetingId}`,
    `Join URL: ${joinUrl}`,
    ``,
    `Powered by Taped HD Video Conferencing`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 580px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #000; font-weight: 800; font-size: 13px; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 8px; color: #ffffff; }
          .host-sub { font-size: 14px; color: #94a3b8; margin: 0 0 24px; }
          .details-card { background-color: #0b1324; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 28px; }
          .detail-row { margin-bottom: 12px; }
          .detail-row:last-child { margin-bottom: 0; }
          .detail-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 4px; }
          .detail-val { font-size: 15px; font-weight: 600; color: #f1f5f9; }
          .code-tag { display: inline-block; background-color: rgba(132, 204, 22, 0.15); color: #84cc16; font-family: monospace; font-size: 14px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
          .button-wrap { text-align: center; margin: 28px 0; }
          .button { display: inline-block; background-color: #84cc16; color: #09090b; font-weight: 700; font-size: 15px; padding: 14px 36px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(132, 204, 22, 0.4); }
          .link-box { background-color: #0b1324; padding: 12px; border-radius: 8px; border: 1px solid #1e293b; word-break: break-all; font-size: 13px; color: #84cc16; }
          .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">LiveKit Video Meeting</div>
          <h1>${cleanMeetingTitle}</h1>
          <p class="host-sub"><strong>${cleanHostName}</strong> invited you to join a video conference on <strong>${cleanOrgName}</strong>.</p>
          
          <div class="details-card">
            <div class="detail-row">
              <div class="detail-label">When</div>
              <div class="detail-val">${formattedTime}</div>
            </div>
            ${
              meetingDescription
                ? `
            <div class="detail-row" style="margin-top: 14px;">
              <div class="detail-label">Agenda / Description</div>
              <div class="detail-val" style="font-weight: 400; color: #cbd5e1;">${meetingDescription}</div>
            </div>`
                : ""
            }
            <div class="detail-row" style="margin-top: 14px;">
              <div class="detail-label">Meeting ID</div>
              <div class="detail-val"><span class="code-tag">${meetingId}</span></div>
            </div>
          </div>

          <div class="button-wrap">
            <a href="${joinUrl}" class="button" target="_blank">Join Video Meeting</a>
          </div>

          <p style="font-size: 13px; color: #94a3b8; margin: 20px 0 8px;">Or copy and paste this link to join:</p>
          <div class="link-box">${joinUrl}</div>

          <div class="footer">
            Powered by <strong>Taped</strong> HD Video Conferencing.<br/>
            &copy; ${new Date().getFullYear()} ${cleanOrgName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  const sendInfo = await transporter.sendMail({
    from: `"${cleanHostName} via Taped" <${senderEmail}>`,
    to: toEmail,
    subject: `Meeting Invitation: ${cleanMeetingTitle}`,
    text: textContent,
    html,
  });

  return sendInfo;
}

export interface SendShareOtpEmailOptions {
  toEmail: string;
  otpCode: string;
  targetTitle: string;
  organizationName: string;
  targetType: "video" | "folder" | "playlist";
}

export async function sendShareOtpEmail(options: SendShareOtpEmailOptions) {
  const { toEmail, otpCode, targetTitle, organizationName, targetType } = options;
  const itemTypeName = targetType === "video" ? "video" : targetType === "playlist" ? "playlist" : "folder";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .org-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #000; font-weight: 800; font-size: 13px; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px; color: #ffffff; }
          p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 20px; }
          .item-card { background-color: #0b1324; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 16px 0; }
          .item-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 4px; }
          .item-title { font-size: 16px; font-weight: 700; color: #f1f5f9; }
          .otp-box { background: linear-gradient(135deg, #0b1324 0%, #172554 100%); border: 2px dashed #84cc16; border-radius: 14px; padding: 24px; text-align: center; margin: 28px 0; }
          .otp-label { font-size: 12px; font-weight: 700; color: #84cc16; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
          .otp-code { font-family: monospace, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ffffff; margin: 0; text-shadow: 0 2px 10px rgba(132, 204, 22, 0.4); }
          .expiry-note { font-size: 12px; color: #cbd5e1; margin-top: 10px; }
          .tip-box { background-color: rgba(132, 204, 22, 0.08); border-left: 3px solid #84cc16; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #cbd5e1; line-height: 1.5; margin-top: 20px; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="org-badge">${organizationName}</div>
          <h1>One-Time Access Code</h1>
          <p>You requested temporary viewer access to restricted content hosted by <strong>${organizationName}</strong>.</p>
          
          <div class="item-card">
            <div class="item-label">Requested ${itemTypeName}</div>
            <div class="item-title">${targetTitle}</div>
          </div>

          <div class="otp-box">
            <div class="otp-label">Your 6-Digit Code</div>
            <div class="otp-code">${otpCode}</div>
            <div class="expiry-note">Valid for 10 minutes &bull; Grants 24-hour browser pass</div>
          </div>

          <div class="tip-box">
            <strong>Pro-tip:</strong> Signing in or creating a free account gives you permanent access to all videos shared with you directly from your dashboard without needing one-time codes.
          </div>

          <div class="footer">
            If you did not request this code, you can safely ignore this email.<br/>
            &copy; ${new Date().getFullYear()} ${organizationName} via Taped. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${organizationName} via Taped" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Your access code: ${otpCode} - ${organizationName}`,
    html,
  });
}

export interface SendAppointmentConfirmationEmailOptions {
  recipientEmail: string;
  recipientRole: "host" | "client";
  hostName: string;
  clientName: string;
  clientEmail: string;
  offeringTitle: string;
  offeringDuration: number;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
  timezone: string;
  joinUrl: string;
  meetingId: string;
  price?: number;
  currency?: string;
  clientNotes?: string | null;
  organizationName: string;
}

export async function sendAppointmentConfirmationEmail(options: SendAppointmentConfirmationEmailOptions) {
  const {
    recipientEmail,
    recipientRole,
    hostName,
    clientName,
    clientEmail,
    offeringTitle,
    offeringDuration,
    scheduledStart,
    scheduledEnd,
    timezone,
    joinUrl,
    meetingId,
    price = 0,
    currency = "USD",
    clientNotes,
    organizationName,
  } = options;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    throw new Error(`Invalid recipient email address: ${recipientEmail}`);
  }

  const startDate = new Date(scheduledStart);
  const endDate = new Date(scheduledEnd);

  let dateFormatted = "Scheduled Date";
  let timeFormatted = "Scheduled Time";
  try {
    dateFormatted = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: timezone || "UTC",
    }).format(startDate);

    const startTime = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "UTC",
    }).format(startDate);

    const endTime = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timezone || "UTC",
    }).format(endDate);

    timeFormatted = `${startTime} – ${endTime}`;
  } catch {
    dateFormatted = startDate.toDateString();
    timeFormatted = `${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`;
  }

  const isHost = recipientRole === "host";
  const emailSubject = isHost
    ? `New Appointment: ${offeringTitle} with ${clientName}`
    : `Appointment Confirmed: ${offeringTitle} with ${hostName}`;

  const headingText = isHost ? "New Appointment Scheduled" : "Appointment Confirmed!";
  const subText = isHost
    ? `<strong>${clientName}</strong> has scheduled a session with you on <strong>${organizationName}</strong>.`
    : `Your appointment with <strong>${hostName}</strong> (${organizationName}) is booked and confirmed.`;

  const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "appointments@taped.in";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #000; font-weight: 800; font-size: 13px; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; }
          h1 { font-size: 24px; font-weight: 800; margin: 0 0 10px; color: #ffffff; letter-spacing: -0.02em; }
          .sub { font-size: 15px; color: #94a3b8; margin: 0 0 28px; line-height: 1.5; }
          .card { background-color: #0b1324; border: 1px solid #1e293b; border-radius: 14px; padding: 24px; margin-bottom: 28px; }
          .grid { display: table; width: 100%; border-collapse: collapse; }
          .row { display: table-row; }
          .col-label { display: table-cell; padding: 8px 12px 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; width: 120px; }
          .col-val { display: table-cell; padding: 8px 0; font-size: 15px; font-weight: 600; color: #f1f5f9; }
          .button-wrap { text-align: center; margin: 32px 0; }
          .button { display: inline-block; background-color: #84cc16; color: #09090b; font-weight: 800; font-size: 16px; padding: 15px 38px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 16px rgba(132, 204, 22, 0.4); }
          .link-box { background-color: #0b1324; padding: 12px 14px; border-radius: 8px; border: 1px solid #1e293b; word-break: break-all; font-size: 13px; color: #84cc16; }
          .notes-box { background: rgba(132, 204, 22, 0.08); border-left: 3px solid #84cc16; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e2e8f0; margin-top: 16px; }
          .footer { margin-top: 36px; padding-top: 24px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">Appointment Scheduled</div>
          <h1>${headingText}</h1>
          <p class="sub">${subText}</p>

          <div class="card">
            <div style="font-size: 18px; font-weight: 800; color: #84cc16; margin-bottom: 16px; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">
              ${offeringTitle}
            </div>

            <div class="grid">
              <div class="row">
                <div class="col-label">Date</div>
                <div class="col-val">${dateFormatted}</div>
              </div>
              <div class="row">
                <div class="col-label">Time</div>
                <div class="col-val">${timeFormatted}</div>
              </div>
              <div class="row">
                <div class="col-label">Duration</div>
                <div class="col-val">${offeringDuration} Minutes</div>
              </div>
              <div class="row">
                <div class="col-label">${isHost ? "Client" : "Host"}</div>
                <div class="col-val">${isHost ? `${clientName} (${clientEmail})` : `${hostName} (${organizationName})`}</div>
              </div>
              ${
                price > 0
                  ? `
              <div class="row">
                <div class="col-label">Price</div>
                <div class="col-val" style="color: #84cc16;">${currency} ${price}</div>
              </div>`
                  : `
              <div class="row">
                <div class="col-label">Price</div>
                <div class="col-val">Free</div>
              </div>`
              }
              <div class="row">
                <div class="col-label">Location</div>
                <div class="col-val">LiveKit HD Video Room</div>
              </div>
            </div>

            ${
              clientNotes
                ? `
            <div style="margin-top: 18px;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 6px;">
                Notes from ${clientName}
              </div>
              <div class="notes-box">"${clientNotes}"</div>
            </div>`
                : ""
            }
          </div>

          <div class="button-wrap">
            <a href="${joinUrl}" class="button" target="_blank">Join Video Call</a>
          </div>

          <p style="font-size: 13px; color: #94a3b8; margin: 20px 0 8px;">Or copy and paste this link to join:</p>
          <div class="link-box">${joinUrl}</div>

          <div class="footer">
            Powered by <strong>Taped</strong> Appointments & HD Video Conferencing.<br/>
            &copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${organizationName} via Taped" <${senderEmail}>`,
    to: recipientEmail,
    subject: emailSubject,
    html,
  });
}

export interface SendAppointmentReminderEmailOptions {
  recipientEmail: string;
  recipientRole: "host" | "client";
  hostName: string;
  clientName: string;
  offeringTitle: string;
  scheduledStart: Date | string;
  timezone: string;
  joinUrl: string;
  meetingId: string;
  organizationName: string;
}

export async function sendAppointmentReminderEmail(options: SendAppointmentReminderEmailOptions) {
  const {
    recipientEmail,
    recipientRole,
    hostName,
    clientName,
    offeringTitle,
    scheduledStart,
    timezone,
    joinUrl,
    organizationName,
  } = options;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    throw new Error(`Invalid recipient email address: ${recipientEmail}`);
  }

  const startDate = new Date(scheduledStart);
  let timeStr = "in 1 hour";
  try {
    timeStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timezone || "UTC",
    }).format(startDate);
  } catch {
    timeStr = startDate.toLocaleTimeString();
  }

  const isHost = recipientRole === "host";
  const partnerName = isHost ? clientName : hostName;
  const emailSubject = `Reminder: Your appointment "${offeringTitle}" starts at ${timeStr}!`;
  const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "appointments@taped.in";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 580px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .badge { display: inline-flex; align-items: center; gap: 8px; background: #f59e0b; color: #000; font-weight: 800; font-size: 13px; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; }
          h1 { font-size: 24px; font-weight: 800; margin: 0 0 10px; color: #ffffff; letter-spacing: -0.02em; }
          p { font-size: 15px; color: #94a3b8; margin: 0 0 24px; line-height: 1.6; }
          .reminder-card { background: #0b1324; border: 1px solid #1e293b; border-radius: 14px; padding: 22px; margin-bottom: 28px; }
          .button-wrap { text-align: center; margin: 32px 0; }
          .button { display: inline-block; background-color: #84cc16; color: #09090b; font-weight: 800; font-size: 16px; padding: 15px 38px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 16px rgba(132, 204, 22, 0.4); }
          .link-box { background-color: #0b1324; padding: 12px 14px; border-radius: 8px; border: 1px solid #1e293b; word-break: break-all; font-size: 13px; color: #84cc16; }
          .footer { margin-top: 36px; padding-top: 24px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">Starting in 1 Hour</div>
          <h1>Upcoming Appointment Reminder</h1>
          <p>This is a quick reminder that your appointment <strong>"${offeringTitle}"</strong> with <strong>${partnerName}</strong> starts at <strong>${timeStr}</strong>.</p>

          <div class="reminder-card">
            <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 4px;">Meeting Session</div>
            <div style="font-size: 18px; font-weight: 800; color: #f8fafc; margin-bottom: 12px;">${offeringTitle}</div>
            <div style="font-size: 14px; color: #94a3b8;">Please ensure your camera and microphone are ready before entering the video room.</div>
          </div>

          <div class="button-wrap">
            <a href="${joinUrl}" class="button" target="_blank">Join Video Room Now</a>
          </div>

          <p style="font-size: 13px; color: #94a3b8; margin: 20px 0 8px;">Or copy and paste this link to join:</p>
          <div class="link-box">${joinUrl}</div>

          <div class="footer">
            Powered by <strong>Taped</strong> Appointments & Video Conferencing.<br/>
            &copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${organizationName} via Taped" <${senderEmail}>`,
    to: recipientEmail,
    subject: emailSubject,
    html,
  });
}

export interface SendAppointmentRescheduleEmailOptions {
  recipientEmail: string;
  recipientRole: "host" | "client";
  hostName: string;
  clientName: string;
  offeringTitle: string;
  offeringDuration: number;
  previousStart: Date | string;
  previousEnd: Date | string;
  proposedStart: Date | string;
  proposedEnd: Date | string;
  timezone: string;
  joinUrl: string;
  proposedByRole: "HOST" | "CLIENT";
  reason?: string | null;
  organizationName: string;
  kind: "REQUEST" | "APPROVED" | "REJECTED" | "CANCELLED";
}

function formatRescheduleMailDate(value: Date | string, timezone: string) {
  try {
    const d = new Date(value);
    const datePart = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: timezone || "UTC",
    }).format(d);
    const startTime = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "UTC",
    }).format(d);
    return `${datePart} at ${startTime}`;
  } catch {
    return new Date(value).toLocaleString();
  }
}

export async function sendAppointmentRescheduleEmail(options: SendAppointmentRescheduleEmailOptions) {
  const {
    recipientEmail,
    recipientRole,
    hostName,
    clientName,
    offeringTitle,
    offeringDuration,
    previousStart,
    previousEnd,
    proposedStart,
    proposedEnd,
    timezone,
    joinUrl,
    proposedByRole,
    reason,
    organizationName,
    kind,
  } = options;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    throw new Error(`Invalid recipient email address: ${recipientEmail}`);
  }

  const isHost = recipientRole === "host";
  const partnerName = proposedByRole === "HOST" ? hostName : clientName;
  const viewerIsProposer =
    (isHost && proposedByRole === "HOST") || (!isHost && proposedByRole === "CLIENT");

  const prevStr = formatRescheduleMailDate(previousStart, timezone);
  const prevEndStr = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: timezone || "UTC",
      }).format(new Date(previousEnd));
    } catch {
      return "";
    }
  })();
  const nextStr = formatRescheduleMailDate(proposedStart, timezone);
  const nextEndStr = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        timeZone: timezone || "UTC",
      }).format(new Date(proposedEnd));
    } catch {
      return "";
    }
  })();

  const subjectMap: Record<SendAppointmentRescheduleEmailOptions["kind"], string> = {
    REQUEST: `Reschedule requested: ${offeringTitle} — action needed`,
    APPROVED: `Rescheduled: ${offeringTitle} confirmed for new time`,
    REJECTED: `Reschedule update: ${offeringTitle} keeps original time`,
    CANCELLED: `Reschedule withdrawn: ${offeringTitle}`,
  };

  const headingMap: Record<SendAppointmentRescheduleEmailOptions["kind"], string> = {
    REQUEST: viewerIsProposer ? "Reschedule request sent" : "New reschedule request",
    APPROVED: "Appointment rescheduled",
    REJECTED: "Reschedule declined",
    CANCELLED: "Reschedule request withdrawn",
  };

  const badgeMap: Record<SendAppointmentRescheduleEmailOptions["kind"], string> = {
    REQUEST: "Action needed",
    APPROVED: "Confirmed",
    REJECTED: "Declined",
    CANCELLED: "Withdrawn",
  };

  const introMap: Record<SendAppointmentRescheduleEmailOptions["kind"], string> = {
    REQUEST: viewerIsProposer
      ? `You proposed a new time for <strong>${offeringTitle}</strong>. We notified <strong>${isHost ? clientName : hostName}</strong> — the appointment stays at its original time until they approve.`
      : `<strong>${partnerName}</strong> proposed a new time for <strong>${offeringTitle}</strong>. Please review and approve or decline — the original slot stays booked until you decide.`,
    APPROVED: `The new time for <strong>${offeringTitle}</strong> is confirmed. Your video room link stays the same.`,
    REJECTED: `The proposed new time for <strong>${offeringTitle}</strong> was declined. The appointment remains at its original time below.`,
    CANCELLED: `The pending reschedule request for <strong>${offeringTitle}</strong> was withdrawn. The appointment remains at its original time.`,
  };

  const emailSubject = subjectMap[kind];
  const senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "appointments@taped.in";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 40px 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #131c2e; border-radius: 16px; border: 1px solid #1e293b; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.6); }
          .badge { display: inline-block; background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%); color: #020617; font-weight: 800; font-size: 12px; padding: 5px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 20px; }
          h1 { font-size: 24px; font-weight: 800; margin: 0 0 10px; color: #ffffff; letter-spacing: -0.02em; }
          .sub { font-size: 15px; color: #94a3b8; margin: 0 0 24px; line-height: 1.6; }
          .card { background-color: #0b1324; border: 1px solid #1e293b; border-radius: 14px; padding: 22px; margin-bottom: 22px; }
          .row-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; font-weight: 700; margin-bottom: 2px; }
          .row-val { font-size: 15px; font-weight: 700; color: #f1f5f9; margin: 0 0 14px; }
          .row-val.old { color: #94a3b8; text-decoration: line-through; font-weight: 500; }
          .row-val.new { color: #84cc16; }
          .meta { font-size: 13px; color: #94a3b8; line-height: 1.6; }
          .reason { background: rgba(56,189,248,0.08); border-left: 3px solid #38bdf8; padding: 12px 16px; border-radius: 6px; font-size: 14px; color: #e2e8f0; margin-top: 14px; }
          .button-wrap { text-align: center; margin: 28px 0 12px; }
          .button { display: inline-block; background-color: #84cc16; color: #09090b; font-weight: 800; font-size: 15px; padding: 14px 34px; text-decoration: none; border-radius: 12px; }
          .link-box { background-color: #0b1324; padding: 12px 14px; border-radius: 8px; border: 1px solid #1e293b; word-break: break-all; font-size: 13px; color: #84cc16; }
          .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">${badgeMap[kind]}</div>
          <h1>${headingMap[kind]}</h1>
          <p class="sub">${introMap[kind]}</p>

          <div class="card">
            <div style="font-size: 17px; font-weight: 800; color: #84cc16; margin-bottom: 16px; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">
              ${offeringTitle} • ${offeringDuration} min
            </div>
            <div class="row-label">Original time</div>
            <p class="row-val old">${prevStr}${prevEndStr ? ` – ${prevEndStr}` : ""}</p>
            <div class="row-label">${kind === "APPROVED" ? "New confirmed time" : "Proposed time"}</div>
            <p class="row-val new">${nextStr}${nextEndStr ? ` – ${nextEndStr}` : ""} (${timezone || "UTC"})</p>
            <div class="row-label">${isHost ? "Client" : "Host"}</div>
            <p class="row-val" style="font-size: 14px;">${isHost ? `${clientName}` : `${hostName} (${organizationName})`}</p>
            ${
              reason
                ? `<div class="row-label">Reason / note</div><div class="reason">"${String(reason).replace(/</g, "&lt;")}"</div>`
                : ""
            }
            <p class="meta" style="margin-top: 16px;">Location: LiveKit HD Video Room. ${
              kind === "REQUEST" && !viewerIsProposer
                ? "Approve or decline from your dashboard — no change happens until you respond."
                : "No action needed — your calendar invite will reflect the confirmed time."
            }</p>
          </div>

          <div class="button-wrap">
            <a href="${joinUrl}" class="button" target="_blank">Open Video Room</a>
          </div>
          <div class="link-box">${joinUrl}</div>

          <div class="footer">
            Powered by <strong>Taped</strong> Appointments & HD Video Conferencing.<br/>
            &copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${organizationName} via Taped" <${senderEmail}>`,
    to: recipientEmail,
    subject: emailSubject,
    html,
  });
}



