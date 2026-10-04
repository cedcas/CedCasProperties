import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { INTERNAL_COOKIE_MAX_AGE, INTERNAL_COOKIE_NAME } from "@/lib/analytics-config";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (isAdminRoute && !isLoginPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
  }

  // Pass pathname to server components via header
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // Mark this browser as internal traffic for GA4 (DEC-021). Readable by client JS on purpose.
  if (isLoggedIn) {
    res.cookies.set(INTERNAL_COOKIE_NAME, "1", {
      path: "/",
      maxAge: INTERNAL_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
    });
  }
  return res;
});

export const config = {
  matcher: ["/admin/:path*"],
};
