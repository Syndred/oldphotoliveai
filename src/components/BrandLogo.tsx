import { BRAND_NAME } from "@/lib/site";

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export default function BrandLogo({
  className = "",
  iconClassName = "",
  textClassName = "",
  showText = true,
}: BrandLogoProps) {
  return (
    <span className={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-[0_12px_24px_rgba(232,184,109,0.22)] ${iconClassName}`.trim()}
      >
        <svg
          viewBox="0 0 64 64"
          className="h-full w-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="brand-logo-gradient"
              x1="10"
              y1="8"
              x2="54"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#D4A574" />
              <stop offset="1" stopColor="#B8860B" />
            </linearGradient>
          </defs>

          <rect width="64" height="64" rx="18" fill="url(#brand-logo-gradient)" />
          <rect
            x="3"
            y="3"
            width="58"
            height="58"
            rx="15"
            stroke="rgba(250,245,240,0.22)"
            strokeWidth="1.5"
          />

          <g opacity="0.58">
            <rect
              x="18"
              y="14"
              width="24"
              height="19"
              rx="5"
              fill="rgba(250,245,240,0.12)"
              stroke="rgba(250,245,240,0.36)"
              strokeWidth="1.5"
            />
            <circle cx="25" cy="20" r="2" fill="#E8B86D" />
            <path
              d="M22 29L26 25L29 28L33 23L38 29"
              stroke="rgba(250,245,240,0.75)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          <rect
            x="12"
            y="21"
            width="32"
            height="25"
            rx="6"
            fill="rgba(12,10,9,0.46)"
            stroke="#FAF5F0"
            strokeWidth="2"
          />
          <circle cx="21" cy="29" r="2.5" fill="#E8B86D" />
          <path
            d="M18 39L23 34L27 38L33 31L40 39"
            stroke="#FAF5F0"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M49 16.5L50.4 20.6L54.5 22L50.4 23.4L49 27.5L47.6 23.4L43.5 22L47.6 20.6L49 16.5Z"
            fill="#FFF7ED"
          />
          <circle cx="45" cy="30" r="1.5" fill="#FFF7ED" fillOpacity="0.9" />
        </svg>
      </span>
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
