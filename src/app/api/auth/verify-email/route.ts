import { NextRequest, NextResponse } from "next/server";
import { verifyEmailCode } from "@/lib/auth/users";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "email and code are required" }, { status: 400 });
  }

  const result = await verifyEmailCode(body.email, body.code);

  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "No account found with this email",
      no_code: "Verification code not found — request a new one",
      expired: "Code has expired — request a new one",
      invalid: "Incorrect code — please try again",
    };
    const reason = (result as { reason?: string }).reason ?? "invalid";
    return NextResponse.json({ error: messages[reason] ?? "Verification failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
