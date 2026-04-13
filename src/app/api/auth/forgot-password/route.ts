import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth/users";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const result = await createPasswordResetToken(email);

  if (!result.ok) {
    return NextResponse.json({ ok: true });
  }

  const resetUrl = `${origin}/reset-password?token=${result.token}`;
  const emailResult = await sendPasswordResetEmail(email, result.name ?? "", resetUrl).catch(() => ({ devUrl: undefined }));

  const isDev = process.env.NODE_ENV !== "production";
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const devUrl = isDev && !smtpConfigured ? resetUrl : undefined;

  return NextResponse.json({ ok: true, devUrl: devUrl ?? emailResult?.devUrl });
}
