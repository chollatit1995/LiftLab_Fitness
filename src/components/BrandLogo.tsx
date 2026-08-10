import Image from "next/image";
import logo from "@/assets/logo.png";

interface BrandLogoProps {
  /** ขนาดแสดงผลเป็นพิกเซล — แนะนำ 40–48 สำหรับหัวเว็บ */
  size?: number;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({
  size = 44,
  className = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={logo}
      alt="LiftLab Fitness"
      width={size}
      height={size}
      className={`rounded-full object-cover shadow-sm ring-1 ring-black/10 ${className}`}
      priority={priority}
    />
  );
}
