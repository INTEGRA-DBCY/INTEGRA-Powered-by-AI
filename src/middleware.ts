import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/server-auth";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 1. Zero-Flash Cryptographic Server Guard for Protected Dashboards
  const protectedDashboards = [
    { path: "/admin", allowedRoles: ["admin", "super_admin"] },
    { path: "/superadmin", allowedRoles: ["super_admin"] },
    { path: "/coordinator", allowedRoles: ["coordinator", "admin", "super_admin"] },
    { path: "/judge", allowedRoles: ["judge", "admin", "super_admin"] },
    { path: "/volunteer", allowedRoles: ["volunteer", "admin", "super_admin"] },
    { path: "/food", allowedRoles: ["food_coordinator", "admin", "super_admin"] },
    { path: "/stall", allowedRoles: ["stall_operator", "admin", "super_admin"] },
    { path: "/dashboard", allowedRoles: ["student", "admin", "super_admin"] },
  ];

  const matchedRoute = protectedDashboards.find(
    (d) => pathname === d.path || pathname.startsWith(`${d.path}/`)
  );

  if (matchedRoute) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(sessionCookie);

    if (!session || !matchedRoute.allowedRoles.includes(session.role)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  // 2. OWASP Security Headers (A05: Security Misconfiguration Defense)
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|integra-logo.png|events|college-logo.png|dept-logo.png).*)",
  ],
};
