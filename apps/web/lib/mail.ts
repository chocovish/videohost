import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.maileroo.com",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false, // 587 uses STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, token: string, callbackUrl?: string) {
  const baseUrl = process.env.APP_URL || "http://localhost:3000";
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

  const formattedTime = scheduledStart
    ? new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(scheduledStart))
    : "Instant Meeting (Happening Now)";

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
          <h1>${meetingTitle}</h1>
          <p class="host-sub"><strong>${hostName}</strong> invited you to join a video conference on <strong>${organizationName}</strong>.</p>
          
          <div class="details-card">
            <div class="detail-row">
              <div class="detail-label">When</div>
              <div class="detail-val">${formattedTime}</div>
            </div>
            ${meetingDescription
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
            &copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"${hostName} via Taped" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Meeting Invitation: ${meetingTitle}`,
      html,
    });
  } catch (err) {
    console.error("Failed to send meeting invitation email to", toEmail, err);
  }
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


