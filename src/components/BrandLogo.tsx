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
      className={`shrink-0 rounded-full object-contain ${className}`}
      priority={priority}
    />
  );
}
