import Image from "next/image";
import { BRAND_NAME } from "@/lib/site";

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  priority?: boolean;
}

export default function BrandLogo({
  className = "",
  iconClassName = "",
  textClassName = "",
  showText = true,
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
      <Image
        src="/brand-mark.svg"
        alt=""
        width={40}
        height={40}
        priority={priority}
        className={`h-10 w-10 shrink-0 rounded-xl shadow-[0_12px_24px_rgba(232,184,109,0.22)] ${iconClassName}`.trim()}
      />
      {showText ? (
        <span
          className={`min-w-0 truncate bg-gradient-to-r from-[var(--color-gradient-from)] to-[var(--color-accent)] bg-clip-text font-bold text-transparent ${textClassName}`.trim()}
        >
          {BRAND_NAME}
        </span>
      ) : (
        <span className="sr-only">{BRAND_NAME}</span>
      )}
    </span>
  );
}
