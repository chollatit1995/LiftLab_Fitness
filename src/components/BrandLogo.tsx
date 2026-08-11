import Image from "next/image";

const PRESET = {
  sm: 24,
  md: 40,
  lg: 44,
  xl: 48,
} as const;

type BrandLogoSize = keyof typeof PRESET | number;

interface BrandLogoProps {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
}

export function BrandLogo({
  size = "lg",
  className = "",
  priority = false,
}: BrandLogoProps) {
  const px = typeof size === "number" ? size : PRESET[size];

  return (
    <Image
      src="/liftlab-logo.png"
      alt="LiftLab Fitness"
      width={px}
      height={px}
      priority={priority}
      className={`shrink-0 rounded-full object-cover ${className}`}
    />
  );
}
