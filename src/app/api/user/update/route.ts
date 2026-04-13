import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const businessName = typeof body.businessName === "string" ? body.businessName.trim() : undefined;

  if (name !== undefined && name.length === 0) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      ...(phone !== undefined ? { phone } : {}),
      ...(businessName !== undefined ? { businessName } : {}),
    } as Parameters<typeof db.user.update>[0]["data"],
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ ok: true });
}
