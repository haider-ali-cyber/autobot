import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.current !== "string" || typeof body.newPassword !== "string") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.passwordHash === "__oauth_google_account__") {
    return NextResponse.json({ error: "Google accounts cannot change password here" }, { status: 400 });
  }

  const isBcrypt = /^\$2[aby]\$\d{2}\$/.test(user.passwordHash);
  let valid = false;
  if (isBcrypt) {
    valid = await compare(body.current, user.passwordHash);
  }

  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await hash(body.newPassword, BCRYPT_ROUNDS);
  await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
