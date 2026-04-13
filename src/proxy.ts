import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

function getSafeRedirectTarget(nextParam: string | null) {
  if (!nextParam) return "/dashboard";
  if (!nextParam.startsWith("/")) return "/dashboard";
  if (nextParam.startsWith("//")) return "/dashboard";
  return nextParam;
}

export default auth((request: NextRequest & { auth: unknown }) => {
  const { pathname, search } = request.nextUrl;
  const session = request.auth;

  if (pathname.startsWith("/dashboard") && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && session) {
    const target = getSafeRedirectTarget(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
