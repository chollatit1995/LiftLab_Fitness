import Image from "next/image";

interface BrandLogoProps {
  /** ขนาดแสดงผลเป็นพิกเซล — แนะนำ 40–48 สำหรับหัวเว็บ */
  size?: number;
  className?: string;
  priority?: boolean;
}

/** ใช้ไฟล์จาก /public เพื่อให้ favicon และโลโก้ในหน้าเว็บเป็น asset เดียวกัน */
const LOGO_SRC = "/logo.png?v=4";

export function BrandLogo({
  size = 44,
  className = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="LiftLab Fitness"
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-contain ${className}`}
      priority={priority}
      unoptimized
    />
  );
}
