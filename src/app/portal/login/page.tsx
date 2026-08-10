import { redirect } from "next/navigation";

/** หน้า login ของสมาชิกถูกรวมเข้ากับ /login แล้ว คงเส้นทางเดิมไว้กัน bookmark พัง */
export default function PortalLoginRedirect() {
  redirect("/login");
}
