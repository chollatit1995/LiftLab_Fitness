import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createSession,
  MEMBER_SESSION_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
  shouldRenew,
  verifyMemberSession,
  verifySession,
} from "@/lib/auth";
import { canAccessPath } from "@/lib/permissions";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

const MEMBER_PUBLIC_PATHS = ["/portal/login", "/api/portal/login"];

/** เส้นทางที่สมาชิกยังเข้าได้แม้ยังไม่ได้เปลี่ยนรหัสผ่านที่พนักงานตั้งให้ */
const MEMBER_PASSWORD_ALLOWED = [
  "/portal/change-password",
  "/api/portal/password",
  "/api/portal/logout",
  "/api/portal/me",
];

async function handlePortal(request: NextRequest, pathname: string) {
  const token = request.cookies.get(MEMBER_SESSION_COOKIE)?.value;
  const session = token ? await verifyMemberSession(token) : null;

  if (MEMBER_PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname === "/portal/login" && session) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    session.mustChangePassword &&
    !MEMBER_PASSWORD_ALLOWED.some((p) => pathname.startsWith(p))
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "ต้องเปลี่ยนรหัสผ่านก่อนใช้งาน" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(
      new URL("/portal/change-password", request.url)
    );
  }

  return NextResponse.next();
}

/** เส้นทางที่ยังต้องเข้าถึงได้แม้ยังไม่ได้เปลี่ยนรหัสผ่านเริ่มต้น */
const PASSWORD_CHANGE_ALLOWED = [
  "/change-password",
  "/api/auth/password",
  "/api/auth/logout",
  "/api/auth/me",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ไฟล์ static จาก /public ต้องไม่ผ่าน auth — ไม่เช่นนั้น favicon/logo จะได้ HTML หน้า login
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$/i.test(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal")) {
    return handlePortal(request, pathname);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname === "/login" && session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // /login รับทั้งพนักงานและสมาชิก จึงต้องเช็ค session ฝั่งสมาชิกด้วย
    if (pathname === "/login") {
      const memberToken = request.cookies.get(MEMBER_SESSION_COOKIE)?.value;
      if (memberToken && (await verifyMemberSession(memberToken))) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
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
  matcher: [
    /*
     * ไม่รัน middleware กับไฟล์ static / Next internals
     * ถ้าไม่ยกเว้น .png แล้ว /logo.png จะถูกบังคับ login → favicon ไม่เปลี่ยน
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
