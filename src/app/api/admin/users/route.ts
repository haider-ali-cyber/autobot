import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const ADMIN_EMAILS = ["admin@sellora.io"];

async function checkAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!ADMIN_EMAILS.includes(session.user.email)) return null;
  return session;
}

// GET — list all users
export async function GET(req: NextRequest) {
  const session = await checkAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q")?.trim() ?? "";
  const roleFilter = searchParams.get("role") ?? "";
  const planFilter = searchParams.get("plan") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (roleFilter) where.role = roleFilter;
  if (planFilter) where.plan = planFilter;

  const users = await db.user.findMany({
    where,
    select: {
      id: true, name: true, email: true,
      emailVerified: true, role: true, plan: true,
      planExpiresAt: true, createdAt: true, updatedAt: true,
      phone: true, businessName: true,
    },
    orderBy: { createdAt: "desc" },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const total = await db.user.count();
  const verified = await db.user.count({ where: { emailVerified: true } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byPlan = await (db.user as any).groupBy({ by: ["plan"], _count: { plan: true } }).catch(() => []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byRole = await (db.user as any).groupBy({ by: ["role"], _count: { role: true } }).catch(() => []);

  return NextResponse.json({ users, stats: { total, verified, byPlan, byRole } });
}

// PATCH — update user role / plan / emailVerified
export async function PATCH(req: NextRequest) {
  const session = await checkAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    userId?: string;
    role?: string;
    plan?: string;
    emailVerified?: boolean;
    planExpiresAt?: string | null;
  };

  const { userId, role, plan, emailVerified, planExpiresAt } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const VALID_ROLES = ["user", "admin", "suspended"];
  const VALID_PLANS = ["free", "starter", "pro", "enterprise"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { updatedAt: new Date() };
  if (role !== undefined && VALID_ROLES.includes(role)) data.role = role;
  if (plan !== undefined && VALID_PLANS.includes(plan)) data.plan = plan;
  if (emailVerified !== undefined) data.emailVerified = emailVerified;
  if (planExpiresAt !== undefined) data.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;

  const updated = await db.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true, plan: true, emailVerified: true, planExpiresAt: true },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return NextResponse.json({ user: updated });
}

// DELETE — delete user account
export async function DELETE(req: NextRequest) {
  const session = await checkAdmin(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Prevent deleting admin itself
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.email && ADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: "Cannot delete admin account" }, { status: 400 });
  }

  await db.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
