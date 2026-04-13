import { NextRequest, NextResponse } from "next/server";
import { resendVerificationCode } from "@/lib/auth/users";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const result = await resendVerificationCode(body.email);

  if (!result.ok) {
    const reason = (result as { reason?: string }).reason;
    if (reason === "already_verified") {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { name, code } = result as { ok: true; code: string; name: string };
  await sendVerificationEmail(body.email, name, code).catch(() => undefined);

  const isDev = process.env.NODE_ENV !== "production";
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const devCode = isDev && !smtpConfigured ? code : undefined;

  return NextResponse.json({ ok: true, devCode });
}
