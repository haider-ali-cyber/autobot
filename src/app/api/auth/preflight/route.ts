import { NextRequest, NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth/users";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ status: "invalid_credentials" });
  }

  const user = await authenticateUser(body.email, body.password).catch(() => null);

  if (!user) {
    return NextResponse.json({ status: "invalid_credentials" });
  }

  if (!user.emailVerified) {
    return NextResponse.json({ status: "not_verified", email: user.email });
  }

  return NextResponse.json({ status: "ok" });
}
