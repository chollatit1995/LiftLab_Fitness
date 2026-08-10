import { NextResponse } from "next/server";
import { getOrInitAppData, isDbConfigured } from "@/lib/db";
import { initialData } from "@/lib/store";
import { livePromotions } from "@/lib/promotions";
import { AppData } from "@/lib/types";

/**
 * เปิดให้เรียกได้โดยไม่ต้อง login — ส่งเฉพาะโปรที่ใช้ได้จริงและแพ็กเกจที่เปิดขาย
 * ไม่มีข้อมูลสมาชิกหรือยอดขายติดไปด้วย
 */
export async function GET() {
  let data: AppData = initialData;

  if (isDbConfigured()) {
    try {
      data = await getOrInitAppData();
    } catch (error) {
      console.error("GET /api/promotions fell back to sample data:", error);
    }
  }

  return NextResponse.json({
    promotions: livePromotions(data.promotions ?? []),
    packages: data.packages.filter((p) => p.status === "active"),
  });
}
