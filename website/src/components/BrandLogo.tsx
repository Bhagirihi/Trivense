import Image from "next/image";
import { site } from "@/lib/content";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
};

/** App icon — square PNG with navy background; use app-icon rounding, no extra padding. */
export function BrandLogo({
  size = 40,
  className = "",
  priority = false,
  alt,
}: BrandLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={alt ?? site.name}
      width={size}
      height={size}
      priority={priority}
      className={`rounded-[22%] object-cover ${className}`}
    />
  );
}
