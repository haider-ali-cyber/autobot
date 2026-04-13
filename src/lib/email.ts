import nodemailer from "nodemailer";

function buildHtml(name: string, code: string) {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#ffffff;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:48px;height:48px;background:#2563eb;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:white;font-weight:800;font-size:20px;">S</span>
      </div>
      <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">Verify your email</h1>
      <p style="color:#6b7280;font-size:14px;margin:0;">Hi ${name}, use the code below to verify your Sellora account.</p>
    </div>
    <div style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:42px;font-weight:800;letter-spacing:14px;color:#111827;">${code}</div>
      <p style="color:#9ca3af;font-size:13px;margin-top:12px;">Valid for <strong style="color:#6b7280;">15 minutes</strong></p>
    </div>
    <p style="color:#d1d5db;font-size:12px;text-align:center;">If you didn't create a Sellora account, you can safely ignore this email.</p>
  </div>`;
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log(`\n[DEV] 🔑 Password reset link for ${to}:\n${resetUrl}\n`);
    return { devUrl: resetUrl };
  }

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#ffffff;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:48px;height:48px;background:#2563eb;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="color:white;font-weight:800;font-size:20px;">S</span>
      </div>
      <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">Reset your password</h1>
      <p style="color:#6b7280;font-size:14px;margin:0;">Hi ${name}, click the button below to reset your Sellora password.</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:white;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">Reset Password</a>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
      <p style="color:#6b7280;font-size:12px;margin:0;word-break:break-all;">Or copy this link: <a href="${resetUrl}" style="color:#2563eb;">${resetUrl}</a></p>
    </div>
    <p style="color:#d1d5db;font-size:12px;text-align:center;">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
  </div>`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `Sellora <${user}>`,
    to,
    subject: "Reset your Sellora password",
    html,
  });

  return { devUrl: undefined };
}

export async function sendVerificationEmail(to: string, name: string, code: string) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log(`\n[DEV] ✉️  Verification code for ${to}: ${code}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? `Sellora <${user}>`,
    to,
    subject: `${code} – Your Sellora verification code`,
    html: buildHtml(name, code),
  });
}
