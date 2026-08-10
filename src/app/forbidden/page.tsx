import Link from "next/link";
import { getServerSession } from "@/lib/auth-server";
import { isValidRole, roleLabels } from "@/lib/permissions";

export default async function ForbiddenPage() {
  const session = await getServerSession();
  const roleTh =
    session && isValidRole(session.role) ? roleLabels[session.role].th : "—";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <span className="material-symbols-outlined text-[28px]">block</span>
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-900">
          ไม่มีสิทธิ์เข้าถึงหน้านี้
        </h1>
        <p className="mt-1 text-sm text-slate-500">Access denied</p>
        <p className="mt-4 text-sm text-slate-600">
          บัญชีของคุณมีสิทธิ์ระดับ <span className="font-medium">{roleTh}</span>{" "}
          ซึ่งไม่ครอบคลุมหน้านี้ หากต้องการสิทธิ์เพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ
        </p>
        <Link href="/" className="btn-primary mt-6 w-full">
          กลับสู่แดชบอร์ด
        </Link>
      </div>
    </div>
  );
}
