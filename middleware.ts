import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { dashboardForRole } from "@/lib/permissions";

const AUTH_COOKIE_NAME = "auth_token";

const AUTH_GUEST_PREFIXES = ["/auth/login", "/auth/register"];

const ROLE_ROUTE_RULES: Array<{ prefix: string; role: string }> = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/verification_agent", role: "VERIFICATION_AGENT" },
  { prefix: "/artisan", role: "ARTISAN" },
  { prefix: "/customer", role: "CUSTOMER" },
];

// Routes that should be accessible without authentication.
// Add specific artisan landing path to allow public access while keeping other /artisan/* routes guarded.
const PUBLIC_PREFIXES = [
  "/",
  "/auth",
  "/products",
  "/marketplace",
  "/forbidden",
  "/artisan/landing",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) =>
    prefix === "/" ? false : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function requiredRoleForPath(pathname: string): string | null {
  const rule = ROLE_ROUTE_RULES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return rule?.role ?? null;
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$/) !== null
  );
}

function isAuthGuestRoute(pathname: string): boolean {
  return AUTH_GUEST_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

async function verifyTokenRole(token: string): Promise<string | null> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    return String(payload.role ?? "");
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (isAuthGuestRoute(pathname) && token) {
    const role = await verifyTokenRole(token);
    if (role) {
      return NextResponse.redirect(new URL(dashboardForRole(role), request.url));
    }
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const requiredRole = requiredRoleForPath(pathname);
  if (!requiredRole) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const role = await verifyTokenRole(token);
  if (!role) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (role !== requiredRole) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
