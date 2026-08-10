import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  shouldRenew,
  verifySession,
} from "@/lib/auth";
import { canAccessPath } from "@/lib/permissions";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

/** เส้นทางที่ยังต้องเข้าถึงได้แม้ยังไม่ได้เปลี่ยนรหัสผ่านเริ่มต้น */
const PASSWORD_CHANGE_ALLOWED = [
  "/change-password",
  "/api/auth/password",
  "/api/auth/logout",
  "/api/auth/me",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (
    session.mustChangePassword &&
    !PASSWORD_CHANGE_ALLOWED.some((p) => pathname.startsWith(p))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "ต้องเปลี่ยนรหัสผ่านก่อนใช้งาน" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  if (!canAccessPath(session.role, pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }

  const response = NextResponse.next();

  // ต่ออายุ session ให้อัตโนมัติระหว่างที่ผู้ใช้ยังทำงานอยู่
  if (shouldRenew(session, Math.floor(Date.now() / 1000))) {
    const renewed = await createSession({
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role,
      mustChangePassword: session.mustChangePassword,
      maxAge: session.maxAge,
    });
    response.cookies.set(
      SESSION_COOKIE,
      renewed,
      sessionCookieOptions(session.maxAge)
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
