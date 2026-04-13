import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth/users";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.token !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "token and password are required" }, { status: 400 });
  }

  if (body.password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const result = await resetPassword(body.token, body.password);

  if (!result.ok) {
    const reason = (result as { reason?: string }).reason;
    if (reason === "expired") {
      return NextResponse.json({ error: "Reset link has expired — request a new one" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
