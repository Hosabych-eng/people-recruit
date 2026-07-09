import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = new Set(["/login"]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/careers" || pathname.startsWith("/careers/")) return true;
  if (pathname.startsWith("/api/public/")) return true;
  if (pathname === "/api/careers/apply") return true;
  if (pathname === "/api/careers/options") return true;
  if (pathname.startsWith("/api/tracking/")) return true;
  return false;
}

function isAdminOnlyPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname === "/settings" ||
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/invitations") ||
    pathname.startsWith("/api/settings") ||
    pathname === "/pipelines" ||
    pathname.startsWith("/pipelines/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isActiveStaff =
    token?.status === "ACTIVE" &&
    (token.role === "ADMIN" || token.role === "RECRUITER");

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && isActiveStaff) {
      return NextResponse.redirect(new URL("/recruiting", request.url));
    }

    return NextResponse.next();
  }

  if (!isActiveStaff) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    if (token && token.status !== "ACTIVE") {
      loginUrl.searchParams.set("error", "AccessDenied");
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminOnlyPath(pathname) && token.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/recruiting", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
