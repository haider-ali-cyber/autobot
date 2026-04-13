import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth/users";
import { sendVerificationEmail } from "@/lib/email";

type SignupBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: SignupBody;

  try {
    body = (await request.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Name must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  let result;

  try {
    result = await registerUser({ name, email, password });
  } catch {
    return NextResponse.json(
      { error: "Auth service unavailable. Check database connection." },
      { status: 503 }
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  await sendVerificationEmail(email, name, result.verificationCode).catch(() => undefined);

  const isDev = process.env.NODE_ENV !== "production";
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const devCode = isDev && !smtpConfigured ? result.verificationCode : undefined;

  return NextResponse.json({ needsVerification: true, email, devCode }, { status: 201 });
}
