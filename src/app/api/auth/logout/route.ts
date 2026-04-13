import { NextResponse } from "next/server";

const authCookieNames = [
  "sellora_session",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
];

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const cookieName of authCookieNames) {
    response.cookies.set(cookieName, "", {
      httpOnly: cookieName.includes("session-token") || cookieName.includes("csrf-token"),
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
