import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "auth_token";

const ROLE_ROUTE_RULES: Array<{ prefix: string; role: string }> = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/verification_agent", role: "VERIFICATION_AGENT" },
  { prefix: "/artisan", role: "ARTISAN" },
  { prefix: "/customer", role: "CUSTOMER" },
];

const PUBLIC_PREFIXES = ["/", "/auth", "/products", "/marketplace", "/forbidden"];

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname) || isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const requiredRole = requiredRoleForPath(pathname);
  if (!requiredRole) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    const role = String(payload.role ?? "");
    if (role !== requiredRole) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }

    return NextResponse.next();
  } catch (_error) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!api).*)"],
};
