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

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const confirmLink = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

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
          <div class="logo-box">Video Host</div>
          <h1>Confirm your email address</h1>
          <p>Thank you for registering with Video Host! Please click the button below to verify your email address and activate your account.</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${confirmLink}" class="button" target="_blank">Confirm Email Address</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <div class="link-box">${confirmLink}</div>
          <p style="margin-top: 20px;">This verification link will expire in 24 hours. If you did not sign up for Video Host, you can safely ignore this email.</p>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Video Host Inc. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Video Host" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: "Confirm your Video Host email address",
    html,
  });
}
