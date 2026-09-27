/**
 * Renaissance shapes — the media kit's decorative system: memorable shapes
 * drawn with an outline and a lighter, semi-transparent fill, rotated and
 * scattered. Deterministic and purely decorative (call sites mark the
 * section region; the SVG itself is aria-hidden). Blue values mirror the
 * brand-kit blue token (hsl 211 82% 49%) used across globals.css.
 */
export function BrandShapes({ variant = "light" }: { variant?: "light" | "blue" }) {
  const line =
    variant === "blue" ? "rgba(255,255,255,0.55)" : "hsl(211 82% 49% / 0.4)";
  const fill =
    variant === "blue" ? "rgba(255,255,255,0.1)" : "hsl(211 82% 49% / 0.07)";
  const ink =
    variant === "blue" ? "rgba(255,255,255,0.35)" : "hsl(0 0% 13% / 0.18)";

  return (
    <svg
      aria-hidden
      focusable={false}
      viewBox="0 0 1200 720"
      preserveAspectRatio="xMaxYMin slice"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-50 sm:opacity-100"
    >
      <circle cx="980" cy="130" r="118" fill={fill} stroke={line} strokeWidth="2.5" />
      <path
        d="M860 470a96 96 0 0 0 192 0z"
        fill={fill}
        stroke={line}
        strokeWidth="2.5"
        transform="rotate(-18 956 470)"
      />
      <rect
        x="795"
        y="40"
        width="92"
        height="92"
        rx="6"
        fill="none"
        stroke={ink}
        strokeWidth="2.5"
        transform="rotate(14 841 86)"
      />
      <path
        d="M1120 420v84M1078 462h84"
        fill="none"
        stroke={line}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="880" cy="345" r="7" fill={line} />
      <path d="M90 640a70 70 0 0 0 140 0" fill="none" stroke={ink} strokeWidth="2.5" />
      <rect
        x="180"
        y="120"
        width="46"
        height="46"
        fill={fill}
        stroke={line}
        strokeWidth="2.5"
        transform="rotate(-12 203 143)"
      />
    </svg>
  );
}
